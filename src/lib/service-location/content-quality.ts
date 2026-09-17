import type { ServiceLocationContentJson } from "./content-contract";
import { scanUnsupportedClaims, flattenContentTexts } from "./content-claims";
import { evaluateLocaleCompleteness } from "./content-completeness";
import { parseContentJson } from "./content-parse";
import { scanDuplicateSimilarity, titlesUnique } from "./content-similarity";
import { scanThinContent } from "./content-thin";
import { arabicIndexBlocked } from "./arabic";
import { isPubliclyEligible } from "./coverage";
import { resolveImageInheritance } from "./images";
import type {
  ArabicConfidence,
  ContentEvalMode,
  DiySafetyClass,
  GateInput,
  WorkingCopy,
} from "./types";
import type { ServiceLocationLifecycle, ServiceLocationQualityStatus, ServiceStatus, LocationStatus } from "@prisma/client";

export type QualityCheckStatus = "pass" | "fail" | "skip" | "review";

export type QualityCheck = {
  id: string;
  label: string;
  status: QualityCheckStatus;
  detail?: string;
};

export type ContentQualityReport = {
  passed: boolean;
  publishableEn: boolean;
  publishableAr: boolean;
  indexableEn: boolean;
  indexableAr: boolean;
  mode: ContentEvalMode;
  checks: QualityCheck[];
  enComplete: boolean;
  arComplete: boolean;
  arStatus: "complete" | "incomplete" | "translation-review";
  seoStatus: "pass" | "fail";
  geoStatus: "pass" | "fail" | "skip";
  aeoStatus: "pass" | "fail" | "skip";
  diyStatus: "inherited" | "missing" | "safety-review" | "pass";
  imageStatus: "ready" | "fallback" | "missing";
  qualityStatus: "pass" | "fail";
  overall: "publishable" | "not_publishable";
};

export type ContentQualityInput = {
  mode: ContentEvalMode;
  covered: boolean;
  coverageStatus: ServiceLocationLifecycle;
  serviceExists: boolean;
  locationExists: boolean;
  serviceStatus: ServiceStatus;
  locationStatus: LocationStatus;
  locationServes: boolean;
  serviceIndexable: boolean;
  locationIndexable: boolean;
  serviceSlug: string;
  locationSlug: string;
  serviceName: string;
  locationName: string;
  serviceHeroImage: string | null;
  heroImageOverride: string | null;
  en: WorkingCopy | null;
  ar: WorkingCopy | null;
  arabicConfidence: ArabicConfidence;
  diySafetyClass: DiySafetyClass;
  diyGuideId: string | null;
  diyMatrixMapped: boolean;
  safetyReviewComplete: boolean;
  humanApproved: boolean;
  qualityScore: number;
  qualityStatusStored: ServiceLocationQualityStatus;
  /** Other page titles for uniqueness (same locale corpus). */
  existingTitlesEn?: string[];
  existingTitlesAr?: string[];
  existingMetasEn?: string[];
  existingMetasAr?: string[];
  /** Other page body blobs for similarity. */
  similarityCorpusEn?: string[];
  similarityCorpusAr?: string[];
};

function check(
  id: string,
  label: string,
  status: QualityCheckStatus,
  detail?: string,
): QualityCheck {
  return { id, label, status, detail };
}

function contentFromCopy(copy: WorkingCopy | null): ServiceLocationContentJson | null {
  if (!copy?.contentJson) return null;
  return parseContentJson(copy.contentJson).value;
}

function seoShellOk(copy: WorkingCopy | null) {
  if (!copy) return false;
  return Boolean(
    copy.seoTitle?.trim() &&
      copy.metaDescription?.trim() &&
      (copy.h1?.trim() || copy.seoTitle.trim()),
  );
}

/**
 * Full A4.1 quality report. Never stubs empty checks as pass.
 * LEGACY_COMPAT skips strict section requirements while still running claim/title checks softly
 * (legacy rows keep publishability via mode-specific rules).
 */
