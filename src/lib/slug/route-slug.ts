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

/**
 * Percent-encode a path segment when it contains non-ASCII (e.g. Arabic).
 * Hostinger/nginx often 404s raw Unicode path bytes; ASCII percent-encoding is safe.
 * Latin/ASCII slugs are returned unchanged. Already-encoded ASCII is left as-is.
 */
export function encodePathSegment(segment: string): string {
  const s = String(segment || "").trim();
  if (!s) return s;
  // Already percent-encoded ASCII (no raw non-ASCII left)
  if (!/[^\x00-\x7F]/.test(s) && /%[0-9A-Fa-f]{2}/.test(s)) return s;
  if (!/[^\x00-\x7F]/.test(s)) return s;
  return encodeURIComponent(s.normalize("NFC"));
}

/** Encode each path segment (split on `/`) for public hrefs / canonicals. */
export function encodePublicPath(path: string): string {
  if (!path) return path;
  const leading = path.startsWith("/") ? "/" : "";
  const bare = path.replace(/^\/+/, "").replace(/\/+$/g, "");
  if (!bare) return leading || "/";
  return leading + bare.split("/").map((seg) => encodePathSegment(seg)).join("/");
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
