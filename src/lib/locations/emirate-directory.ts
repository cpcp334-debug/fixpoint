/**
 * Visitor directory for an emirate. Reads the approved location master.
 * Does not publish child pages and does not claim coverage.
 * Hrefs are locale-aware: Latin on /en, Arabic on /ar.
 */
import { cache } from "react";
import {
  loadLocationMaster,
  PARENT_CITY_ALIASES,
  type MasterLocation,
} from "../../../prisma/data/location-master";
import { isKnownEmirateSlug, toMasterLocationSlug } from "@/lib/slug/location-slug-map";
import { locationPathSlug } from "@/lib/slug/locale-slug";

export type DirectoryPlace = {
  slug: string;
  name: string;
  type: "city" | "community";
};

export type EmirateDirectory = {
  cities: DirectoryPlace[];
  areas: DirectoryPlace[];
  total: number;
};

const EMIRATE_SLUGS = new Set([
  "abu-dhabi",
  "dubai",
  "sharjah",
  "ajman",
  "umm-al-quwain",
  "ras-al-khaimah",
  "fujairah",
]);

const AR_SCRIPT = /[\u0600-\u06FF]/;

function visitorName(row: MasterLocation, locale: string) {
  if (
    locale === "ar" &&
    row.nameAr &&
    row.nameAr !== "REVIEW_REQUIRED" &&
    AR_SCRIPT.test(row.nameAr)
  ) {
    return row.nameAr;
  }
  return row.nameEn;
}

function byName(a: { name: string }, b: { name: string }) {
  return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
}

const EMIRATE_ORDER = [
  "abu-dhabi",
  "dubai",
  "sharjah",
  "ajman",
  "umm-al-quwain",
  "ras-al-khaimah",
  "fujairah",
] as const;

export function isPublicEmirateSlug(slug: string) {
  return isKnownEmirateSlug(slug) || EMIRATE_SLUGS.has(toMasterLocationSlug(slug));
}

export function getHomeLocationGroups(locale: string) {
  const master = loadLocationMaster();
  return EMIRATE_ORDER.map((latinSlug) => {
    const emirate = master.locations.find((row) => row.slug === latinSlug && row.type === "emirate");
    const places = master.locations
      .filter((row) => row.emirateSlug === latinSlug && row.type !== "emirate")
      .map((row) => ({ slug: locationPathSlug(locale, row.slug), name: visitorName(row, locale) }))
      .sort(byName);
    const name = emirate ? visitorName(emirate, locale) : latinSlug;
    const publicSlug = locationPathSlug(locale, latinSlug);
    return {
      slug: publicSlug,
      name,
      count: places.length + 1,
      places: [{ slug: publicSlug, name }, ...places],
    };
  });
}

export const getEmirateDirectory = cache((emirateSlug: string, locale: string): EmirateDirectory => {
  const masterKey = toMasterLocationSlug(emirateSlug);
  if (!EMIRATE_SLUGS.has(masterKey) && !EMIRATE_SLUGS.has(emirateSlug)) {
    return { cities: [], areas: [], total: 0 };
  }
  const latinKey = EMIRATE_SLUGS.has(masterKey) ? masterKey : emirateSlug;
  const master = loadLocationMaster();
  const cities: DirectoryPlace[] = [];
  const areas: DirectoryPlace[] = [];
  for (const row of master.locations) {
    if (row.emirateSlug !== latinKey) continue;
    if (row.type === "city") {
      cities.push({ slug: locationPathSlug(locale, row.slug), name: visitorName(row, locale), type: "city" });
    } else if (row.type === "community" || row.type === "area") {
      areas.push({ slug: locationPathSlug(locale, row.slug), name: visitorName(row, locale), type: "community" });
    }
  }
  cities.sort(byName);
  areas.sort(byName);
  return { cities, areas, total: cities.length + areas.length };
});

/** Curated Arabic (or EN) display name from the location master for a Latin/AR slug. */
export function masterVisitorName(anySlug: string, locale: string): string | null {
  const latin = toMasterLocationSlug(anySlug);
  const master = loadLocationMaster();
  const row = master.locations.find((item) => item.slug === latin);
  if (!row) return null;
  return visitorName(row, locale);
}

/**
 * Estates/communities under a city — or under an emirate when places parent to the emirate name (e.g. Dubai).
 */
export const getPlacesUnderCity = cache((citySlug: string, locale: string): DirectoryPlace[] => {
  const latin = toMasterLocationSlug(citySlug);
  const master = loadLocationMaster();
  const city = master.locations.find((row) => row.slug === latin && row.type === "city");
  const emirate = master.locations.find((row) => row.slug === latin && row.type === "emirate");
  const anchor = city || emirate;
  if (!anchor) return [];
  const parentLabels = new Set(
    [anchor.nameEn, anchor.locationName, city?.parentCityMunicipality].filter(Boolean) as string[],
  );
  for (const [alias, target] of Object.entries(PARENT_CITY_ALIASES)) {
    if (parentLabels.has(target)) parentLabels.add(alias);
  }
  const emirateKey = city?.emirateSlug || emirate?.emirateSlug || latin;
  const places: DirectoryPlace[] = [];
  for (const row of master.locations) {
    if (row.emirateSlug !== emirateKey) continue;
    if (row.type !== "community" && row.type !== "area") continue;
    const parent = row.parentCityMunicipality;
    if (!parent || !parentLabels.has(parent)) continue;
    places.push({
      slug: locationPathSlug(locale, row.slug),
      name: visitorName(row, locale),
      type: "community",
    });
  }
  places.sort(byName);
  return places;
});
