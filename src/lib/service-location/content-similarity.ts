/** Token-overlap duplicate / near-duplicate detector (A4.1). */

export const SIMILARITY_THRESHOLD = 0.85;

export function normalizeTokens(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]+/gu, " ")
    .split(/\s+/)
    .filter((t) => t.length > 2);
}

export function tokenOverlapRatio(a: string, b: string): number {
  const ta = new Set(normalizeTokens(a));
  const tb = new Set(normalizeTokens(b));
  if (ta.size === 0 || tb.size === 0) return 0;
  let inter = 0;
  for (const t of ta) if (tb.has(t)) inter += 1;
  const union = ta.size + tb.size - inter;
  return union === 0 ? 0 : inter / union;
}

export type SimilarityScanResult = {
  ok: boolean;
  maxOverlap: number;
  threshold: number;
  flaggedAgainstIndex?: number;
};

export function scanDuplicateSimilarity(
  candidate: string,
  corpus: string[],
  threshold: number = SIMILARITY_THRESHOLD,
): SimilarityScanResult {
  let maxOverlap = 0;
  let flaggedAgainstIndex: number | undefined;
  for (let i = 0; i < corpus.length; i += 1) {
    const ratio = tokenOverlapRatio(candidate, corpus[i]!);
    if (ratio > maxOverlap) {
      maxOverlap = ratio;
      if (ratio >= threshold) flaggedAgainstIndex = i;
    }
  }
  return {
    ok: maxOverlap < threshold,
    maxOverlap,
    threshold,
    flaggedAgainstIndex,
  };
}

export function titlesUnique(title: string, existing: string[]): boolean {
  const key = title.toLowerCase().replace(/\s+/g, " ").trim();
  if (!key) return false;
  return !existing.some((t) => t.toLowerCase().replace(/\s+/g, " ").trim() === key);
}
