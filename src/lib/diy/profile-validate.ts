import {
  DIY_PROFILE_JSON_VERSION,
  emptyDiyProfile,
  normalizeProfileSteps,
  stepsToPlainText,
  type DiyGuideProfileJson,
  type DiyMatrixSafety,
  type DiyProfileLifecycleStatus,
  type DiyArabicReviewStatus,
} from "./profile-contract";
import { scanUnsupportedClaims } from "@/lib/service-location/content-claims";

export type ProfileValidationIssue = { code: string; message: string; path?: string };

export type ProfileValidationResult = {
  ok: boolean;
  value: DiyGuideProfileJson | null;
  issues: ProfileValidationIssue[];
  requiresHumanReview: boolean;
};

const UNSAFE_STEP =
  /\b(live\s+wir|energiz|hot\s+wire|strip\s+(the\s+)?insulation|open\s+the\s+(breaker\s+)?panel\s+cover|rewire|splice\s+mains|gas\s+valve\s+adjust|bleed\s+gas|smell\s+gas\s+and\s+continue|refrigerant|freon|r-?\d{2,3}|capacitor\s+discharge|magnetron|high[- ]voltage|mix\s+bleach\s+and\s+ammonia|confined\s+space\s+entry|climb\s+without\s+fall|structural\s+beam|cut\s+load[- ]bearing)\b/i;

function asString(v: unknown, fallback = "") {
  return typeof v === "string" ? v : fallback;
}
function asStringArray(v: unknown) {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
}
function filled(s: string, min = 12) {
  return s.replace(/\s+/g, " ").trim().length >= min;
}

function asSafety(v: unknown): DiyMatrixSafety {
  if (v === "GREEN" || v === "YELLOW" || v === "RED" || v === "REVIEW_REQUIRED") return v;
  return "REVIEW_REQUIRED";
}

function asStatus(v: unknown): DiyProfileLifecycleStatus {
  if (
    v === "draft" ||
    v === "safety_review" ||
    v === "translation_review" ||
    v === "approved" ||
    v === "published" ||
    v === "archived"
  )
    return v;
  return "draft";
}

function asArabic(v: unknown): DiyArabicReviewStatus {
  if (v === "not_started" || v === "translation_review" || v === "ready_for_translation" || v === "reviewed")
    return v;
  return "not_started";
}

export function parseDiyProfileJson(input: unknown): ProfileValidationResult {
  const issues: ProfileValidationIssue[] = [];
  if (input == null || input === "" || input === "{}") {
    return { ok: true, value: emptyDiyProfile({ matrixSafety: "REVIEW_REQUIRED" }), issues: [], requiresHumanReview: false };
  }
  let raw: unknown = input;
  if (typeof input === "string") {
    try {
      raw = JSON.parse(input);
    } catch {
      return {
        ok: false,
        value: null,
        issues: [{ code: "parse", message: "profileJson is not valid JSON" }],
        requiresHumanReview: true,
      };
    }
  }
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return {
      ok: false,
      value: null,
      issues: [{ code: "type", message: "profileJson must be an object" }],
      requiresHumanReview: true,
    };
  }
  const o = raw as Record<string, unknown>;
  if (o.version != null && o.version !== DIY_PROFILE_JSON_VERSION) {
    issues.push({ code: "version", message: `Unsupported profile version ${String(o.version)}`, path: "version" });
  }
  const main = (o.main && typeof o.main === "object" ? o.main : {}) as Record<string, unknown>;
  const safety = (o.safety && typeof o.safety === "object" ? o.safety : {}) as Record<string, unknown>;
  const tools = (o.tools && typeof o.tools === "object" ? o.tools : {}) as Record<string, unknown>;
  const checks = (o.checks && typeof o.checks === "object" ? o.checks : {}) as Record<string, unknown>;
  const troubleshooting = (o.troubleshooting && typeof o.troubleshooting === "object"
    ? o.troubleshooting
    : {}) as Record<string, unknown>;
  const professional = (o.professional && typeof o.professional === "object"
    ? o.professional
    : {}) as Record<string, unknown>;
  const aeo = (o.aeo && typeof o.aeo === "object" ? o.aeo : {}) as Record<string, unknown>;
  const metadata = (o.metadata && typeof o.metadata === "object" ? o.metadata : {}) as Record<string, unknown>;
  const faqRaw = Array.isArray(o.faq) ? o.faq : [];
  const faq = faqRaw
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const f = item as Record<string, unknown>;
      return { question: asString(f.question), answer: asString(f.answer) };
    })
    .filter((x): x is { question: string; answer: string } => Boolean(x));

  const matrixSafety = asSafety(o.matrixSafety ?? safety.safetyLevel);
  const steps = normalizeProfileSteps(o.steps);
  const value: DiyGuideProfileJson = {
    version: DIY_PROFILE_JSON_VERSION,
    locale: "en",
    matrixSafety,
    main: {
      overview: asString(main.overview),
      symptoms: asString(main.symptoms),
      canIDoIt: asString(main.canIDoIt),
      skillLevel: asString(main.skillLevel),
      estimatedTime: asString(main.estimatedTime),
    },
    safety: {
      safetyLevel: asSafety(safety.safetyLevel ?? matrixSafety),
      warnings: asStringArray(safety.warnings),
      stopConditions: asStringArray(safety.stopConditions),
      dontDo: asStringArray(safety.dontDo),
    },
    tools: {
      tools: asStringArray(tools.tools),
      materials: asStringArray(tools.materials),
      prerequisites: asStringArray(tools.prerequisites),
    },
    checks: {
      safeChecks: asStringArray(checks.safeChecks),
      expectedObservations: asStringArray(checks.expectedObservations),
    },
    troubleshooting: {
      commonCauses: asStringArray(troubleshooting.commonCauses),
      troubleshooting: asStringArray(troubleshooting.troubleshooting),
    },
    steps,
    professional: {
      whenToCallProfessional: asString(professional.whenToCallProfessional),
      professionalFallback: asString(professional.professionalFallback),
    },
    faq,
    relatedServiceSlugs: asStringArray(o.relatedServiceSlugs),
    relatedGuideSlugs: asStringArray(o.relatedGuideSlugs),
    aeo: {
      whatIs: asString(aeo.whatIs),
      canIDoIt: asString(aeo.canIDoIt),
      checkFirst: asString(aeo.checkFirst ?? aeo.whatToCheckFirst),
      usualCauses: asString(aeo.usualCauses),
      whenCallProfessional: asString(aeo.whenCallProfessional),
    },
    metadata: {
      status: asStatus(metadata.status),
      createdBy: asString(metadata.createdBy, "system"),
      updatedBy: asString(metadata.updatedBy, "system"),
      safetyReviewedBy: metadata.safetyReviewedBy == null ? null : asString(metadata.safetyReviewedBy),
      safetyReviewedAt: metadata.safetyReviewedAt == null ? null : asString(metadata.safetyReviewedAt),
      arabicReviewStatus: asArabic(metadata.arabicReviewStatus),
      batch: metadata.batch == null ? null : asString(metadata.batch),
      authored: Boolean(metadata.authored),
    },
  };

  if ((matrixSafety === "RED" || matrixSafety === "REVIEW_REQUIRED") && value.steps.length > 0) {
    issues.push({ code: "red_rr_steps", message: "RED/REVIEW_REQUIRED profiles cannot include procedural steps", path: "steps" });
  }

  return {
    ok: issues.length === 0,
    value,
    issues,
    requiresHumanReview: issues.some((i) => i.code === "red_rr_steps"),
  };
}

