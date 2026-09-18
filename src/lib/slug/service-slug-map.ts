/**
 * Maps research-master Latin service slugs to public Arabic primary slugs.
 * Approved nav / seed still use Latin keys; DB/public URLs use Arabic after Phase 2.
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

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
  return cachedForward![slug] ?? slug;
}

/** Public Arabic slug → Latin master slug for approved-nav / seed lookups. */
export function toMasterServiceSlug(slug: string): string {
  loadMaps();
  return cachedReverse![slug] ?? slug;
}
