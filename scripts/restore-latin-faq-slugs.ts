/**
 * Restore Latin primary FAQ article slugs (reverse of phase2-arabic-faq-slugs).
 * Policy: DB `slug` = `faq-{latinService}`; Arabic forms kept in scripts/_slug-maps.json → faq.
 *
 * Also remaps relatedServiceSlugs / relatedDiySlugs to Latin masters.
 *
 * Usage:
 *   npx tsx scripts/restore-latin-faq-slugs.ts --dry-run
 *   npx tsx scripts/restore-latin-faq-slugs.ts
 */
import "./load-env-mysql";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { prisma } from "../src/server/db";
import { SERVICE_FAQ_CATEGORY, SERVICE_FAQ_SLUG_PREFIX } from "../src/lib/faq/service-faq";
import { toMasterServiceSlug } from "../src/lib/slug/service-slug-map";
import { parseJson } from "../src/lib/utils";

const MAP_PATH = join(process.cwd(), "scripts/_slug-maps.json");
const AR = /[\u0600-\u06FF]/;

type SlugMaps = {
  service?: Record<string, string>;
  diyGuide?: Record<string, string>;
  faq?: Record<string, string>;
  [key: string]: Record<string, string> | undefined;
};

function parseArgs(argv: string[]) {
  return { dryRun: argv.includes("--dry-run") };
}

function reverseMap(forward: Record<string, string> | undefined) {
  const rev: Record<string, string> = {};
  for (const [latin, ar] of Object.entries(forward || {})) {
    if (ar) rev[ar] = latin;
  }
  return rev;
}

function toLatinService(raw: string, serviceRev: Record<string, string>) {
  const viaHelper = toMasterServiceSlug(raw);
  if (viaHelper && !AR.test(viaHelper)) return viaHelper;
  const viaRev = serviceRev[raw];
  if (viaRev && !AR.test(viaRev)) return viaRev;
  if (raw && !AR.test(raw)) return raw;
  return "";
}

function toLatinDiy(raw: string, diyRev: Record<string, string>) {
  const viaRev = diyRev[raw];
  if (viaRev && !AR.test(viaRev)) return viaRev;
  if (raw && !AR.test(raw)) return raw;
  return raw;
}

function uniquify(base: string, taken: Set<string>) {
  if (!taken.has(base)) {
    taken.add(base);
    return base;
  }
  let i = 2;
  while (i < 10_000) {
    const next = `${base}-${i}`;
    if (!taken.has(next)) {
      taken.add(next);
      return next;
    }
    i += 1;
  }
  throw new Error(`Could not uniquify ${base}`);
}

