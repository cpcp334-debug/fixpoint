import type { EngineIssue } from "../config/types";
import { HARD_GATES } from "../config/engine.config";

/** Exact duplicate via normalized hash of body text. */
export function normalizeForHash(text: string): string {
  return String(text || "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

export function exactDuplicate(
  candidate: string,
  corpus: Iterable<string>,
): { duplicate: boolean; issues: EngineIssue[] } {
  const n = normalizeForHash(candidate);
  for (const other of corpus) {
    if (n && n === normalizeForHash(other)) {
      return {
        duplicate: true,
        issues: [
          {
            code: "EXACT_DUPLICATE",
            severity: "blocker",
            message: "Exact duplicate body detected",
          },
        ],
      };
    }
  }
  return { duplicate: false, issues: [] };
}

/** Jaccard token similarity (lightweight; production may call existing SIMILARITY_THRESHOLD helpers). */
export function tokenSimilarity(a: string, b: string): number {
  const ta = new Set(normalizeForHash(a).split(" ").filter((t) => t.length > 2));
  const tb = new Set(normalizeForHash(b).split(" ").filter((t) => t.length > 2));
  if (!ta.size || !tb.size) return 0;
  let inter = 0;
  for (const t of ta) if (tb.has(t)) inter++;
  return inter / (ta.size + tb.size - inter);
}

export function validateAgainstCorpus(
  candidate: string,
  corpus: string[],
  threshold = HARD_GATES.similarityThreshold,
): { maxSimilarity: number; issues: EngineIssue[] } {
  let maxSimilarity = 0;
  const issues: EngineIssue[] = [];
  const exact = exactDuplicate(candidate, corpus);
  if (exact.duplicate) {
    return { maxSimilarity: 1, issues: exact.issues };
  }
  for (const other of corpus) {
    const s = tokenSimilarity(candidate, other);
    if (s > maxSimilarity) maxSimilarity = s;
    if (s >= threshold) {
      issues.push({
        code: "TOKEN_SIMILARITY",
        severity: "blocker",
        message: `Token similarity ${s.toFixed(3)} >= ${threshold}`,
      });
      break;
    }
  }
  return { maxSimilarity, issues };
}

/** Detect crude location-swap templates (same skeleton, only place name differs). */
export function locationSwapDetected(
  a: string,
  b: string,
  locationNames: string[],
): boolean {
  let na = normalizeForHash(a);
  let nb = normalizeForHash(b);
  for (const loc of locationNames) {
    const re = new RegExp(`\\b${loc.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "gi");
    na = na.replace(re, "{{LOC}}");
    nb = nb.replace(re, "{{LOC}}");
  }
  if (na === nb && na.includes("{{LOC}}")) return true;
  return tokenSimilarity(na, nb) >= HARD_GATES.similarityThreshold;
}
