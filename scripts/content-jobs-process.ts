/**
 * Offline worker: process pending content generation jobs.
 * Env: CONTENT_JOB_TAKE (default 50), CONTENT_JOB_KIND, CONTENT_JOB_BATCH
 */
import { prisma } from "../src/server/db";
import { processPendingJobs } from "../src/lib/content-generation/process-job";

async function main() {
  const take = Number(process.env.CONTENT_JOB_TAKE || "50");
  const kind = process.env.CONTENT_JOB_KIND as any;
  const batchKey = process.env.CONTENT_JOB_BATCH;
  const results = await processPendingJobs({ take, kind, batchKey });
  const ok = results.filter((r) => r.ok).length;
  const fail = results.length - ok;
  console.log(JSON.stringify({ processed: results.length, ok, fail, results: results.slice(0, 20) }, null, 2));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
