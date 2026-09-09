/**
 * A4.2 Batch 2 — select exactly 20 authorable YELLOW offerings.
 * Skips 6 unresolved hubs + painting-services; continues matrix order.
 */
import { loadMatrixRows, MISSING_HUBS } from "@/lib/diy/coverage";

export const YELLOW_BATCH2_SKIP_HUBS = [
  "refrigerator",
  "microwave",
  "washing-machine",
  "water-heater",
  "dishwasher",
  "oven",
] as const;

export const YELLOW_BATCH2_SKIP_PAINTING = "painting-services" as const;

export const YELLOW_BATCH2_SIZE = 20;

export type YellowBatch2Selection = {
  selected: Array<{ offeringSlug: string; serviceOffering: string; parentSlug: string; n: number }>;
  skippedHubs: string[];
  skippedPainting: boolean;
};

export function selectYellowBatch2(cwd = process.cwd()): YellowBatch2Selection {
  const rows = loadMatrixRows(cwd).filter((r) => r.diyStatus === "YELLOW");
  const skippedHubs: string[] = [];
  let skippedPainting = false;
  const selected: YellowBatch2Selection["selected"] = [];

  for (const row of rows) {
    if ((YELLOW_BATCH2_SKIP_HUBS as readonly string[]).includes(row.offeringSlug)) {
      skippedHubs.push(row.offeringSlug);
      continue;
    }
    if (row.offeringSlug === YELLOW_BATCH2_SKIP_PAINTING) {
      skippedPainting = true;
      continue;
    }
    // Hubs list includes burner-cooker (RED) — also skip any MISSING_HUBS generally
    if ((MISSING_HUBS as readonly string[]).includes(row.offeringSlug)) {
      if (!skippedHubs.includes(row.offeringSlug)) skippedHubs.push(row.offeringSlug);
      continue;
    }
    selected.push({
      offeringSlug: row.offeringSlug,
      serviceOffering: row.serviceOffering,
      parentSlug: row.parentSlug,
      n: (row as { n?: number }).n ?? 0,
    });
    if (selected.length >= YELLOW_BATCH2_SIZE) break;
  }

  return { selected, skippedHubs, skippedPainting };
}
