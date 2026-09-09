/**
 * Phase A2 — load authoritative UAE location master (research JSON).
 * Parent label aliases normalize city-name mismatches without inventing locations.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

export type MasterArabicConfidence = "HIGH" | "MEDIUM" | "REVIEW_REQUIRED";
export type MasterLocationType = "country" | "emirate" | "city" | "community" | "area";

export type MasterLocation = {
  id: number;
  emirateSlug: string | null;
  parentCityMunicipality: string | null;
  locationName: string;
  type: MasterLocationType;
  nameEn: string;
  nameAr: string;
  arabicSource: string;
  arabicConfidence: MasterArabicConfidence;
  slug: string;
  source: string;
  sourceConfidence: string;
  reasonIfNotHigh: string | null;
  hierarchyStatus: string;
  existingSeed: boolean;
  appTypeMapping: string;
};

export type LocationMasterFile = {
  meta: {
    targetTotal: number;
    actualTotal: number;
    breakdown: {
      country: number;
      emirate: number;
      city: number;
      community: number;
      area: number;
    };
    arabicVerification: {
      arabicHigh: number;
      arabicMedium: number;
      arabicReviewRequired: number;
    };
    validation: {
      existingEightSlugs: string[];
    };
  };
  locations: MasterLocation[];
};

/** Map parentCityMunicipality labels → city nameEn in the same file. */
export const PARENT_CITY_ALIASES: Record<string, string> = {
  "Ajman City": "Ajman",
  "Al Mirfa": "Al Marfa",
  "Al Sila": "Al Sila'",
};

export const EXISTING_EIGHT_SLUGS = [
  "uae",
  "dubai",
  "abu-dhabi",
  "sharjah",
  "ajman",
  "umm-al-quwain",
  "ras-al-khaimah",
  "fujairah",
] as const;

export function loadLocationMaster(cwd = process.cwd()): LocationMasterFile {
  const path = join(cwd, "prisma/data/uae-location-master-200.json");
  return JSON.parse(readFileSync(path, "utf8")) as LocationMasterFile;
}

export function resolveParentCityName(parentLabel: string | null): string | null {
  if (!parentLabel) return null;
  return PARENT_CITY_ALIASES[parentLabel] ?? parentLabel;
}

export function appLocationType(type: MasterLocationType): "country" | "emirate" | "city" | "community" {
  if (type === "area") return "community";
  return type;
}

export function validateLocationMaster(file: LocationMasterFile): {
  ok: boolean;
  errors: string[];
  counts: {
    total: number;
    country: number;
    emirate: number;
    city: number;
    community: number;
    area: number;
    arabicHigh: number;
    arabicMedium: number;
    arabicReviewRequired: number;
  };
} {
  const errors: string[] = [];
  const locs = file.locations;
  const counts = {
    total: locs.length,
    country: 0,
    emirate: 0,
    city: 0,
    community: 0,
    area: 0,
    arabicHigh: 0,
    arabicMedium: 0,
    arabicReviewRequired: 0,
  };

  if (locs.length !== 200) errors.push(`total must be 200, got ${locs.length}`);
  if (file.meta.actualTotal !== 200) errors.push(`meta.actualTotal must be 200, got ${file.meta.actualTotal}`);

  const slugs = new Set<string>();
  for (const loc of locs) {
    counts[loc.type] = (counts[loc.type] || 0) + 1;
    if (loc.arabicConfidence === "HIGH") counts.arabicHigh += 1;
    else if (loc.arabicConfidence === "MEDIUM") counts.arabicMedium += 1;
    else if (loc.arabicConfidence === "REVIEW_REQUIRED") counts.arabicReviewRequired += 1;
    else errors.push(`${loc.slug}: invalid arabicConfidence ${loc.arabicConfidence}`);

    if (!loc.slug) errors.push(`missing slug for id ${loc.id}`);
    if (slugs.has(loc.slug)) errors.push(`duplicate slug ${loc.slug}`);
    slugs.add(loc.slug);
    if (!loc.nameEn) errors.push(`${loc.slug}: missing nameEn`);
    if (!loc.nameAr) errors.push(`${loc.slug}: missing nameAr`);
  }

  if (counts.country !== 1) errors.push(`country must be 1, got ${counts.country}`);
  if (counts.emirate !== 7) errors.push(`emirates must be 7, got ${counts.emirate}`);
  if (counts.city + counts.community + counts.area !== 192) {
    errors.push(`city+community+area must be 192, got ${counts.city + counts.community + counts.area}`);
  }

  for (const slug of EXISTING_EIGHT_SLUGS) {
    const row = locs.find((l) => l.slug === slug);
    if (!row) errors.push(`missing existing seed slug ${slug}`);
    else if (!row.existingSeed) errors.push(`${slug} must be marked existingSeed`);
  }

  const bySlug = new Map(locs.map((l) => [l.slug, l]));
  const cities = locs.filter((l) => l.type === "city");
  const cityByEmName = new Map(cities.map((c) => [`${c.emirateSlug}|${c.nameEn}`, c]));

  for (const loc of locs) {
    if (loc.type === "country") continue;
    if (loc.type === "emirate") {
      if (!loc.emirateSlug || loc.slug !== loc.emirateSlug) {
        errors.push(`emirate ${loc.slug} slug/emirateSlug mismatch`);
      }
      if (!bySlug.has("uae")) errors.push("missing UAE parent for emirates");
      continue;
    }
    if (!loc.emirateSlug || !bySlug.has(loc.emirateSlug)) {
      errors.push(`${loc.slug}: invalid emirateSlug ${loc.emirateSlug}`);
    }
    if (loc.type === "community" || loc.type === "area") {
      const parentName = resolveParentCityName(loc.parentCityMunicipality);
      if (!parentName) {
        errors.push(`${loc.slug}: missing parentCityMunicipality`);
        continue;
      }
      const key = `${loc.emirateSlug}|${parentName}`;
      if (!cityByEmName.has(key)) {
        errors.push(`${loc.slug}: parent city not found (${key})`);
      }
    }
  }

  if (counts.arabicHigh !== 121) errors.push(`arabic HIGH expected 121, got ${counts.arabicHigh}`);
  if (counts.arabicMedium !== 61) errors.push(`arabic MEDIUM expected 61, got ${counts.arabicMedium}`);
  if (counts.arabicReviewRequired !== 18) {
    errors.push(`arabic REVIEW_REQUIRED expected 18, got ${counts.arabicReviewRequired}`);
  }

  return { ok: errors.length === 0, errors, counts };
}
