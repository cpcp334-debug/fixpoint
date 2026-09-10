/**
 * Content Engine Phase 1 — dry test harness (1 | 10 | 100).
 * Does NOT generate corpus, does NOT publish, does NOT mutate public pages.
 *
 * Usage: npx tsx content-engine/scripts/test-batch.ts 1
 *        npx tsx content-engine/scripts/test-batch.ts 10
 *        npx tsx content-engine/scripts/test-batch.ts 100
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { runDryBatch } from "../pipeline/dry-run";
import { clearReviewQueue, listReviewQueue } from "../pipeline/review-queue";
import { clearPublicationQueue } from "../pipeline/publication-queue";
import { clearAudit, listAudit } from "../pipeline/audit";
import { FREEZE } from "../config/freeze";
import { buildManifestSummary } from "../manifests/builder";
import { diyMappingStatus } from "../manifests/diy-311-mapping";
import { blogArchitectureStatus } from "../manifests/blog-architecture";
import { imagePipelineStatus } from "../images/status";

async function main() {
  const arg = Number(process.argv[2] || "1");
  if (![1, 10, 100].includes(arg)) {
    console.error("Usage: test-batch.ts <1|10|100>");
    process.exit(1);
  }
  clearReviewQueue();
  clearPublicationQueue();
  clearAudit();

  const report = await runDryBatch(arg as 1 | 10 | 100);
  const outDir = join(process.cwd(), "content-engine", "reports");
  mkdirSync(outDir, { recursive: true });
  const payload = {
    at: new Date().toISOString(),
    freeze: FREEZE,
    manifestSummary: buildManifestSummary(),
    diy311: diyMappingStatus(),
    blog: blogArchitectureStatus(),
    images: imagePipelineStatus(),
    dryRun: {
      ...report,
      sampleValidation: report.sampleValidation
        ? {
            passed: report.sampleValidation.passed,
            lifecycle: report.sampleValidation.lifecycle,
            wordCount: report.sampleValidation.wordCount,
            issueCodes: report.sampleValidation.issues.map((i) => i.code),
          }
        : null,
    },
    reviewQueueSize: listReviewQueue().length,
    auditEvents: listAudit().length,
    assertions: {
      noMassGeneration: report.generationSkipped === report.n,
      publicationQueuedZeroWithoutApproval: report.publicationQueued === 0,
      reviewReceivesFailures: report.blockers === report.reviewQueued,
    },
  };

  const file = join(outDir, `dry-batch-${arg}.json`);
  writeFileSync(file, JSON.stringify(payload, null, 2), "utf8");
  console.log(JSON.stringify({ ok: true, file, ...payload.assertions, dryRun: payload.dryRun }, null, 2));

  const assertOk =
    payload.assertions.noMassGeneration &&
    payload.assertions.publicationQueuedZeroWithoutApproval &&
    payload.assertions.reviewReceivesFailures;
  if (!assertOk) process.exit(2);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
