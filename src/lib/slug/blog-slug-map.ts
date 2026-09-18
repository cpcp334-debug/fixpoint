/**
 * Maps Latin blog article slugs to Arabic public forms (soft recovery).
 * DB primary `slug` is Latin after restore-latin-article-slugs; Hostinger cannot serve Unicode paths,
 * so public hrefs stay Latin for both locales. Lookup still accepts Arabic URL params.
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { publicSlugLookupCandidates } from "@/lib/slug/route-slug";

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
  return cachedForward![slug] ?? slug;
}

/** Public Arabic blog slug → Latin master. */
export function toMasterBlogSlug(slug: string): string {
  loadMaps();
  if (!/[\u0600-\u06FF]/.test(slug)) return slug;
  return cachedReverse![slug] ?? slug;
}

/**
 * Public href slug for blogs.
 * Hostinger/nginx returns 404 for Unicode paths — always emit Latin for both locales.
 */
export function blogPathSlug(_locale: string, anySlug: string): string {
  return toMasterBlogSlug(anySlug);
}

/** Candidates for DB lookup: URL param may be Latin or Arabic. */
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
