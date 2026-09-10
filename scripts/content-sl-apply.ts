/**
 * Enqueue + process ServiceLocation locale draft content in batches.
 * Skips published pairs. Does not publish. Does not invent coverage.
 *
 * Env:
 *   SL_CONTENT_LIMIT — max pairs to process this run (default 100)
 *   SL_CONTENT_LOCALE — en | ar | both (default both)
 *   SL_CONTENT_OFFSET — skip N eligible pairs (default 0)
 *   SL_CONTENT_INCLUDE_LEGACY=1 — include legacy outside-matrix services
 *   SL_CONTENT_LEGACY_ONLY=1 — process only legacy outside-matrix services
 *   SL_CONTENT_CONCURRENCY — parallel jobs (default 8)
 */
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { prisma } from "../src/server/db";
import { enqueueJob } from "../src/lib/content-generation/jobs";
import { processContentJob } from "../src/lib/content-generation/process-job";
import { UNMAPPED_LEGACY_DRAFT_SLUGS } from "../prisma/data/catalog-a1";
import { loadDiyClassificationMatrix } from "../src/lib/service-location/diy-matrix";

async function mapPool<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  async function worker() {
    while (true) {
      const i = next;
      next += 1;
      if (i >= items.length) return;
      results[i] = await fn(items[i]!);
    }
  }
  const n = Math.max(1, Math.min(concurrency, items.length || 1));
  await Promise.all(Array.from({ length: n }, () => worker()));
  return results;
}

async function main() {
  const limit = Number(process.env.SL_CONTENT_LIMIT || "100");
  const offset = Number(process.env.SL_CONTENT_OFFSET || "0");
  const localeMode = (process.env.SL_CONTENT_LOCALE || "both") as "en" | "ar" | "both";
  const includeLegacy = process.env.SL_CONTENT_INCLUDE_LEGACY === "1";
  const legacyOnly = process.env.SL_CONTENT_LEGACY_ONLY === "1";
  const concurrency = Number(process.env.SL_CONTENT_CONCURRENCY || "8");
  const matrix = loadDiyClassificationMatrix();
  const legacy = new Set(UNMAPPED_LEGACY_DRAFT_SLUGS as readonly string[]);
  const batchKey = `sl-content-${new Date().toISOString().slice(0, 10)}`;

  const serviceWhere = legacyOnly
    ? { slug: { in: [...legacy] } }
    : includeLegacy
      ? undefined
      : { slug: { notIn: [...legacy] } };

  const pairs = await prisma.serviceLocation.findMany({
    where: {
      coverageStatus: { not: "published" },
      service: serviceWhere,
    },
    select: {
      id: true,
      service: { select: { slug: true } },
      location: { select: { slug: true } },
      translations: { select: { locale: true, intro: true, h1: true } },
    },
    orderBy: [{ service: { slug: "asc" } }, { location: { slug: "asc" } }],
    skip: offset,
    take: limit,
  });

  const report = {
    batchKey,
    offset,
    limit,
    concurrency,
    legacyOnly,
    includeLegacy,
    selected: pairs.length,
    enOk: 0,
    arOk: 0,
    skippedPublished: 0,
    failed: [] as Array<{ pair: string; error: string }>,
  };

  type WorkItem = {
    pairId: string;
    serviceSlug: string;
    locationSlug: string;
    locale: "en" | "ar";
  };

  const work: WorkItem[] = [];
  for (const pair of pairs) {
    if (legacyOnly) {
      if (!legacy.has(pair.service.slug)) continue;
    } else if (!matrix.bySlug.has(pair.service.slug) && !(includeLegacy && legacy.has(pair.service.slug))) {
      continue;
    }

    const locales: Array<"en" | "ar"> =
      localeMode === "both" ? ["en", "ar"] : localeMode === "ar" ? ["ar"] : ["en"];

    for (const locale of locales) {
      const existing = pair.translations.find((t) => t.locale === locale);
      if (existing?.intro?.trim() && existing?.h1?.trim()) {
        if (locale === "en") report.enOk += 1;
        else report.arOk += 1;
        continue;
      }
      work.push({
        pairId: pair.id,
        serviceSlug: pair.service.slug,
        locationSlug: pair.location.slug,
        locale,
      });
    }
  }

  await mapPool(work, concurrency, async (item) => {
    try {
      const job = await enqueueJob({
        kind: "service_location_locale",
        idempotencyKey: `sl_locale:${item.locale}:${item.serviceSlug}:${item.locationSlug}:v1`,
        batchKey,
        generationVersion: 1,
        serviceLocationId: item.pairId,
        locale: item.locale,
        priority: 5,
        requeueSucceeded: false,
      });
      if (job.status === "succeeded") {
        if (item.locale === "en") report.enOk += 1;
        else report.arOk += 1;
        return;
      }
      if (job.status === "running" || job.status === "failed") {
        await prisma.contentGenerationJob.update({
          where: { id: job.id },
          data: { status: "pending", startedAt: null, finishedAt: null },
        });
      }
      const res = await processContentJob(job.id);
      if (res.ok) {
        if (item.locale === "en") report.enOk += 1;
        else report.arOk += 1;
      } else {
        report.failed.push({
          pair: `${item.serviceSlug}/${item.locationSlug}:${item.locale}`,
          error: res.error || "failed",
        });
      }
    } catch (e) {
      report.failed.push({
        pair: `${item.serviceSlug}/${item.locationSlug}:${item.locale}`,
        error: e instanceof Error ? e.message : String(e),
      });
    }
  });

  const out = join(process.cwd(), "docs/content-sl-apply.json");
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
