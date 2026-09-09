/**
 * Reap stale running ContentGenerationJob rows (worker crash / abandoned lease).
 * Usage: npx tsx scripts/content-generation-reaper.ts [olderThanMs]
 * Default olderThanMs: 15 minutes.
 */
import { reapStaleRunning } from "../src/lib/content-generation/jobs";
import { prisma } from "../src/server/db";

async function main() {
  const raw = process.argv[2] ?? process.env.CONTENT_JOB_STALE_MS ?? String(15 * 60 * 1000);
  const olderThanMs = Number(raw);
  if (!Number.isFinite(olderThanMs) || olderThanMs < 1000) {
    throw new Error(`Invalid olderThanMs: ${raw}`);
  }

  const result = await reapStaleRunning(olderThanMs, prisma);
  console.log(
    JSON.stringify(
      {
        olderThanMs,
        ...result,
      },
      null,
      2,
    ),
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
