/**
 * One Service × Location draft pilot. Never publishes. Never indexes.
 * Never flips covered. Refuses already-published pairs.
 *
 * Default pair: residential-cleaning × abu-dhabi-city
 * (first item on the Cleaning list: Residential Cleaning — Abu Dhabi — Abu Dhabi)
 */
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { prisma } from "../src/server/db";
import {
  composeServiceLocationLocale,
  saveServiceLocationDraftContent,
} from "../src/lib/content-generation/author-service-location";
import { loadEligibilityForId } from "../src/lib/service-location/publication-ops";
import { resolveServiceLocationPageFresh } from "../src/lib/service-location/page-resolve";
import { countRenderedWords, wordCountBand } from "../src/lib/service-location/rendered-words";
import { estimateWorkingCopyWords } from "../src/lib/service-location/rendered-words";

const SERVICE_SLUG = process.env.SL_PILOT_SERVICE || "residential-cleaning";
const LOCATION_CANDIDATES = (
  process.env.SL_PILOT_LOCATION || "abu-dhabi-city,abu-dhabi"
)
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const BATCH_KEY = "sl-pilot-one";

async function main() {
  const service = await prisma.service.findUnique({
    where: { slug: SERVICE_SLUG },
    select: { id: true, slug: true, status: true },
  });
  if (!service) throw new Error(`service_not_found:${SERVICE_SLUG}`);

  const locations = await prisma.location.findMany({
    where: { slug: { in: LOCATION_CANDIDATES } },
    select: { id: true, slug: true, type: true, serves: true, status: true },
  });
  const bySlug = new Map(locations.map((l) => [l.slug, l]));

  let chosen: { id: string; slug: string } | null = null;
  let skippedPublished: string | null = null;

  for (const slug of LOCATION_CANDIDATES) {
    const location = bySlug.get(slug);
    if (!location) continue;
    const row = await prisma.serviceLocation.findUnique({
      where: { serviceId_locationId: { serviceId: service.id, locationId: location.id } },
      select: {
        id: true,
        coverageStatus: true,
        covered: true,
        indexable: true,
        indexableEn: true,
        indexableAr: true,
      },
    });
    if (!row) continue;
    if (row.coverageStatus === "published") {
      skippedPublished = `${SERVICE_SLUG}/${slug}`;
      continue;
    }
    chosen = { id: row.id, slug };
    break;
  }

  if (!chosen) {
    throw new Error(
      skippedPublished
        ? `no_unpublished_pair (skipped published ${skippedPublished})`
        : `pair_not_materialized:${SERVICE_SLUG} × ${LOCATION_CANDIDATES.join("|")}`,
    );
  }

  const before = await prisma.serviceLocation.findUniqueOrThrow({
    where: { id: chosen.id },
    select: {
      coverageStatus: true,
      covered: true,
      indexable: true,
      indexableEn: true,
      indexableAr: true,
      publishedAt: true,
    },
  });
  if (before.coverageStatus === "published" || before.covered || before.indexable) {
    throw new Error("refusing_public_or_covered_row");
  }

  const locales = ["en", "ar"] as const;
  const composed: Record<string, { words: number; hints: string[] }> = {};

  for (const locale of locales) {
    const result = await composeServiceLocationLocale(prisma, {
      serviceLocationId: chosen.id,
      locale,
    });
    await saveServiceLocationDraftContent(prisma, {
      serviceLocationId: chosen.id,
      locale,
      copy: result.copy,
      contentHash: result.contentHash,
      batchKey: BATCH_KEY,
    });
    composed[locale] = {
      words: estimateWorkingCopyWords(result.copy, locale),
      hints: result.qualityHints,
    };
  }

  const after = await prisma.serviceLocation.findUniqueOrThrow({
    where: { id: chosen.id },
    select: {
      coverageStatus: true,
      covered: true,
      indexable: true,
      indexableEn: true,
      indexableAr: true,
      qualityStatus: true,
      publishedAt: true,
    },
  });

  if (after.coverageStatus === "published" || after.covered || after.indexable) {
    throw new Error("pilot_mutated_public_flags");
  }

  const { eligibility } = await loadEligibilityForId(prisma, chosen.id);

  const rendered: Record<string, { words: number; band: string } | null> = {};
  for (const locale of locales) {
    const model = await resolveServiceLocationPageFresh({
      serviceSlug: SERVICE_SLUG,
      locationSlug: chosen.slug,
      locale,
      mode: "preview",
    });
    rendered[locale] = model
      ? { words: countRenderedWords(model), band: wordCountBand(countRenderedWords(model)) }
      : null;
  }

  const report = {
    pilot: true,
    published: false,
    indexed: false,
    pair: `${SERVICE_SLUG}/${chosen.slug}`,
    skippedPublished,
    lifecycle: after.coverageStatus,
    qualityStatus: after.qualityStatus,
    covered: after.covered,
    indexable: after.indexable,
    composedWords: composed,
    previewRendered: rendered,
    canPublish: eligibility.canPublish,
    canIndexEn: eligibility.canIndexEn,
    canIndexAr: eligibility.canIndexAr,
    primaryBucket: eligibility.primaryBucket,
    blockReasons: eligibility.blockReasons,
    checks: eligibility.checks,
  };

  const out = join(process.cwd(), "docs/service-location-pilot-one.json");
  writeFileSync(out, JSON.stringify(report, null, 2) + "\n", "utf8");
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
