import type { EngineIssue } from "../config/types";

export type SafetyClass = "GREEN" | "YELLOW" | "RED" | "REVIEW_REQUIRED" | string;

export type SafetyInput = {
  safetyClass: SafetyClass;
  intendsPublic: boolean;
  contentType: "DIY" | "SERVICE_LOCATION" | "BLOG" | "SERVICE" | "CATEGORY";
  covered?: boolean;
};

/**
 * DIY public = GREEN only.
 * SL public = covered only (never invent).
 * Never downgrade safety.
 */
export function validateSafety(input: SafetyInput): EngineIssue[] {
  const issues: EngineIssue[] = [];
  if (input.contentType === "DIY" && input.intendsPublic) {
    if (input.safetyClass !== "GREEN") {
      issues.push({
        code: "SAFETY_DIY_PUBLIC",
        severity: "blocker",
        message: `DIY safety ${input.safetyClass} cannot be public (GREEN only)`,
      });
    }
  }
  if (input.contentType === "SERVICE_LOCATION" && input.intendsPublic) {
    if (!input.covered) {
      issues.push({
        code: "SAFETY_COVERAGE",
        severity: "blocker",
        message: "Uncovered Service × Location must not publish/index",
      });
    }
  }
  if (input.safetyClass === "RED" && input.intendsPublic) {
    issues.push({
      code: "SAFETY_RED",
      severity: "blocker",
      message: "RED content must never be public",
    });
  }
  return issues;
}
