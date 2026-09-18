/**
 * Maps Latin blog article slugs to Arabic public forms.
 * DB primary `slug` is Latin; Arabic forms in _slug-maps.json → article.
 * /en → Latin; /ar → percent-encoded Arabic (Hostinger ASCII-safe).
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { encodePathSegment, normalizeRouteSlug, publicSlugLookupCandidates } from "@/lib/slug/route-slug";

let cachedForward: Record<string, string> | null = null;
let cachedReverse: Record<string, string> | null = null;

function loadMaps() {
  if (cachedForward && cachedReverse) return;
  const forward: Record<string, string> = {};
  const path = join(process.cwd(), "scripts/_slug-maps.json");
  if (existsSync(path)) {
    try {
      const raw = JSON.parse(readFileSync(path, "utf8")) as { article?: Record<string, string> };
      Object.assign(forward, raw.article || {});
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

/** Latin master blog slug → mapped Arabic form (identity if unknown). */
export function toPublicBlogSlug(slug: string): string {
  loadMaps();
  const decoded = normalizeRouteSlug(slug);
  return cachedForward![decoded] ?? cachedForward![slug] ?? decoded;
}

/** Public Arabic blog slug → Latin master. */
export function toMasterBlogSlug(slug: string): string {
  loadMaps();
  const decoded = normalizeRouteSlug(slug);
  if (!/[\u0600-\u06FF]/.test(decoded)) return decoded;
  return cachedReverse![decoded] ?? decoded;
}

/**
 * Public href slug for blogs.
 * EN: Latin. AR: Arabic percent-encoded for Hostinger ASCII-safe paths.
 */
export function blogPathSlug(locale: string, anySlug: string): string {
  const latin = toMasterBlogSlug(anySlug);
  if (locale !== "ar") return latin;
  return encodePathSegment(toPublicBlogSlug(latin));
}

/** Candidates for DB lookup: URL param may be Latin, Arabic, or percent-encoded. */
export function blogLookupCandidates(urlSlug: string): string[] {
  const latin = toMasterBlogSlug(urlSlug);
  const arabic = toPublicBlogSlug(latin);
  const out: string[] = [];
  for (const raw of [urlSlug, latin, arabic]) {
    for (const c of publicSlugLookupCandidates(raw)) {
      if (!out.includes(c)) out.push(c);
    }
  }
  return out;
}
