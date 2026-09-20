/**
 * FINAL-1 controlled coverage + publication workflow verification.
 * Does not publish. Does not invent coverage.
 */
import { prisma } from "../src/server/db";
import { measureServiceLocationPopulation } from "../src/lib/service-location/population";
import { evaluatePublicationEligibility } from "../src/lib/service-location/publication-eligibility";
import { previewBulkCoverage, applyCoverageDecision } from "../src/lib/service-location/coverage-ops";
import { coverageLifecycleAllowed } from "../src/lib/service-location/coverage";
import { can } from "../src/lib/admin/rbac";
import { publicServiceLocationWhere } from "../src/lib/catalog";
import { SITEMAP_PAIR_SHARDS } from "../src/app/sitemap";

function assert(cond: unknown, message: string): asserts cond {
  if (!cond) throw new Error(message);
}

async function main() {
  const pop = await measureServiceLocationPopulation(prisma);
  assert(pop.offeringsApproved === 311 || pop.classification.approvedMatrixRows === 60800, "matrix candidates");
  assert(pop.serviceLocationTotal === 63400, "total 63400");
  assert(pop.classification.approvedMatrixRows === 60800, "60800 matrix");
  assert(pop.classification.legacyOutsideMatrixRows === 2600, "2600 legacy");
  assert(pop.serviceLocationTotal - 62200 === 1200, "1200 documented extra vs 62200");
  assert(pop.duplicates === 0, "no duplicate pairs");
  assert(pop.published === 49, "49 published protected");
  assert(pop.indexableEn === 49 && pop.indexableAr === 49, "49 indexable");
  assert(pop.pilotsPreserved === 50, "50 pilots preserved");

  const services = await prisma.service.count();
  const locations = await prisma.location.count();
  assert(services === 317, "317 service rows (304+13)");
  assert(locations === 200, "200 locations");

  // Eligibility: uncovered publishable is NOT publishable for index
  const sample = await prisma.serviceLocation.findFirst({
    where: { covered: false, qualityStatus: "publishable", coverageStatus: { not: "published" } },
    include: { translations: true, service: true, location: true },
  });
  if (sample) {
    const en = sample.translations.find((t) => t.locale === "en");
    const elig = evaluatePublicationEligibility({
      serviceValid: true,
      locationValid: true,
      serviceActive: sample.service.status === "active",
      locationActive: sample.location.status === "active",
      locationServes: sample.location.serves,
      covered: false,
      coverageStatus: sample.coverageStatus,
      qualityStatus: sample.qualityStatus,
      qualityScore: sample.qualityScore,
      indexable: false,
      indexableEn: false,
      indexableAr: false,
      diySafetyClass: "GREEN",
      diySafetyOk: true,
      arabicConfidence: "HIGH",
      en: en
        ? {
            locale: "en",
            intro: en.intro,
            localInfo: en.localInfo,
            seoTitle: en.seoTitle,
            metaDescription: en.metaDescription,
            faq: en.faq,
            h1: en.h1,
            body: en.body,
            directAnswer: en.directAnswer,
            geoIntro: en.geoIntro,
            imageAlt: en.imageAlt,
          }
        : null,
      ar: null,
      heroImageOverride: null,
      serviceHeroImage: null,
      objectStorageConfigured: false,
      allowApprovedImageFallback: true,
    });
    assert(!elig.eligibleEn, "uncovered must not be eligible");
    assert(elig.blockReasons.includes("COVERAGE_MISSING"), "coverage missing block");
  }

  // Lifecycle transitions
  assert(coverageLifecycleAllowed("draft", "review"), "draft→review");
  assert(coverageLifecycleAllowed("review", "approved"), "review→approved");
  assert(coverageLifecycleAllowed("approved", "published"), "approved→published");
  assert(!coverageLifecycleAllowed("draft", "published"), "no draft→published skip");

  // RBAC
  assert(can("content_manager", "services"), "content_manager services");
  assert(can("manager", "services"), "manager services");
  assert(!can("technician", "services"), "technician no services");

  // Published protection: coverage apply throws
  const published = await prisma.serviceLocation.findFirst({
    where: { coverageStatus: "published" },
    select: { id: true },
  });
  assert(published, "published row exists");
  let blocked = false;
  try {
    await applyCoverageDecision(prisma, {
      serviceLocationId: published.id,
      decision: "NOT_COVERED",
      actor: "verify",
      reason: "should_fail",
    });
  } catch {
    blocked = true;
  }
  assert(blocked, "published coverage mutation blocked");

  // Bulk preview does not mutate
  const svc = await prisma.service.findFirst({ where: { status: "active" }, select: { id: true } });
  const loc = await prisma.location.findFirst({ where: { serves: true }, select: { id: true } });
  assert(svc && loc, "svc/loc");
  const before = await prisma.serviceLocation.count({ where: { covered: true } });
  const preview = await previewBulkCoverage(prisma, {
    serviceIds: [svc.id],
    locationIds: [loc.id],
    setCovered: true,
  });
  const after = await prisma.serviceLocation.count({ where: { covered: true } });
  assert(before === after, "preview must not mutate coverage");
  assert(preview.rowCount >= 0, "preview rows");

  // Draft/uncovered not in public sitemap where
  const publicCount = await prisma.serviceLocation.count({ where: publicServiceLocationWhere });
  assert(publicCount === 49, "public where = 49");

  // Sitemap shard constant
  assert(SITEMAP_PAIR_SHARDS === 64, "64 shards");

  // Uncovered remain noindex
  const badIndex = await prisma.serviceLocation.count({
    where: { covered: false, indexable: true },
  });
  assert(badIndex === 0, "uncovered must not be indexable");

  console.log(
    JSON.stringify(
      {
        ok: true,
        total: pop.serviceLocationTotal,
        matrix: pop.classification.approvedMatrixRows,
        legacy: pop.classification.legacyOutsideMatrixRows,
        published: pop.published,
        indexableEn: pop.indexableEn,
        sitemapShards: SITEMAP_PAIR_SHARDS,
        publicPairs: publicCount,
      },
      null,
      2,
    ),
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
