/**
 * Controlled publication eligibility — covered ≠ catalog.
 * Never invents coverage. Never auto-publishes.
 * Aligns with docs/public-article-publication-gates.md (SL floor 800).
 */
import type { ServiceLocationLifecycle, ServiceLocationQualityStatus } from "@prisma/client";
import { arabicIndexBlocked } from "./arabic";
import { scanUnsupportedClaims } from "./content-claims";
import { isPublishedHeroPath } from "./images";
import { RENDERED_WORD_MIN_PUBLISH } from "./rendered-words";
import type { ArabicConfidence, DiySafetyClass, WorkingCopy } from "./types";

export type PublicationQueueBucket =
  | "READY_FOR_PUBLISH"
  | "REVIEW_REQUIRED"
  | "COVERAGE_MISSING"
  | "EN_MISSING"
  | "AR_MISSING"
  | "IMAGE_MISSING"
  | "ALT_MISSING"
  | "SEO_FAILED"
  | "GEO_FAILED"
  | "AEO_FAILED"
  | "DIY_BLOCKED"
  | "QUALITY_FAILED"
  | "WORD_COUNT_BELOW_MIN"
  | "IMAGE_EXTERNAL_SETUP_REQUIRED"
  | "ALREADY_PUBLISHED"
  | "NOT_ELIGIBLE";

export type PublicationEligibilityInput = {
  serviceValid: boolean;
  locationValid: boolean;
  serviceActive: boolean;
  locationActive: boolean;
  locationServes: boolean;
  covered: boolean;
  coverageStatus: ServiceLocationLifecycle;
  qualityStatus: ServiceLocationQualityStatus;
  qualityScore: number;
  indexable: boolean;
  indexableEn: boolean;
  indexableAr: boolean;
  diySafetyClass: DiySafetyClass;
  diySafetyOk: boolean;
  arabicConfidence: ArabicConfidence;
  en: WorkingCopy | null;
  ar: WorkingCopy | null;
  heroImageOverride: string | null;
  serviceHeroImage: string | null;
  objectStorageConfigured: boolean;
  /** When true, approved_fallback satisfies image gate. */
  allowApprovedImageFallback: boolean;
  /** Optional rendered word counts — blocks READY/INDEXABLE when below 800. */
  enRenderedWords?: number | null;
  arRenderedWords?: number | null;
  /** Prefer WebP for newly controlled publishes (default false for legacy rows). */
  requireWebp?: boolean;
};

export type PublicationEligibilityResult = {
  eligibleEn: boolean;
  eligibleAr: boolean;
  canPromoteLifecycle: boolean;
  canPublish: boolean;
  canIndexEn: boolean;
  canIndexAr: boolean;
  blockReasons: PublicationQueueBucket[];
  primaryBucket: PublicationQueueBucket;
  checks: Record<string, boolean>;
};

function shellOk(copy: WorkingCopy | null) {
  if (!copy) return false;
  return Boolean(
    copy.h1?.trim() &&
      copy.intro?.trim() &&
      copy.seoTitle?.trim() &&
      copy.metaDescription?.trim() &&
      copy.directAnswer?.trim() &&
      copy.geoIntro?.trim(),
  );
}

function altOk(copy: WorkingCopy | null) {
  return Boolean(copy?.imageAlt?.trim() && copy.imageAlt.trim().length >= 8);
}

function isWebpPath(src: string | null | undefined) {
  if (!src) return false;
  return /\.webp($|\?)/i.test(src.trim());
}

