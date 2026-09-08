/**
 * FIX 5 durable rate-limit + trusted-proxy verification.
 * Does not wipe business data. Uses hashed test keys only.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { prisma } from "../src/server/db";
import { hashRateLimitKey, rateLimit, clientIp, onRateLimitStoreError } from "../src/server/rate-limit";
import { resolveClientIp, trustedProxyEnabled } from "../src/server/trusted-proxy";
import { emailLockoutKey } from "../src/lib/admin/auth";

function assert(cond: unknown, message: string): asserts cond {
  if (!cond) throw new Error(message);
}

const PREFIX = "fix5-rl-verify:";

async function cleanup() {
  const known = [
    `${PREFIX}allow`,
    `${PREFIX}block`,
    `${PREFIX}persist`,
    `${PREFIX}shared-a`,
    `${PREFIX}ttl`,
    `${PREFIX}fail-closed`,
    `${PREFIX}cofounder`,
    `${PREFIX}automation`,
    `${PREFIX}health`,
    `${PREFIX}ai`,
    `${PREFIX}upload`,
    `${PREFIX}lead`,
    `${PREFIX}booking`,
    `${PREFIX}qa`,
    `${PREFIX}review`,
    `${PREFIX}vote`,
    `${PREFIX}report`,
    `${PREFIX}analytics`,
  ].map(hashRateLimitKey);
  await prisma.rateLimitBucket.deleteMany({ where: { keyHash: { in: known } } });
}

async function main() {
  await cleanup();

  const rateSrc = readFileSync(join(process.cwd(), "src/server/rate-limit.ts"), "utf8");
  const proxySrc = readFileSync(join(process.cwd(), "src/server/trusted-proxy.ts"), "utf8");
  const ingestSrc = readFileSync(join(process.cwd(), "src/lib/analytics/ingest.ts"), "utf8");
  const docs = readFileSync(join(process.cwd(), "docs/rate-limiting.md"), "utf8");
  const schema = readFileSync(join(process.cwd(), "prisma/schema.prisma"), "utf8");
  const pkg = JSON.parse(readFileSync(join(process.cwd(), "package.json"), "utf8")) as {
    scripts: Record<string, string>;
  };

  assert(schema.includes("model RateLimitBucket"), "RateLimitBucket in schema");
  assert(docs.includes("TRUST_PROXY"), "docs mention TRUST_PROXY");
  assert(docs.includes("fail open") || docs.includes("Fail open"), "docs analytics fail open");
  assert(ingestSrc.includes('onStoreError: "open"'), "analytics fail open configured");
  assert(rateSrc.includes("hashRateLimitKey") || rateSrc.includes("sha256"), "keys hashed");
  assert(proxySrc.includes("parts.length - hops"), "Nth from right hop selection");
  assert(!trustedProxyEnabled({}), "proxy disabled by default");
  assert(!trustedProxyEnabled({ TRUST_PROXY: "1" }), "hops required");
  assert(trustedProxyEnabled({ TRUST_PROXY: "1", TRUSTED_PROXY_HOPS: "1" }), "proxy enabled when hops set");

  // Spoofed headers ignored without trust
  const spoofHeaders = new Headers({
    "x-forwarded-for": "203.0.113.9, 198.51.100.1",
    "x-real-ip": "203.0.113.9",
  });
  assert(resolveClientIp(spoofHeaders, {}) === "unknown", "spoofed XFF ignored without TRUST_PROXY");
  assert(clientIp(spoofHeaders) === "unknown", "clientIp uses trusted resolver");
  assert(
    resolveClientIp(spoofHeaders, { TRUST_PROXY: "1", TRUSTED_PROXY_HOPS: "1" }) === "198.51.100.1",
    "1 hop from right",
  );
  assert(
    resolveClientIp(spoofHeaders, { TRUST_PROXY: "1", TRUSTED_PROXY_HOPS: "2" }) === "203.0.113.9",
    "2 hops from right",
  );
  assert(
    resolveClientIp(new Headers({ "x-forwarded-for": "9.9.9.9" }), {}) === "unknown",
    "leftmost alone not trusted without config",
  );

  // 1–2 under / over limit
  const allowKey = `${PREFIX}allow`;
  for (let i = 0; i < 3; i++) {
    const r = await rateLimit(allowKey, 3, 60_000);
    assert(r.ok, `under-limit hit ${i + 1}`);
  }
  const blocked = await rateLimit(allowKey, 3, 60_000);
  assert(!blocked.ok && blocked.remaining === 0, "exceeded limit blocked");

  // Persistence / shared state across logical "restart" (durable DB, not process memory)
  const persistKey = `${PREFIX}persist`;
  assert((await rateLimit(persistKey, 5, 60_000)).ok, "persist first");
  assert((await rateLimit(persistKey, 5, 60_000)).ok, "persist second");
  await prisma.$disconnect();
  // Reconnect via fresh query through prisma singleton after disconnect — use $connect
  await prisma.$connect();
  const row = await prisma.rateLimitBucket.findUnique({ where: { keyHash: hashRateLimitKey(persistKey) } });
  assert(row?.count === 2, "shared durable count=2 after reconnect");
  assert(/^[a-f0-9]{64}$/.test(row!.keyHash), "keyHash is sha256 hex");
  assert(row!.keyHash !== persistKey, "logical key not stored raw");
  assert(!row!.keyHash.includes("."), "keyHash is not an IP");

  const { spawnSync } = await import("node:child_process");
  const child = spawnSync("npx", ["tsx", "scripts/rate-limit-persist-child.ts", persistKey], {
    cwd: process.cwd(),
    encoding: "utf8",
    shell: true,
    env: process.env,
  });
  assert(child.status === 0 && (child.stdout || "").includes("child-ok"), "persistence visible across process restart");

  // TTL expiry
  const ttlKey = `${PREFIX}ttl`;
  assert((await rateLimit(ttlKey, 1, 60_000)).ok, "ttl first");
  assert(!(await rateLimit(ttlKey, 1, 60_000)).ok, "ttl blocked in window");
  await prisma.rateLimitBucket.update({
    where: { keyHash: hashRateLimitKey(ttlKey) },
    data: { resetAt: new Date(Date.now() - 1000) },
  });
  assert((await rateLimit(ttlKey, 1, 60_000)).ok, "ttl expiry resets window");

  // Numeric limit inventory (source)
  const callers: Array<{ file: string; needle: string }> = [
    { file: "src/lib/admin/auth.ts", needle: "await rateLimit(`staff-login:${ip}`, 8, 15 * 60 * 1000)" },
    { file: "src/app/api/ai/chat/route.ts", needle: "await rateLimit(`ai:${ip}`, 20, 10 * 60 * 1000)" },
    { file: "src/app/api/ai/uploads/route.ts", needle: "await rateLimit(`ai-upload:${ip}`, 10, 10 * 60 * 1000)" },
    { file: "src/lib/leads.ts", needle: "await rateLimit(`lead:${ip}`, 5, 10 * 60 * 1000)" },
    { file: "src/lib/bookings.ts", needle: "await rateLimit(`booking:${ip}`, 5, 10 * 60 * 1000)" },
    { file: "src/lib/questions.ts", needle: "await rateLimit(`qa:${ip}`, 5, 60 * 60 * 1000)" },
    { file: "src/lib/reviews.ts", needle: "await rateLimit(`review:${ip}`, 3, 60 * 60 * 1000)" },
    { file: "src/lib/reviews.ts", needle: "await rateLimit(`review-vote:${ip}:${reviewId}`, 5, 60 * 60 * 1000)" },
    { file: "src/lib/reviews.ts", needle: "await rateLimit(`report:${ip}`, 8, 60 * 60 * 1000)" },
    { file: "src/server/votes.ts", needle: "await rateLimit(`vote:${clientIp(hdrs)}:${guideId}`, 5, 60 * 60 * 1000)" },
    { file: "src/lib/analytics/ingest.ts", needle: "onStoreError: \"open\"" },
    { file: "src/app/api/admin/ai/chat/route.ts", needle: "await rateLimit(`cofounder:${session.id}`, 30, 10 * 60 * 1000)" },
    { file: "src/app/api/admin/ai/proposals/route.ts", needle: "await rateLimit(`cofounder-proposals:${session.id}`, 60, 10 * 60 * 1000)" },
    { file: "src/app/api/admin/ai/proposals/[id]/approve/route.ts", needle: "await rateLimit(`cofounder-proposal-write:${session.id}`, 40, 10 * 60 * 1000)" },
    { file: "src/app/api/admin/ai/proposals/[id]/cancel/route.ts", needle: "await rateLimit(`cofounder-proposal-write:${session.id}`, 40, 10 * 60 * 1000)" },
    { file: "src/app/api/admin/ai/proposals/[id]/edit/route.ts", needle: "await rateLimit(`cofounder-proposal-write:${session.id}`, 40, 10 * 60 * 1000)" },
    { file: "src/app/api/internal/automation/tick/route.ts", needle: 'await rateLimit("automation-tick", 60, 60_000)' },
    { file: "src/app/api/internal/health/db/route.ts", needle: 'await rateLimit("health-db", 120, 60_000)' },
  ];
  for (const c of callers) {
    const src = readFileSync(join(process.cwd(), c.file), "utf8");
    assert(src.includes(c.needle), `caller limit preserved: ${c.file} → ${c.needle}`);
  }

  // Fail-open / fail-closed contracts
  assert(onRateLimitStoreError("open", 60).ok === true, "analytics store failure fails open");
  assert(onRateLimitStoreError("closed", 8).ok === false, "security store failure fails closed");

  // Exercise representative keys
  assert((await rateLimit(`${PREFIX}ai`, 20, 10 * 60 * 1000)).ok, "ai limit path");
  assert((await rateLimit(`${PREFIX}upload`, 10, 10 * 60 * 1000)).ok, "upload limit path");
  assert((await rateLimit(`${PREFIX}lead`, 5, 10 * 60 * 1000)).ok, "lead limit path");
  assert((await rateLimit(`${PREFIX}booking`, 5, 10 * 60 * 1000)).ok, "booking limit path");
  assert((await rateLimit(`${PREFIX}qa`, 5, 60 * 60 * 1000)).ok, "qa limit path");
  assert((await rateLimit(`${PREFIX}review`, 3, 60 * 60 * 1000)).ok, "review limit path");
  assert((await rateLimit(`${PREFIX}vote`, 5, 60 * 60 * 1000)).ok, "diy vote path");
  assert((await rateLimit(`${PREFIX}report`, 8, 60 * 60 * 1000)).ok, "report path");
  assert((await rateLimit(`${PREFIX}cofounder`, 30, 10 * 60 * 1000)).ok, "cofounder burst path");
  assert((await rateLimit(`${PREFIX}automation`, 60, 60_000)).ok, "automation path");
  assert((await rateLimit(`${PREFIX}health`, 120, 60_000)).ok, "health path");
  assert((await rateLimit(`${PREFIX}analytics`, 60, 10 * 60 * 1000, { onStoreError: "open" })).ok, "analytics path");

  // AuthLoginGuard regression
  assert(schema.includes("model AuthLoginGuard"), "AuthLoginGuard preserved");
  const sampleHash = emailLockoutKey("fix5-guard@verify.local");
  assert(sampleHash.length === 64 && sampleHash !== "fix5-guard@verify.local", "login guard still hashes email");

  // No raw PII in RateLimitBucket rows we created
  const tracked = [
    `${PREFIX}allow`,
    `${PREFIX}block`,
    `${PREFIX}persist`,
    `${PREFIX}ttl`,
    `${PREFIX}ai`,
    `${PREFIX}upload`,
    `${PREFIX}lead`,
    `${PREFIX}booking`,
    `${PREFIX}qa`,
    `${PREFIX}review`,
    `${PREFIX}vote`,
    `${PREFIX}report`,
    `${PREFIX}cofounder`,
    `${PREFIX}automation`,
    `${PREFIX}health`,
    `${PREFIX}analytics`,
  ].map(hashRateLimitKey);
  const buckets = await prisma.rateLimitBucket.findMany({ where: { keyHash: { in: tracked } } });
  for (const b of buckets) {
    assert(/^[a-f0-9]{64}$/.test(b.keyHash), "every keyHash is 64-hex");
    assert(!b.keyHash.includes("@"), "no email in keyHash");
    assert(!/^\d+\.\d+\.\d+\.\d+$/.test(b.keyHash), "keyHash is not dotted IP");
  }

  assert(pkg.scripts["verify:rate-limit"]?.includes("rate-limit-verify"), "verify:rate-limit script");

  // Co-Founder daily still separate
  const limitsSrc = readFileSync(join(process.cwd(), "src/lib/cofounder/limits.ts"), "utf8");
  assert(limitsSrc.includes("consumeCofounderDailyChat"), "daily cap preserved");

  await cleanup();
  console.log("Rate-limit verification passed.");
}

main()
  .catch(async (err) => {
    console.error(err instanceof Error ? err.message : err);
    await cleanup().catch(() => undefined);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
