/**
 * Arabic URL slug helpers (Unicode). No Latin transliteration.
 * Spaces → `-`; keep Arabic letters, digits, and hyphens.
 */
export function toArabicSlug(input: string, maxLen = 180): string {
  const base = String(input || "")
    .normalize("NFC")
    .trim()
    .replace(/[ـ]/g, "") // tatweel
    .replace(/[\s_]+/g, "-")
    .replace(/[^\u0600-\u06FF0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  if (!base) return "صفحة";
  if (base.length <= maxLen) return base;
  return base.slice(0, maxLen).replace(/-$/g, "");
}

export function buildArabicSecSlug(serviceNameAr: string, estateNameAr: string, cityNameAr: string) {
  const parts = [serviceNameAr, estateNameAr, cityNameAr].map((p) => toArabicSlug(p, 60));
  const base = parts.filter(Boolean).join("-");
  return toArabicSlug(base, 180);
}

export function ensureUniqueSlug(desired: string, taken: Set<string>, disambiguator?: string) {
  let candidate = toArabicSlug(desired);
  if (!taken.has(candidate)) {
    taken.add(candidate);
    return candidate;
  }
  if (disambiguator) {
    const withDis = toArabicSlug(`${desired}-${disambiguator}`);
    if (!taken.has(withDis)) {
      taken.add(withDis);
      return withDis;
    }
  }
  let i = 2;
  while (i < 10_000) {
    const next = toArabicSlug(`${candidate}-${i}`);
    if (!taken.has(next)) {
      taken.add(next);
      return next;
    }
    i += 1;
  }
  throw new Error(`Could not uniquify slug for ${desired}`);
}

export function remapJsonSlugArray(raw: string | null | undefined, map: Record<string, string>): string {
  if (!raw) return "[]";
  let arr: unknown;
  try {
    arr = JSON.parse(raw);
  } catch {
    return raw;
  }
  if (!Array.isArray(arr)) return raw;
  const next = arr.map((item) => {
    if (typeof item !== "string") return item;
    return map[item] ?? item;
  });
  return JSON.stringify(next);
}

export function isAlreadyArabicSlug(slug: string) {
  return /[\u0600-\u06FF]/.test(slug);
}
