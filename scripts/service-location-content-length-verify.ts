/**
 * Content-length audit with EN/AR split + readiness snapshot.
 * Read-heavy; does not mutate. Uses rendered word counts.
 */
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { prisma } from "../src/server/db";
import { resolveServiceLocationPageFresh } from "../src/lib/service-location/page-resolve";
import { countRenderedWords, wordCountBand } from "../src/lib/service-location/rendered-words";
import { measureServiceLocationPopulation } from "../src/lib/service-location/population";
import { UNMAPPED_LEGACY_DRAFT_SLUGS } from "../prisma/data/catalog-a1";

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
    bands: { ...bands },
    under800: bands["<500"] + bands["500-799"],
    in800_999: bands["800-999"],
    in1000_1200: bands["1000-1200"],
    over1200: bands[">1200"],
  };
}

async function measurePairs(
  pairs: Array<{ serviceSlug: string; locationSlug: string }>,
  locales: Array<"en" | "ar">,
) {
  const bandsEn = emptyBands();
  const bandsAr = emptyBands();
  const wordsEn: number[] = [];
  const wordsAr: number[] = [];
  let failed = 0;
  for (const pair of pairs) {
    for (const locale of locales) {
      try {
        const model = await resolveServiceLocationPageFresh({
          serviceSlug: pair.serviceSlug,
          locationSlug: pair.locationSlug,
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
      } catch {
        failed += 1;
      }
    }
  }
  return {
    failed,
    EN: summarize(wordsEn, bandsEn),
    AR: summarize(wordsAr, bandsAr),
  };
}

async function main() {
  const pop = await measureServiceLocationPopulation(prisma);
  const legacy = [...(UNMAPPED_LEGACY_DRAFT_SLUGS as readonly string[])];

  const published = await prisma.serviceLocation.findMany({
    where: { coverageStatus: "published" },
    select: { service: { select: { slug: true } }, location: { select: { slug: true } } },
  });

  // Sample regenerated drafts: first 1000 draft pairs (2000 locales) after longform start
  const draftSample = await prisma.serviceLocation.findMany({
    where: { coverageStatus: "draft" },
    orderBy: [{ serviceId: "asc" }, { locationId: "asc" }],
    take: 1000,
    select: { service: { select: { slug: true } }, location: { select: { slug: true } } },
  });

  const publishedStats = await measurePairs(
    published.map((p) => ({ serviceSlug: p.service.slug, locationSlug: p.location.slug })),
    ["en", "ar"],
  );
  const draftStats = await measurePairs(
    draftSample.map((p) => ({ serviceSlug: p.service.slug, locationSlug: p.location.slug })),
    ["en", "ar"],
  );

  const byQuality = await prisma.serviceLocation.groupBy({ by: ["qualityStatus"], _count: true });
  const qMap = Object.fromEntries(byQuality.map((r) => [r.qualityStatus, r._count]));
  const gen = await prisma.contentGenerationJob.groupBy({
    by: ["status"],
    where: { batchKey: { startsWith: "sl-longform-v2" } },
    _count: true,
  });

  const longJobs = await prisma.contentGenerationJob.count({
    where: { idempotencyKey: { startsWith: "sl_long_v2:" }, status: "succeeded" },
  });

  const report = {
    generatedAt: new Date().toISOString(),
    method: "countRenderedWords(ServiceLocationPageModel) matching ServiceLocationView",
    population: {
      total: pop.serviceLocationTotal,
      published: pop.published,
      draft: pop.draft,
      covered: pop.covered,
      indexableEn: pop.indexableEn,
      indexableAr: pop.indexableAr,
      approvedMatrix: pop.classification.approvedMatrixRows,
      legacy: pop.classification.legacyOutsideMatrixRows,
      theoretical62200: 62200,
      extraVs62200: 1200,
    },
    longformJobsSucceeded: longJobs,
    longformJobStatus: Object.fromEntries(gen.map((g) => [g.status, g._count])),
    TOTAL_DRAFT_LOCALES_TARGET: pop.draft * 2,
    protectedPublished49: {
      pairs: published.length,
      grandfathered: true,
      autoRegenerate: false,
      ...publishedStats,
    },
    draftSampleFirst1000Pairs: {
      pairs: draftSample.length,
      locales: draftSample.length * 2,
      ...draftStats,
    },
    QUALITY: {
      publishable: qMap.publishable ?? 0,
      ready_for_review: qMap.ready_for_review ?? 0,
      failed_quality: qMap.failed_quality ?? 0,
      incomplete: qMap.incomplete ?? 0,
      indexable: qMap.indexable ?? 0,
      note: "Length failure does not auto-set failed_quality for uncovered drafts",
    },
    READINESS: {
      READY_FOR_PUBLISH_proxy: qMap.publishable ?? 0,
      DRAFT: pop.draft,
      REVIEW_REQUIRED: qMap.ready_for_review ?? 0,
      QUALITY_FAILED: qMap.failed_quality ?? 0,
      PUBLISHED: pop.published,
      INDEXABLE_EN: pop.indexableEn,
      INDEXABLE_AR: pop.indexableAr,
    },
    legacySlugs: legacy,
    CLAIMS_FALSE: {
      allDraftsAt1000Words: false,
      massPublished: false,
      productionReady: false,
    },
  };

  writeFileSync(
    join(process.cwd(), "docs/service-location-content-length-report.json"),
    JSON.stringify(report, null, 2) + "\n",
  );

  const d = report.draftSampleFirst1000Pairs;
  const md = `# ServiceLocation content length report

Generated: ${report.generatedAt}

## Method
Rendered word count via \`countRenderedWords\` (matches \`ServiceLocationView\`).

## Population
| Metric | Value |
|--------|------:|
| Total SL | ${report.population.total} |
| Draft / published | ${report.population.draft} / ${report.population.published} |
| Draft locales target (EN+AR) | ${report.TOTAL_DRAFT_LOCALES_TARGET} |
| Longform jobs succeeded | ${report.longformJobsSucceeded} |
| Matrix / legacy | ${report.population.approvedMatrix} / ${report.population.legacy} |

## Protected published 49
| | EN | AR |
|--|---:|---:|
| Counted | ${report.protectedPublished49.EN.count} | ${report.protectedPublished49.AR.count} |
| Average | ${report.protectedPublished49.EN.average} | ${report.protectedPublished49.AR.average} |
| Median | ${report.protectedPublished49.EN.median} | ${report.protectedPublished49.AR.median} |
| Under 800 | ${report.protectedPublished49.EN.under800} | ${report.protectedPublished49.AR.under800} |

Grandfathered — not auto-regenerated.

## Draft sample (first 1000 pairs / ${d.locales} locales) — post longform composer
### EN
| Band | Count |
|------|------:|
| <500 | ${d.EN.bands["<500"]} |
| 500–799 | ${d.EN.bands["500-799"]} |
| 800–999 | ${d.EN.bands["800-999"]} |
| 1,000–1,200 | ${d.EN.bands["1000-1200"]} |
| >1,200 | ${d.EN.bands[">1200"]} |
| Average / median | ${d.EN.average} / ${d.EN.median} |

### AR
| Band | Count |
|------|------:|
| <500 | ${d.AR.bands["<500"]} |
| 500–799 | ${d.AR.bands["500-799"]} |
| 800–999 | ${d.AR.bands["800-999"]} |
| 1,000–1,200 | ${d.AR.bands["1000-1200"]} |
| >1,200 | ${d.AR.bands[">1200"]} |
| Average / median | ${d.AR.average} / ${d.AR.median} |

## Readiness
| Status | Count |
|--------|------:|
| Publishable (quality) | ${report.READINESS.READY_FOR_PUBLISH_proxy} |
| Draft | ${report.READINESS.DRAFT} |
| Review required | ${report.READINESS.REVIEW_REQUIRED} |
| Quality failed | ${report.READINESS.QUALITY_FAILED} |
| Published | ${report.READINESS.PUBLISHED} |
| Indexable EN / AR | ${report.READINESS.INDEXABLE_EN} / ${report.READINESS.INDEXABLE_AR} |

## Notes
- Coverage is never invented by generation.
- Published 49 protected.
- Continuous longform: \`npm run db:content-sl-long-continue\`
`;

  writeFileSync(join(process.cwd(), "docs/service-location-content-length-report.md"), md);
  console.log(JSON.stringify({ ok: true, longformJobsSucceeded: longJobs, draftEnAvg: d.EN.average, draftArAvg: d.AR.average }, null, 2));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
