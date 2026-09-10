/**
 * Safe FAILED → PENDING requeue only.
 * Preserves attempt/error/ids/locale/generationVersion + appends audit history.
 * Does NOT touch succeeded/dead jobs or any published content.
 */
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { prisma } from "../src/server/db";
import { requeueFailedJobs } from "../src/lib/content-generation/jobs";
import { processContentJob } from "../src/lib/content-generation/process-job";

async function main() {
  const take = Number(process.env.REQUEUE_TAKE || "500");
  const processAfter = process.env.REQUEUE_PROCESS === "1";
  const result = await requeueFailedJobs({ take });
  const processed: Array<{ id: string; ok: boolean; error?: string }> = [];

  if (processAfter) {
    for (const id of result.ids) {
      const res = await processContentJob(id);
      processed.push({ id, ok: res.ok, error: res.error });
    }
  }

  const report = {
    at: new Date().toISOString(),
    requeued: result.requeued,
    processed: processAfter ? processed : undefined,
    note: "Only status=failed was touched. succeeded/dead/published untouched. error history preserved in resultJson.",
  };
  writeFileSync(join(process.cwd(), "docs/content-jobs-requeue-failed.json"), JSON.stringify(report, null, 2) + "\n");
  console.log(JSON.stringify(report, null, 2));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