export function evaluatePublicationEligibility(
  input: PublicationEligibilityInput,
): PublicationEligibilityResult {
  const blocks: PublicationQueueBucket[] = [];
  const enOk = shellOk(input.en);
  const arOk = shellOk(input.ar);
  const seoOk = Boolean(input.en?.seoTitle?.trim() && input.en?.metaDescription?.trim() && input.en?.h1?.trim());
  const geoOk = Boolean(input.en?.geoIntro?.trim());
  const aeoOk = Boolean(input.en?.directAnswer?.trim());
  const arSeoOk = Boolean(input.ar?.seoTitle?.trim() && input.ar?.metaDescription?.trim() && input.ar?.h1?.trim());
  const arGeoOk = Boolean(input.ar?.geoIntro?.trim());
  const arAeoOk = Boolean(input.ar?.directAnswer?.trim());
  const enAltOk = altOk(input.en);
  const arAltOk = !arOk || altOk(input.ar);
  // SL pages always render Get a Quote chrome in ServiceLocationView.
  const ctaOk = true;

  const imageReal =
    isPublishedHeroPath(input.heroImageOverride) || isPublishedHeroPath(input.serviceHeroImage);
  const imageOk = imageReal || input.allowApprovedImageFallback;
  const webpOk =
    !input.requireWebp ||
    isWebpPath(input.heroImageOverride) ||
    isWebpPath(input.serviceHeroImage) ||
    input.allowApprovedImageFallback;
  if (!imageReal && !input.objectStorageConfigured && !input.allowApprovedImageFallback) {
    blocks.push("IMAGE_EXTERNAL_SETUP_REQUIRED");
  }

  if (!input.serviceValid || !input.serviceActive) blocks.push("NOT_ELIGIBLE");
  if (!input.locationValid || !input.locationActive || !input.locationServes) blocks.push("NOT_ELIGIBLE");
  if (!input.covered) blocks.push("COVERAGE_MISSING");
  if (!enOk) blocks.push("EN_MISSING");
  if (!seoOk) blocks.push("SEO_FAILED");
  if (!geoOk) blocks.push("GEO_FAILED");
  if (!aeoOk) blocks.push("AEO_FAILED");
  if (!input.diySafetyOk) blocks.push("DIY_BLOCKED");
  if (input.qualityStatus === "failed_quality" || input.qualityScore < 50) blocks.push("QUALITY_FAILED");
  if (input.qualityStatus === "ready_for_review" || input.qualityStatus === "incomplete") {
    blocks.push("REVIEW_REQUIRED");
  }
  if (!imageOk || !webpOk) blocks.push("IMAGE_MISSING");
  if (enOk && !enAltOk) blocks.push("ALT_MISSING");
  if (arOk && !arAltOk) blocks.push("ALT_MISSING");
  if (!arOk) blocks.push("AR_MISSING");

  const claimText = [
    input.en?.seoTitle,
    input.en?.metaDescription,
    input.en?.intro,
    input.en?.h1,
    input.en?.body,
    input.en?.directAnswer,
    input.en?.geoIntro,
    input.ar?.seoTitle,
    input.ar?.metaDescription,
    input.ar?.intro,
    input.ar?.h1,
    input.ar?.body,
    input.ar?.directAnswer,
    input.ar?.geoIntro,
  ]
    .filter(Boolean)
    .join("\n");
  const claimsOk = scanUnsupportedClaims(claimText).ok;
  if (!claimsOk) blocks.push("QUALITY_FAILED");

  const enWordsOk = input.enRenderedWords == null || input.enRenderedWords >= RENDERED_WORD_MIN_PUBLISH;
  const arWordsOk = !arOk || input.arRenderedWords == null || input.arRenderedWords >= RENDERED_WORD_MIN_PUBLISH;
  if (input.enRenderedWords != null && input.enRenderedWords < RENDERED_WORD_MIN_PUBLISH) {
    blocks.push("WORD_COUNT_BELOW_MIN");
  }
  if (arOk && input.arRenderedWords != null && input.arRenderedWords < RENDERED_WORD_MIN_PUBLISH) {
    blocks.push("WORD_COUNT_BELOW_MIN");
  }

  const qualityPublishable =
    input.qualityStatus === "publishable" ||
    input.qualityStatus === "approved" ||
    input.qualityStatus === "indexable";

  if (
    input.covered &&
    enOk &&
    seoOk &&
    geoOk &&
    aeoOk &&
    input.diySafetyOk &&
    imageOk &&
    webpOk &&
    enAltOk &&
    qualityPublishable &&
    enWordsOk &&
    arWordsOk &&
    claimsOk &&
    ctaOk
  ) {
    if (!blocks.includes("READY_FOR_PUBLISH")) blocks.unshift("READY_FOR_PUBLISH");
  }

  if (input.coverageStatus === "published" && input.indexable) {
    return {
      eligibleEn: true,
      eligibleAr: Boolean(arOk && arSeoOk && arGeoOk && arAeoOk && !arabicIndexBlocked(input.arabicConfidence)),
      canPromoteLifecycle: false,
      canPublish: false,
      canIndexEn: input.indexableEn,
      canIndexAr: input.indexableAr,
      blockReasons: ["ALREADY_PUBLISHED"],
      primaryBucket: "ALREADY_PUBLISHED",
      checks: {
        serviceValid: input.serviceValid,
        locationValid: input.locationValid,
        covered: input.covered,
        enOk,
        arOk,
        seoOk,
        geoOk,
        aeoOk,
        diyOk: input.diySafetyOk,
        imageOk,
        webpOk,
        enAltOk,
        arAltOk,
        ctaOk,
        claimsOk,
        enWordsOk,
        arWordsOk,
        qualityPublishable,
      },
    };
  }

  const uniqueBlocks = [...new Set(blocks)];
  const ready =
    uniqueBlocks.includes("READY_FOR_PUBLISH") &&
    !uniqueBlocks.some((b) =>
      [
        "COVERAGE_MISSING",
        "EN_MISSING",
        "SEO_FAILED",
        "GEO_FAILED",
        "AEO_FAILED",
        "DIY_BLOCKED",
        "QUALITY_FAILED",
        "IMAGE_MISSING",
        "ALT_MISSING",
        "IMAGE_EXTERNAL_SETUP_REQUIRED",
        "REVIEW_REQUIRED",
        "WORD_COUNT_BELOW_MIN",
      ].includes(b),
    );

  const eligibleEn = ready;
  const eligibleAr = Boolean(
    eligibleEn &&
      arOk &&
      arSeoOk &&
      arGeoOk &&
      arAeoOk &&
      arAltOk &&
      !arabicIndexBlocked(input.arabicConfidence),
  );

  const lifecycleOk =
    input.coverageStatus === "draft" ||
    input.coverageStatus === "review" ||
    input.coverageStatus === "approved";

  const primaryBucket: PublicationQueueBucket = ready
    ? "READY_FOR_PUBLISH"
    : uniqueBlocks.find((b) => b !== "READY_FOR_PUBLISH") || "NOT_ELIGIBLE";

  return {
    eligibleEn,
    eligibleAr,
    canPromoteLifecycle: eligibleEn && lifecycleOk,
    canPublish: eligibleEn && (input.coverageStatus === "approved" || input.coverageStatus === "review"),
    canIndexEn: false, // only after controlled publish sets flags
    canIndexAr: false,
    blockReasons: uniqueBlocks.length ? uniqueBlocks : ["NOT_ELIGIBLE"],
    primaryBucket,
    checks: {
      serviceValid: input.serviceValid,
      locationValid: input.locationValid,
      covered: input.covered,
      enOk,
      arOk,
      seoOk,
      geoOk,
      aeoOk,
      diyOk: input.diySafetyOk,
      imageOk,
      webpOk,
      enAltOk,
      arAltOk,
      ctaOk,
      claimsOk,
      enWordsOk,
      arWordsOk,
      qualityPublishable,
    },
  };
}

export type CoverageDecision = "NOT_COVERED" | "COVERED" | "TEMPORARILY_CLOSED";

export function coverageDecisionFromRow(covered: boolean, temporarilyClosed: boolean): CoverageDecision {
  if (temporarilyClosed) return "TEMPORARILY_CLOSED";
  return covered ? "COVERED" : "NOT_COVERED";
}
