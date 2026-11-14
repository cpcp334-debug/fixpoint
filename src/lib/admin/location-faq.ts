/** Validate edited location FAQs without rewriting untouched legacy values. */
export function locationFaqField(form: FormData, key: string, stored: string | null | undefined):
  { ok: true; value: string | undefined } | { ok: false } {
  if (!form.has(key)) return { ok: true, value: undefined };
  if (form.getAll(key).length !== 1) return { ok: false };
  const raw = form.get(key);
  if (typeof raw !== "string") return { ok: false };
  if (raw === (stored ?? "")) return { ok: true, value: undefined };
  if (raw.length > 65536) return { ok: false };
  let parsed: unknown;
  try { parsed = JSON.parse(raw); } catch { return { ok: false }; }
  if (!Array.isArray(parsed) || parsed.length > 50) return { ok: false };
  const seen = new Set<string>();
  const items: Array<{ q: string; a: string }> = [];
  for (const item of parsed) {
    if (!item || typeof item !== "object" || Array.isArray(item)
      || Object.keys(item).some((key) => key !== "q" && key !== "a")
      || typeof item.q !== "string" || typeof item.a !== "string") return { ok: false };
    const q = item.q.replace(/\s+/g, " ").trim();
    const a = item.a.replace(/\s+/g, " ").trim();
    const duplicateKey = q.toLowerCase();
    if (q.length < 3 || q.length > 500 || a.length < 8 || a.length > 5000 || seen.has(duplicateKey)) return { ok: false };
    seen.add(duplicateKey);
    items.push({ q, a });
  }
  return { ok: true, value: JSON.stringify(items) };
}
