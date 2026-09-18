/**
 * Decode + NFC-normalize a dynamic route slug (Arabic Unicode safe).
 * Does not map Latin legacy slugs — those intentionally 404.
 */
export function normalizeRouteSlug(raw: string): string {
  let s = String(raw || "").trim();
  for (let i = 0; i < 2; i++) {
    try {
      const decoded = decodeURIComponent(s);
      if (decoded === s) break;
      s = decoded;
    } catch {
      break;
    }
  }
  return s.normalize("NFC").replace(/\/+$/g, "");
}

/** Alif / hamza spelling variants for the first character only. */
function alifPrefixVariants(slug: string): string[] {
  if (!slug) return [];
  const rest = slug.slice(1);
  const first = slug[0];
  const out = new Set<string>([slug]);
  if (first === "أ" || first === "إ" || first === "آ" || first === "ٱ") {
    out.add(`ا${rest}`);
  } else if (first === "ا") {
    out.add(`أ${rest}`);
    out.add(`إ${rest}`);
  }
  return [...out];
}

/**
 * Candidate slugs to try when resolving a public location/service URL param.
 * Order: exact normalized, alif variants, hyphen/space, toArabicSlug form.
 */
export function publicSlugLookupCandidates(raw: string): string[] {
  const base = normalizeRouteSlug(raw);
  if (!base) return [];
  const out: string[] = [];
  const push = (value: string) => {
    const v = value.normalize("NFC");
    if (v && !out.includes(v)) out.push(v);
  };
  for (const variant of alifPrefixVariants(base)) {
    push(variant);
    push(variant.replace(/\s+/g, "-"));
    push(variant.replace(/-/g, " ").trim());
  }
  // Re-run through toArabicSlug for space/tatweel cleanup without Latin transliteration.
  // Imported lazily-shaped: caller may pass already-clean Arabic.
  const cleaned = base
    .replace(/[ـ]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  push(cleaned);
  for (const variant of alifPrefixVariants(cleaned)) push(variant);
  return out;
}

/** Merge base candidates with an optional mapped public (Arabic) slug. */
export function mergeSlugLookupCandidates(raw: string, mappedPublic?: string | null): string[] {
  const out = publicSlugLookupCandidates(raw);
  if (!mappedPublic || mappedPublic === raw) return out;
  for (const c of publicSlugLookupCandidates(mappedPublic)) {
    if (!out.includes(c)) out.push(c);
  }
  return out;
}
