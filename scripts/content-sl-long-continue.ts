/**
 * Continuous long-form draft corpus regen until exhausted.
 * Resumable via SL_LONG_OFFSET. Skips published. Tracks EN/AR separately.
 */
import { writeFileSync, appendFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { prisma } from "../src/server/db";
import {
  composeServiceLocationLocale,
  saveServiceLocationDraftContent,
} from "../src/lib/content-generation/author-service-location";
import { enqueueJob, markRunning, markSucceeded, markFailed } from "../src/lib/content-generation/jobs";
import { resolveServiceLocationPageFresh } from "../src/lib/service-location/page-resolve";
import {
  countRenderedWords,
  wordCountBand,
  RENDERED_WORD_MIN_PUBLISH,
} from "../src/lib/service-location/rendered-words";

type Band = ReturnType<typeof wordCountBand>;

const BATCH_KEY = process.env.SL_LONG_BATCH_KEY || `sl-longform-v2-${new Date().toISOString().slice(0, 10)}`;
const CHUNK = Number(process.env.SL_LONG_BATCH || "2000");
let offset = Number(process.env.SL_LONG_OFFSET || "0");
const MAX_TOTAL = Number(process.env.SL_LONG_MAX || "0"); // 0 = until exhausted

function emptyBands(): Record<Band, number> {
  return { "<500": 0, "500-799": 0, "800-999": 0, "1000-1200": 0, ">1200": 0 };
}

function stats(words: number[], bands: Record<Band, number>) {
  const sorted = [...words].sort((a, b) => a - b);
  const avg = sorted.length ? Math.round(sorted.reduce((a, b) => a + b, 0) / sorted.length) : 0;
  const median = sorted.length ? sorted[Math.floor(sorted.length / 2)]! : 0;
  return { count: sorted.length, avg, median, bands, under800: bands["<500"] + bands["500-799"] };
}

async function processChunk(startOffset: number, takeLocales: number) {
  const drafts = await prisma.serviceLocation.findMany({
    where: { coverageStatus: { not: "published" } },
    orderBy: [{ serviceId: "asc" }, { locationId: "asc" }],
    skip: Math.floor(startOffset / 2),
    take: Math.ceil(takeLocales / 2),
    select: {
      id: true,
      service: { select: { slug: true } },
      location: { select: { slug: true } },
    },
  });

  const work: Array<{ slId: string; serviceSlug: string; locationSlug: string; locale: "en" | "ar" }> = [];
  for (const row of drafts) {
    work.push({ slId: row.id, serviceSlug: row.service.slug, locationSlug: row.location.slug, locale: "en" });
    work.push({ slId: row.id, serviceSlug: row.service.slug, locationSlug: row.location.slug, locale: "ar" });
  }
  const slice = work.slice(0, takeLocales);
  if (!slice.length) return { done: true as const, processed: 0 };

  const bandsAll = emptyBands();
  const bandsEn = emptyBands();
  const bandsAr = emptyBands();
  const wordsAll: number[] = [];
  const wordsEn: number[] = [];
  const wordsAr: number[] = [];
  let failed = 0;
  let pass = 0;

  for (const item of slice) {
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
      const band = wordCountBand(n);
      wordsAll.push(n);
      bandsAll[band] += 1;
      if (item.locale === "en") {
        wordsEn.push(n);
        bandsEn[band] += 1;
      } else {
        wordsAr.push(n);
        bandsAr[band] += 1;
      }
      if (n >= RENDERED_WORD_MIN_PUBLISH) pass += 1;
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

  const report = {
    generatedAt: new Date().toISOString(),
    batchKey: BATCH_KEY,
    offset: startOffset,
    generated: slice.length,
    pass800plus: pass,
    under800: bandsAll["<500"] + bandsAll["500-799"],
    failed,
    overall: stats(wordsAll, bandsAll),
    EN: stats(wordsEn, bandsEn),
    AR: stats(wordsAr, bandsAr),
    systemicHealthy: failed / Math.max(slice.length, 1) < 0.1 && pass / Math.max(wordsAll.length, 1) >= 0.7,
  };

  writeFileSync(
    join(process.cwd(), `docs/service-location-longform-batch-offset-${startOffset}.json`),
    JSON.stringify(report, null, 2) + "\n",
  );
  console.log(JSON.stringify({ ...report, nextOffset: startOffset + slice.length }, null, 2));
  return { done: false as const, processed: slice.length, report };
}

async function main() {
  mkdirSync(join(process.cwd(), "docs"), { recursive: true });
  let processedTotal = 0;
  const progressPath = join(process.cwd(), "docs/service-location-longform-progress.jsonl");

  while (true) {
    if (MAX_TOTAL > 0 && processedTotal >= MAX_TOTAL) break;
    const take = MAX_TOTAL > 0 ? Math.min(CHUNK, MAX_TOTAL - processedTotal) : CHUNK;
    const result = await processChunk(offset, take);
    if (result.done || result.processed === 0) {
      console.log(JSON.stringify({ ok: true, exhausted: true, offset, processedTotal }));
      break;
    }
    appendFileSync(progressPath, JSON.stringify({ at: new Date().toISOString(), offset, processed: result.processed }) + "\n");
    if (!result.report.systemicHealthy) {
      console.error(JSON.stringify({ stop: "systemic_unhealthy", offset, report: result.report }));
      process.exitCode = 2;
      break;
    }
    offset += result.processed;
    processedTotal += result.processed;
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
