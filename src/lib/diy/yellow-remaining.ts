/**
 * Remaining YELLOW DIY selection (after A4.2 Batch 2).
 * Excludes category-only hubs + painting-services; skips already-authored Batch 2.
 */
import { loadMatrixRows, MISSING_HUBS } from "@/lib/diy/coverage";
import { selectYellowBatch2 } from "@/lib/diy/yellow-batch";

export const YELLOW_SKIP_PAINTING = "painting-services" as const;
export const YELLOW_REMAINING_BATCH = "A4.2-YELLOW-REMAINING" as const;

export type YellowOffering = {
  offeringSlug: string;
  serviceOffering: string;
  parentSlug: string;
  n: number;
};

export function listAuthorableYellow(cwd = process.cwd()): YellowOffering[] {
  const rows = loadMatrixRows(cwd).filter((r) => r.diyStatus === "YELLOW");
  const out: YellowOffering[] = [];
  for (const row of rows) {
    if ((MISSING_HUBS as readonly string[]).includes(row.offeringSlug)) continue;
    if (row.offeringSlug === YELLOW_SKIP_PAINTING) continue;
    out.push({
      offeringSlug: row.offeringSlug,
      serviceOffering: row.serviceOffering,
      parentSlug: row.parentSlug,
      n: (row as { n?: number }).n ?? 0,
    });
  }
  return out;
}

/** Already authored in Batch 2 (first 20 authorable). */
export function listBatch2AuthoredSlugs(cwd = process.cwd()): Set<string> {
  return new Set(selectYellowBatch2(cwd).selected.map((s) => s.offeringSlug));
}

export function listRemainingYellow(cwd = process.cwd()): YellowOffering[] {
  const authored = listBatch2AuthoredSlugs(cwd);
  // Also exclude already-written remaining batch (idempotent reruns)
  try {
    const { readFileSync, existsSync } = require("node:fs") as typeof import("node:fs");
    const { join } = require("node:path") as typeof import("node:path");
    const reportPath = join(cwd, "docs/diy-authoring-a42-yellow-remaining.json");
    if (existsSync(reportPath)) {
      const report = JSON.parse(readFileSync(reportPath, "utf8")) as {
        authored?: Array<{ slug: string }>;
        meta?: { heldReviewRequired?: string[] };
      };
      for (const row of report.authored || []) authored.add(row.slug);
      // Held items still count as processed for "remaining eligible" — they need human review, not re-author
      for (const slug of report.meta?.heldReviewRequired || []) authored.add(slug);
    }
  } catch {
    /* ignore missing report */
  }
  return listAuthorableYellow(cwd).filter((r) => !authored.has(r.offeringSlug));
}

export function selectRemainingYellowBatch(
  size: number,
  offset = 0,
  cwd = process.cwd(),
): { selected: YellowOffering[]; totalRemaining: number; offset: number } {
  const all = listRemainingYellow(cwd);
  const selected = all.slice(offset, offset + size);
  return { selected, totalRemaining: all.length, offset };
}
