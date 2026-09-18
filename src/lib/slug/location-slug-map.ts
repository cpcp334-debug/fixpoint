/**
 * Maps research-master Latin location slugs to public Arabic forms.
 * DB primary `slug` stays Latin; Arabic lives in scripts/_slug-maps.json.
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { normalizeRouteSlug } from "@/lib/slug/route-slug";

let cachedForward: Record<string, string> | null = null;
let cachedReverse: Record<string, string> | null = null;

const EMIRATE_LATIN_TO_AR: Record<string, string> = {
  "abu-dhabi": "\u0623\u0628\u0648\u0638\u0628\u064a",
  dubai: "\u062f\u0628\u064a",
  sharjah: "\u0627\u0644\u0634\u0627\u0631\u0642\u0629",
  ajman: "\u0639\u062c\u0645\u0627\u0646",
  "umm-al-quwain": "\u0623\u0645-\u0627\u0644\u0642\u064a\u0648\u064a\u0646",
  "ras-al-khaimah": "\u0631\u0623\u0633-\u0627\u0644\u062e\u064a\u0645\u0629",
  fujairah: "\u0627\u0644\u0641\u062c\u064a\u0631\u0629",
};

function loadMaps() {
  if (cachedForward && cachedReverse) return;
  const forward: Record<string, string> = { ...EMIRATE_LATIN_TO_AR };
  const path = join(process.cwd(), "scripts/_slug-maps.json");
  if (existsSync(path)) {
    try {
      const raw = JSON.parse(readFileSync(path, "utf8")) as { location?: Record<string, string> };
      Object.assign(forward, raw.location || {});
    } catch {
      // keep emirate fallbacks
    }
  }
  const reverse: Record<string, string> = {};
  for (const [latin, ar] of Object.entries(forward)) {
    reverse[ar] = latin;
  }
  cachedForward = forward;
  cachedReverse = reverse;
}

/** Latin master slug to public Arabic slug (identity if already Arabic / unknown). */
export function toPublicLocationSlug(slug: string): string {
  loadMaps();
  const decoded = normalizeRouteSlug(slug);
  return cachedForward![decoded] ?? cachedForward![slug] ?? decoded;
}

/** Public Arabic slug to Latin master slug for research-master lookups. */
export function toMasterLocationSlug(slug: string): string {
  loadMaps();
  const decoded = normalizeRouteSlug(slug);
  if (!/[\u0600-\u06FF]/.test(decoded)) return decoded;
  return cachedReverse![decoded] ?? decoded;
}

export function isKnownEmirateSlug(slug: string): boolean {
  loadMaps();
  if (slug in EMIRATE_LATIN_TO_AR) return true;
  return Object.values(EMIRATE_LATIN_TO_AR).includes(slug);
}
