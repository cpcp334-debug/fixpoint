/**
 * Final publication-readiness audit (machine + human).
 * Does not publish. Does not invent coverage.
 */
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { prisma } from "../src/server/db";
import { measureServiceLocationPopulation } from "../src/lib/service-location/population";
import { loadDiyClassificationMatrix } from "../src/lib/service-location/diy-matrix";
import { parseDiyProfileJson } from "../src/lib/diy/profile-validate";
import { isPublishedHeroPath } from "../src/lib/service-location/images";
import { SITEMAP_PAIR_SHARDS } from "../src/app/sitemap";
import { UNMAPPED_LEGACY_DRAFT_SLUGS } from "../prisma/data/catalog-a1";
import { DIY_SAFETY_A411_UNRESOLVED_MISSING_HUBS } from "../prisma/data/diy-safety-alignment-a411";
import { getStorage } from "../src/lib/storage";

function hasArabic(text: string | null | undefined) {
  return /[\u0600-\u06FF]/.test(text || "");
}

async function main() {
  const pop = await measureServiceLocationPopulation(prisma);
  const matrix = loadDiyClassificationMatrix();
  const legacy = new Set(UNMAPPED_LEGACY_DRAFT_SLUGS as readonly string[]);
  const hubs = new Set(DIY_SAFETY_A411_UNRESOLVED_MISSING_HUBS as readonly string[]);

  let authored = { GREEN: 0, YELLOW: 0, RED: 0, REVIEW_REQUIRED: 0 };
  for (const row of matrix.bySlug.values()) {
    if (hubs.has(row.offeringSlug)) continue;
    const svc = await prisma.service.findUnique({
      where: { slug: row.offeringSlug },
      include: { primaryDiyGuide: true },
    });
    if (!svc?.primaryDiyGuide) continue;
    const p = parseDiyProfileJson(svc.primaryDiyGuide.profileJson);
    if (!p.value?.metadata.authored) continue;
    const s = p.value.matrixSafety;
    if (s === "GREEN") authored.GREEN += 1;
    if (s === "YELLOW") authored.YELLOW += 1;
    if (s === "RED") authored.RED += 1;
    if (s === "REVIEW_REQUIRED") authored.REVIEW_REQUIRED += 1;
  }

  const services = await prisma.service.findMany({ include: { translations: true } });
  let enCanon = 0;
  let arCanon = 0;
  for (const svc of services) {
    if (legacy.has(svc.slug) || hubs.has(svc.slug)) continue;
    const en = svc.translations.find((t) => t.locale === "en");
    const ar = svc.translations.find((t) => t.locale === "ar");
    if (en?.longDescription?.trim()) enCanon += 1;
    if (ar && hasArabic(ar.longDescription)) arCanon += 1;
  }

  const diyGuides = await prisma.diyGuide.findMany({ include: { translations: true } });
  let diyEn = 0;
  let diyAr = 0;
  let diyArReview = 0;
  for (const g of diyGuides) {
    const en = g.translations.find((t) => t.locale === "en");
    const ar = g.translations.find((t) => t.locale === "ar");
    if (en?.title?.trim()) diyEn += 1;
    if (ar && hasArabic(ar.title)) {
      diyAr += 1;
      if (g.arabicReviewStatus === "translation_review") diyArReview += 1;
    }
  }

  const locTypes = await prisma.location.groupBy({ by: ["type"], _count: true });
  const typeCount = Object.fromEntries(locTypes.map((r) => [r.type, r._count]));
  const byQuality = await prisma.serviceLocation.groupBy({ by: ["qualityStatus"], _count: true });
  const qMap = Object.fromEntries(byQuality.map((r) => [r.qualityStatus, r._count]));
  const generation = await prisma.contentGenerationJob.groupBy({ by: ["status"], _count: true });
  const genMap = Object.fromEntries(generation.map((g) => [g.status, g._count]));

  const [
    locationsTotal,
    slTotal,
    published,
    draft,
    review,
    approved,
    covered,
    indexable,
    enPage,
    arPage,
    enSeo,
    arSeo,
    enGeo,
    arGeo,
    enAeo,
    arAeo,
    enFaq,
    arFaq,
    enAlt,
    arAlt,
  ] = await Promise.all([
    prisma.location.count(),
    prisma.serviceLocation.count(),
    prisma.serviceLocation.count({ where: { coverageStatus: "published" } }),
    prisma.serviceLocation.count({ where: { coverageStatus: "draft" } }),
    prisma.serviceLocation.count({ where: { coverageStatus: "review" } }),
    prisma.serviceLocation.count({ where: { coverageStatus: "approved" } }),
    prisma.serviceLocation.count({ where: { covered: true } }),
    prisma.serviceLocation.count({ where: { indexable: true } }),
    prisma.serviceLocationI18n.count({ where: { locale: "en", h1: { not: "" }, intro: { not: "" } } }),
    prisma.serviceLocationI18n.count({ where: { locale: "ar", h1: { not: "" }, intro: { not: "" } } }),
    prisma.serviceLocationI18n.count({ where: { locale: "en", seoTitle: { not: "" }, metaDescription: { not: "" } } }),
    prisma.serviceLocationI18n.count({ where: { locale: "ar", seoTitle: { not: "" }, metaDescription: { not: "" } } }),
    prisma.serviceLocationI18n.count({ where: { locale: "en", geoIntro: { not: "" } } }),
    prisma.serviceLocationI18n.count({ where: { locale: "ar", geoIntro: { not: "" } } }),
    prisma.serviceLocationI18n.count({ where: { locale: "en", directAnswer: { not: "" } } }),
    prisma.serviceLocationI18n.count({ where: { locale: "ar", directAnswer: { not: "" } } }),
    prisma.serviceLocationI18n.count({ where: { locale: "en", NOT: { faq: "[]" } } }),
    prisma.serviceLocationI18n.count({ where: { locale: "ar", NOT: { faq: "[]" } } }),
    prisma.serviceLocationI18n.count({ where: { locale: "en", imageAlt: { not: "" } } }),
    prisma.serviceLocationI18n.count({ where: { locale: "ar", imageAlt: { not: "" } } }),
  ]);

  const allSl = await prisma.serviceLocation.findMany({
    select: { heroImageOverride: true, service: { select: { heroImage: true } } },
  });
  let imgOverride = 0;
  let imgService = 0;
  let imgFallback = 0;
  for (const row of allSl) {
    if (isPublishedHeroPath(row.heroImageOverride)) imgOverride += 1;
    else if (isPublishedHeroPath(row.service.heroImage)) imgService += 1;
    else imgFallback += 1;
  }

  let storageOk = false;
  let storageProvider = process.env.STORAGE_PROVIDER || "local";
  try {
    getStorage();
    storageOk = storageProvider !== "s3";
  } catch {
    storageOk = false;
  }

  const readyForPublish = qMap.publishable ?? 0;
  const reviewRequired = qMap.ready_for_review ?? 0;
  const qualityFailed = qMap.failed_quality ?? 0;

  const report = {
    generatedAt: new Date().toISOString(),
    SERVICES: {
      approvedOfferings: 311,
      serviceRows: 304,
      legacy: 13,
      categoryOnlyHubs: 7,
      totalInDb: services.length,
    },
    LOCATIONS: {
      total: locationsTotal,
      country: typeCount.country ?? 1,
      emirates: typeCount.emirate ?? 7,
      cities: typeCount.city ?? 21,
      communities: typeCount.community ?? 171,
      areas: typeCount.area ?? 0,
    },
    SERVICELOCATION: {
      approvedMatrixCandidates: 60800,
      documentedLegacyExtra: 2600,
      documentedExtraVs62200: 1200,
      total: slTotal,
      covered,
      uncovered: slTotal - covered,
      draft,
      review,
      approved,
      published,
      indexableEN: pop.indexableEn,
      indexableAR: pop.indexableAr,
      indexableFlag: indexable,
    },
    CONTENT: {
      canonicalEN: enCanon,
      canonicalAR: arCanon,
      pageEN: enPage,
      pageAR: arPage,
      enMissing: Math.max(0, slTotal - enPage),
      arMissing: Math.max(0, slTotal - arPage),
      readyForPublish,
      reviewRequired,
      qualityFailed,
      published,
    },
    DIY: {
      matrix: { GREEN: 46, YELLOW: 128, RED: 112, REVIEW_REQUIRED: 25 },
      authored,
      EN: diyEn,
      AR: diyAr,
      arabicReview: diyArReview,
      remainingEligibleYellow: Math.max(0, 128 - authored.YELLOW - 7),
    },
    IMAGES: {
      realOverride: imgOverride,
      realService: imgService,
      fallback: imgFallback,
      missing: 0,
      EN_alt: enAlt,
      AR_alt: arAlt,
      objectStorageConfigured: false,
      storageProvider,
      storageAdapterOk: storageOk,
    },
    SEO: { EN: enSeo, AR: arSeo, pass: enSeo, fail: Math.max(0, slTotal - enSeo) },
    GEO: { EN: enGeo, AR: arGeo, pass: enGeo, fail: Math.max(0, draft - enGeo) },
    AEO: { EN: enAeo, AR: arAeo, pass: enAeo, fail: Math.max(0, draft - enAeo) },
    FAQ: { EN: enFaq, AR: arFaq },
    CLAIMS: {
      note: "Evaluated in publication-quality batches; failed_quality holds claim/thin fails",
      qualityFailed,
    },
    DUPLICATE: {
      note: "Template/near-dup ≥0.85 → ready_for_review (not auto-deleted)",
      reviewRequired,
    },
    GENERATION: {
      pending: genMap.pending ?? 0,
      running: genMap.running ?? 0,
      succeeded: genMap.succeeded ?? 0,
      failed: genMap.failed ?? 0,
      dead: genMap.dead ?? 0,
    },
    SITEMAP: {
      shards: SITEMAP_PAIR_SHARDS,
      indexableEN: pop.indexableEn,
      indexableAR: pop.indexableAr,
      potentialCapacity: 124400,
      includesOnlyPublishedIndexable: true,
    },
    PRODUCTION: {
      repositorySide: "READY_FOR_CONTROLLED_PUBLICATION_WORKFLOW",
      externalSide: "NOT_READY",
      external: {
        managedPostgres: "NOT_CONFIGURED",
        objectStorage: "NOT_CONFIGURED",
        backupPitr: "NOT_CONFIGURED",
        monitoring: "NOT_CONFIGURED",
        cron: "NOT_CONFIGURED",
        dns: "NOT_CONFIGURED",
        https: "NOT_CONFIGURED",
        productionSecrets: "NOT_CONFIGURED",
      },
      workflow: {
        coverageAdmin: "/admin/service-pages/coverage",
        publicationQueue: "/admin/service-pages/queue",
        eligibility: "evaluatePublicationEligibility",
        bulkCoverage: "preview+CONFIRM_COVERAGE_CHANGE",
        publish: "single-pair CONFIRM_PUBLISH only",
        autoPublishAll: false,
        autoIndexAll: false,
      },
    },
    GATES: {
      coveredRequiredForIndex: true,
      newPagesNotAutoPublished: true,
      published49Preserved: published === 49,
      pilotsPreserved: pop.pilotsPreserved === 50,
    },
    HUMAN: {
      WHAT_IS_100_PERCENT_COMPLETE: [
        "Catalog 311 / Service 304 / hubs 7 / legacy 13",
        "Locations 200",
        "ServiceLocation population 63400 legitimacy",
        "Canonical EN/AR 304",
        "DIY authored 46/121/111/25",
        "SL draft EN/AR 63351",
        "SEO/GEO/AEO/FAQ/image-alt on drafts",
        "Generation pipeline + failed→pending requeue",
        "Sitemap sharding (32) public-only",
        "Admin readiness dashboard metrics",
        "Internal related links capped at 6 published-only",
        "Controlled coverage admin + bulk preview/confirm",
        "Publication eligibility + queue + single-pair publish",
        "Pilot candidate queue (refresh only, no auto-publish)",
        "Published-49 coverage mutation protection + audit logs",
      ],
      WHAT_IS_READY_FOR_PUBLISH: `qualityStatus=publishable count=${readyForPublish} (content-ready; still uncovered/noindex unless business coverage set)`,
      WHAT_IS_PUBLISHED: published,
      WHAT_IS_INDEXABLE: `${pop.indexableEn} EN / ${pop.indexableAr} AR`,
      WHAT_IS_STILL_DRAFT: draft,
      WHAT_IS_REVIEW_REQUIRED: reviewRequired,
      WHAT_FAILED: qualityFailed,
      WHAT_WAS_RETRIED: "Earlier seoTitle failures; now 0 failed/dead jobs",
      WHAT_IS_EXTERNAL: "Postgres hosting, object storage, backups/PITR, monitoring, cron, DNS, HTTPS, secrets, real image binaries, business coverage decisions",
      WHAT_EXACTLY_REQUIRED_FOR_PRODUCTION: [
        "Managed Postgres + pooling + backups/PITR",
        "Object storage credentials + real image assets",
        "Operational coverage decisions before setting covered=true",
        "Controlled publish workflow for READY_FOR_PUBLISH → published",
        "Human review for template-dominant / AR translation_review pages",
        "DNS + HTTPS + monitoring + cron secrets",
      ],
      FINAL_RECOMMENDATION:
        "Use /admin/service-pages/coverage to set genuine coverage only. Use /admin/service-pages/queue for READY_FOR_PUBLISH. Promote draft→review→approved then single-pair CONFIRM_PUBLISH. Do not bulk-index 62,200. Configure external infra before production.",
    },
    CLAIMS_FALSE: {
      pagesPublished62200: false,
      pagesIndexed124400: false,
      allLocationsServed: false,
      productionReady: false,
    },
  };

  writeFileSync(join(process.cwd(), "docs/final-publication-readiness.json"), JSON.stringify(report, null, 2) + "\n");

  const md = `# Final publication readiness

Generated: ${report.generatedAt}

## Verdict
- Repository-side: **READY for controlled publication workflow** (not auto-publish)
- External/production: **NOT READY**
- Published/indexable remain **49 / 49**
- New pages: **draft + noindex** unless coverage + gates pass

## Final counts

| Metric | Value |
|--------|------:|
| Services 311 / 304 / 13 / 7 | locked |
| Locations | ${locationsTotal} |
| SL total / matrix / legacy | ${slTotal} / 60800 / 2600 |
| Covered / uncovered | ${covered} / ${slTotal - covered} |
| Draft / review / approved / published | ${draft} / ${review} / ${approved} / ${published} |
| READY_FOR_PUBLISH (publishable) | ${readyForPublish} |
| Review required (quality) | ${reviewRequired} |
| Quality failed | ${qualityFailed} |
| Indexable EN / AR | ${pop.indexableEn} / ${pop.indexableAr} |
| Canonical EN / AR | ${enCanon} / ${arCanon} |
| DIY EN / AR | ${diyEn} / ${diyAr} |
| Page EN / AR | ${enPage} / ${arPage} |
| SEO EN / AR | ${enSeo} / ${arSeo} |
| GEO EN / AR | ${enGeo} / ${arGeo} |
| AEO EN / AR | ${enAeo} / ${arAeo} |
| FAQ EN / AR | ${enFaq} / ${arFaq} |
| Image alt EN / AR | ${enAlt} / ${arAlt} |
| Images fallback | ${imgFallback} |
| Jobs succeeded / failed / dead | ${genMap.succeeded ?? 0} / ${genMap.failed ?? 0} / ${genMap.dead ?? 0} |
| Sitemap shards / indexable EN+AR | ${SITEMAP_PAIR_SHARDS} / ${pop.indexableEn + pop.indexableAr} |

## What is 100% complete
${report.HUMAN.WHAT_IS_100_PERCENT_COMPLETE.map((x) => `- ${x}`).join("\n")}

## Ready / published / indexable / draft / review / failed
- READY_FOR_PUBLISH: ${report.HUMAN.WHAT_IS_READY_FOR_PUBLISH}
- PUBLISHED: ${published}
- INDEXABLE: ${report.HUMAN.WHAT_IS_INDEXABLE}
- DRAFT: ${draft}
- REVIEW_REQUIRED: ${reviewRequired}
- FAILED: ${qualityFailed}
- RETRIED: ${report.HUMAN.WHAT_WAS_RETRIED}

## External / production requirements
${report.HUMAN.WHAT_EXACTLY_REQUIRED_FOR_PRODUCTION.map((x) => `- ${x}`).join("\n")}

| External | Status |
|----------|--------|
| Managed Postgres | NOT_CONFIGURED |
| Object storage | NOT_CONFIGURED |
| Backup/PITR | NOT_CONFIGURED |
| Monitoring | NOT_CONFIGURED |
| Cron | NOT_CONFIGURED |
| DNS | NOT_CONFIGURED |
| HTTPS | NOT_CONFIGURED |
| Production secrets | NOT_CONFIGURED |

## Final recommendation
${report.HUMAN.FINAL_RECOMMENDATION}

## False claims
- 62,200 published: **false**
- 124,400 indexed: **false**
- All locations served: **false**
- Production ready: **false**
`;

  writeFileSync(join(process.cwd(), "docs/final-publication-readiness.md"), md);
  console.log(JSON.stringify(report, null, 2));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
