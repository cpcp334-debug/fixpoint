import type { TimelineFact, TimelineKind } from "@/lib/journey/types";

const BLOCKED_FACT_KEYS = new Set([
  "ip",
  "userAgent",
  "user-agent",
  "ua",
  "fingerprint",
  "transcript",
  "messages",
  "utm",
  "utmSource",
  "utm_source",
  "referrer",
  "referer",
]);

const AI_FACT_KEYS = new Set(["opened", "messageCount", "suggestion", "riskClass", "handover", "photoCount"]);

export function sanitizeFacts(kind: TimelineKind, facts: TimelineFact): TimelineFact {
  const out: TimelineFact = {};
  for (const [key, value] of Object.entries(facts)) {
    if (BLOCKED_FACT_KEYS.has(key)) continue;
    if (kind.startsWith("ai.") && !AI_FACT_KEYS.has(key)) continue;
    out[key] = value;
  }
  return out;
}

export function containsBlockedKey(value: unknown): boolean {
  const raw = JSON.stringify(value).toLowerCase();
  return ["\"ip\"", "user-agent", "fingerprint", "transcript", "\"messages\"", "utm_source", "referrer"].some((token) =>
    raw.includes(token),
  );
}