function contentBlob(profile: DiyGuideProfileJson): string {
  return [
    profile.main.overview,
    profile.main.symptoms,
    ...stepsToPlainText(profile.steps),
    ...profile.troubleshooting.troubleshooting,
    profile.professional.professionalFallback,
    ...profile.faq.map((f) => `${f.question} ${f.answer}`),
  ].join("\n");
}

/** Completeness + safety for authored GREEN Batch 1 profiles. */
export function validateAuthoredGreenProfile(profile: DiyGuideProfileJson): ProfileValidationResult {
  const issues: ProfileValidationIssue[] = [];
  if (profile.matrixSafety !== "GREEN") {
    issues.push({ code: "not_green", message: "Batch 1 authoring requires GREEN matrixSafety" });
  }
  if (!filled(profile.main.overview, 40)) issues.push({ code: "overview", message: "overview too thin", path: "main.overview" });
  if (!filled(profile.main.canIDoIt, 20)) issues.push({ code: "canIDoIt", message: "canIDoIt required", path: "main.canIDoIt" });
  if (profile.tools.tools.length < 1) issues.push({ code: "tools", message: "tools required", path: "tools.tools" });
  if (profile.steps.length < 3) issues.push({ code: "steps", message: "at least 3 steps required for GREEN", path: "steps" });
  if (profile.safety.stopConditions.length < 2)
    issues.push({ code: "stop", message: "stopConditions required", path: "safety.stopConditions" });
  if (profile.safety.dontDo.length < 2) issues.push({ code: "dontdo", message: "dontDo required", path: "safety.dontDo" });
  if (!filled(profile.professional.professionalFallback, 30))
    issues.push({ code: "fallback", message: "professionalFallback required", path: "professional.professionalFallback" });
  if (profile.faq.length < 5 || profile.faq.length > 8)
    issues.push({ code: "faq_count", message: "FAQ must be 5–8 items", path: "faq" });
  for (const [i, f] of profile.faq.entries()) {
    if (!filled(f.question, 8) || !filled(f.answer, 20)) {
      issues.push({ code: "faq_thin", message: `FAQ ${i} thin`, path: `faq.${i}` });
    }
  }
  for (const field of ["whatIs", "canIDoIt", "checkFirst", "usualCauses", "whenCallProfessional"] as const) {
    if (!filled(profile.aeo[field], 20)) issues.push({ code: `aeo_${field}`, message: `aeo.${field} required` });
  }

  const blob = contentBlob(profile);
  if (UNSAFE_STEP.test(blob)) {
    issues.push({ code: "unsafe_content", message: "Blocked unsafe instructional pattern" });
  }
  const claims = scanUnsupportedClaims(blob);
  if (!claims.ok) {
    issues.push({ code: "claims", message: `Unsupported claims: ${claims.hits.map((h) => h.code).join(",")}` });
  }
  if (/check the equipment and contact a professional\.?$/i.test(profile.main.overview.trim())) {
    issues.push({ code: "generic_filler", message: "Generic filler overview rejected" });
  }

  const requiresHumanReview = issues.some((i) => i.code === "unsafe_content");
  if (requiresHumanReview) profile.metadata.status = "safety_review";

  return { ok: issues.length === 0, value: profile, issues, requiresHumanReview };
}

