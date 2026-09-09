import {
  CONTENT_JSON_VERSION,
  emptyContentJson,
  type AeoContentBlock,
  type DiyContentBlock,
  type ExpertCtaBlock,
  type FaqApprovalState,
  type FaqContentItem,
  type GeoContentBlock,
  type MainContentBlock,
  type ServiceLocationContentJson,
} from "./content-contract";

export type ContentJsonValidationIssue = {
  code: string;
  message: string;
  path?: string;
};

export type ContentJsonValidationResult = {
  ok: boolean;
  value: ServiceLocationContentJson | null;
  issues: ContentJsonValidationIssue[];
};

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

function asFaqApproval(value: unknown): FaqApprovalState {
  if (value === "draft" || value === "approved" || value === "rejected") return value;
  return "draft";
}

function parseMain(raw: unknown): MainContentBlock {
  const o = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  return {
    serviceExplanation: asString(o.serviceExplanation),
    problems: asStringArray(o.problems),
    symptomsUseCases: asStringArray(o.symptomsUseCases),
    process: asStringArray(o.process),
    propertyTypes: asStringArray(o.propertyTypes),
    professionalRecommendation: asString(o.professionalRecommendation),
  };
}

function parseAeo(raw: unknown): AeoContentBlock {
  const o = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  return {
    directAnswer: asString(o.directAnswer),
    whatIs: asString(o.whatIs),
    canIDoIt: asString(o.canIDoIt),
    whenCallProfessional: asString(o.whenCallProfessional),
    availabilityAnswer: asString(o.availabilityAnswer),
    bookingAnswer: asString(o.bookingAnswer),
    emergencyAnswer: asString(o.emergencyAnswer),
    amcAnswer: asString(o.amcAnswer),
  };
}

function parseGeo(raw: unknown): GeoContentBlock {
  const o = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  return {
    emirate: asString(o.emirate),
    city: asString(o.city),
    community: asString(o.community),
    localInfo: asString(o.localInfo),
    approvedLocalContext: asString(o.approvedLocalContext),
    coverageStatement: asString(o.coverageStatement),
  };
}

function parseDiy(raw: unknown): DiyContentBlock {
  const o = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const safety = o.safetyState;
  const safetyState =
    safety === "GREEN" || safety === "YELLOW" || safety === "RED" || safety === "REVIEW_REQUIRED"
      ? safety
      : ("REVIEW_REQUIRED" as const);
  return {
    canonicalGuideSlug: typeof o.canonicalGuideSlug === "string" ? o.canonicalGuideSlug : null,
    safetyState,
    allowedBlocks: asStringArray(o.allowedBlocks),
    safeSelfChecks: asStringArray(o.safeSelfChecks),
    tools: asStringArray(o.tools),
    steps: asStringArray(o.steps),
    stopConditions: asStringArray(o.stopConditions),
    whatNotToDo: asStringArray(o.whatNotToDo),
    safetyNotes: asStringArray(o.safetyNotes),
    professionalFallback: asString(o.professionalFallback),
  };
}

function parseFaq(raw: unknown): FaqContentItem[] {
  if (!Array.isArray(raw)) return [];
  const items: FaqContentItem[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    const locale = o.locale === "ar" ? "ar" : "en";
    const category = o.category;
    const entry: FaqContentItem = {
      question: asString(o.question),
      answer: asString(o.answer),
      locale,
      approvalState: asFaqApproval(o.approvalState),
    };
    if (
      category === "service" ||
      category === "location" ||
      category === "booking" ||
      category === "safety" ||
      category === "emergency" ||
      category === "amc"
    ) {
      entry.category = category;
    }
    items.push(entry);
  }
  return items;
}

function parseExpert(raw: unknown): ExpertCtaBlock {
  const o = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  return {
    helpSummary: asString(o.helpSummary),
    quoteCta: o.quoteCta !== false,
    bookingCta: Boolean(o.bookingCta),
    whatsappCta: o.whatsappCta !== false,
    phoneCta: o.phoneCta !== false,
    aiCta: o.aiCta !== false,
    emergencyCta: Boolean(o.emergencyCta),
    amcCta: Boolean(o.amcCta),
  };
}

/**
 * Parse untrusted JSON into the typed contract.
 * Unknown top-level keys are ignored safely (not fatal).
 * Invalid shape returns ok:false with issues.
 */
