/**
 * Overnight ServiceLocation corpus runner (resumable).
 * Stages: materialize missing pairs → longform content batches → bulk publish.
 *
 * Env:
 *   SL_OVERNIGHT_CONFIRM=CONFIRM_PUBLISH — required
 *   SL_OVERNIGHT_MATERIALIZE=1 — materialize remaining matrix (default 1)
 *   SL_OVERNIGHT_CONTENT_BATCH — locale rows per content loop (default 1000)
 *   SL_OVERNIGHT_PUBLISH_BATCH — pairs per publish loop (default 200)
 *   SL_OVERNIGHT_MAX_LOOPS — safety cap (default 500)
 *   MATRIX_INCLUDE_LEGACY=1 — optional pass-through to materialize
 */
import { spawnSync } from "node:child_process";
import { prisma } from "../src/server/db";

function run(label: string, script: string, env: Record<string, string>) {
  console.log(JSON.stringify({ phase: "run", label, at: new Date().toISOString() }));
  const r = spawnSync("npx", ["tsx", script], {
    cwd: process.cwd(),
    env: { ...process.env, ...env },
    encoding: "utf8",
    shell: true,
    stdio: "inherit",
    maxBuffer: 32 * 1024 * 1024,
  });
  if (r.status !== 0) {
    throw new Error(`${label}_failed_exit_${r.status}`);
  }
}

async function snapshot() {
  const [total, published, draft, activeLoc] = await Promise.all([
    prisma.serviceLocation.count(),
    prisma.serviceLocation.count({
      where: { coverageStatus: "published", covered: true, indexable: true },
    }),
    prisma.serviceLocation.count({ where: { coverageStatus: { not: "published" } } }),
    prisma.location.count({ where: { status: "active", serves: true } }),
  ]);
  return { total, published, draft, activeLoc };
}

async function main() {
  if (process.env.SL_OVERNIGHT_CONFIRM !== "CONFIRM_PUBLISH") {
    throw new Error("Set SL_OVERNIGHT_CONFIRM=CONFIRM_PUBLISH");
  }
  const doMaterialize = process.env.SL_OVERNIGHT_MATERIALIZE !== "0";
  const contentBatch = Number(process.env.SL_OVERNIGHT_CONTENT_BATCH || "1000");
  const publishBatch = Number(process.env.SL_OVERNIGHT_PUBLISH_BATCH || "200");
  const maxLoops = Number(process.env.SL_OVERNIGHT_MAX_LOOPS || "500");

  console.log(JSON.stringify({ phase: "start", ...(await snapshot()) }, null, 2));

  if (doMaterialize) {
    // Explicitly clear MATRIX_LIMIT so a prior pilot env cannot cap the full run.
    run("materialize", "scripts/service-location-matrix-materialize.ts", {
      MATRIX_LIMIT: "",
      ...(process.env.MATRIX_INCLUDE_LEGACY === "1" ? { MATRIX_INCLUDE_LEGACY: "1" } : {}),
    });
  }

  for (let loop = 0; loop < maxLoops; loop++) {
    const before = await snapshot();
    console.log(JSON.stringify({ phase: "loop", loop, ...before }, null, 2));
    if (before.draft === 0) {
      console.log(JSON.stringify({ phase: "done", reason: "no_drafts_left", ...before }, null, 2));
      return;
    }

    // Content: process next draft chunk (pairs ≈ contentBatch/2)
    run("content", "scripts/content-sl-long-batch.ts", {
      SL_LONG_BATCH: String(contentBatch),
      SL_LONG_OFFSET: "0",
      SL_LONG_BATCH_KEY: `sl-overnight-${new Date().toISOString().slice(0, 10)}`,
    });

    run("publish", "scripts/publish-service-locations-bulk.ts", {
      SL_BULK_CONFIRM: "CONFIRM_PUBLISH",
      SL_BULK_LIMIT: String(publishBatch),
      SL_BULK_OFFSET: "0",
      SL_BULK_PUBLISH_AR: "1",
    });

    const after = await snapshot();
    if (after.published <= before.published) {
      // Advance content window so we do not keep regenerating the same filled drafts.
      const nextOffset = Number(process.env.SL_LONG_OFFSET || "0") + contentBatch;
      process.env.SL_LONG_OFFSET = String(nextOffset);
      console.log(
        JSON.stringify(
          {
            phase: "stall_advance_offset",
            loop,
            nextOffset,
            before,
            after,
          },
          null,
          2,
        ),
      );
      // Stop only after many consecutive no-publish loops
      const stallCount = Number(process.env.SL_OVERNIGHT_STALL_COUNT || "0") + 1;
      process.env.SL_OVERNIGHT_STALL_COUNT = String(stallCount);
      if (stallCount >= 5) {
        console.log(JSON.stringify({ phase: "stop_on_stall", stallCount, ...after }, null, 2));
        return;
      }
    } else {
      process.env.SL_OVERNIGHT_STALL_COUNT = "0";
    }
  }

  console.log(JSON.stringify({ phase: "max_loops", ...(await snapshot()) }, null, 2));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