/** Completeness + safety for authored YELLOW Batch 2 profiles (limited troubleshooting). */
export function validateAuthoredYellowProfile(profile: DiyGuideProfileJson): ProfileValidationResult {
  const issues: ProfileValidationIssue[] = [];
  if (profile.matrixSafety !== "YELLOW") {
    issues.push({ code: "not_yellow", message: "Batch 2 authoring requires YELLOW matrixSafety" });
  }
  if (profile.safety.safetyLevel !== "YELLOW") {
    issues.push({ code: "safety_level", message: "safety.safetyLevel must be YELLOW" });
  }
  if (!filled(profile.main.overview, 40)) issues.push({ code: "overview", message: "overview too thin", path: "main.overview" });
  if (!filled(profile.main.symptoms, 20)) issues.push({ code: "symptoms", message: "symptoms required", path: "main.symptoms" });
  if (!filled(profile.main.canIDoIt, 20)) issues.push({ code: "canIDoIt", message: "canIDoIt required", path: "main.canIDoIt" });
  if (!filled(profile.main.skillLevel, 4)) issues.push({ code: "skill", message: "skillLevel required" });
  if (profile.tools.tools.length < 1) issues.push({ code: "tools", message: "tools required" });
  if (profile.tools.prerequisites.length < 1) issues.push({ code: "prep", message: "prerequisites required" });
  if (profile.checks.safeChecks.length < 2) issues.push({ code: "checks", message: "safeChecks required" });
  if (profile.troubleshooting.commonCauses.length < 2) issues.push({ code: "causes", message: "commonCauses required" });
  if (profile.troubleshooting.troubleshooting.length < 2)
    issues.push({ code: "ts", message: "troubleshooting required" });
  if (profile.steps.length < 3) issues.push({ code: "steps", message: "at least 3 structured steps required" });
  for (const [i, s] of profile.steps.entries()) {
    if (!filled(s.action, 12) || !filled(s.expectedResult, 8) || !filled(s.stopCondition, 8)) {
      issues.push({ code: "step_struct", message: `step ${i} incomplete`, path: `steps.${i}` });
    }
  }
  if (profile.safety.warnings.length < 2) issues.push({ code: "warnings", message: "warnings required" });
  if (profile.safety.stopConditions.length < 2) issues.push({ code: "stop", message: "stopConditions required" });
  if (profile.safety.dontDo.length < 2) issues.push({ code: "dontdo", message: "dontDo required" });
  if (!filled(profile.professional.whenToCallProfessional, 20))
    issues.push({ code: "when_pro", message: "whenToCallProfessional required" });
  if (!filled(profile.professional.professionalFallback, 30))
    issues.push({ code: "fallback", message: "professionalFallback required" });
  if (profile.faq.length < 5 || profile.faq.length > 8) issues.push({ code: "faq_count", message: "FAQ must be 5–8" });
  for (const [i, f] of profile.faq.entries()) {
    if (!filled(f.question, 8) || !filled(f.answer, 20)) {
      issues.push({ code: "faq_thin", message: `FAQ ${i} thin`, path: `faq.${i}` });
    }
  }
  for (const field of ["whatIs", "canIDoIt", "checkFirst", "whenCallProfessional"] as const) {
    if (!filled(profile.aeo[field], 20)) issues.push({ code: `aeo_${field}`, message: `aeo.${field} required` });
  }
  if (/check the equipment and contact a professional\.?$/i.test(profile.main.overview.trim())) {
    issues.push({ code: "generic_filler", message: "Generic filler overview rejected" });
  }

  const blob = contentBlob(profile);
  if (UNSAFE_STEP.test(blob)) {
    issues.push({ code: "unsafe_content", message: "Blocked unsafe instructional pattern" });
    profile.metadata.status = "safety_review";
  }
  const claims = scanUnsupportedClaims(blob);
  if (!claims.ok) {
    issues.push({ code: "claims", message: `Unsupported claims: ${claims.hits.map((h) => h.code).join(",")}` });
  }

  const requiresHumanReview = issues.some((i) => i.code === "unsafe_content");
  return { ok: issues.length === 0, value: profile, issues, requiresHumanReview };
}
