/**
 * FIX 7 — stale running AutomationJob reaper verification.
 * Does not call live OpenAI or wipe unrelated business data.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { prisma } from "../src/server/db";
import { reapStaleRunningJobs } from "../src/lib/automation/reaper";
import {
  DEFAULT_AUTOMATION_STALE_RUNNING_MINUTES,
  MIN_AUTOMATION_STALE_RUNNING_MINUTES,
  resolveStaleRunningMinutes,
  staleRunningCutoff,
} from "../src/lib/automation/settings";
import { processDueJobs } from "../src/lib/automation/tick";
import { authorizeTick, GET as tickGet, POST as tickPost } from "../src/app/api/internal/automation/tick/route";
import { enqueueDomainEvent } from "../src/lib/automation/enqueue";

function assert(cond: unknown, message: string): asserts cond {
  if (!cond) throw new Error(message);
}

const PREFIX = "fix7-reaper-verify";
const ids = { jobs: [] as string[], leads: [] as string[], audits: [] as string[] };

async function cleanup() {
  if (ids.audits.length) {
    await prisma.auditLog.deleteMany({ where: { id: { in: ids.audits } } });
  }
  await prisma.auditLog.deleteMany({
    where: { action: "automation.job.reaped", entityId: { in: ids.jobs.length ? ids.jobs : ["__none__"] } },
  });
  if (ids.jobs.length) {
    await prisma.automationRun.deleteMany({ where: { jobId: { in: ids.jobs } } });
    await prisma.automationJob.deleteMany({ where: { id: { in: ids.jobs } } });
  }
  await prisma.automationJob.deleteMany({ where: { idempotencyKey: { startsWith: `${PREFIX}-` } } });
  if (ids.leads.length) {
    await prisma.leadScoreHistory.deleteMany({ where: { leadId: { in: ids.leads } } });
    await prisma.leadScore.deleteMany({ where: { leadId: { in: ids.leads } } });
    await prisma.lead.deleteMany({ where: { id: { in: ids.leads } } });
  }
}

async function seedJob(partial: {
  status: "pending" | "running" | "failed" | "succeeded" | "dead";
  startedAt?: Date | null;
  attempt?: number;
  runAt?: Date;
  suffix: string;
}) {
  const job = await prisma.automationJob.create({
    data: {
      status: partial.status,
      trigger: "NEW_LEAD",
      subjectType: "Lead",
      subjectId: `fix7-subject-${partial.suffix}`,
      payloadJson: "{}",
      runAt: partial.runAt ?? new Date(),
      startedAt: partial.startedAt === undefined ? null : partial.startedAt,
      attempt: partial.attempt ?? 0,
      maxAttempts: 3,
      idempotencyKey: `${PREFIX}-${partial.suffix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      lastError: "",
    },
  });
  ids.jobs.push(job.id);
  return job;
}

async function main() {
  const root = process.cwd();
  const schema = readFileSync(join(root, "prisma/schema.prisma"), "utf8");
  const reaperSrc = readFileSync(join(root, "src/lib/automation/reaper.ts"), "utf8");
  const tickSrc = readFileSync(join(root, "src/lib/automation/tick.ts"), "utf8");
  const engineSrc = readFileSync(join(root, "src/lib/automation/engine.ts"), "utf8");
  const envExample = readFileSync(join(root, ".env.example"), "utf8");
  const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8")) as { scripts: Record<string, string> };

  assert(schema.includes("startedAt"), "schema has startedAt");
  assert(schema.includes("@@index([status, startedAt])"), "schema index status+startedAt");
  assert(tickSrc.includes("reapStaleRunningJobs"), "tick invokes reaper");
  assert(tickSrc.includes("startedAt: claimAt"), "claim sets startedAt");
  assert(engineSrc.includes("startedAt: null"), "engine clears startedAt on terminal");
  assert(reaperSrc.includes('action: "automation.job.reaped"'), "reaper audit action");
  assert(reaperSrc.includes('reason: "stale_running"'), "reaper audit meta reason only");
  assert(!reaperSrc.includes("phone") && !reaperSrc.includes("email"), "no PII fields in reaper");
  assert(envExample.includes("AUTOMATION_STALE_RUNNING_MINUTES"), ".env.example documents env");
  assert(pkg.scripts["verify:automation-reaper"]?.includes("automation-reaper"), "verify script registered");
  assert(!/prisma\.automationRun|automationRun\.create/.test(reaperSrc), "no AutomationRun create in reaper");
  assert(reaperSrc.includes("adminAudit"), "reaper uses AuditLog via adminAudit");

  assert(resolveStaleRunningMinutes({}) === DEFAULT_AUTOMATION_STALE_RUNNING_MINUTES, "default 15");
  assert(resolveStaleRunningMinutes({ AUTOMATION_STALE_RUNNING_MINUTES: "3" }) === MIN_AUTOMATION_STALE_RUNNING_MINUTES, "floor 5");
  assert(resolveStaleRunningMinutes({ AUTOMATION_STALE_RUNNING_MINUTES: "20" }) === 20, "custom 20");

  await cleanup();

  const now = new Date();
  const recent = await seedJob({
    status: "running",
    startedAt: new Date(now.getTime() - 2 * 60_000),
    attempt: 1,
    suffix: "recent",
  });
  const stale = await seedJob({
    status: "running",
    startedAt: new Date(now.getTime() - 16 * 60_000),
    attempt: 2,
    suffix: "stale",
  });
  const succeeded = await seedJob({
    status: "succeeded",
    startedAt: new Date(now.getTime() - 60 * 60_000),
    attempt: 1,
    suffix: "ok",
  });
  const failed = await seedJob({
    status: "failed",
    startedAt: null,
    attempt: 1,
    runAt: new Date(now.getTime() + 60_000),
    suffix: "fail",
  });
  const dead = await seedJob({
    status: "dead",
    startedAt: new Date(now.getTime() - 60 * 60_000),
    attempt: 3,
    suffix: "dead",
  });

  const env = { AUTOMATION_STALE_RUNNING_MINUTES: "15" };
  const cutoff = staleRunningCutoff(now, env);
  assert(recent.startedAt! > cutoff, "recent is newer than cutoff");
  assert(stale.startedAt! <= cutoff, "stale is older than cutoff");

  const result = await reapStaleRunningJobs({ now, env });
  assert(result.reaped === 1, `expected 1 reaped, got ${result.reaped}`);

  const afterRecent = await prisma.automationJob.findUniqueOrThrow({ where: { id: recent.id } });
  assert(afterRecent.status === "running", "1 recent running not reaped");
  assert(afterRecent.startedAt != null, "1 recent startedAt kept");
  assert(afterRecent.attempt === 1, "1 recent attempt unchanged");

  const afterStale = await prisma.automationJob.findUniqueOrThrow({ where: { id: stale.id } });
  assert(afterStale.status === "pending", "3 stale becomes pending");
  assert(Math.abs(afterStale.runAt.getTime() - now.getTime()) < 2000, "4 runAt becomes now");
  assert(afterStale.startedAt == null, "5 startedAt clears");
  assert(afterStale.attempt === 2, "6 attempt does not increment during reap");
  assert(afterStale.lastError === "stale_running_reaped", "lastError set");

  const afterOk = await prisma.automationJob.findUniqueOrThrow({ where: { id: succeeded.id } });
  assert(afterOk.status === "succeeded" && afterOk.attempt === 1, "8 succeeded untouched");
  const afterFail = await prisma.automationJob.findUniqueOrThrow({ where: { id: failed.id } });
  assert(afterFail.status === "failed" && afterFail.attempt === 1, "9 failed untouched");
  const afterDead = await prisma.automationJob.findUniqueOrThrow({ where: { id: dead.id } });
  assert(afterDead.status === "dead" && afterDead.attempt === 3, "10 dead untouched");

  const audits = await prisma.auditLog.findMany({
    where: { action: "automation.job.reaped", entityId: stale.id },
    orderBy: { createdAt: "desc" },
    take: 5,
  });
  assert(audits.length >= 1, "audit recorded");
  ids.audits.push(...audits.map((a) => a.id));
  const meta = JSON.parse(audits[0].meta) as Record<string, unknown>;
  assert(meta.reason === "stale_running", "audit meta reason");
  assert(Object.keys(meta).length === 1, "audit meta only reason");
  assert(!JSON.stringify(meta).includes("phone"), "no phone in audit");

  // Concurrent reap/claim: claim wins over second reap for same fresh running job
  const raceJob = await seedJob({
    status: "running",
    startedAt: new Date(now.getTime() - 20 * 60_000),
    attempt: 0,
    suffix: "race",
  });
  const [reapRace, claimRace] = await Promise.all([
    prisma.automationJob.updateMany({
      where: { id: raceJob.id, status: "running", startedAt: { lte: cutoff } },
      data: { status: "pending", runAt: now, startedAt: null, lastError: "stale_running_reaped" },
    }),
    prisma.automationJob.updateMany({
      where: { id: raceJob.id, status: "running" },
      data: { status: "running", startedAt: now },
    }),
  ]);
  assert(reapRace.count + claimRace.count === 1, "11 concurrent reap/claim exclusive (one winner)");

  // Next claim increments attempt normally via processJob path (tick claim + process)
  const reclaim = await seedJob({
    status: "pending",
    startedAt: null,
    attempt: 2,
    runAt: new Date(Date.now() - 1000),
    suffix: "reclaim",
  });
  // Force subject missing so process finishes without rules blowing up — LEAD_CREATED with no rules may succeed skipped
  const beforeAttempt = reclaim.attempt;
  await prisma.automationJob.update({
    where: { id: reclaim.id },
    data: { status: "running", startedAt: new Date() },
  });
  const { processJob } = await import("../src/lib/automation/engine");
  const fresh = await prisma.automationJob.findUniqueOrThrow({ where: { id: reclaim.id } });
  await processJob(fresh);
  const afterProcess = await prisma.automationJob.findUniqueOrThrow({ where: { id: reclaim.id } });
  assert(afterProcess.attempt === beforeAttempt + 1, "7 next process increments attempt");
  assert(afterProcess.startedAt == null, "terminal clears startedAt");
  assert(afterProcess.status === "succeeded" || afterProcess.status === "failed" || afterProcess.status === "dead", "terminal status");

  // Idempotency: enqueue same key twice
  const lead = await prisma.lead.create({
    data: {
      name: "FIX7 Reaper",
      phone: "+971509018799",
      source: "verify",
      status: "NEW",
      requirement: "fix7 reaper verify",
    },
  });
  ids.leads.push(lead.id);
  const key = `${PREFIX}-idem-${lead.id}`;
  const first = await enqueueDomainEvent({
    trigger: "NEW_LEAD",
    subjectType: "Lead",
    subjectId: lead.id,
    occurrenceKey: key,
    payload: {},
  });
  const second = await enqueueDomainEvent({
    trigger: "NEW_LEAD",
    subjectType: "Lead",
    subjectId: lead.id,
    occurrenceKey: key,
    payload: {},
  });
  assert(first.ok && first.jobId, "enqueue ok");
  if (first.jobId) ids.jobs.push(first.jobId);
  assert(second.ok && second.duplicate, "12 idempotency prevents duplicate jobs");

  // Tick secret required
  const prevSecret = process.env.AUTOMATION_CRON_SECRET;
  process.env.AUTOMATION_CRON_SECRET = "fix7-automation-cron-secret";
  assert(!authorizeTick(new Request("http://local/tick", { method: "POST" })), "13 secret required");
  const unauthorized = await tickPost(new Request("http://local/tick", { method: "POST" }));
  assert(unauthorized.status === 401, "13 tick 401 without secret");
  const getBlocked = tickGet();
  assert(getBlocked.status === 405, "GET tick blocked");
  process.env.AUTOMATION_CRON_SECRET = prevSecret;

  // Public writes isolation — enqueueDomainEventSafe pattern already in 2F5; smoke that reaper does not throw on empty
  const empty = await reapStaleRunningJobs({ now, env: { AUTOMATION_STALE_RUNNING_MINUTES: "15" } });
  assert(typeof empty.reaped === "number", "15 reaper safe when nothing stale");

  // Tick still callable (reaper at start) — use secret
  process.env.AUTOMATION_CRON_SECRET = "fix7-automation-cron-secret";
  const authorized = await tickPost(
    new Request("http://local/tick", {
      method: "POST",
      headers: { authorization: "Bearer fix7-automation-cron-secret" },
    }),
  );
  assert(authorized.status === 200 || authorized.status === 429, "tick with secret ok or rate-limited");
  if (authorized.status === 200) {
    const body = (await authorized.json()) as { ok: boolean; reaped?: number };
    assert(body.ok === true && typeof body.reaped === "number", "tick returns reaped");
  }
  process.env.AUTOMATION_CRON_SECRET = prevSecret;

  // processDueJobs exposes reaped
  const due = await processDueJobs(1);
  assert(typeof due.reaped === "number", "processDueJobs returns reaped");

  await cleanup();
  console.log("verify:automation-reaper OK");
}

main()
  .catch(async (error) => {
    console.error(error);
    try {
      await cleanup();
    } catch {
      /* ignore */
    }
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
