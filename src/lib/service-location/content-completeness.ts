import type { ServiceLocationContentJson } from "./content-contract";
import { parseContentJson } from "./content-parse";
import type { ArabicConfidence, ContentEvalMode, WorkingCopy } from "./types";

export type LocaleCompleteness = {
  complete: boolean;
  mode: ContentEvalMode;
  missing: string[];
  /** AR-only display helper */
  arStatus?: "complete" | "incomplete" | "translation-review";
};

function filled(value: string | null | undefined, min = 8) {
  return Boolean(value && value.replace(/\s+/g, " ").trim().length >= min);
}

/** A3.x shell completeness — used for grandfathered 49. */
export function legacyShellComplete(copy: WorkingCopy | null): boolean {
  if (!copy) return false;
  return (
    filled(copy.intro) &&
    filled(copy.localInfo) &&
    filled(copy.seoTitle) &&
    filled(copy.metaDescription)
  );
}

export function resolveContentJson(copy: WorkingCopy | null): ServiceLocationContentJson | null {
  if (!copy?.contentJson) return null;
  const parsed = parseContentJson(copy.contentJson);
  return parsed.value;
}

export function evaluateLocaleCompleteness(args: {
  copy: WorkingCopy | null;
  mode: ContentEvalMode;
  locale: "en" | "ar";
  arabicConfidence?: ArabicConfidence;
}): LocaleCompleteness {
  const { copy, mode, locale } = args;
  const missing: string[] = [];
  if (!copy) {
    return {
      complete: false,
      mode,
      missing: ["working_copy"],
      arStatus: locale === "ar" ? "incomplete" : undefined,
    };
  }

  if (!filled(copy.intro)) missing.push("intro");
  if (!filled(copy.localInfo)) missing.push("localInfo");
  if (!filled(copy.seoTitle)) missing.push("seoTitle");
  if (!filled(copy.metaDescription)) missing.push("metaDescription");

  if (mode === "LEGACY_COMPAT") {
    const complete = missing.length === 0;
    let arStatus: LocaleCompleteness["arStatus"];
    if (locale === "ar") {
      if (args.arabicConfidence === "REVIEW_REQUIRED" || args.arabicConfidence === "UNKNOWN") {
        arStatus = "translation-review";
      } else {
        arStatus = complete ? "complete" : "incomplete";
      }
    }
    return { complete, mode, missing, arStatus };
  }

  // STRICT_NEW_CONTENT
  if (!filled(copy.h1, 8)) missing.push("h1");
  if (!filled(copy.directAnswer, 40) && !resolveContentJson(copy)?.aeo.directAnswer) {
    missing.push("directAnswer");
  }

  const content = resolveContentJson(copy);
  if (!content) {
    missing.push("contentJson");
  } else {
    if (!filled(content.main.serviceExplanation, 40)) missing.push("main.serviceExplanation");
    if (content.main.problems.length < 1) missing.push("main.problems");
    if (content.main.process.length < 1) missing.push("main.process");
    if (!filled(content.aeo.directAnswer, 40)) missing.push("aeo.directAnswer");
    if (!filled(content.aeo.whatIs, 20)) missing.push("aeo.whatIs");
    if (!content.geo.emirate && !content.geo.city && !content.geo.community) missing.push("geo.hierarchy");
    if (!filled(content.geo.coverageStatement, 20)) missing.push("geo.coverageStatement");
    if (!content.faq.some((f) => f.approvalState === "approved" && filled(f.question) && filled(f.answer, 20))) {
      missing.push("faq");
    }
    if (!filled(content.expert.helpSummary, 20)) missing.push("expert.helpSummary");
    if (!filled(content.diy.professionalFallback, 20)) missing.push("diy.professionalFallback");
  }

  const complete = missing.length === 0;
  let arStatus: LocaleCompleteness["arStatus"];
  if (locale === "ar") {
    if (args.arabicConfidence === "REVIEW_REQUIRED" || args.arabicConfidence === "UNKNOWN") {
      arStatus = "translation-review";
    } else {
      arStatus = complete ? "complete" : "incomplete";
    }
  }
  return { complete, mode, missing, arStatus };
}

/** Detect grandfathered A3 published/indexable pairs. */
export function isLegacyCompatRow(row: {
  covered: boolean;
  coverageStatus: string;
  indexable: boolean;
  qualityStatus: string;
}): boolean {
  return (
    row.covered &&
    row.coverageStatus === "published" &&
    row.indexable &&
    row.qualityStatus === "indexable"
  );
}
