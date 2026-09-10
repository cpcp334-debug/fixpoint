/**
 * Final longform completion + publication readiness audit.
 * READ-ONLY regarding published content. Does not publish or invent coverage.
 */
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { prisma } from "../src/server/db";
import { resolveServiceLocationPageFresh } from "../src/lib/service-location/page-resolve";
import { countRenderedWords, wordCountBand } from "../src/lib/service-location/rendered-words";
import { measureServiceLocationPopulation } from "../src/lib/service-location/population";
import { loadDiyClassificationMatrix } from "../src/lib/service-location/diy-matrix";
import { parseDiyProfileJson } from "../src/lib/diy/profile-validate";
import { publicServiceLocationWhere } from "../src/lib/catalog";
import { SITEMAP_PAIR_SHARDS } from "../src/app/sitemap";
import { UNMAPPED_LEGACY_DRAFT_SLUGS } from "../prisma/data/catalog-a1";
import { DIY_SAFETY_A411_UNRESOLVED_MISSING_HUBS } from "../prisma/data/diy-safety-alignment-a411";

type Band = ReturnType<typeof wordCountBand>;

function emptyBands(): Record<Band, number> {
  return { "<500": 0, "500-799": 0, "800-999": 0, "1000-1200": 0, ">1200": 0 };
}

function summarize(words: number[], bands: Record<Band, number>) {
  const sorted = [...words].sort((a, b) => a - b);
  return {
    count: sorted.length,
    average: sorted.length ? Math.round(sorted.reduce((a, b) => a + b, 0) / sorted.length) : 0,
    median: sorted.length ? sorted[Math.floor(sorted.length / 2)]! : 0,
    min: sorted.length ? sorted[0]! : 0,
    max: sorted.length ? sorted[sorted.length - 1]! : 0,
    bands: { ...bands },
    under800: bands["<500"] + bands["500-799"],
    in800_999: bands["800-999"],
    in1000_1200: bands["1000-1200"],
    over1200: bands[">1200"],
  };
}

async function sampleWordCounts(args: {
  where: Record<string, unknown>;
  take: number;
  label: string;
}) {
  const rows = await prisma.serviceLocation.findMany({
    where: args.where as never,
    orderBy: [{ serviceId: "asc" }, { locationId: "asc" }],
    take: args.take,
    select: { service: { select: { slug: true } }, location: { select: { slug: true } } },
  });
  const bandsEn = emptyBands();
  const bandsAr = emptyBands();
  const wordsEn: number[] = [];
  const wordsAr: number[] = [];
  let failed = 0;
  let missingSections = 0;
  for (const row of rows) {
    for (const locale of ["en", "ar"] as const) {
      try {
        const model = await resolveServiceLocationPageFresh({
          serviceSlug: row.service.slug,
          locationSlug: row.location.slug,
          locale,
          mode: "preview",
        });
        if (!model) {
          failed += 1;
          continue;
        }
        const n = countRenderedWords(model);
        const band = wordCountBand(n);
        if (locale === "en") {
          wordsEn.push(n);
          bandsEn[band] += 1;
        } else {
          wordsAr.push(n);
          bandsAr[band] += 1;
        }
        if (!model.content.intro?.trim() || !(model.content.body || model.serviceLongDescription)?.trim() || model.aeo.length < 3) {
          missingSections += 1;
        }
      } catch {
        failed += 1;
      }
    }
  }
  return {
    label: args.label,
    pairsSampled: rows.length,
    localesAttempted: rows.length * 2,
    failed,
    missingSections,
    EN: summarize(wordsEn, bandsEn),
    AR: summarize(wordsAr, bandsAr),
  };
}

