import type { EngineIssue } from "../config/types";

const LATIN_HEAVY = /[A-Za-z]{4,}/g;

export type LocaleInput = {
  enBody?: string | null;
  arBody?: string | null;
  enTitle?: string | null;
  arTitle?: string | null;
};

export function validateLocalization(input: LocaleInput): EngineIssue[] {
  const issues: EngineIssue[] = [];
  if (!input.enBody || input.enBody.trim().length < 200) {
    issues.push({ code: "EN_INCOMPLETE", severity: "blocker", message: "EN body incomplete" });
  }
  if (!input.arBody || input.arBody.trim().length < 200) {
    issues.push({ code: "AR_INCOMPLETE", severity: "blocker", message: "AR body incomplete" });
  }
  if (input.enTitle && input.arTitle && input.enTitle.trim() === input.arTitle.trim()) {
    issues.push({
      code: "ENGLISH_FALLBACK_TITLE",
      severity: "blocker",
      message: "AR title equals EN title (fallback suspected)",
    });
  }
  if (input.enBody && input.arBody) {
    const en = input.enBody.trim();
    const ar = input.arBody.trim();
    if (en === ar) {
      issues.push({
        code: "ENGLISH_FALLBACK_BODY",
        severity: "blocker",
        message: "AR body identical to EN",
      });
    }
    const latinHits = (ar.match(LATIN_HEAVY) || []).length;
    const arWords = ar.split(/\s+/).length;
    if (arWords > 50 && latinHits / arWords > 0.4) {
      issues.push({
        code: "ENGLISH_FALLBACK_RATIO",
        severity: "blocker",
        message: "AR body appears English-dominant",
      });
    }
  }
  return issues;
}
