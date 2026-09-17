/**
 * Visitor directory for an emirate. Reads the approved location master.
 * Does not publish child pages and does not claim coverage.
 */
import { cache } from "react";
import { loadLocationMaster, type MasterLocation } from "../../../prisma/data/location-master";

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
  return EMIRATE_SLUGS.has(slug);
}

export function getHomeLocationGroups(locale: string) {
  const master = loadLocationMaster();
  return EMIRATE_ORDER.map((slug) => {
    const emirate = master.locations.find((row) => row.slug === slug && row.type === "emirate");
    const places = master.locations
      .filter((row) => row.emirateSlug === slug && row.type !== "emirate")
      .map((row) => ({ slug: row.slug, name: visitorName(row, locale) }))
      .sort(byName);
    const name = emirate ? visitorName(emirate, locale) : slug;
    return {
      slug,
      name,
      count: places.length + 1,
      places: [{ slug, name }, ...places],
    };
  });
}

export const getEmirateDirectory = cache((emirateSlug: string, locale: string): EmirateDirectory => {
  if (!EMIRATE_SLUGS.has(emirateSlug)) return { cities: [], areas: [], total: 0 };
  const master = loadLocationMaster();
  const cities: DirectoryPlace[] = [];
  const areas: DirectoryPlace[] = [];
  for (const row of master.locations) {
    if (row.emirateSlug !== emirateSlug) continue;
    if (row.type === "city") {
      cities.push({ slug: row.slug, name: visitorName(row, locale), type: "city" });
    } else if (row.type === "community" || row.type === "area") {
      areas.push({ slug: row.slug, name: visitorName(row, locale), type: "community" });
    }
  }
  cities.sort(byName);
  areas.sort(byName);
  return { cities, areas, total: cities.length + areas.length };
});
