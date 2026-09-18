/**
 * Locale-aware public path slugs.
 * Policy: /en → Latin (master) slugs; /ar → Arabic slugs from scripts/_slug-maps.json
 * (percent-encoded path segments so Hostinger receives ASCII-safe URLs).
 * DB primary `slug` stays Latin; never overwrite with Arabic.
 */
import { toMasterServiceSlug, toPublicServiceSlug } from "@/lib/slug/service-slug-map";
import { toMasterLocationSlug, toPublicLocationSlug } from "@/lib/slug/location-slug-map";
import { encodePathSegment, normalizeRouteSlug, publicSlugLookupCandidates } from "@/lib/slug/route-slug";

export function servicePathSlug(locale: string, anySlug: string): string {
  const latin = toMasterServiceSlug(normalizeRouteSlug(anySlug));
  if (locale !== "ar") return latin;
  return encodePathSegment(toPublicServiceSlug(latin));
}

export function locationPathSlug(locale: string, anySlug: string): string {
  const latin = toMasterLocationSlug(normalizeRouteSlug(anySlug));
  if (locale !== "ar") return latin;
  return encodePathSegment(toPublicLocationSlug(latin));
}

export function serviceHref(locale: string, anySlug: string, suffix = ""): string {
  const base = `/${servicePathSlug(locale, anySlug)}`;
  return suffix ? `${base}${suffix.startsWith("/") ? suffix : `/${suffix}`}` : base;
}

export function serviceLocationHref(locale: string, serviceSlug: string, locationSlug: string): string {
  return `/${servicePathSlug(locale, serviceSlug)}/${locationPathSlug(locale, locationSlug)}`;
}

export function locationPageHref(locale: string, locationSlug: string): string {
  return `/locations/${locationPathSlug(locale, locationSlug)}`;
}

/** Candidates for DB lookup: URL param may be Latin or Arabic. */
export function serviceLookupCandidates(urlSlug: string): string[] {
  const latin = toMasterServiceSlug(urlSlug);
  const arabic = toPublicServiceSlug(latin);
  const out: string[] = [];
  for (const raw of [urlSlug, latin, arabic]) {
    for (const c of publicSlugLookupCandidates(raw)) {
      if (!out.includes(c)) out.push(c);
    }
  }
  return out;
}

export function locationLookupCandidates(urlSlug: string): string[] {
  const latin = toMasterLocationSlug(urlSlug);
  const arabic = toPublicLocationSlug(latin);
  const out: string[] = [];
  for (const raw of [urlSlug, latin, arabic]) {
    for (const c of publicSlugLookupCandidates(raw)) {
      if (!out.includes(c)) out.push(c);
    }
  }
  return out;
}
