/**
 * Phase 2c — Arabic FAQ article slugs + relatedServiceSlugs remap.
 * Usage: npx tsx scripts/phase2-arabic-faq-slugs.ts --limit=50
 */
import "./load-env-mysql";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { prisma } from "../src/server/db";
import { isAlreadyArabicSlug, remapJsonSlugArray, toArabicSlug } from "../src/lib/slug/arabic-slug";

const MAP_PATH = join(process.cwd(), "scripts/_slug-maps.json");
const AR = /[\u0600-\u06FF]/;

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const limitArg = process.argv.find((a) => a.startsWith("--limit="));
  const limit = limitArg ? Math.max(0, Number(limitArg.slice(8)) || 0) : 0;
  const maps = JSON.parse(readFileSync(MAP_PATH, "utf8")) as { service: Record<string, string> };

  const services = await prisma.service.findMany({
    select: { slug: true, translations: { where: { locale: "ar" }, select: { name: true } } },
  });
  const nameByNew = new Map(services.map((s) => [s.slug, s.translations[0]?.name || ""]));
  const nameByOld = new Map(Object.entries(maps.service).map(([old, neu]) => [old, nameByNew.get(neu) || ""]));

  let rows = await prisma.article.findMany({
    where: {
      OR: [{ slug: { startsWith: "faq-" } }, { categorySlugs: { contains: "service-faq" } }],
    },
    select: {
      id: true,
      slug: true,
      relatedServiceSlugs: true,
      translations: { where: { locale: "ar" }, select: { title: true } },
    },
    orderBy: { id: "asc" },
  });
  if (limit) rows = rows.slice(0, limit);

  let updated = 0;
  let skipped = 0;
  const samples: Array<{ from: string; to: string }> = [];
  const taken = new Set<string>();

  for (const row of rows) {
    if (isAlreadyArabicSlug(row.slug)) {
      skipped += 1;
      continue;
    }
    let svcOld = row.slug.startsWith("faq-") ? row.slug.slice(4) : "";
    try {
      const rel = JSON.parse(row.relatedServiceSlugs || "[]") as string[];
      if (rel[0]) svcOld = rel[0];
    } catch {
      /* ignore */
    }
    const name = nameByOld.get(svcOld) || nameByNew.get(svcOld) || row.translations[0]?.title || svcOld;
    if (!AR.test(name)) {
      skipped += 1;
      continue;
    }
    let next = toArabicSlug(`أسئلة-${name}`);
    let i = 2;
    while (taken.has(next)) {
      next = toArabicSlug(`أسئلة-${name}-${i}`);
      i += 1;
    }
    taken.add(next);
    samples.push({ from: row.slug, to: next });
    if (!dryRun) {
      await prisma.article.update({
        where: { id: row.id },
        data: {
          slug: next,
          relatedServiceSlugs: remapJsonSlugArray(row.relatedServiceSlugs, maps.service),
        },
      });
    }
    updated += 1;
  }

  console.log(JSON.stringify({ dryRun, total: rows.length, updated, skipped, samples: samples.slice(0, 12) }, null, 2));
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
