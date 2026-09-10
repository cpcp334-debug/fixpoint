/**
 * Coverage operations — covered flag only (no invent, no auto-publish).
 */
import type { PrismaClient } from "@prisma/client";
import { adminAudit } from "@/lib/admin/numbers";
import { coverageDecisionFromRow, type CoverageDecision } from "./publication-eligibility";

export type BulkCoveragePreview = {
  serviceCount: number;
  locationCount: number;
  rowCount: number;
  beforeCovered: number;
  beforeUncovered: number;
  afterCovered: number;
  afterUncovered: number;
  protectedPublishedSkipped: number;
  sampleIds: string[];
};

function isTemporarilyClosed(bookingEnabledOverride: boolean | null) {
  return bookingEnabledOverride === false;
}

export async function previewBulkCoverage(
  prisma: PrismaClient,
  args: { serviceIds: string[]; locationIds: string[]; setCovered: boolean },
): Promise<BulkCoveragePreview> {
  const rows = await prisma.serviceLocation.findMany({
    where: {
      serviceId: { in: args.serviceIds },
      locationId: { in: args.locationIds },
    },
    select: { id: true, covered: true, coverageStatus: true },
  });

  let protectedPublishedSkipped = 0;
  const mutable = rows.filter((r) => {
    if (r.coverageStatus === "published") {
      protectedPublishedSkipped += 1;
      return false;
    }
    return true;
  });

  const beforeCovered = rows.filter((r) => r.covered).length;
  const beforeUncovered = rows.length - beforeCovered;
  let afterCovered = beforeCovered;
  for (const row of mutable) {
    if (args.setCovered && !row.covered) afterCovered += 1;
    if (!args.setCovered && row.covered) afterCovered -= 1;
  }

  return {
    serviceCount: args.serviceIds.length,
    locationCount: args.locationIds.length,
    rowCount: rows.length,
    beforeCovered,
    beforeUncovered,
    afterCovered,
    afterUncovered: rows.length - afterCovered,
    protectedPublishedSkipped,
    sampleIds: mutable.slice(0, 20).map((r) => r.id),
  };
}

/**
 * Apply covered=true/false only. Never changes lifecycle, content, or published rows.
 * TEMPORARILY_CLOSED → covered=false + bookingEnabledOverride=false.
 */
export async function applyCoverageDecision(
  prisma: PrismaClient,
  args: {
    serviceLocationId: string;
    decision: CoverageDecision;
    actor: string;
    reason: string;
  },
) {
  const row = await prisma.serviceLocation.findUniqueOrThrow({
    where: { id: args.serviceLocationId },
    select: {
      id: true,
      covered: true,
      coverageStatus: true,
      indexable: true,
      indexableEn: true,
      indexableAr: true,
      bookingEnabledOverride: true,
      serviceId: true,
      locationId: true,
    },
  });

  if (row.coverageStatus === "published") {
    throw new Error("refusing_to_mutate_published_service_location_coverage");
  }

  const previous = {
    covered: row.covered,
    decision: coverageDecisionFromRow(row.covered, isTemporarilyClosed(row.bookingEnabledOverride)),
    indexable: row.indexable,
    indexableEn: row.indexableEn,
    indexableAr: row.indexableAr,
    bookingEnabledOverride: row.bookingEnabledOverride,
  };

  const nextCovered = args.decision === "COVERED";
  const nextBookingOverride = args.decision === "TEMPORARILY_CLOSED" ? false : null;

  const updated = await prisma.serviceLocation.update({
    where: { id: row.id },
    data: {
      covered: nextCovered,
      // Uncovered / closed must never remain indexable
      indexable: nextCovered ? row.indexable : false,
      indexableEn: nextCovered ? row.indexableEn : false,
      indexableAr: nextCovered ? row.indexableAr : false,
      bookingEnabledOverride: nextBookingOverride,
    },
  });

  await adminAudit({
    actor: args.actor,
    action: "service_location.coverage.set",
    entity: "ServiceLocation",
    entityId: row.id,
    meta: {
      reason: args.reason,
      previous,
      next: {
        covered: updated.covered,
        decision: args.decision,
        indexable: updated.indexable,
        indexableEn: updated.indexableEn,
        indexableAr: updated.indexableAr,
        bookingEnabledOverride: updated.bookingEnabledOverride,
      },
      serviceId: row.serviceId,
      locationId: row.locationId,
    },
  });

  return updated;
}

export async function applyBulkCoverage(
  prisma: PrismaClient,
  args: {
    serviceIds: string[];
    locationIds: string[];
    setCovered: boolean;
    actor: string;
    reason: string;
    confirmToken: string;
    expectedRowCount: number;
  },
) {
  if (args.confirmToken !== "CONFIRM_COVERAGE_CHANGE") {
    throw new Error("confirmation_required");
  }
  const preview = await previewBulkCoverage(prisma, {
    serviceIds: args.serviceIds,
    locationIds: args.locationIds,
    setCovered: args.setCovered,
  });
  if (preview.rowCount !== args.expectedRowCount) {
    throw new Error(`row_count_mismatch:expected_${args.expectedRowCount}_got_${preview.rowCount}`);
  }

  const rows = await prisma.serviceLocation.findMany({
    where: {
      serviceId: { in: args.serviceIds },
      locationId: { in: args.locationIds },
      coverageStatus: { not: "published" },
    },
    select: { id: true },
  });

  let changed = 0;
  for (const row of rows) {
    await applyCoverageDecision(prisma, {
      serviceLocationId: row.id,
      decision: args.setCovered ? "COVERED" : "NOT_COVERED",
      actor: args.actor,
      reason: args.reason,
    });
    changed += 1;
  }

  await adminAudit({
    actor: args.actor,
    action: "service_location.coverage.bulk",
    entity: "ServiceLocation",
    meta: {
      reason: args.reason,
      setCovered: args.setCovered,
      preview,
      changed,
    },
  });

  return { preview, changed };
}
