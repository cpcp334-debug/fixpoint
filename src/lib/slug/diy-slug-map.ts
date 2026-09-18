/**
 * Maps Latin DIY guide/category slugs to Arabic public forms.
 * DB primary `slug` should be Latin; Arabic lives in scripts/_slug-maps.json.
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { encodePathSegment, normalizeRouteSlug, publicSlugLookupCandidates } from "@/lib/slug/route-slug";

let cachedGuideForward: Record<string, string> | null = null;
let cachedGuideReverse: Record<string, string> | null = null;
let cachedCatForward: Record<string, string> | null = null;
let cachedCatReverse: Record<string, string> | null = null;

function loadMaps() {
  if (cachedGuideForward && cachedGuideReverse && cachedCatForward && cachedCatReverse) return;
  const guideForward: Record<string, string> = {};
  const catForward: Record<string, string> = {};
  const path = join(process.cwd(), "scripts/_slug-maps.json");
  if (existsSync(path)) {
    try {
      const raw = JSON.parse(readFileSync(path, "utf8")) as {
        diyGuide?: Record<string, string>;
        diyCategory?: Record<string, string>;
      };
      for (const [k, v] of Object.entries(raw.diyGuide || {})) {
        // Prefer latin → arabic entries; skip arabic→arabic identity noise.
        if (!/[\u0600-\u06FF]/.test(k) && v) guideForward[k] = v;
      }
      for (const [k, v] of Object.entries(raw.diyCategory || {})) {
        if (!/[\u0600-\u06FF]/.test(k) && v) catForward[k] = v;
      }
    } catch {
      // identity fallback
    }
  }
  const guideReverse: Record<string, string> = {};
  for (const [latin, ar] of Object.entries(guideForward)) {
    guideReverse[ar] = latin;
  }
  const catReverse: Record<string, string> = {};
  for (const [latin, ar] of Object.entries(catForward)) {
    catReverse[ar] = latin;
  }
  cachedGuideForward = guideForward;
  cachedGuideReverse = guideReverse;
  cachedCatForward = catForward;
  cachedCatReverse = catReverse;
}

export function toPublicDiyGuideSlug(slug: string): string {
  loadMaps();
  const decoded = normalizeRouteSlug(slug);
  return cachedGuideForward![decoded] ?? cachedGuideForward![slug] ?? decoded;
}

export function toMasterDiyGuideSlug(slug: string): string {
  loadMaps();
  const decoded = normalizeRouteSlug(slug);
  if (!/[\u0600-\u06FF]/.test(decoded)) return decoded;
  return cachedGuideReverse![decoded] ?? decoded;
}

export function toPublicDiyCategorySlug(slug: string): string {
  loadMaps();
  const decoded = normalizeRouteSlug(slug);
  return cachedCatForward![decoded] ?? cachedCatForward![slug] ?? decoded;
}

export function toMasterDiyCategorySlug(slug: string): string {
  loadMaps();
  const decoded = normalizeRouteSlug(slug);
  if (!/[\u0600-\u06FF]/.test(decoded)) return decoded;
  return cachedCatReverse![decoded] ?? decoded;
}

/** Public href slug: EN Latin; AR Arabic percent-encoded. */
export function diyGuidePathSlug(locale: string, anySlug: string): string {
  const latin = toMasterDiyGuideSlug(anySlug);
  if (locale !== "ar") return latin;
  return encodePathSegment(toPublicDiyGuideSlug(latin));
}

export function diyCategoryPathSlug(locale: string, anySlug: string): string {
  const latin = toMasterDiyCategorySlug(anySlug);
  if (locale !== "ar") return latin;
  return encodePathSegment(toPublicDiyCategorySlug(latin));
}

/** Prefer guide map, then category map (same URL segment space). */
export function diyPathSlug(locale: string, anySlug: string): string {
  const decoded = normalizeRouteSlug(anySlug);
  loadMaps();
  if (cachedGuideForward![decoded] || cachedGuideReverse![decoded] || !/[\u0600-\u06FF]/.test(decoded)) {
    // If it looks like a known guide OR is Latin diy-*, use guide helper.
    if (decoded.startsWith("diy-") || cachedGuideForward![decoded] || cachedGuideReverse![decoded]) {
      return diyGuidePathSlug(locale, decoded);
    }
  }
  if (cachedCatForward![decoded] || cachedCatReverse![decoded]) {
    return diyCategoryPathSlug(locale, decoded);
  }
  // Fallback: locale-aware encode of whatever we have.
  if (locale === "ar" && /[\u0600-\u06FF]/.test(decoded)) return encodePathSegment(decoded);
  return toMasterDiyGuideSlug(decoded);
}

export function diyLookupCandidates(urlSlug: string): string[] {
  const decoded = normalizeRouteSlug(urlSlug);
  const latinGuide = toMasterDiyGuideSlug(decoded);
  const arabicGuide = toPublicDiyGuideSlug(latinGuide);
  const latinCat = toMasterDiyCategorySlug(decoded);
  const arabicCat = toPublicDiyCategorySlug(latinCat);
  const out: string[] = [];
  for (const raw of [urlSlug, decoded, latinGuide, arabicGuide, latinCat, arabicCat]) {
    for (const c of publicSlugLookupCandidates(raw)) {
      if (!out.includes(c)) out.push(c);
    }
  }
  return out;
}
