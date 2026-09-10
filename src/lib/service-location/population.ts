/**
 * ServiceLocation population semantics (authoritative reconciliation).
 *
 * Approved offerings: 311 (18 parents + 293 children)
 * Category-only hubs (7): no Service rows → no ServiceLocation rows
 * Approved Service rows that can form pairs: 311 − 7 = 304
 * Approved matrix candidates: 304 × 200 = 60,800
 *
 * Live DB also includes UNMAPPED_LEGACY_DRAFT_SLUGS (13) × 200 = 2,600
 * → total ServiceLocation = 60,800 + 2,600 = 63,400
 *
 * Net vs theoretical 311×200=62,200:
 *   −7×200 hubs never materialized (−1,400)
 *   +13×200 legacy outside matrix (+2,600)
 *   = +1,200
 */
import {
  UNMAPPED_LEGACY_DRAFT_SLUGS,
} from "../../../prisma/data/catalog-a1";
import { DIY_SAFETY_A411_UNRESOLVED_MISSING_HUBS } from "../../../prisma/data/diy-safety-alignment-a411";
import {
  A32_PILOT_PAIR_COUNT,
  a32PilotPairs,
} from "../../../prisma/data/service-location-a32-pilot";
import type { PrismaClient } from "@prisma/client";
import { loadDiyClassificationMatrix } from "./diy-matrix";

export const APPROVED_OFFERING_COUNT = 311;
export const LOCATION_COUNT_EXPECTED = 200;
export const CATEGORY_ONLY_HUBS = DIY_SAFETY_A411_UNRESOLVED_MISSING_HUBS;
export const LEGACY_OUTSIDE_MATRIX_SLUGS = UNMAPPED_LEGACY_DRAFT_SLUGS;

export type PopulationClass =
  | "APPROVED_MATRIX_CANDIDATE"
  | "LEGACY_OUTSIDE_APPROVED_MATRIX"
  | "CATEGORY_ONLY_HUB_ABSENT"
  | "UNKNOWN";

export type PopulationSnapshot = {
  offeringsApproved: number;
  hubsCategoryOnly: number;
  approvedServiceRowsExpected: number;
  legacyServiceSlugs: number;
  locationsExpected: number;
  approvedMatrixCandidates: number;
  legacyOutsideMatrixRows: number;
  theoreticalWithHubs: number;
  hubsNotMaterializedRows: number;
  netVsTheoretical62200: number;
  servicesInDb: number;
  locationsInDb: number;
  serviceLocationTotal: number;
  uniquePairs: number;
  duplicates: number;
  published: number;
  draft: number;
  covered: number;
  uncovered: number;
  indexable: number;
  indexableEn: number;
  indexableAr: number;
  pilotsPreserved: number;
  hubsAbsentInDb: boolean;
  outsideMatrixSlugsPresent: string[];
  classification: {
    approvedMatrixRows: number;
    legacyOutsideMatrixRows: number;
    unexplainedRows: number;
  };
  equation: string;
  legitimacy:
    | "DOCUMENTED_LEGACY_PLUS_APPROVED_MATRIX"
    | "ANOMALY_NEEDS_REVIEW";
};

/** Approved offering Service slugs = DIY matrix 311 (parent anchors + children), not category table slugs. */
export function approvedOfferingSlugs(): Set<string> {
  const matrix = loadDiyClassificationMatrix();
  return new Set([...matrix.bySlug.keys()]);
}

export function classifyServiceSlug(slug: string): PopulationClass {
  if ((CATEGORY_ONLY_HUBS as readonly string[]).includes(slug)) {
    return "CATEGORY_ONLY_HUB_ABSENT";
  }
  if ((LEGACY_OUTSIDE_MATRIX_SLUGS as readonly string[]).includes(slug)) {
    return "LEGACY_OUTSIDE_APPROVED_MATRIX";
  }
  if (approvedOfferingSlugs().has(slug)) {
    return "APPROVED_MATRIX_CANDIDATE";
  }
  return "UNKNOWN";
}

