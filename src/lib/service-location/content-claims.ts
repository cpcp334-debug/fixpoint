/** Deterministic unsupported-claim scanner (A4.1). No NLP. */

export type ClaimHit = {
  code: string;
  pattern: string;
  excerpt: string;
};

export type ClaimScanResult = {
  ok: boolean;
  hits: ClaimHit[];
};

const CLAIM_PATTERNS: Array<{ code: string; re: RegExp }> = [
  { code: "best", re: /\bbest\b/i },
  { code: "number_one", re: /(?:^|[^\w])(#1|no\.?\s*1|number\s*one)(?=$|[^\w])/i },
  { code: "certified", re: /\bcertified\b/i },
  { code: "licensed", re: /\blicensed\b/i },
  { code: "cheapest", re: /\bcheapest\b/i },
  { code: "guaranteed", re: /\bguaranteed?\b/i },
  { code: "fake_rating", re: /\b(\d+(\.\d+)?\s*\/\s*5|\d+(\.\d+)?\s*stars?|aggregateRating)\b/i },
  { code: "fake_review_count", re: /\b\d{2,}\+?\s*(reviews?|ratings?)\b/i },
  { code: "fake_price", re: /\b(from\s*(AED|USD|\$)\s*\d+|only\s*(AED|USD|\$)\s*\d+|price\s*starts?\s*at)\b/i },
  { code: "fake_response_time", re: /\b(within\s*\d+\s*(minutes?|mins?|hours?)|30[- ]minute\s*response)\b/i },
  { code: "fake_office", re: /\b(our\s+(local\s+)?office\s+in|branch\s+in\s+[A-Za-z]|headquarters\s+in)\b/i },
  { code: "fake_technicians", re: /\b(\d{2,}\+?\s*(technicians?|engineers?|staff)|largest\s+team)\b/i },
  { code: "fake_awards", re: /\b(award[- ]winning|winner\s+of|trophy)\b/i },
  { code: "fake_stats", re: /\b(\d{3,}\+?\s*(customers?|homes?|projects?)|99%\s*satisfaction)\b/i },
];

function excerptAround(text: string, index: number, length: number) {
  const start = Math.max(0, index - 24);
  const end = Math.min(text.length, index + length + 24);
  return text.slice(start, end).replace(/\s+/g, " ").trim();
}

export function scanUnsupportedClaims(...parts: Array<string | null | undefined>): ClaimScanResult {
  const text = parts.filter(Boolean).join("\n");
  if (!text.trim()) return { ok: true, hits: [] };
  const hits: ClaimHit[] = [];
  for (const { code, re } of CLAIM_PATTERNS) {
    const match = re.exec(text);
    if (match) {
      hits.push({
        code,
        pattern: re.source,
        excerpt: excerptAround(text, match.index, match[0].length),
      });
    }
  }
  return { ok: hits.length === 0, hits };
}

export function flattenContentTexts(args: {
  seoTitle?: string;
  metaDescription?: string;
  h1?: string;
  intro?: string;
  localInfo?: string;
  body?: string;
  directAnswer?: string;
  geoIntro?: string;
  contentJsonText?: string;
}): string {
  return [
    args.seoTitle,
    args.metaDescription,
    args.h1,
    args.intro,
    args.localInfo,
    args.body,
    args.directAnswer,
    args.geoIntro,
    args.contentJsonText,
  ]
    .filter(Boolean)
    .join("\n");
}