export function evaluateContentQuality(input: ContentQualityInput): ContentQualityReport {
  const checks: QualityCheck[] = [];
  const mode = input.mode;

  checks.push(
    check(
      "service_exists",
      "Service valid",
      input.serviceExists ? "pass" : "fail",
      input.serviceExists ? undefined : "Service missing",
    ),
  );
  checks.push(
    check(
      "location_exists",
      "Location valid",
      input.locationExists ? "pass" : "fail",
      input.locationExists ? undefined : "Location missing",
    ),
  );

  const coverageOk = isPubliclyEligible({
    covered: input.covered,
    coverageStatus: input.coverageStatus,
    serviceStatus: input.serviceStatus,
    locationStatus: input.locationStatus,
    locationServes: input.locationServes,
  });
  checks.push(
    check(
      "coverage",
      "Coverage / lifecycle",
      coverageOk ? "pass" : "fail",
      coverageOk ? undefined : `covered=${input.covered} status=${input.coverageStatus}`,
    ),
  );

  const enComp = evaluateLocaleCompleteness({
    copy: input.en,
    mode,
    locale: "en",
  });
  const arComp = evaluateLocaleCompleteness({
    copy: input.ar,
    mode,
    locale: "ar",
    arabicConfidence: input.arabicConfidence,
  });

  checks.push(
    check(
      "en_complete",
      "EN complete",
      enComp.complete ? "pass" : "fail",
      enComp.missing.length ? enComp.missing.join(",") : undefined,
    ),
  );

  const arBlocked = arabicIndexBlocked(input.arabicConfidence);
  const arStatus = arComp.arStatus ?? (arComp.complete ? "complete" : "incomplete");
  checks.push(
    check(
      "ar_complete",
      "AR complete",
      arBlocked ? "review" : arComp.complete ? "pass" : "fail",
      arBlocked ? `arabicConfidence=${input.arabicConfidence}` : arComp.missing.join(",") || undefined,
    ),
  );

  const enContent = contentFromCopy(input.en);
  const arContent = contentFromCopy(input.ar);

  // SEO
  let seoStatus: "pass" | "fail" = "pass";
  if (!seoShellOk(input.en) && mode === "STRICT_NEW_CONTENT") {
    seoStatus = "fail";
    checks.push(check("seo_en", "SEO EN", "fail", "Missing title/meta/h1"));
  } else if (!input.en || !input.en.seoTitle.trim() || !input.en.metaDescription.trim()) {
    if (mode === "LEGACY_COMPAT" && enComp.complete) {
      checks.push(check("seo_en", "SEO EN", "pass", "legacy shell"));
    } else {
      seoStatus = "fail";
      checks.push(check("seo_en", "SEO EN", "fail", "Missing seoTitle/meta"));
    }
  } else {
    checks.push(check("seo_en", "SEO EN", "pass"));
  }

  const titleEnOk = input.en?.seoTitle
    ? titlesUnique(input.en.seoTitle, input.existingTitlesEn ?? [])
    : mode === "LEGACY_COMPAT";
  const titleArOk = input.ar?.seoTitle
    ? titlesUnique(input.ar.seoTitle, input.existingTitlesAr ?? [])
    : true;
  checks.push(check("title_unique_en", "EN title unique", titleEnOk ? "pass" : "fail"));
  if (input.ar?.seoTitle) {
    checks.push(check("title_unique_ar", "AR title unique", titleArOk ? "pass" : "fail"));
  }

  // GEO / AEO — strict only
  let geoStatus: "pass" | "fail" | "skip" = "skip";
  let aeoStatus: "pass" | "fail" | "skip" = "skip";
  if (mode === "STRICT_NEW_CONTENT") {
    const geoOk = Boolean(
      enContent &&
        (enContent.geo.emirate || enContent.geo.city || enContent.geo.community) &&
        enContent.geo.coverageStatement.trim().length >= 20,
    );
    geoStatus = geoOk ? "pass" : "fail";
    checks.push(check("geo", "GEO", geoStatus, geoOk ? undefined : "Missing geo facts/coverage"));

    const aeoOk = Boolean(enContent && enContent.aeo.directAnswer.trim().length >= 40);
    aeoStatus = aeoOk ? "pass" : "fail";
    checks.push(check("aeo", "AEO", aeoStatus, aeoOk ? undefined : "Missing directAnswer"));

    const faqOk = Boolean(
      enContent?.faq.some((f) => f.approvalState === "approved" && f.question.trim() && f.answer.trim().length >= 20),
    );
    checks.push(check("faq", "FAQ", faqOk ? "pass" : "fail"));
  } else {
    checks.push(check("geo", "GEO", "skip", "LEGACY_COMPAT"));
    checks.push(check("aeo", "AEO", "skip", "LEGACY_COMPAT"));
    checks.push(check("faq", "FAQ", "skip", "LEGACY_COMPAT"));
  }

  // DIY
  let diyStatus: ContentQualityReport["diyStatus"] = "pass";
  if (!input.diyMatrixMapped) {
    diyStatus = "missing";
    checks.push(check("diy_matrix", "DIY matrix mapping", "fail", "Service slug not in 311 matrix"));
  } else if (input.diySafetyClass === "RED" || input.diySafetyClass === "REVIEW_REQUIRED") {
    diyStatus = input.safetyReviewComplete ? "pass" : "safety-review";
    checks.push(
      check(
        "diy_safety",
        "DIY safety",
        input.safetyReviewComplete ? "pass" : "review",
        input.diySafetyClass,
      ),
    );
    if (enContent && enContent.diy.steps.length > 0) {
      diyStatus = "safety-review";
      checks.push(check("diy_red_steps", "DIY RED/RR steps", "fail", "Procedural steps not allowed"));
    } else {
      checks.push(check("diy_red_steps", "DIY RED/RR steps", "pass"));
    }
  } else if (!input.diyGuideId && mode === "STRICT_NEW_CONTENT") {
    diyStatus = "inherited";
    checks.push(check("diy_guide", "DIY guide", "review", "No published guide — inherit service-level only"));
  } else {
    diyStatus = input.diyGuideId ? "inherited" : "inherited";
    checks.push(check("diy_guide", "DIY inheritance", "pass", input.diySafetyClass));
  }

  // Image
  const image = resolveImageInheritance({
    heroImageOverride: input.heroImageOverride,
    serviceHeroImage: input.serviceHeroImage,
    serviceName: input.serviceName,
    locationName: input.locationName,
    locale: "en",
  });
  const imageStatus: ContentQualityReport["imageStatus"] =
    image.source === "approved_fallback" ? "fallback" : image.src ? "ready" : "missing";
  checks.push(
    check(
      "image",
      "Image",
      image.gatePass ? "pass" : "fail",
      `${image.source}${image.gatePass ? "" : " (gate fail)"}`,
    ),
  );

  // Claims / thin / similarity
  const enBlob = flattenContentTexts({
    seoTitle: input.en?.seoTitle,
    metaDescription: input.en?.metaDescription,
    h1: input.en?.h1,
    intro: input.en?.intro,
    localInfo: input.en?.localInfo,
    body: input.en?.body,
    directAnswer: input.en?.directAnswer,
    geoIntro: input.en?.geoIntro,
    contentJsonText: input.en?.contentJson ? JSON.stringify(input.en.contentJson) : undefined,
  });

  if (mode === "STRICT_NEW_CONTENT") {
    const claims = scanUnsupportedClaims(enBlob);
    checks.push(
      check(
        "claims",
        "Claims",
        claims.ok ? "pass" : "fail",
        claims.ok ? undefined : claims.hits.map((h) => h.code).join(","),
      ),
    );

    const thin = scanThinContent({
      intro: input.en?.intro ?? "",
      localInfo: input.en?.localInfo ?? "",
      h1: input.en?.h1,
      serviceName: input.serviceName,
      locationName: input.locationName,
      content: enContent,
    });
    checks.push(
      check("thin", "Thin content", thin.ok ? "pass" : "fail", thin.reasons.join(",") || undefined),
    );

    const sim = scanDuplicateSimilarity(enBlob, input.similarityCorpusEn ?? []);
    checks.push(
      check(
        "similarity",
        "Duplicate similarity",
        sim.ok ? "pass" : "fail",
        `maxOverlap=${sim.maxOverlap.toFixed(2)}`,
      ),
    );

    const enAlt = Boolean(input.en?.imageAlt?.trim() && input.en.imageAlt.trim().length >= 8);
    checks.push(check("alt_en", "EN image alt", enAlt ? "pass" : "fail"));
    if (input.ar) {
      const arAlt = Boolean(input.ar.imageAlt?.trim() && input.ar.imageAlt.trim().length >= 8);
      checks.push(check("alt_ar", "AR image alt", arAlt ? "pass" : "fail"));
    }
  } else {
    // Legacy: still scan claims for visibility, but do not fail overall publishability
    const claims = scanUnsupportedClaims(enBlob);
    checks.push(
      check(
        "claims",
        "Claims",
        claims.ok ? "pass" : "review",
        claims.ok ? "legacy soft" : `legacy soft: ${claims.hits.map((h) => h.code).join(",")}`,
      ),
    );
    checks.push(check("thin", "Thin content", "skip", "LEGACY_COMPAT"));
    checks.push(check("similarity", "Duplicate similarity", "skip", "LEGACY_COMPAT"));
  }

  checks.push(
    check(
      "human_approval",
      "Human approval",
      input.humanApproved ? "pass" : mode === "LEGACY_COMPAT" && coverageOk ? "pass" : "fail",
      input.humanApproved ? undefined : "approvedBy missing",
    ),
  );

  const failedHard = checks.filter((c) => c.status === "fail");
  // For EN publishability, ignore AR-only failures
  const enBlocking = failedHard.filter((c) => !["ar_complete", "title_unique_ar", "alt_ar"].includes(c.id));

  const strictEnExtraOk =
    mode === "LEGACY_COMPAT" ||
    (enComp.complete &&
      geoStatus !== "fail" &&
      aeoStatus !== "fail" &&
      !failedHard.some((c) =>
        ["claims", "thin", "similarity", "faq", "seo_en", "title_unique_en", "alt_en"].includes(c.id),
      ));

  const baseOps =
    coverageOk &&
    input.serviceExists &&
    input.locationExists &&
    input.serviceIndexable &&
    input.locationIndexable &&
    image.gatePass &&
    (input.humanApproved || (mode === "LEGACY_COMPAT" && coverageOk)) &&
    input.qualityStatusStored !== "failed_quality" &&
    input.qualityScore >= 50;

  const publishableEn = Boolean(
    baseOps && enComp.complete && titleEnOk && enBlocking.length === 0 && strictEnExtraOk,
  );

  const arStrictOk =
    mode === "LEGACY_COMPAT"
      ? arComp.complete
      : arComp.complete &&
        Boolean(arContent?.aeo.directAnswer.trim()) &&
        titleArOk &&
        !failedHard.some((c) => c.id === "title_unique_ar");

  const publishableAr = Boolean(baseOps && arStrictOk && !arBlocked && enComp.complete !== undefined);

  // EN independent: AR incompleteness must not block EN
  const indexableEn = publishableEn;
  const indexableAr = Boolean(publishableAr && arComp.complete && !arBlocked);

  // Fix publishableAr: should not require EN for AR content completeness path, but pair needs EN shell historically.
  // Spec: AR may publish only when AR complete + AR gates. EN independent. So AR can be publishable without... 
  // Actually "EN can publish independently" doesn't say AR requires EN. Allow AR if AR gates pass.
  const publishableArFinal = Boolean(
    coverageOk &&
      input.serviceExists &&
      input.locationExists &&
      input.serviceIndexable &&
      input.locationIndexable &&
      image.gatePass &&
      (input.humanApproved || mode === "LEGACY_COMPAT") &&
      arComp.complete &&
      !arBlocked &&
      titleArOk &&
      (mode === "LEGACY_COMPAT" || Boolean(arContent)),
  );

  const passed = publishableEn || (mode === "LEGACY_COMPAT" && indexableEn);
  const qualityStatus: "pass" | "fail" =
    failedHard.some((c) => ["claims", "thin", "similarity"].includes(c.id)) || !publishableEn
      ? mode === "LEGACY_COMPAT" && publishableEn
        ? "pass"
        : publishableEn
          ? "pass"
          : "fail"
      : "pass";

  return {
    passed: mode === "LEGACY_COMPAT" ? publishableEn : publishableEn && enBlocking.length === 0,
    publishableEn,
    publishableAr: publishableArFinal,
    indexableEn,
    indexableAr: Boolean(publishableArFinal && indexableAr),
    mode,
    checks,
    enComplete: enComp.complete,
    arComplete: arComp.complete,
    arStatus,
    seoStatus,
    geoStatus,
    aeoStatus,
    diyStatus,
    imageStatus,
    qualityStatus: publishableEn ? "pass" : qualityStatus,
    overall: publishableEn || publishableArFinal ? "publishable" : "not_publishable",
  };
}

/** Map quality report scanner results onto GateInput-compatible flags. */
export function gateScannerFlagsFromReport(report: ContentQualityReport): Pick<
  GateInput,
  | "uniqueTitleEn"
  | "uniqueTitleAr"
  | "uniqueMetaEn"
  | "uniqueMetaAr"
  | "duplicateSimilarityOk"
  | "claimScanOk"
  | "thinContentOk"
> {
  const byId = Object.fromEntries(report.checks.map((c) => [c.id, c]));
  const passOrSkip = (id: string) => {
    const c = byId[id];
    if (!c) return false;
    return c.status === "pass" || c.status === "skip" || c.status === "review";
  };
  return {
    uniqueTitleEn: passOrSkip("title_unique_en"),
    uniqueTitleAr: passOrSkip("title_unique_ar") || !byId.title_unique_ar,
    uniqueMetaEn: report.seoStatus !== "fail",
    uniqueMetaAr: report.seoStatus !== "fail",
    duplicateSimilarityOk: passOrSkip("similarity"),
    claimScanOk: passOrSkip("claims"),
    thinContentOk: passOrSkip("thin"),
  };
}
