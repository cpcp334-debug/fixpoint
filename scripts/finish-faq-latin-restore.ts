/**
 * Finish stuck FAQ restores left at `__restore_faq_{id}` after a crashed two-phase run.
 * Also remaps Arabic relatedServiceSlugs → Latin masters and writes faq map entries.
 *
 * Usage:
 *   npx tsx scripts/finish-faq-latin-restore.ts --dry-run
 *   npx tsx scripts/finish-faq-latin-restore.ts
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

function reverseMap(forward: Record<string, string> | undefined) {
  const rev: Record<string, string> = {};
  for (const [latin, ar] of Object.entries(forward || {})) {
    if (ar) rev[ar] = latin;
  }
  return rev;
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
  const dryRun = process.argv.includes("--dry-run");
  if (!existsSync(MAP_PATH)) throw new Error(`Missing ${MAP_PATH}`);
  const maps = JSON.parse(readFileSync(MAP_PATH, "utf8")) as SlugMaps;
  const serviceRev = reverseMap(maps.service);
  const diyRev = reverseMap(maps.diyGuide);

  const rows = await prisma.article.findMany({
    where: { categorySlugs: { contains: SERVICE_FAQ_CATEGORY } },
    select: {
      id: true,
      slug: true,
      relatedServiceSlugs: true,
      relatedDiySlugs: true,
    },
    orderBy: { id: "asc" },
  });

  const taken = new Set<string>();
  for (const row of rows) {
    if (row.slug.startsWith(SERVICE_FAQ_SLUG_PREFIX) && !AR.test(row.slug) && !row.slug.startsWith("__restore_faq_")) {
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
  const failures: Array<{ id: string; slug: string; reason: string }> = [];

  for (const row of rows) {
    const stuck = row.slug.startsWith("__restore_faq_");
    const needsLatinSlug = stuck || AR.test(row.slug) || !row.slug.startsWith(SERVICE_FAQ_SLUG_PREFIX);
    const relSvc = parseJson<string[]>(row.relatedServiceSlugs, []);
    const relDiy = parseJson<string[]>(row.relatedDiySlugs, []);

    const latinSvcList = relSvc
      .map((s) => {
        const via = toMasterServiceSlug(s);
        if (via && !AR.test(via)) return via;
        const rev = serviceRev[s];
        if (rev && !AR.test(rev)) return rev;
        if (s && !AR.test(s)) return s;
        return "";
      })
      .filter(Boolean);

    const latinSvc = latinSvcList[0] || "";
    if (!latinSvc) {
      failures.push({ id: row.id, slug: row.slug, reason: "no-latin-service" });
      continue;
    }

    const desiredBase = `${SERVICE_FAQ_SLUG_PREFIX}${latinSvc}`;
    const nextSlug = needsLatinSlug
      ? row.slug.startsWith(SERVICE_FAQ_SLUG_PREFIX) && !AR.test(row.slug) && !stuck
        ? row.slug
        : uniquify(desiredBase, taken)
      : row.slug;

    if (!needsLatinSlug && nextSlug === row.slug) {
      // still fix related arrays
      const nextRelSvc = JSON.stringify(latinSvcList.length ? latinSvcList : [latinSvc]);
      const nextRelDiy = JSON.stringify(
        relDiy.map((s) => {
          const via = diyRev[s];
          if (via && !AR.test(via)) return via;
          return AR.test(s) ? s : s;
        }),
      );
      if (nextRelSvc === (row.relatedServiceSlugs || "[]") && nextRelDiy === (row.relatedDiySlugs || "[]")) {
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

    plan.push({
      id: row.id,
      from: row.slug,
      to: nextSlug,
      relatedServiceSlugs: JSON.stringify(latinSvcList.length ? latinSvcList : [latinSvc]),
      relatedDiySlugs: JSON.stringify(
        relDiy.map((s) => {
          const via = diyRev[s];
          if (via && !AR.test(via)) return via;
          return s;
        }),
      ),
    });
  }

  if (!dryRun) {
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
      // already at temp, or move to temp first
      if (!step.from.startsWith("__restore_faq_")) {
        await prisma.article.update({
          where: { id: step.id },
          data: { slug: `__restore_faq_${step.id}` },
        });
      }
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
    writeFileSync(MAP_PATH, JSON.stringify(maps, null, 2), "utf8");
  }

  const after = dryRun
    ? null
    : {
        faqPrefix: await prisma.article.count({ where: { slug: { startsWith: SERVICE_FAQ_SLUG_PREFIX } } }),
        temp: await prisma.article.count({ where: { slug: { startsWith: "__restore_faq_" } } }),
      };

  console.log(
    JSON.stringify(
      {
        dryRun,
        planned: plan.length,
        slugChanges: plan.filter((p) => p.from !== p.to).length,
        failures: failures.slice(0, 20),
        failureCount: failures.length,
        samples: plan.filter((p) => p.from !== p.to).slice(0, 10),
        after,
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
