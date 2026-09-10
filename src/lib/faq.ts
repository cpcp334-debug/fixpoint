/**
 * Normalize FAQ JSON shapes used across the site.
 * Accepts { q, a } or { question, answer } and drops empties.
 */
export type FaqItem = { q: string; a: string };

export function normalizeFaqItems(input: unknown): FaqItem[] {
  if (!Array.isArray(input)) return [];
  const out: FaqItem[] = [];
  const seen = new Set<string>();
  for (const raw of input) {
    if (!raw || typeof raw !== "object") continue;
    const o = raw as Record<string, unknown>;
    const q = String(o.q ?? o.question ?? "")
      .replace(/\s+/g, " ")
      .trim();
    const a = String(o.a ?? o.answer ?? "")
      .replace(/\s+/g, " ")
      .trim();
    if (q.length < 3 || a.length < 8) continue;
    const key = q.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ q, a });
  }
  return out;
}

export function parseFaqJson(value: string | null | undefined): FaqItem[] {
  if (!value) return [];
  try {
    return normalizeFaqItems(JSON.parse(value));
  } catch {
    return [];
  }
}

export function faqItemsToStorage(items: FaqItem[]): string {
  return JSON.stringify(items.map((f) => ({ q: f.q, a: f.a })));
}
