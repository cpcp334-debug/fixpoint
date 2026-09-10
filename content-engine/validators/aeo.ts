import type { EngineIssue } from "../config/types";

export type AeoInput = {
  hasDirectAnswer?: boolean;
  questionCount?: number;
  faqCount?: number;
  hasNextSteps?: boolean;
};

export function validateAeo(input: AeoInput): EngineIssue[] {
  const issues: EngineIssue[] = [];
  if (!input.hasDirectAnswer) {
    issues.push({
      code: "AEO_DIRECT_ANSWER",
      severity: "blocker",
      message: "Direct answer section required",
    });
  }
  if ((input.questionCount ?? 0) < 1) {
    issues.push({ code: "AEO_QUESTIONS", severity: "warn", message: "Include visitor questions" });
  }
  if ((input.faqCount ?? 0) < 2) {
    issues.push({ code: "AEO_FAQ", severity: "blocker", message: "At least 2 FAQs required" });
  }
  if (!input.hasNextSteps) {
    issues.push({ code: "AEO_NEXT_STEPS", severity: "blocker", message: "Next steps required" });
  }
  return issues;
}