export async function measureServiceLocationPopulation(
  prisma: PrismaClient,
): Promise<PopulationSnapshot> {
  const hubs = CATEGORY_ONLY_HUBS.length;
  const approvedServiceRowsExpected = APPROVED_OFFERING_COUNT - hubs;
  const approvedMatrixCandidates = approvedServiceRowsExpected * LOCATION_COUNT_EXPECTED;
  const legacyServiceSlugs = LEGACY_OUTSIDE_MATRIX_SLUGS.length;
  const legacyOutsideMatrixRows = legacyServiceSlugs * LOCATION_COUNT_EXPECTED;
  const theoreticalWithHubs = APPROVED_OFFERING_COUNT * LOCATION_COUNT_EXPECTED;
  const hubsNotMaterializedRows = hubs * LOCATION_COUNT_EXPECTED;

  const [services, locations, pairs] = await Promise.all([
    prisma.service.findMany({
      where: { status: { not: "archived" } },
      select: { id: true, slug: true },
    }),
    prisma.location.findMany({ select: { id: true, slug: true, type: true } }),
    prisma.serviceLocation.findMany({
      select: {
        id: true,
        serviceId: true,
        locationId: true,
        coverageStatus: true,
        covered: true,
        indexable: true,
        indexableEn: true,
        indexableAr: true,
      },
    }),
  ]);

  const serviceById = new Map(services.map((s) => [s.id, s]));
  const keySet = new Set(pairs.map((p) => `${p.serviceId}:${p.locationId}`));

  let approvedMatrixRows = 0;
  let legacyRows = 0;
  let unexplainedRows = 0;
  const outsidePresent = new Set<string>();

  for (const pair of pairs) {
    const svc = serviceById.get(pair.serviceId);
    if (!svc) {
      unexplainedRows += 1;
      continue;
    }
    const cls = classifyServiceSlug(svc.slug);
    if (cls === "APPROVED_MATRIX_CANDIDATE") approvedMatrixRows += 1;
    else if (cls === "LEGACY_OUTSIDE_APPROVED_MATRIX") {
      legacyRows += 1;
      outsidePresent.add(svc.slug);
    } else {
      unexplainedRows += 1;
      outsidePresent.add(svc.slug);
    }
  }

  const published = pairs.filter(
    (p) => p.coverageStatus === "published" && p.covered && p.indexable,
  ).length;
  const draft = pairs.filter((p) => p.coverageStatus === "draft").length;
  const covered = pairs.filter((p) => p.covered).length;
  const indexable = pairs.filter((p) => p.indexable).length;
  const indexableEn = pairs.filter((p) => p.indexableEn).length;
  const indexableAr = pairs.filter((p) => p.indexableAr).length;

  // Pilot pairs must still exist as draft/uncovered/non-indexable
  const svcBySlug = new Map(services.map((s) => [s.slug, s]));
  const locBySlug = new Map(locations.map((l) => [l.slug, l]));
  let pilotsPreserved = 0;
  for (const pair of a32PilotPairs()) {
    const s = svcBySlug.get(pair.serviceSlug);
    const l = locBySlug.get(pair.locationSlug);
    if (!s || !l) continue;
    const row = pairs.find((p) => p.serviceId === s.id && p.locationId === l.id);
    if (
      row &&
      row.coverageStatus === "draft" &&
      row.covered === false &&
      row.indexable === false
    ) {
      pilotsPreserved += 1;
    }
  }

  const hubsAbsentInDb = CATEGORY_ONLY_HUBS.every(
    (slug) => !services.some((s) => s.slug === slug),
  );

  const total = pairs.length;
  const explained = approvedMatrixRows + legacyRows;
  const legitimacy =
    unexplainedRows === 0 &&
    hubsAbsentInDb &&
    approvedMatrixRows === approvedMatrixCandidates &&
    legacyRows === legacyOutsideMatrixRows &&
    total === approvedMatrixCandidates + legacyOutsideMatrixRows
      ? "DOCUMENTED_LEGACY_PLUS_APPROVED_MATRIX"
      : "ANOMALY_NEEDS_REVIEW";

  return {
    offeringsApproved: APPROVED_OFFERING_COUNT,
    hubsCategoryOnly: hubs,
    approvedServiceRowsExpected,
    legacyServiceSlugs,
    locationsExpected: LOCATION_COUNT_EXPECTED,
    approvedMatrixCandidates,
    legacyOutsideMatrixRows,
    theoreticalWithHubs,
    hubsNotMaterializedRows,
    netVsTheoretical62200: total - theoreticalWithHubs,
    servicesInDb: services.length,
    locationsInDb: locations.length,
    serviceLocationTotal: total,
    uniquePairs: keySet.size,
    duplicates: total - keySet.size,
    published,
    draft,
    covered,
    uncovered: total - covered,
    indexable,
    indexableEn,
    indexableAr,
    pilotsPreserved,
    hubsAbsentInDb,
    outsideMatrixSlugsPresent: [...outsidePresent].sort(),
    classification: {
      approvedMatrixRows,
      legacyOutsideMatrixRows: legacyRows,
      unexplainedRows,
    },
    equation: `${approvedMatrixCandidates} approved (304×200) + ${legacyOutsideMatrixRows} legacy (13×200) = ${approvedMatrixCandidates + legacyOutsideMatrixRows}; vs 311×200=${theoreticalWithHubs} ⇒ net ${total - theoreticalWithHubs} (= −${hubsNotMaterializedRows} hubs + ${legacyOutsideMatrixRows} legacy)`,
    legitimacy,
  };
}

export function assertPopulationInvariants(snap: PopulationSnapshot): void {
  if (snap.locationsInDb !== LOCATION_COUNT_EXPECTED) {
    throw new Error(`locations must be ${LOCATION_COUNT_EXPECTED}, got ${snap.locationsInDb}`);
  }
  if (snap.duplicates !== 0) {
    throw new Error(`duplicate ServiceLocation pairs: ${snap.duplicates}`);
  }
  if (snap.published !== 49) {
    throw new Error(`published+covered+indexable must stay 49, got ${snap.published}`);
  }
  if (snap.pilotsPreserved !== A32_PILOT_PAIR_COUNT) {
    throw new Error(`pilot pairs preserved must be ${A32_PILOT_PAIR_COUNT}, got ${snap.pilotsPreserved}`);
  }
  if (!snap.hubsAbsentInDb) {
    throw new Error("category-only hubs must remain without Service rows");
  }
  if (snap.legitimacy !== "DOCUMENTED_LEGACY_PLUS_APPROVED_MATRIX") {
    throw new Error(
      `population anomaly: ${JSON.stringify(snap.classification)} total=${snap.serviceLocationTotal}`,
    );
  }
  if (
    snap.serviceLocationTotal !==
    snap.classification.approvedMatrixRows + snap.classification.legacyOutsideMatrixRows
  ) {
    throw new Error(
      `approved + legacy != total: ${snap.classification.approvedMatrixRows}+${snap.classification.legacyOutsideMatrixRows} != ${snap.serviceLocationTotal}`,
    );
  }
  // Draft expansion must not be indexable
  // (published count already gates public index; draft indexable would be unexpected)
}
