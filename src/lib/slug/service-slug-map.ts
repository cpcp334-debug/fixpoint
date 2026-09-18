/**
 * Maps research-master Latin service slugs to public Arabic forms.
 * DB primary `slug` stays Latin; Arabic lives in scripts/_slug-maps.json.
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { normalizeRouteSlug } from "@/lib/slug/route-slug";

let cachedForward: Record<string, string> | null = null;
let cachedReverse: Record<string, string> | null = null;

function loadMaps() {
  if (cachedForward && cachedReverse) return;
  const forward: Record<string, string> = {};
  const path = join(process.cwd(), "scripts/_slug-maps.json");
  if (existsSync(path)) {
    try {
      const raw = JSON.parse(readFileSync(path, "utf8")) as { service?: Record<string, string> };
      Object.assign(forward, raw.service || {});
    } catch {
      // keep empty — lookups fall back to identity
    }
  }
  const reverse: Record<string, string> = {};
  for (const [latin, ar] of Object.entries(forward)) {
    reverse[ar] = latin;
  }
  cachedForward = forward;
  cachedReverse = reverse;
}

/** Latin master slug → public Arabic slug (identity if already Arabic / unknown). */
export function toPublicServiceSlug(slug: string): string {
  loadMaps();
  const decoded = normalizeRouteSlug(slug);
  return cachedForward![decoded] ?? cachedForward![slug] ?? decoded;
}

/** Public Arabic slug → Latin master slug for approved-nav / seed lookups. */
export function toMasterServiceSlug(slug: string): string {
  loadMaps();
  const decoded = normalizeRouteSlug(slug);
  if (!/[\u0600-\u06FF]/.test(decoded)) return decoded;
  return cachedReverse![decoded] ?? decoded;
}
