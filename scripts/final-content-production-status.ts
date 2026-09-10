/**
 * Final content-production status (machine + human).
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
  let canonicalEn = 0;
  let canonicalAr = 0;
  let canonicalArReview = 0;
  for (const svc of services) {
    if (legacy.has(svc.slug)) continue;
    if (hubs.has(svc.slug)) continue;
    const en = svc.translations.find((t) => t.locale === "en");
    const ar = svc.translations.find((t) => t.locale === "ar");
    if (en?.longDescription?.trim() && en?.shortDescription?.trim()) canonicalEn += 1;
    if (ar && hasArabic(ar.name) && hasArabic(ar.longDescription) && ar.name !== "REVIEW_REQUIRED") {
      canonicalAr += 1;
    } else if (ar && (ar.safetyNotes === "REVIEW_REQUIRED" || ar.name === "REVIEW_REQUIRED")) {
      canonicalArReview += 1;
    }
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

  const [
    locationsTotal,
    slTotal,
    published,
    draft,
    review,
    ready,
    qualityFail,
    qualityIncomplete,
    slEn,
    slAr,
    slEnSeo,
    slArSeo,
    slEnGeo,
    slArGeo,
    slEnAeo,
    slArAeo,
    slEnAlt,
    slArAlt,
    legacyMissingEn,
  ] = await Promise.all([
    prisma.location.count(),
    prisma.serviceLocation.count(),
    prisma.serviceLocation.count({ where: { coverageStatus: "published" } }),
    prisma.serviceLocation.count({ where: { coverageStatus: "draft" } }),
    prisma.serviceLocation.count({ where: { coverageStatus: "review" } }),
    prisma.serviceLocation.count({ where: { coverageStatus: "approved" } }),
    prisma.serviceLocation.count({ where: { qualityStatus: "failed_quality" } }),
    prisma.serviceLocation.count({ where: { qualityStatus: "incomplete" } }),
    prisma.serviceLocationI18n.count({ where: { locale: "en", h1: { not: "" }, intro: { not: "" } } }),
    prisma.serviceLocationI18n.count({ where: { locale: "ar", h1: { not: "" }, intro: { not: "" } } }),
    prisma.serviceLocationI18n.count({ where: { locale: "en", seoTitle: { not: "" }, metaDescription: { not: "" } } }),
    prisma.serviceLocationI18n.count({ where: { locale: "ar", seoTitle: { not: "" }, metaDescription: { not: "" } } }),
    prisma.serviceLocationI18n.count({ where: { locale: "en", geoIntro: { not: "" } } }),
    prisma.serviceLocationI18n.count({ where: { locale: "ar", geoIntro: { not: "" } } }),
    prisma.serviceLocationI18n.count({ where: { locale: "en", directAnswer: { not: "" } } }),
    prisma.serviceLocationI18n.count({ where: { locale: "ar", directAnswer: { not: "" } } }),
    prisma.serviceLocationI18n.count({ where: { locale: "en", imageAlt: { not: "" } } }),
    prisma.serviceLocationI18n.count({ where: { locale: "ar", imageAlt: { not: "" } } }),
    prisma.serviceLocation.count({
      where: {
        coverageStatus: { not: "published" },
        service: { slug: { in: [...legacy] } },
        translations: { none: { locale: "en", h1: { not: "" }, intro: { not: "" } } },
      },
    }),
  ]);

  const locTypes = await prisma.location.groupBy({ by: ["type"], _count: true });
  const typeCount = Object.fromEntries(locTypes.map((r) => [r.type, r._count]));

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

  const generation = await prisma.contentGenerationJob.groupBy({ by: ["status"], _count: true });
  const genMap = Object.fromEntries(generation.map((g) => [g.status, g._count]));

  const publishedRows = await prisma.serviceLocation.findMany({
    where: { coverageStatus: "published", indexable: true, covered: true },
    include: { translations: true },
  });
  let seoPub = 0;
  let geoPub = 0;
  let aeoPub = 0;
  for (const row of publishedRows) {
    const en = row.translations.find((t) => t.locale === "en");
    const ar = row.translations.find((t) => t.locale === "ar");
    if (en?.seoTitle?.trim() && en?.metaDescription?.trim() && ar?.seoTitle?.trim() && ar?.metaDescription?.trim()) {
      seoPub += 1;
    }
    if (en?.geoIntro?.trim() && ar?.geoIntro?.trim()) geoPub += 1;
    if (en?.directAnswer?.trim() && ar?.directAnswer?.trim()) aeoPub += 1;
  }

  const report = {
    generatedAt: new Date().toISOString(),
    runPolicy: {
      publishNewPages: false,
      inventCoverage: false,
      preservePublished49: true,
      preservePilot50Draft: true,
      preserveLegacyExtra1200: true,
      failedJobRequeue: "FAILED→PENDING only; history preserved",
    },
    SERVICES: {
      approvedOfferings: 311,
      linkedServiceRows: 304,
      legacy: 13,
      categoryOnlyHubs: 7,
      totalServiceRowsInDb: services.length,
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
      approvedMatrixCandidates: pop.classification.approvedMatrixRows,
      theoretical311x200: 62200,
      legacyExtraRows: pop.classification.legacyOutsideMatrixRows,
      documentedExtraVs62200: pop.serviceLocationTotal - 62200,
      total: slTotal,
      covered: pop.covered,
      uncovered: pop.uncovered,
      published,
      draft,
      review,
      ready_approved_lifecycle: ready,
      indexableEN: pop.indexableEn,
      indexableAR: pop.indexableAr,
      legitimacy: pop.legitimacy,
      equation: pop.equation,
    },
    DIY: {
      matrix: { GREEN: 46, YELLOW: 128, RED: 112, REVIEW_REQUIRED: 25 },
      authored,
      remainingEligibleYellow: Math.max(0, 128 - authored.YELLOW - 7),
      EN: diyEn,
      AR: diyAr,
      AR_translation_review: diyArReview,
      guidesTotal: diyGuides.length,
    },
    CANONICAL: {
      EN: canonicalEn,
      AR: canonicalAr,
      AR_review: canonicalArReview,
    },
    PAGE_CONTENT: {
      ServiceLocation_EN: slEn,
      ServiceLocation_AR: slAr,
      legacyDraftMissingEN: legacyMissingEn,
      draft,
      review,
      ready: ready,
      published,
      quality_failed: qualityFail,
      quality_incomplete: qualityIncomplete,
    },
    IMAGES: {
      override: imgOverride,
      serviceHero: imgService,
      approvedFallback: imgFallback,
      EN_alt: slEnAlt,
      AR_alt: slArAlt,
      objectStorage: "NOT_CONFIGURED",
    },
    SEO: {
      draftEN: slEnSeo,
      draftAR: slArSeo,
      publishedPass: seoPub,
      publishedFail: publishedRows.length - seoPub,
    },
    GEO: {
      draftEN: slEnGeo,
      draftAR: slArGeo,
      publishedPass: geoPub,
      publishedFail: publishedRows.length - geoPub,
      note: "Published 49 not rewritten; GEO fields may remain empty there by protection policy",
    },
    AEO: {
      draftEN: slEnAeo,
      draftAR: slArAeo,
      publishedPass: aeoPub,
      publishedFail: publishedRows.length - aeoPub,
      note: "Published 49 not rewritten; AEO fields may remain empty there by protection policy",
    },
    QUALITY: {
      failed_quality: qualityFail,
      incomplete: qualityIncomplete,
      publishable_lifecycle_proxy: ready,
    },
    GENERATION: {
      pending: genMap.pending ?? 0,
      running: genMap.running ?? 0,
      succeeded: genMap.succeeded ?? 0,
      failed: genMap.failed ?? 0,
      dead: genMap.dead ?? 0,
    },
    SITEMAP: {
      indexCount: 1,
      shardCount: SITEMAP_PAIR_SHARDS,
      indexableEN: pop.indexableEn,
      indexableAR: pop.indexableAr,
      potentialLocalizedCapacity: 124400,
    },
    EXTERNAL: [
      "Object storage provider client + credentials (S3 stub only)",
      "Managed Postgres pooling/backups/PITR in production",
      "Production monitoring/alerts/cron/DNS/HTTPS proxy wiring",
      "Real category/service hero image binary assets under public/media",
      "Human review for DIY Arabic translation_review shells",
      "Controlled publication workflow DRAFT/REVIEW/READY → published",
      "Optional enrichment of published 49 GEO/AEO without unsafe regen",
    ],
    CLAIMS: {
      pagesComplete124400: false,
      productionReady: false,
      allLocationsServed: false,
      allPagesIndexable: false,
    },
  };

  writeFileSync(join(process.cwd(), "docs/final-content-production-status.json"), JSON.stringify(report, null, 2) + "\n");

  const md = `# Final content production status

Generated: ${report.generatedAt}

## Verdict
Repository-side content systems and draft generation are in place.
**New pages were not published/indexed.**
Claims: 124400 complete=false · production ready=false · all locations served=false · all indexable=false.

## Counts

| Area | Value |
|------|------:|
| Canonical EN | ${canonicalEn} |
| Canonical AR | ${canonicalAr} |
| DIY EN | ${diyEn} |
| DIY AR | ${diyAr} |
| DIY AR translation_review | ${diyArReview} |
| ServiceLocation EN | ${slEn} |
| ServiceLocation AR | ${slAr} |
| Images override/service/fallback | ${imgOverride}/${imgService}/${imgFallback} |
| Image alt EN/AR | ${slEnAlt}/${slArAlt} |
| SEO draft EN/AR | ${slEnSeo}/${slArSeo} |
| GEO draft EN/AR | ${slEnGeo}/${slArGeo} |
| AEO draft EN/AR | ${slEnAeo}/${slArAeo} |
| Published | ${published} |
| Draft | ${draft} |
| Review | ${review} |
| Indexable EN/AR | ${pop.indexableEn}/${pop.indexableAr} |
| Quality failed | ${qualityFail} |
| Generation succeeded/failed/dead | ${genMap.succeeded ?? 0}/${genMap.failed ?? 0}/${genMap.dead ?? 0} |

## Population
- Total SL ${slTotal} · matrix ${pop.classification.approvedMatrixRows} · legacy ${pop.classification.legacyOutsideMatrixRows}
- Covered ${pop.covered} · uncovered ${pop.uncovered}
- DIY authored G/Y/R/RR: ${authored.GREEN}/${authored.YELLOW}/${authored.RED}/${authored.REVIEW_REQUIRED}

## External blockers
${report.EXTERNAL.map((e) => `- ${e}`).join("\n")}
`;

  writeFileSync(join(process.cwd(), "docs/final-content-production-status.md"), md);
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
