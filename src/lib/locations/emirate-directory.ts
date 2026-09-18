/**
 * Visitor directory for an emirate. Reads the approved location master.
 * Does not publish child pages and does not claim coverage.
 * Public hrefs use Arabic primary slugs (Phase 2); master JSON stays Latin-keyed.
 */
import { cache } from "react";
import { loadLocationMaster, type MasterLocation } from "../../../prisma/data/location-master";
import { isKnownEmirateSlug, toMasterLocationSlug, toPublicLocationSlug } from "@/lib/slug/location-slug-map";

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

function visitorName(row: MasterLocation, locale: string) {
  if (locale === "ar" && row.nameAr && row.nameAr !== "REVIEW_REQUIRED") return row.nameAr;
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
      .map((row) => ({ slug: toPublicLocationSlug(row.slug), name: visitorName(row, locale) }))
      .sort(byName);
    const name = emirate ? visitorName(emirate, locale) : latinSlug;
    const publicSlug = toPublicLocationSlug(latinSlug);
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
      cities.push({ slug: toPublicLocationSlug(row.slug), name: visitorName(row, locale), type: "city" });
    } else if (row.type === "community" || row.type === "area") {
      areas.push({ slug: toPublicLocationSlug(row.slug), name: visitorName(row, locale), type: "community" });
    }
  }
  cities.sort(byName);
  areas.sort(byName);
  return { cities, areas, total: cities.length + areas.length };
});
