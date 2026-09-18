/**
 * Overnight loop: keep publishing service×estate×city blogs until matrix filled.
 * Env:
 *   SEC_BLOG_CONFIRM=CONFIRM_PUBLISH
 *   SEC_BLOG_LIMIT — per loop (default 2000)
 *   SEC_BLOG_BATCH — default 40
 *   SEC_BLOG_MAX_LOOPS — default 100
 */
import { spawnSync } from "node:child_process";
import "./load-env-mysql";
import { prisma } from "../src/server/db";

function run() {
  const r = spawnSync("npx", ["tsx", "scripts/publish-service-estate-city-blogs.ts"], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      SEC_BLOG_CONFIRM: "CONFIRM_PUBLISH",
      SEC_BLOG_SKIP_GATES: process.env.SEC_BLOG_SKIP_GATES || "1",
      SEC_BLOG_LIMIT: process.env.SEC_BLOG_LIMIT || "2000",
      SEC_BLOG_BATCH: process.env.SEC_BLOG_BATCH || "40",
    },
    stdio: "inherit",
    shell: true,
  });
  return r.status ?? 1;
}

async function publishedSec() {
  return prisma.article.count({
    where: { status: "published", indexable: true, categorySlugs: { contains: "service-location" } },
  });
}

async function main() {
  if (process.env.SEC_BLOG_CONFIRM !== "CONFIRM_PUBLISH") {
    throw new Error("Set SEC_BLOG_CONFIRM=CONFIRM_PUBLISH");
  }
  const maxLoops = Math.max(1, Number(process.env.SEC_BLOG_MAX_LOOPS || "100"));
  const target = Math.max(1, Number(process.env.SEC_BLOG_TARGET || "119140"));

  for (let i = 0; i < maxLoops; i++) {
    const before = await publishedSec();
    console.log(JSON.stringify({ phase: "loop_start", i, before, target, at: new Date().toISOString() }));
    if (before >= target) {
      console.log(JSON.stringify({ phase: "done", reason: "target_reached", before }));
      return;
    }
    const code = run();
    const after = await publishedSec();
    console.log(JSON.stringify({ phase: "loop_end", i, before, after, code }));
    if (code !== 0) throw new Error(`loop_${i}_failed_${code}`);
    if (after <= before) {
      console.log(JSON.stringify({ phase: "done", reason: "no_progress", after }));
      return;
    }
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
