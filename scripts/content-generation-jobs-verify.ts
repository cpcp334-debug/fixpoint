/**
 * Minimal ContentGenerationJob queue verification (schema + enqueue/reaper smoke).
 * Does not wipe operational data.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  enqueueJob,
  listJobs,
  markFailed,
  markRunning,
  markSucceeded,
  reapStaleRunning,
} from "../src/lib/content-generation/jobs";
import { prisma } from "../src/server/db";

function assert(cond: unknown, message: string): asserts cond {
  if (!cond) throw new Error(message);
}

const PREFIX = "verify-content-jobs";

async function cleanup() {
  await prisma.contentGenerationJob.deleteMany({
    where: { idempotencyKey: { startsWith: `${PREFIX}-` } },
  });
}

async function main() {
  const root = process.cwd();
  const schema = readFileSync(join(root, "prisma/schema.prisma"), "utf8");
  const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8")) as {
    scripts: Record<string, string>;
  };

  assert(schema.includes("model ContentGenerationJob"), "schema has ContentGenerationJob");
  assert(schema.includes("enum ContentGenerationJobStatus"), "schema has ContentGenerationJobStatus");
  assert(pkg.scripts["db:content-jobs:reaper"], "package.json has db:content-jobs:reaper");
  assert(pkg.scripts["verify:content-jobs"], "package.json has verify:content-jobs");

  await cleanup();

  const key = `${PREFIX}-idem-${Date.now()}`;
  const a = await enqueueJob({
    kind: "sitemap_shard",
    idempotencyKey: key,
    batchKey: `${PREFIX}-batch`,
    generationVersion: 1,
    payloadJson: '{"n":1}',
  });
  const b = await enqueueJob({
    kind: "sitemap_shard",
    idempotencyKey: key,
    batchKey: `${PREFIX}-batch`,
    generationVersion: 1,
    payloadJson: '{"n":2}',
  });
  assert(a.id === b.id, "enqueue must upsert by idempotencyKey");
  assert(b.payloadJson.includes('"n":2'), "re-enqueue refreshes payload");

  const running = await markRunning(a.id);
  assert(running.status === "running", "markRunning → running");

  // Stale reap: backdate startedAt
  await prisma.contentGenerationJob.update({
    where: { id: a.id },
    data: { startedAt: new Date(Date.now() - 60_000) },
  });
  const reaped = await reapStaleRunning(1_000);
  assert(reaped.reaped >= 1, "reaper should reap stale running job");
  const afterReap = await prisma.contentGenerationJob.findUniqueOrThrow({ where: { id: a.id } });
  assert(afterReap.status === "failed" || afterReap.status === "dead", "reaped → failed/dead");
  assert(afterReap.attempt >= 1, "reap increments attempt");

  // Drive to dead
  const failKey = `${PREFIX}-dead-${Date.now()}`;
  const failJob = await enqueueJob({
    kind: "diy_profile",
    idempotencyKey: failKey,
    batchKey: `${PREFIX}-batch`,
    generationVersion: 1,
    maxAttempts: 2,
  });
  await markRunning(failJob.id);
  const f1 = await markFailed(failJob.id, "boom1");
  assert(f1.status === "failed" && f1.attempt === 1, "first fail → failed");
  await markRunning(failJob.id);
  const f2 = await markFailed(failJob.id, "boom2");
  assert(f2.status === "dead" && f2.attempt === 2, "second fail → dead");

  const okKey = `${PREFIX}-ok-${Date.now()}`;
  const okJob = await enqueueJob({
    kind: "image_asset",
    idempotencyKey: okKey,
    batchKey: `${PREFIX}-batch`,
    generationVersion: 1,
  });
  await markRunning(okJob.id);
  const done = await markSucceeded(okJob.id, { resultJson: '{"ok":true}' });
  assert(done.status === "succeeded", "markSucceeded");

  const listed = await listJobs({ batchKey: `${PREFIX}-batch`, take: 50 });
  assert(listed.length >= 3, "listJobs returns batch rows");

  await cleanup();
  console.log("verify:content-jobs PASSED");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await cleanup().catch(() => undefined);
    await prisma.$disconnect();
  });
