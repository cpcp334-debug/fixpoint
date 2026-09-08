import { prisma } from "@/server/db";
import { adminAudit } from "@/lib/admin/numbers";
import { staleRunningCutoff } from "@/lib/automation/settings";

/**
 * Reset abandoned running jobs (worker crash) to pending for reclaim.
 * Per-id atomic updateMany — concurrency-safe with claim.
 * Does not increment attempt; next processJob claim does.
 * AuditLog only — no AutomationRun stub for the reaper.
 */
export async function reapStaleRunningJobs(opts?: { now?: Date; env?: Record<string, string | undefined> }) {
  const now = opts?.now ?? new Date();
  const cutoff = staleRunningCutoff(now, opts?.env ?? process.env);

  const stale = await prisma.automationJob.findMany({
    where: {
      status: "running",
      startedAt: { lte: cutoff },
    },
    select: { id: true },
    take: 100,
  });
  if (!stale.length) return { reaped: 0 };

  let reaped = 0;
  for (const row of stale) {
    const updated = await prisma.automationJob.updateMany({
      where: {
        id: row.id,
        status: "running",
        startedAt: { lte: cutoff },
      },
      data: {
        status: "pending",
        runAt: now,
        startedAt: null,
        lastError: "stale_running_reaped",
      },
    });
    if (updated.count !== 1) continue;
    reaped += 1;
    await adminAudit({
      actor: "system",
      action: "automation.job.reaped",
      entity: "AutomationJob",
      entityId: row.id,
      meta: { reason: "stale_running" },
    });
  }

  return { reaped };
}
