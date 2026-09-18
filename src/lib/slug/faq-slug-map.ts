/**
 * Maps Latin FAQ article slugs (`faq-{service}`) to Arabic public forms.
 * DB primary `slug` is Latin after restore-latin-faq-slugs; AR URLs use Arabic (encoded).
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { SERVICE_FAQ_SLUG_PREFIX } from "@/lib/faq/service-faq";
import { encodePathSegment, normalizeRouteSlug, publicSlugLookupCandidates } from "@/lib/slug/route-slug";

let cachedForward: Record<string, string> | null = null;
let cachedReverse: Record<string, string> | null = null;

function loadMaps() {
  if (cachedForward && cachedReverse) return;
  const forward: Record<string, string> = {};
  const path = join(process.cwd(), "scripts/_slug-maps.json");
  if (existsSync(path)) {
    try {
      const raw = JSON.parse(readFileSync(path, "utf8")) as { faq?: Record<string, string> };
      Object.assign(forward, raw.faq || {});
    } catch {
      // identity fallback
    }
  }
  const reverse: Record<string, string> = {};
  for (const [latin, ar] of Object.entries(forward)) {
    reverse[ar] = latin;
  }
  cachedForward = forward;
  cachedReverse = reverse;
}

/** Latin master FAQ slug → public Arabic slug (identity if unknown). */
export function toPublicFaqSlug(slug: string): string {
  loadMaps();
  const decoded = normalizeRouteSlug(slug);
  return cachedForward![decoded] ?? cachedForward![slug] ?? decoded;
}

/** Public Arabic FAQ slug → Latin master `faq-*` slug. */
export function toMasterFaqSlug(slug: string): string {
  loadMaps();
  const decoded = normalizeRouteSlug(slug);
  if (decoded.startsWith(SERVICE_FAQ_SLUG_PREFIX)) return decoded;
  return cachedReverse![decoded] ?? decoded;
}

/** Public href slug: EN Latin; AR Arabic percent-encoded. */
export function faqPathSlug(locale: string, anySlug: string): string {
  const latin = toMasterFaqSlug(anySlug);
  if (locale !== "ar") return latin.startsWith(SERVICE_FAQ_SLUG_PREFIX) ? latin : toMasterFaqSlug(latin);
  const arabic = toPublicFaqSlug(latin);
  return encodePathSegment(arabic);
}

/** Candidates for DB lookup: URL param may be Latin or Arabic. */
export function faqLookupCandidates(urlSlug: string): string[] {
  const latin = toMasterFaqSlug(urlSlug);
  const arabic = toPublicFaqSlug(latin);
  const out: string[] = [];
  for (const raw of [urlSlug, latin, arabic]) {
    for (const c of publicSlugLookupCandidates(raw)) {
      if (!out.includes(c)) out.push(c);
    }
  }
  return out;
}
