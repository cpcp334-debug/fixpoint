/**
 * A3.2 ServiceLocation coverage pilot verification (state-aware).
 * Historical checkpoint was 99 rows; live DB may include expanded
 * approved-matrix + documented legacy pairs. See population.ts.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { APPROVED_CHILDREN, childSlug } from "../prisma/data/catalog-a1";
import {
  A32_PILOT_LOCATION_SLUGS,
  A32_PILOT_PAIR_COUNT,
  A32_PILOT_SERVICE_SLUGS,
  a32PilotPairs,
} from "../prisma/data/service-location-a32-pilot";
import { listServicePages } from "../src/lib/admin/service-pages";
import { getServiceLocation, publicServiceLocationWhere } from "../src/lib/catalog";
import { evaluateServiceLocationGates } from "../src/lib/service-location/gates";
import { resolveDiyInheritance } from "../src/lib/service-location/diy";
import { resolveEffectiveOps, wouldWeakenSafety } from "../src/lib/service-location/overrides";
import { resolveImageInheritance } from "../src/lib/service-location/images";
import { arabicConfidenceForSlug } from "../src/lib/service-location/arabic";
import {
  assertPopulationInvariants,
  measureServiceLocationPopulation,
} from "../src/lib/service-location/population";
import { prisma } from "../src/server/db";

function assert(cond: unknown, message: string): asserts cond {
  if (!cond) throw new Error(message);
}

function isEmptyContent(value: string | null | undefined) {
  return !value || value.replace(/\s+/g, " ").trim() === "" || value === "[]";
}

async function main() {
  assert(A32_PILOT_PAIR_COUNT === 50, "pilot pair count must be 50");
  const approvedChildSlugs = new Set(APPROVED_CHILDREN.map(childSlug));
  for (const slug of A32_PILOT_SERVICE_SLUGS) {
    assert(approvedChildSlugs.has(slug), `${slug} must be approved A1 child`);
  }

  const population = await measureServiceLocationPopulation(prisma);
  assertPopulationInvariants(population);

  const published = await prisma.serviceLocation.findMany({
    where: { coverageStatus: "published", covered: true, indexable: true },
    include: {
      service: { select: { slug: true, status: true } },
      location: { select: { slug: true, type: true } },
      translations: true,
      revisions: true,
    },
    orderBy: { id: "asc" },
  });
  assert(published.length === 49, `original published covered rows must remain 49, got ${published.length}`);
  for (const row of published) {
    assert(row.service.status === "active", `${row.service.slug} published pair service must stay active`);
    assert(row.location.type === "emirate", `${row.location.slug} published pair must stay emirate`);
    assert(row.indexableEn && row.indexableAr, `${row.id} grandfathered locale index flags`);
    assert(row.revisions.length >= 2, `${row.id} must keep EN/AR revisions`);
  }

  const services = await prisma.service.findMany({
    where: { slug: { in: [...A32_PILOT_SERVICE_SLUGS] } },
    include: { diyGuides: true },
  });
  const locations = await prisma.location.findMany({
    where: { slug: { in: [...A32_PILOT_LOCATION_SLUGS] } },
  });
  assert(services.length === 10 && locations.length === 5, "pilot service/location catalog rows missing");
  const serviceBySlug = new Map(services.map((s) => [s.slug, s]));
  const locationBySlug = new Map(locations.map((l) => [l.slug, l]));

  const pilotPairsReport: Array<Record<string, unknown>> = [];
  let pilotI18n = 0;
  let pilotRevisions = 0;

  for (const pair of a32PilotPairs()) {
    const service = serviceBySlug.get(pair.serviceSlug)!;
    const location = locationBySlug.get(pair.locationSlug)!;
    const row = await prisma.serviceLocation.findUnique({
      where: { serviceId_locationId: { serviceId: service.id, locationId: location.id } },
      include: { translations: true, revisions: true },
    });
    assert(row, `missing pilot pair ${pair.serviceSlug}/${pair.locationSlug}`);
    assert(row.coverageStatus === "draft", `${pair.serviceSlug}/${pair.locationSlug} must be DRAFT`);
    assert(row.covered === false, `${pair.serviceSlug}/${pair.locationSlug} covered must be false`);
    assert(row.indexable === false, `${pair.serviceSlug}/${pair.locationSlug} indexable must be false`);
    assert(row.indexableEn === false, `${pair.serviceSlug}/${pair.locationSlug} indexableEn must be false`);
    assert(row.indexableAr === false, `${pair.serviceSlug}/${pair.locationSlug} indexableAr must be false`);
    assert(row.bookingEnabledOverride === null, "booking override must be null");
    assert(row.amcAvailableOverride === null, "amc override must be null");
    assert(row.emergencyAvailableOverride === null, "emergency override must be null");
    assert(row.diyRestricted === false, "diyRestricted default false");
    // Post content-production: draft revisions/i18n may exist; pilots must remain draft/uncovered/noindex.
    const publishedRevs = row.revisions.filter((r) => r.status === "published");
    assert(publishedRevs.length === 0, `${pair.serviceSlug}/${pair.locationSlug} must have no published revisions`);
    const en = row.translations.find((t) => t.locale === "en");
    const ar = row.translations.find((t) => t.locale === "ar");
    assert(en && ar, `${pair.serviceSlug}/${pair.locationSlug} must have EN+AR i18n shells`);
    pilotI18n += row.translations.length;
    pilotRevisions += row.revisions.length;

    const ops = resolveEffectiveOps({
      bookingEnabledOverride: row.bookingEnabledOverride,
      amcAvailableOverride: row.amcAvailableOverride,
      emergencyAvailableOverride: row.emergencyAvailableOverride,
      diyRestricted: row.diyRestricted,
      serviceBookingEnabled: service.bookingEnabled,
      serviceAmcAvailable: service.amcAvailable,
      serviceEmergencyAvailable: service.emergencyAvailable,
      serviceDiyAvailable: service.diyAvailable,
      serviceRiskLevel: service.riskLevel,
    });
    assert(ops.bookingEnabled === service.bookingEnabled, "booking inherits from service");
    assert(ops.amcAvailable === service.amcAvailable, "amc inherits from service");
    assert(ops.emergencyAvailable === service.emergencyAvailable, "emergency inherits from service");
    assert(wouldWeakenSafety({ serviceRiskLevel: "red", attemptedDiyAvailable: true }), "cannot enable DIY on red");
    assert(wouldWeakenSafety({ serviceRiskLevel: "red", attemptedRiskLevel: "green" }), "cannot weaken red→green");
    const guide = service.diyGuides.find((g) => g.status === "published") ?? service.diyGuides[0] ?? null;
    const diy = resolveDiyInheritance({
      serviceRiskLevel: service.riskLevel,
      serviceDiyAvailable: service.diyAvailable,
      diyRestricted: row.diyRestricted,
      serviceSlug: service.slug,
      guide: guide ? { id: guide.id, slug: guide.slug, riskLevel: guide.riskLevel, status: guide.status } : null,
    });
    assert(diy.safetyWeakened === false, "DIY inheritance must not weaken safety");
    const image = resolveImageInheritance({
      heroImageOverride: row.heroImageOverride,
      serviceHeroImage: service.heroImage,
      serviceName: service.slug,
      locationName: location.slug,
      locale: "en",
    });
    assert(image.gatePass, "image inheritance fallback gatePass");

    const gates = evaluateServiceLocationGates({
      covered: row.covered,
      coverageStatus: row.coverageStatus,
      serviceStatus: service.status,
      locationStatus: location.status,
      locationServes: location.serves,
      bookingEnabledOverride: row.bookingEnabledOverride,
      amcAvailableOverride: row.amcAvailableOverride,
      emergencyAvailableOverride: row.emergencyAvailableOverride,
      diyRestricted: row.diyRestricted,
      serviceBookingEnabled: service.bookingEnabled,
      serviceAmcAvailable: service.amcAvailable,
      serviceEmergencyAvailable: service.emergencyAvailable,
      serviceDiyAvailable: service.diyAvailable,
      serviceRiskLevel: service.riskLevel,
      indexableStored: row.indexable,
      qualityStatus: row.qualityStatus,
      qualityScore: row.qualityScore,
      serviceIndexable: service.indexable,
      locationIndexable: location.indexable,
      locationSlug: location.slug,
      serviceSlug: service.slug,
      serviceHeroImage: service.heroImage,
      heroImageOverride: row.heroImageOverride,
      en,
      ar,
      arabicConfidence: arabicConfidenceForSlug(location.slug),
      diySafetyClass: diy.safetyClass,
      safetyReviewComplete: diy.safetyClass !== "RED" && diy.safetyClass !== "REVIEW_REQUIRED",
      uniqueTitleEn: true,
      uniqueTitleAr: true,
      uniqueMetaEn: true,
      uniqueMetaAr: true,
      duplicateSimilarityOk: true,
      claimScanOk: true,
      thinContentOk: true,
      humanApproved: Boolean(row.approvedBy),
    });
    assert(!gates.indexableEn, `${pair.serviceSlug}/${pair.locationSlug} EN must not index`);
    assert(!gates.indexableAr, `${pair.serviceSlug}/${pair.locationSlug} AR must not index`);
    assert(!gates.pairIndexable, `${pair.serviceSlug}/${pair.locationSlug} pair must not index`);
    assert(
      gates.failures.some((f) => f.code === "lifecycle_draft" || f.code === "not_published" || f.code === "en_incomplete"),
      `${pair.serviceSlug}/${pair.locationSlug} quality/index gates must fail for empty draft`,
    );

    const publicRow = await getServiceLocation(pair.serviceSlug, pair.locationSlug, "en");
    assert(!publicRow, `draft pilot must not resolve publicly: ${pair.serviceSlug}/${pair.locationSlug}`);

    pilotPairsReport.push({
      service: pair.serviceSlug,
      location: pair.locationSlug,
      coverageStatus: row.coverageStatus,
      covered: row.covered,
      indexableEn: row.indexableEn,
      indexableAr: row.indexableAr,
      bookingEffective: ops.bookingEnabled,
      amcEffective: ops.amcAvailable,
      emergencyEffective: ops.emergencyAvailable,
      diyVisible: diy.visible,
      diySafety: diy.safetyClass,
      imageSource: image.source,
      gateIndexableEn: gates.indexableEn,
      gateIndexableAr: gates.indexableAr,
    });
  }

  const duplicateCheck = await prisma.serviceLocation.groupBy({
    by: ["serviceId", "locationId"],
    _count: true,
  });
  assert(
    duplicateCheck.every((g) => g._count === 1),
    "duplicate service/location pairs exist",
  );

  // Admin filters: do not load all draft rows at matrix scale — query pilots + bounded filters only.
  const pilotAdminRows = await prisma.serviceLocation.findMany({
    where: {
      service: { slug: { in: [...A32_PILOT_SERVICE_SLUGS] } },
      location: { slug: { in: [...A32_PILOT_LOCATION_SLUGS] } },
      coverageStatus: "draft",
      covered: false,
    },
    select: { id: true },
  });
  assert(pilotAdminRows.length === 50, `admin/pilot draft pairs must be 50, got ${pilotAdminRows.length}`);
  const byService = await listServicePages({ service: "villa-cleaning" });
  assert(
    byService.length === 100,
    `admin listServicePages is capped at 100 for scale; villa-cleaning filter must return 100, got ${byService.length}`,
  );
  const byLocation = await listServicePages({ location: "dubai-marina" });
  assert(
    byLocation.length === 100,
    `admin listServicePages is capped at 100 for scale; dubai-marina filter must return 100, got ${byLocation.length}`,
  );
  const villaTotal = await prisma.serviceLocation.count({ where: { service: { slug: "villa-cleaning" } } });
  assert(villaTotal === 200, `DB must still have 200 villa-cleaning pairs (admin UI paginated), got ${villaTotal}`);
  const marinaTotal = await prisma.serviceLocation.count({ where: { location: { slug: "dubai-marina" } } });
  assert(
    marinaTotal === population.servicesInDb,
    `DB must still have one dubai-marina row per service (${population.servicesInDb}), got ${marinaTotal}`,
  );

  const publicIndexable = await prisma.serviceLocation.count({ where: publicServiceLocationWhere });
  assert(publicIndexable === 49, `public indexable ServiceLocation must stay 49, got ${publicIndexable}`);

  const samplePublic = await getServiceLocation("cleaning-services", "dubai", "en");
  assert(samplePublic, "existing /cleaning-services/dubai must still resolve");

  const sitemapSrc = readFileSync(join(process.cwd(), "src/app/sitemap.ts"), "utf8");
  assert(sitemapSrc.includes("pair.service.slug") || sitemapSrc.includes("generateSitemaps"), "sitemap still uses pair query / shards");
  const seedSrc = readFileSync(join(process.cwd(), "prisma/seed.ts"), "utf8");
  assert(!seedSrc.includes("service-location-a32") && !seedSrc.includes("A32_PILOT"), "pilot not wired into seed");

  const locationTotal = await prisma.location.count();
  assert(locationTotal === 200, `locations must stay 200, got ${locationTotal}`);

  // Draft expansion must not be publicly indexable beyond the 49 grandfathered
  const draftIndexable = await prisma.serviceLocation.count({
    where: { coverageStatus: "draft", OR: [{ indexable: true }, { indexableEn: true }, { indexableAr: true }] },
  });
  assert(draftIndexable === 0, `unexpected indexable draft rows: ${draftIndexable}`);

  console.log(
    JSON.stringify(
      {
        historicalCheckpoint: 99,
        approvedMatrixRows: population.classification.approvedMatrixRows,
        legacyOutsideMatrixRows: population.classification.legacyOutsideMatrixRows,
        total: population.serviceLocationTotal,
        equation: population.equation,
        population,
        publishedPreserved: published.length,
        pilotsPreserved: population.pilotsPreserved,
        pilotI18n,
        pilotRevisions,
        publicIndexable,
        adminDraftPilot: pilotAdminRows.length,
        pairs: pilotPairsReport,
      },
      null,
      2,
    ),
  );
  console.log("A3.2 ServiceLocation coverage pilot verification PASSED");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
