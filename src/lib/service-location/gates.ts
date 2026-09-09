import type { ServiceLocationQualityStatus } from "@prisma/client";
import { isPubliclyEligible } from "./coverage";
import { arabicIndexBlocked } from "./arabic";
import { resolveImageInheritance } from "./images";
import { evaluateLocaleCompleteness, legacyShellComplete } from "./content-completeness";
import type { ContentEvalMode, GateFailure, GateInput, GateResult, WorkingCopy } from "./types";

const QUALITY_PASS_MIN = 50;

function push(failures: GateFailure[], code: string, message: string) {
  failures.push({ code, message });
}

/** Back-compat export used by A3.x verifies — legacy shell rules. */
export function localeContentComplete(copy: WorkingCopy | null) {
  return legacyShellComplete(copy);
}

export function evaluateServiceLocationGates(input: GateInput): GateResult {
  const failures: GateFailure[] = [];
  const mode: ContentEvalMode = input.contentMode ?? "LEGACY_COMPAT";
  const eligible = isPubliclyEligible(input);

  if (!input.covered) push(failures, "not_covered", "Coverage is not marked covered");
  if (input.coverageStatus === "draft") push(failures, "lifecycle_draft", "Lifecycle is draft");
  if (input.coverageStatus === "review") push(failures, "lifecycle_review", "Lifecycle is review");
  if (input.coverageStatus === "archived") push(failures, "lifecycle_archived", "Lifecycle is archived");
  if (input.coverageStatus !== "published") push(failures, "not_published", "Coverage is not published");
  if (input.serviceStatus !== "active") push(failures, "service_inactive", "Service is not active");
  if (!input.serviceIndexable) push(failures, "service_not_indexable", "Service is not indexable");
  if (input.locationStatus !== "active") push(failures, "location_inactive", "Location is not active");
  if (!input.locationServes) push(failures, "location_unserved", "Location does not serve");
  if (!input.locationIndexable) push(failures, "location_not_indexable", "Location is not indexable");

  const enComp = evaluateLocaleCompleteness({ copy: input.en, mode, locale: "en" });
  const arComp = evaluateLocaleCompleteness({
    copy: input.ar,
    mode,
    locale: "ar",
    arabicConfidence: input.arabicConfidence,
  });

  if (!enComp.complete) push(failures, "en_incomplete", `English incomplete: ${enComp.missing.join(",") || "shell"}`);
  // AR incompleteness is recorded but must NOT block EN indexing/publishability
  if (!arComp.complete) push(failures, "ar_incomplete", `Arabic incomplete: ${arComp.missing.join(",") || "shell"}`);

  if (!input.safetyReviewComplete && (input.diySafetyClass === "RED" || input.diySafetyClass === "REVIEW_REQUIRED")) {
    push(failures, "safety_review", "Safety review is required for this DIY class");
  }

  const image = resolveImageInheritance({
    heroImageOverride: input.heroImageOverride,
    serviceHeroImage: input.serviceHeroImage,
    serviceName: input.serviceSlug,
    locationName: input.locationSlug,
    locale: "en",
  });
  if (!image.gatePass) push(failures, "image_missing", "No approved image or fallback");

  if (!input.uniqueTitleEn) push(failures, "title_dupe_en", "English title is not unique");
  if (!input.uniqueTitleAr) push(failures, "title_dupe_ar", "Arabic title is not unique");
  if (!input.uniqueMetaEn) push(failures, "meta_dupe_en", "English meta is not unique");
  if (!input.uniqueMetaAr) push(failures, "meta_dupe_ar", "Arabic meta is not unique");
  if (!input.duplicateSimilarityOk) push(failures, "similarity", "Duplicate similarity check failed");
  if (!input.claimScanOk) push(failures, "claims", "Unsupported claims detected");
  if (!input.thinContentOk) push(failures, "thin_content", "Thin or doorway content signal");
  if (!input.humanApproved) push(failures, "human_approval", "Human approval is missing");
  if (input.qualityStatus === "failed_quality" || input.qualityScore < QUALITY_PASS_MIN) {
    push(failures, "quality_failed", "Quality status/score failed");
  }

  const qualityBlocking = failures.some((f) =>
    ["quality_failed", "claims", "thin_content", "similarity"].includes(f.code),
  );
  // EN incomplete affects quality demotion; AR incomplete does not demote EN-capable pairs alone
  const incomplete = failures.some((f) => f.code === "en_incomplete");
  const demoted =
    failures.some((f) =>
      ["service_inactive", "location_inactive", "location_unserved", "not_covered", "lifecycle_archived"].includes(
        f.code,
      ),
    ) || qualityBlocking;

  let qualityStatus: ServiceLocationQualityStatus = input.qualityStatus;
  if (qualityBlocking) qualityStatus = "failed_quality";
  else if (incomplete) qualityStatus = "incomplete";
  else if (!eligible) qualityStatus = input.coverageStatus === "review" ? "ready_for_review" : input.qualityStatus;

  const indexBase =
    eligible &&
    !qualityBlocking &&
    input.humanApproved &&
    enComp.complete &&
    image.gatePass &&
    input.claimScanOk &&
    input.thinContentOk &&
    input.duplicateSimilarityOk &&
    input.qualityStatus !== "failed_quality" &&
    input.qualityScore >= QUALITY_PASS_MIN;

  // EN independent of AR readiness
  const indexableEn = Boolean(indexBase && input.uniqueTitleEn && input.uniqueMetaEn && enComp.complete);

  const arArabicOk = !arabicIndexBlocked(input.arabicConfidence);
  const indexableAr = Boolean(
    indexBase &&
      arArabicOk &&
      arComp.complete &&
      input.uniqueTitleAr &&
      input.uniqueMetaAr,
  );

  if (!arArabicOk) push(failures, "ar_review_required", "Arabic REVIEW_REQUIRED blocks AR indexing");

  if (demoted) {
    return {
      eligible: false,
      coveredOps: input.covered && (input.coverageStatus === "approved" || input.coverageStatus === "published"),
      qualityStatus: qualityBlocking ? "failed_quality" : qualityStatus,
      failures,
      indexableEn: false,
      indexableAr: false,
      pairIndexable: false,
    };
  }

  return {
    eligible,
    coveredOps: input.covered && (input.coverageStatus === "approved" || input.coverageStatus === "published"),
    qualityStatus,
    failures,
    indexableEn,
    indexableAr,
    pairIndexable: indexableEn,
  };
}

export function localeShouldIndex(result: GateResult, locale: string) {
  if (locale === "ar") return result.indexableAr;
  return result.indexableEn;
}
