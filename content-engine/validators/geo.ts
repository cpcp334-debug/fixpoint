import type { EngineIssue } from "../config/types";

const FAKE_LOCAL = [
  /\bour store in\b/i,
  /\bwe visited\b/i,
  /\blocal office at\b/i,
  /\bguaranteed same[- ]day in\b/i,
  /\bwithin\s+\d+\s+hours?\b/i,
];

export type GeoInput = {
  applicable: boolean;
  locationName?: string | null;
  body?: string | null;
  hasGenuineLocalContext?: boolean;
};

export function validateGeo(input: GeoInput): EngineIssue[] {
  if (!input.applicable) return [];
  const issues: EngineIssue[] = [];
  const body = input.body || "";
  if (!input.hasGenuineLocalContext && input.locationName) {
    const mentions = body.toLowerCase().includes(String(input.locationName).toLowerCase());
    if (!mentions) {
      issues.push({
        code: "GEO_CONTEXT",
        severity: "blocker",
        message: "Genuine local context missing",
      });
    }
  }
  for (const re of FAKE_LOCAL) {
    if (re.test(body)) {
      issues.push({
        code: "GEO_FAKE_CLAIM",
        severity: "blocker",
        message: `Unsupported local claim matched: ${re}`,
      });
    }
  }
  return issues;
}
