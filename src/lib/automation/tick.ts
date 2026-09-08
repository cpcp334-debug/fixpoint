import { prisma } from "@/server/db";
import { processJob } from "@/lib/automation/engine";
import { scanAmcRenewals } from "@/lib/automation/amc-scan";
import { reapStaleRunningJobs } from "@/lib/automation/reaper";

const BATCH = 20;

export async function processDueJobs(limit = BATCH) {
  const reaper = await reapStaleRunningJobs();
  await scanAmcRenewals();
  const take = Math.max(1, Math.min(limit, BATCH));
  let processed = 0;
  let succeeded = 0;
  let failed = 0;
  const claimAt = new Date();
  for (let i = 0; i < take; i += 1) {
    const job = await prisma.automationJob.findFirst({
      where: { status: { in: ["pending", "failed"] }, runAt: { lte: new Date() } },
      orderBy: { runAt: "asc" },
    });
    if (!job) break;
    const claimed = await prisma.automationJob.updateMany({
      where: { id: job.id, status: job.status },
      data: { status: "running", startedAt: claimAt },
    });
    if (claimed.count !== 1) continue;
    const fresh = await prisma.automationJob.findUnique({ where: { id: job.id } });
    if (!fresh) continue;
    const result = await processJob(fresh);
    processed += 1;
    if (result.ok) succeeded += 1;
    else failed += 1;
  }
  return { processed, succeeded, failed, reaped: reaper.reaped };
}