async function main() {
  const { dryRun } = parseArgs(process.argv.slice(2));
  if (!existsSync(MAP_PATH)) throw new Error(`Missing ${MAP_PATH}`);
  const maps = JSON.parse(readFileSync(MAP_PATH, "utf8")) as SlugMaps;
  const serviceRev = reverseMap(maps.service);
  const diyRev = reverseMap(maps.diyGuide);

  const rows = await prisma.article.findMany({
    where: { categorySlugs: { contains: SERVICE_FAQ_CATEGORY } },
    select: {
      id: true,
      slug: true,
      categorySlugs: true,
      relatedServiceSlugs: true,
      relatedDiySlugs: true,
    },
    orderBy: { id: "asc" },
  });

  const taken = new Set<string>();
  // Reserve already-latin faq-* that we will not change
  for (const row of rows) {
    if (row.slug.startsWith(SERVICE_FAQ_SLUG_PREFIX) && !AR.test(row.slug)) {
      taken.add(row.slug);
    }
  }

  const faqForward: Record<string, string> = { ...(maps.faq || {}) };
  const plan: Array<{
    id: string;
    from: string;
    to: string;
    relatedServiceSlugs: string;
    relatedDiySlugs: string;
  }> = [];
  let skippedLatin = 0;
  let failed = 0;
  const failures: Array<{ id: string; slug: string; reason: string }> = [];

  for (const row of rows) {
    const cats = parseJson<string[]>(row.categorySlugs, []);
    const relSvc = parseJson<string[]>(row.relatedServiceSlugs, []);
    const relDiy = parseJson<string[]>(row.relatedDiySlugs, []);

    const latinSvcList = relSvc.map((s) => toLatinService(s, serviceRev)).filter(Boolean);
    let latinSvc = latinSvcList[0] || "";
    if (!latinSvc) {
      const hub = cats.find((c) => c !== SERVICE_FAQ_CATEGORY) || "";
      if (hub && !AR.test(hub)) latinSvc = hub;
    }
    if (!latinSvc) {
      failed += 1;
      failures.push({ id: row.id, slug: row.slug, reason: "no-latin-service" });
      continue;
    }

    const desiredBase = `${SERVICE_FAQ_SLUG_PREFIX}${latinSvc}`;
    const alreadyLatin = row.slug.startsWith(SERVICE_FAQ_SLUG_PREFIX) && !AR.test(row.slug);
    const nextSlug = alreadyLatin ? row.slug : uniquify(desiredBase, taken);

    if (alreadyLatin && row.slug === nextSlug) {
      // Still remap related arrays if needed
      const nextRelSvc = JSON.stringify(latinSvcList.length ? latinSvcList : [latinSvc]);
      const nextRelDiy = JSON.stringify(relDiy.map((s) => toLatinDiy(s, diyRev)));
      const svcChanged = nextRelSvc !== (row.relatedServiceSlugs || "[]");
      const diyChanged = nextRelDiy !== (row.relatedDiySlugs || "[]");
      if (!svcChanged && !diyChanged) {
        skippedLatin += 1;
        continue;
      }
      plan.push({
        id: row.id,
        from: row.slug,
        to: row.slug,
        relatedServiceSlugs: nextRelSvc,
        relatedDiySlugs: nextRelDiy,
      });
      continue;
    }

    // latin faq-* → prior Arabic slug (for AR soft recovery)
    if (AR.test(row.slug) && nextSlug !== row.slug) {
      faqForward[nextSlug] = row.slug;
    }

    plan.push({
      id: row.id,
      from: row.slug,
      to: nextSlug,
      relatedServiceSlugs: JSON.stringify(latinSvcList.length ? latinSvcList : [latinSvc]),
      relatedDiySlugs: JSON.stringify(relDiy.map((s) => toLatinDiy(s, diyRev))),
    });
  }

  const samples = plan.filter((p) => p.from !== p.to).slice(0, 12);

  if (!dryRun) {
    // Two-phase slug updates to avoid unique collisions
    for (const step of plan) {
      if (step.from === step.to) {
        await prisma.article.update({
          where: { id: step.id },
          data: {
            relatedServiceSlugs: step.relatedServiceSlugs,
            relatedDiySlugs: step.relatedDiySlugs,
          },
        });
        continue;
      }
      await prisma.article.update({
        where: { id: step.id },
        data: { slug: `__restore_faq_${step.id}` },
      });
    }
    for (const step of plan) {
      if (step.from === step.to) continue;
      await prisma.article.update({
        where: { id: step.id },
        data: {
          slug: step.to,
          relatedServiceSlugs: step.relatedServiceSlugs,
          relatedDiySlugs: step.relatedDiySlugs,
        },
      });
    }

    maps.faq = faqForward;
    const faqSidecar = join(process.cwd(), "scripts/_faq-slug-map.json");
    writeFileSync(faqSidecar, JSON.stringify(faqForward, null, 2), "utf8");
    writeFileSync(MAP_PATH, JSON.stringify(maps, null, 2), "utf8");
    const verifyCount = Object.keys(
      (JSON.parse(readFileSync(MAP_PATH, "utf8")) as { faq?: Record<string, string> }).faq || {},
    ).length;
    if (verifyCount !== Object.keys(faqForward).length) {
      throw new Error(
        `FAQ map write verify failed: expected ${Object.keys(faqForward).length}, got ${verifyCount}`,
      );
    }
  }

  const afterPrefix = dryRun
    ? null
    : await prisma.article.count({ where: { slug: { startsWith: SERVICE_FAQ_SLUG_PREFIX } } });
  const afterArabic = dryRun
    ? null
    : await prisma.article.count({
        where: { categorySlugs: { contains: SERVICE_FAQ_CATEGORY }, slug: { startsWith: "أسئلة" } },
      });

  console.log(
    JSON.stringify(
      {
        dryRun,
        total: rows.length,
        planned: plan.length,
        slugChanges: plan.filter((p) => p.from !== p.to).length,
        skippedLatin,
        failed,
        failures,
        samples,
        afterPrefix,
        afterArabic,
        faqMapEntries: Object.keys(faqForward).length,
      },
      null,
      2,
    ),
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
