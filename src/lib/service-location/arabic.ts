import { loadLocationMaster, type MasterArabicConfidence } from "../../../prisma/data/location-master";
import type { ArabicConfidence } from "./types";

let cache: Map<string, MasterArabicConfidence> | null = null;

export function arabicConfidenceForSlug(slug: string): ArabicConfidence {
  if (!cache) {
    const master = loadLocationMaster();
    cache = new Map(master.locations.map((row) => [row.slug, row.arabicConfidence]));
  }
  return cache.get(slug) ?? "UNKNOWN";
}

export function arabicIndexBlocked(confidence: ArabicConfidence) {
  return confidence === "REVIEW_REQUIRED" || confidence === "UNKNOWN";
}
