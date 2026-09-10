/**
 * End-to-end dry pipeline for Phase 1 tests (no DB writes, no AI, no publish).
 */
import { sampleManifestRecords } from "../manifests/builder";
import { generateContentStub } from "../generators/stub";
import { runValidationPipeline } from "../validators/pipeline";
import { enqueueReview } from "./review-queue";
import { enqueuePublication } from "./publication-queue";
import { audit } from "./audit";
import { makeBatchKey, makeIdempotencyKey, emptyCheckpoint } from "./batch";
import { CONTENT_ENGINE_VERSION } from "../config/engine.config";
import type { ValidationResult } from "../config/types";

export type DryRunReport = {
  n: number;
  batchKey: string;
  generationSkipped: number;
  validated: number;
  reviewQueued: number;
  publicationQueued: number;
  blockers: number;
  checkpoint: ReturnType<typeof emptyCheckpoint>;
  sampleValidation?: ValidationResult;
};

/** Build a synthetic draft that intentionally fails most gates (dry validate path). */
function syntheticDraft(slug: string) {
  return {
    bodyEn: `Short draft for ${slug}.`,
    bodyAr: `مسودة قصيرة لـ ${slug}.`,
    titleEn: `Test ${slug}`,
    titleAr: `اختبار ${slug}`,
  };
}

export async function runDryBatch(n: 1 | 10 | 100): Promise<DryRunReport> {
  const records = sampleManifestRecords(n);
  const batchKey = makeBatchKey(CONTENT_ENGINE_VERSION, n, 1);
  const checkpoint = emptyCheckpoint(batchKey);
  let generationSkipped = 0;
  let validated = 0;
  let reviewQueued = 0;
  let publicationQueued = 0;
  let blockers = 0;
  let sampleValidation: ValidationResult | undefined;

  audit("dry_batch_start", { detail: batchKey });

  for (const manifest of records) {
    const idem = makeIdempotencyKey({
      contentKey: manifest.contentKey,
      locale: manifest.locale,
      generationVersion: CONTENT_ENGINE_VERSION,
      kind: "engine_validate",
    });
    const gen = await generateContentStub({
      manifest,
      generationVersion: CONTENT_ENGINE_VERSION,
      attempt: 1,
    });
    if (gen.skipped) generationSkipped++;

    const draft = syntheticDraft(manifest.articleSlug || manifest.contentKey);
    const validation = runValidationPipeline({
      ...draft,
      safety: {
        safetyClass: "GREEN",
        intendsPublic: false,
        contentType: "BLOG",
      },
      aeo: { hasDirectAnswer: false, faqCount: 0, hasNextSteps: false },
      seo: {},
      image: {},
      humanApproved: false,
      diySelfHelpRequired: false,
    });

    validated++;
    checkpoint.processed++;
    if (!validation.passed) {
      blockers++;
      checkpoint.failed++;
      enqueueReview({ contentKey: manifest.contentKey, lifecycle: validation.lifecycle, validation });
      reviewQueued++;
    } else {
      checkpoint.succeeded++;
      const pub = enqueuePublication({
        contentKey: manifest.contentKey,
        validation,
        humanApproved: false,
      });
      if (pub.ok) publicationQueued++;
    }
    sampleValidation = validation;
    checkpoint.lastContentKey = manifest.contentKey;
    checkpoint.updatedAt = new Date().toISOString();
    audit("dry_item", { contentKey: manifest.contentKey, detail: idem, issues: validation.issues.slice(0, 5) });
  }

  audit("dry_batch_end", { detail: batchKey });
  return {
    n,
    batchKey,
    generationSkipped,
    validated,
    reviewQueued,
    publicationQueued,
    blockers,
    checkpoint,
    sampleValidation,
  };
}