export function parseContentJson(input: unknown): ContentJsonValidationResult {
  const issues: ContentJsonValidationIssue[] = [];
  if (input == null) {
    return { ok: true, value: emptyContentJson(), issues: [] };
  }
  if (typeof input === "string") {
    const trimmed = input.trim();
    if (!trimmed || trimmed === "{}") {
      return { ok: true, value: emptyContentJson(), issues: [] };
    }
    try {
      return parseContentJson(JSON.parse(trimmed));
    } catch {
      return {
        ok: false,
        value: null,
        issues: [{ code: "content_json_parse", message: "contentJson is not valid JSON" }],
      };
    }
  }
  if (typeof input !== "object" || Array.isArray(input)) {
    return {
      ok: false,
      value: null,
      issues: [{ code: "content_json_type", message: "contentJson must be an object" }],
    };
  }

  const raw = input as Record<string, unknown>;
  const version = raw.version;
  if (version != null && version !== CONTENT_JSON_VERSION) {
    issues.push({
      code: "content_json_version",
      message: `Unsupported contentJson version: ${String(version)}`,
      path: "version",
    });
  }

  const value: ServiceLocationContentJson = {
    version: CONTENT_JSON_VERSION,
    main: parseMain(raw.main),
    aeo: parseAeo(raw.aeo),
    geo: parseGeo(raw.geo),
    diy: parseDiy(raw.diy),
    faq: parseFaq(raw.faq),
    expert: parseExpert(raw.expert),
    related: {
      relatedServiceSlugs: asStringArray(
        raw.related && typeof raw.related === "object"
          ? (raw.related as Record<string, unknown>).relatedServiceSlugs
          : [],
      ),
      relatedLocationSlugs: asStringArray(
        raw.related && typeof raw.related === "object"
          ? (raw.related as Record<string, unknown>).relatedLocationSlugs
          : [],
      ),
    },
  };

  // DIY RED must not carry procedural steps in stored content
  if (value.diy.safetyState === "RED" && value.diy.steps.length > 0) {
    issues.push({
      code: "diy_red_steps",
      message: "RED DIY content must not include procedural steps",
      path: "diy.steps",
    });
  }
  if (value.diy.safetyState === "REVIEW_REQUIRED" && value.diy.steps.length > 0) {
    issues.push({
      code: "diy_rr_steps",
      message: "REVIEW_REQUIRED DIY content must not include procedural steps",
      path: "diy.steps",
    });
  }

  if (issues.some((i) => i.code === "content_json_version" || i.code.startsWith("diy_"))) {
    return { ok: false, value, issues };
  }
  return { ok: true, value, issues };
}

export function validateContentJsonForPublication(input: unknown): ContentJsonValidationResult {
  const parsed = parseContentJson(input);
  if (!parsed.ok || !parsed.value) return parsed;
  const issues = [...parsed.issues];
  const v = parsed.value;
  if (!v.aeo.directAnswer.trim()) {
    issues.push({ code: "aeo_direct_missing", message: "AEO directAnswer is required", path: "aeo.directAnswer" });
  }
  if (!v.main.serviceExplanation.trim()) {
    issues.push({
      code: "main_explanation_missing",
      message: "Main serviceExplanation is required",
      path: "main.serviceExplanation",
    });
  }
  if (!v.geo.emirate.trim() && !v.geo.city.trim() && !v.geo.community.trim()) {
    issues.push({ code: "geo_hierarchy_missing", message: "GEO hierarchy facts are required", path: "geo" });
  }
  if (!v.geo.coverageStatement.trim()) {
    issues.push({
      code: "geo_coverage_missing",
      message: "GEO coverageStatement is required",
      path: "geo.coverageStatement",
    });
  }
  const approvedFaqs = v.faq.filter((f) => f.approvalState === "approved" && f.question.trim() && f.answer.trim());
  if (approvedFaqs.length < 1) {
    issues.push({ code: "faq_missing", message: "At least one approved FAQ is required", path: "faq" });
  }
  if (!v.expert.helpSummary.trim()) {
    issues.push({ code: "expert_summary_missing", message: "Expert helpSummary is required", path: "expert.helpSummary" });
  }
  if (!v.diy.professionalFallback.trim()) {
    issues.push({
      code: "diy_fallback_missing",
      message: "DIY professionalFallback is required",
      path: "diy.professionalFallback",
    });
  }
  return { ok: issues.length === 0, value: v, issues };
}