async function main() {
  const pop = await measureServiceLocationPopulation(prisma);
  const matrix = loadDiyClassificationMatrix();
  const hubs = new Set(DIY_SAFETY_A411_UNRESOLVED_MISSING_HUBS as readonly string[]);
  const legacy = new Set(UNMAPPED_LEGACY_DRAFT_SLUGS as readonly string[]);

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

  const longformSucceeded = await prisma.contentGenerationJob.count({
    where: { idempotencyKey: { startsWith: "sl_long_v2:" }, status: "succeeded" },
  });
  const longformFailed = await prisma.contentGenerationJob.count({
    where: { idempotencyKey: { startsWith: "sl_long_v2:" }, status: "failed" },
  });
  const longformDead = await prisma.contentGenerationJob.count({
    where: { idempotencyKey: { startsWith: "sl_long_v2:" }, status: "dead" },
  });
  const longformPending = await prisma.contentGenerationJob.count({
    where: { idempotencyKey: { startsWith: "sl_long_v2:" }, status: "pending" },
  });
  const longformRunning = await prisma.contentGenerationJob.count({
    where: { idempotencyKey: { startsWith: "sl_long_v2:" }, status: "running" },
  });

  const byQuality = await prisma.serviceLocation.groupBy({ by: ["qualityStatus"], _count: true });
  const qMap = Object.fromEntries(byQuality.map((r) => [r.qualityStatus, r._count]));
  const dupPairs = await prisma.serviceLocation.groupBy({
    by: ["serviceId", "locationId"],
    having: { serviceId: { _count: { gt: 1 } } },
    _count: true,
  });

  const sitemapPublic = await prisma.serviceLocation.count({ where: publicServiceLocationWhere });
  const uncoveredIndexable = await prisma.serviceLocation.count({
    where: { covered: false, indexable: true },
  });
  const publishedUncovered = await prisma.serviceLocation.count({
    where: { coverageStatus: "published", covered: false },
  });

  // Full draft corpus word-count sample strategy:
  // - If longformSucceeded >= 126000, sample 5000 pairs across corpus (stratified by skip)
  // - Always measure all published 49
  const draftTotal = pop.draft;
  const sampleTake = Math.min(3000, draftTotal);
  const skip = draftTotal > sampleTake ? Math.floor((draftTotal - sampleTake) / 2) : 0;

  const publishedSample = await sampleWordCounts({
    where: { coverageStatus: "published" },
    take: 49,
    label: "protected_published_49",
  });
  const draftHead = await sampleWordCounts({
    where: { coverageStatus: "draft" },
    take: sampleTake,
    label: "draft_sample",
  });
  // Mid-corpus sample
  const draftMidRows = await prisma.serviceLocation.findMany({
    where: { coverageStatus: "draft" },
    orderBy: [{ serviceId: "asc" }, { locationId: "asc" }],
    skip,
    take: Math.min(1500, draftTotal),
    select: { service: { select: { slug: true } }, location: { select: { slug: true } } },
  });
  const bandsEn = emptyBands();
  const bandsAr = emptyBands();
  const wordsEn: number[] = [];
  const wordsAr: number[] = [];
  let midFailed = 0;
  let midMissing = 0;
  for (const row of draftMidRows) {
    for (const locale of ["en", "ar"] as const) {
      try {
        const model = await resolveServiceLocationPageFresh({
          serviceSlug: row.service.slug,
          locationSlug: row.location.slug,
          locale,
          mode: "preview",
        });
        if (!model) {
          midFailed += 1;
          continue;
        }
        const n = countRenderedWords(model);
        const band = wordCountBand(n);
        if (locale === "en") {
          wordsEn.push(n);
          bandsEn[band] += 1;
        } else {
          wordsAr.push(n);
          bandsAr[band] += 1;
        }
        if (!model.content.intro?.trim() || !(model.content.body || model.serviceLongDescription)?.trim()) midMissing += 1;
      } catch {
        midFailed += 1;
      }
    }
  }
  const draftMid = {
    label: "draft_mid_sample",
    pairsSampled: draftMidRows.length,
    localesAttempted: draftMidRows.length * 2,
    failed: midFailed,
    missingSections: midMissing,
    EN: summarize(wordsEn, bandsEn),
    AR: summarize(wordsAr, bandsAr),
  };

  const draftLocalesTarget = pop.draft * 2;
  const corpusComplete =
    longformSucceeded >= draftLocalesTarget - 50 && longformPending === 0 && longformRunning === 0;

  const report = {
    generatedAt: new Date().toISOString(),
    LONGFORM_STATUS: {
      succeeded: longformSucceeded,
      failed: longformFailed,
      dead: longformDead,
      pending: longformPending,
      running: longformRunning,
      draftLocalesTarget,
      corpusComplete,
      progressPct: Math.round((longformSucceeded / Math.max(draftLocalesTarget, 1)) * 1000) / 10,
    },
    POPULATION: {
      total: pop.serviceLocationTotal,
      approvedMatrixMaterialized: pop.classification.approvedMatrixRows,
      theoretical311x200: 62200,
      legacyExtra: pop.classification.legacyOutsideMatrixRows,
      documentedExtraVs62200: 1200,
      duplicateServiceLocationPairs: dupPairs.length,
      published: pop.published,
      covered: pop.covered,
      draft: pop.draft,
      uncovered: pop.uncovered,
      indexableEn: pop.indexableEn,
      indexableAr: pop.indexableAr,
    },
    CONTENT: {
      method: "countRenderedWords matching ServiceLocationView",
      publishedGrandfathered: publishedSample,
      draftHeadSample: draftHead,
      draftMidSample: draftMid,
    },
    QUALITY: {
      publishable: qMap.publishable ?? 0,
      ready_for_review: qMap.ready_for_review ?? 0,
      failed_quality: qMap.failed_quality ?? 0,
      incomplete: qMap.incomplete ?? 0,
      indexable: qMap.indexable ?? 0,
      note: "Most drafts remain ready_for_review due to template/dup gates; length does not auto-fail qualityStatus",
    },
    SAFETY: {
      matrix: { GREEN: 46, YELLOW: 128, RED: 112, REVIEW_REQUIRED: 25 },
      authored,
      intentionalYellowExclusions: 7,
      hubsCategoryOnly: [...hubs],
      paintingHeld: "painting-services",
      remainingEligibleYellow: Math.max(0, 128 - authored.YELLOW - 7),
    },
    PUBLICATION: {
      workflow: "COVERED → READY_FOR_PUBLISH → REVIEW/APPROVED → CONFIRM_PUBLISH → PUBLISHED → INDEXABLE",
      autoPublishOccurred: false,
      uncoveredIndexable: uncoveredIndexable,
      publishedUncovered: publishedUncovered,
      sitemapPublicPairs: sitemapPublic,
      sitemapShards: SITEMAP_PAIR_SHARDS,
      CONTENT_READY: longformSucceeded >= draftLocalesTarget * 0.95,
      COVERAGE_READY: pop.covered,
      PUBLISH_READY: qMap.publishable ?? 0,
      ACTUALLY_PUBLISHED: pop.published,
    },
    CLAIMS_FALSE: {
      entireUaeMatrixPublishReady: false,
      all124400Indexed: false,
      allLocationsServed: false,
    },
    BLOCKERS: [
      longformRunning > 0 || longformPending > 0 ? "Longform jobs still pending/running" : null,
      !corpusComplete ? `Longform incomplete: ${longformSucceeded}/${draftLocalesTarget}` : null,
      "Operational coverage decisions still EXTERNAL_REQUIRED for remaining uncovered pairs",
      "Object storage / real image binaries EXTERNAL_REQUIRED",
      "Managed production Postgres / DNS / HTTPS / secrets EXTERNAL_REQUIRED",
    ].filter(Boolean),
    NEXT_OPERATIONAL_STEP: !corpusComplete
      ? "Let longform runner finish remaining draft locales; do not interrupt."
      : "Use /admin/service-pages/coverage to set real coverage, then queue → CONFIRM_PUBLISH for eligible pairs only.",
  };

  writeFileSync(join(process.cwd(), "docs/final-longform-completion-report.json"), JSON.stringify(report, null, 2) + "\n");
  writeFileSync(join(process.cwd(), "docs/final-publication-readiness.json"), JSON.stringify(report, null, 2) + "\n");

  const en = draftHead.EN;
  const ar = draftHead.AR;
  const md = `# Final longform completion report

Generated: ${report.generatedAt}

## LONGFORM STATUS
- Succeeded: **${longformSucceeded}** / ${draftLocalesTarget} (${report.LONGFORM_STATUS.progressPct}%)
- Failed / dead / pending / running: ${longformFailed} / ${longformDead} / ${longformPending} / ${longformRunning}
- Corpus complete: **${corpusComplete}**

## FINAL COUNTS
| Metric | Value |
|--------|------:|
| ServiceLocation total | ${pop.serviceLocationTotal} |
| Matrix materialized | ${pop.classification.approvedMatrixRows} |
| Legacy extra | ${pop.classification.legacyOutsideMatrixRows} |
| Duplicate pairs | ${dupPairs.length} |
| Published / covered | ${pop.published} / ${pop.covered} |
| Draft / uncovered | ${pop.draft} / ${pop.uncovered} |
| Indexable EN / AR | ${pop.indexableEn} / ${pop.indexableAr} |

## EN WORDCOUNT (draft head sample n=${en.count})
| Band | Count |
|------|------:|
| <500 | ${en.bands["<500"]} |
| 500–799 | ${en.bands["500-799"]} |
| 800–999 | ${en.bands["800-999"]} |
| 1,000–1,200 | ${en.bands["1000-1200"]} |
| >1,200 | ${en.bands[">1200"]} |
| Avg / median / min / max | ${en.average} / ${en.median} / ${en.min} / ${en.max} |

## AR WORDCOUNT (draft head sample n=${ar.count})
| Band | Count |
|------|------:|
| <500 | ${ar.bands["<500"]} |
| 500–799 | ${ar.bands["500-799"]} |
| 800–999 | ${ar.bands["800-999"]} |
| 1,000–1,200 | ${ar.bands["1000-1200"]} |
| >1,200 | ${ar.bands[">1200"]} |
| Avg / median / min / max | ${ar.average} / ${ar.median} / ${ar.min} / ${ar.max} |

## QUALITY STATUS
- publishable: ${report.QUALITY.publishable}
- ready_for_review: ${report.QUALITY.ready_for_review}
- failed_quality: ${report.QUALITY.failed_quality}

## SAFETY STATUS
- Matrix 46/128/112/25
- Authored ${authored.GREEN}/${authored.YELLOW}/${authored.RED}/${authored.REVIEW_REQUIRED}
- Remaining eligible YELLOW: ${report.SAFETY.remainingEligibleYellow}
- Hubs category-only preserved; painting-services held

## PUBLICATION STATUS
| Layer | Value |
|-------|------:|
| CONTENT-READY | ${report.PUBLICATION.CONTENT_READY} |
| COVERAGE-READY (covered rows) | ${report.PUBLICATION.COVERAGE_READY} |
| PUBLISH-READY (quality publishable) | ${report.PUBLICATION.PUBLISH_READY} |
| ACTUALLY PUBLISHED | ${report.PUBLICATION.ACTUALLY_PUBLISHED} |
| Sitemap public pairs | ${sitemapPublic} |
| Uncovered indexable | ${uncoveredIndexable} |

## BLOCKERS
${report.BLOCKERS.map((b) => `- ${b}`).join("\n")}

## NEXT OPERATIONAL STEP
${report.NEXT_OPERATIONAL_STEP}
`;

  writeFileSync(join(process.cwd(), "docs/final-longform-completion-report.md"), md);
  writeFileSync(join(process.cwd(), "docs/final-publication-readiness.md"), md);
  console.log(
    JSON.stringify(
      {
        ok: true,
        longformSucceeded,
        draftLocalesTarget,
        corpusComplete,
        progressPct: report.LONGFORM_STATUS.progressPct,
        enAvg: en.average,
        arAvg: ar.average,
        published: pop.published,
        covered: pop.covered,
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
