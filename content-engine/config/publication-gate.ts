/**
 * Publication gate — all conditions must pass before READY_TO_PUBLISH.
 * Service × Location coverage remains controlled by ServiceLocation.covered (never invent).
 */
import { HARD_GATES } from "./engine.config";
import type { EngineIssue, ValidationResult, ValidationScore } from "./types";

export type GateInput = {
  wordCount: number;
  unique: boolean;
  visitorUseful: boolean;
  hasWebpImage: boolean;
  hasAlt: boolean;
  enComplete: boolean;
  arComplete: boolean;
  noEnglishFallback: boolean;
  seoOk: boolean;
  aeoOk: boolean;
  geoOk: boolean; // true when N/A
  qualityOk: boolean;
  safetyOk: boolean;
  coverageOk: boolean; // true when N/A (DIY/Blog); for SL must mirror ServiceLocation.covered
  humanApproved: boolean;
};

export function evaluatePublicationGate(input: GateInput): ValidationResult {
  const issues: EngineIssue[] = [];

  if (input.wordCount < HARD_GATES.minRenderedWords) {
    issues.push({
      code: "WORDS_BELOW_FLOOR",
      severity: "blocker",
      message: `Rendered words ${input.wordCount} < ${HARD_GATES.minRenderedWords}`,
      field: "body",
    });
  }
  if (!input.unique) {
    issues.push({ code: "NOT_UNIQUE", severity: "blocker", message: "Uniqueness gate failed" });
  }
  if (!input.visitorUseful) {
    issues.push({ code: "NOT_USEFUL", severity: "blocker", message: "Visitor usefulness gate failed" });
  }
  if (!input.hasWebpImage || !input.hasAlt) {
    issues.push({
      code: "IMAGE_GATE",
      severity: "blocker",
      message: "Relevant WebP image + alt required",
      field: "image",
    });
  }
  if (!input.enComplete || !input.arComplete) {
    issues.push({
      code: "LOCALIZATION",
      severity: "blocker",
      message: "Independent EN and AR required",
    });
  }
  if (!input.noEnglishFallback) {
    issues.push({
      code: "ENGLISH_FALLBACK",
      severity: "blocker",
      message: "Arabic must not fall back to English",
    });
  }
  if (!input.seoOk) {
    issues.push({ code: "SEO", severity: "blocker", message: "SEO gate failed" });
  }
  if (!input.aeoOk) {
    issues.push({ code: "AEO", severity: "blocker", message: "AEO gate failed" });
  }
  if (!input.geoOk) {
    issues.push({ code: "GEO", severity: "blocker", message: "GEO / local-context gate failed" });
  }
  if (!input.qualityOk) {
    issues.push({ code: "QUALITY", severity: "blocker", message: "Quality gate failed" });
  }
  if (!input.safetyOk) {
    issues.push({ code: "SAFETY", severity: "blocker", message: "Safety gate failed" });
  }
  if (!input.coverageOk) {
    issues.push({
      code: "COVERAGE",
      severity: "blocker",
      message: "ServiceLocation.covered is false — do not invent coverage",
    });
  }
  if (!input.humanApproved) {
    issues.push({
      code: "APPROVAL",
      severity: "blocker",
      message: "Human publication approval required (AI never publishes)",
    });
  }

  if (HARD_GATES.aiMayPublish) {
    issues.push({
      code: "CONFIG_VIOLATION",
      severity: "blocker",
      message: "aiMayPublish must remain false",
    });
  }

  const blockers = issues.filter((i) => i.severity === "blocker");
  const score: ValidationScore = {
    wordCount: input.wordCount,
    unique: input.unique,
    useful: input.visitorUseful,
    seo: input.seoOk,
    aeo: input.aeoOk,
    geo: input.geoOk,
    safety: input.safetyOk,
    quality: input.qualityOk,
    coverage: input.coverageOk,
    image: input.hasWebpImage && input.hasAlt,
    localization: input.enComplete && input.arComplete && input.noEnglishFallback,
    publicationEligible: blockers.length === 0,
  };

  return {
    passed: blockers.length === 0,
    lifecycle: blockers.length === 0 ? "READY_TO_PUBLISH" : mapBlockerLifecycle(blockers[0]!.code),
    wordCount: input.wordCount,
    score,
    issues,
  };
}

function mapBlockerLifecycle(code: string): string {
  const map: Record<string, string> = {
    WORDS_BELOW_FLOOR: "BLOCKED_WORDS",
    NOT_UNIQUE: "BLOCKED_DUPLICATE",
    IMAGE_GATE: "BLOCKED_IMAGE",
    LOCALIZATION: "BLOCKED_LOCALIZATION",
    ENGLISH_FALLBACK: "BLOCKED_LOCALIZATION",
    SEO: "BLOCKED_SEO",
    AEO: "BLOCKED_AEO",
    GEO: "BLOCKED_GEO",
    SAFETY: "BLOCKED_SAFETY",
    COVERAGE: "BLOCKED_COVERAGE",
    QUALITY: "BLOCKED_QUALITY",
    NOT_USEFUL: "BLOCKED_QUALITY",
    APPROVAL: "READY_FOR_REVIEW",
  };
  return map[code] ?? "BLOCKED_QUALITY";
}
