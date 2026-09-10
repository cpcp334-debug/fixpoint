/**
 * First long-form draft regen batch: 500 locale rows (EN+AR).
 * Skips published. Resumable via ContentGenerationJob idempotency.
 */
import { prisma } from "../src/server/db";
import { composeServiceLocationLocale, saveServiceLocationDraftContent } from "../src/lib/content-generation/author-service-location";
import { enqueueJob, markRunning, markSucceeded, markFailed } from "../src/lib/content-generation/jobs";
import { resolveServiceLocationPageFresh } from "../src/lib/service-location/page-resolve";
import { countRenderedWords, wordCountBand, RENDERED_WORD_MIN_PUBLISH } from "../src/lib/service-location/rendered-words";
import { writeFileSync } from "node:fs";
import { join } from "node:path";

const BATCH_KEY = process.env.SL_LONG_BATCH_KEY || `sl-longform-v2-${new Date().toISOString().slice(0, 10)}`;
const TARGET = Number(process.env.SL_LONG_BATCH || "500");
const OFFSET = Number(process.env.SL_LONG_OFFSET || "0");

async function main() {
  const drafts = await prisma.serviceLocation.findMany({
    where: { coverageStatus: { not: "published" } },
    orderBy: [{ serviceId: "asc" }, { locationId: "asc" }],
    skip: Math.floor(OFFSET / 2),
    take: Math.ceil(TARGET / 2),
    select: {
      id: true,
      service: { select: { slug: true } },
      location: { select: { slug: true } },
    },
  });

  const locales: Array<{ slId: string; serviceSlug: string; locationSlug: string; locale: "en" | "ar" }> = [];
  for (const row of drafts) {
    locales.push({ slId: row.id, serviceSlug: row.service.slug, locationSlug: row.location.slug, locale: "en" });
    locales.push({ slId: row.id, serviceSlug: row.service.slug, locationSlug: row.location.slug, locale: "ar" });
  }
  const work = locales.slice(0, TARGET);

  const bands = { "<500": 0, "500-799": 0, "800-999": 0, "1000-1200": 0, ">1200": 0 };
  let pass = 0;
  let under800 = 0;
  let failed = 0;
  let arReview = 0;
  const words: number[] = [];

  for (const item of work) {
    const idem = `sl_long_v2:${item.serviceSlug}:${item.locationSlug}:${item.locale}`;
    try {
      const job = await enqueueJob({
        kind: "service_location_locale",
        idempotencyKey: idem,
        batchKey: BATCH_KEY,
        generationVersion: 2,
        serviceLocationId: item.slId,
        locale: item.locale,
        priority: 5,
        payloadJson: JSON.stringify({ mode: "longform_v2", force: true }),
        requeueSucceeded: true,
      });
      await markRunning(job.id);
      const composed = await composeServiceLocationLocale(prisma, {
        serviceLocationId: item.slId,
        locale: item.locale,
      });
      await saveServiceLocationDraftContent(prisma, {
        serviceLocationId: item.slId,
        locale: item.locale,
        copy: composed.copy,
        contentHash: composed.contentHash,
        batchKey: BATCH_KEY,
      });
      await markSucceeded(job.id, {
        resultJson: JSON.stringify({ hints: composed.qualityHints, contentHash: composed.contentHash }),
        contentHash: composed.contentHash,
      });

      const model = await resolveServiceLocationPageFresh({
        serviceSlug: item.serviceSlug,
        locationSlug: item.locationSlug,
        locale: item.locale,
        mode: "preview",
      });
      if (!model) {
        failed += 1;
        continue;
      }
      const n = countRenderedWords(model);
      words.push(n);
      bands[wordCountBand(n)] += 1;
      if (n >= RENDERED_WORD_MIN_PUBLISH) pass += 1;
      else under800 += 1;
      if (item.locale === "ar") arReview += 1;
    } catch (err) {
      failed += 1;
      const message = err instanceof Error ? err.message : String(err);
      console.error(idem, message);
      try {
        const job = await prisma.contentGenerationJob.findUnique({ where: { idempotencyKey: idem } });
        if (job) await markFailed(job.id, message);
      } catch {
        /* ignore */
      }
    }
  }

  words.sort((a, b) => a - b);
  const avg = words.length ? Math.round(words.reduce((a, b) => a + b, 0) / words.length) : 0;
  const median = words.length ? words[Math.floor(words.length / 2)]! : 0;
  const report = {
    generatedAt: new Date().toISOString(),
    batchKey: BATCH_KEY,
    offset: OFFSET,
    generated: work.length,
    pass800plus: pass,
    under800,
    bands,
    average: avg,
    median,
    arLocales: arReview,
    failed,
    systemicHealthy: failed / Math.max(work.length, 1) < 0.1 && pass / Math.max(words.length, 1) >= 0.7,
  };
  const outName =
    OFFSET === 0 && TARGET === 500
      ? "docs/service-location-longform-batch-500.json"
      : `docs/service-location-longform-batch-offset-${OFFSET}.json`;
  writeFileSync(join(process.cwd(), outName), JSON.stringify(report, null, 2) + "\n");
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
