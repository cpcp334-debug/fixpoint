/**
 * Phase 2 — replace primary entity slugs with Arabic Unicode slugs.
 * NO redirects / NO legacySlug table (per product decision: Latin URLs 404).
 *
 * Order: service categories → services → locations → diy categories → diy guides.
 * Writes maps to scripts/_slug-maps.json for article remaps / JSON sweeps.
 *
 * Usage:
 *   npx tsx scripts/phase2-arabic-primary-slugs.ts --dry-run --limit=20
 *   npx tsx scripts/phase2-arabic-primary-slugs.ts --entities=services,locations
 *   npx tsx scripts/phase2-arabic-primary-slugs.ts
 */
import "./load-env-mysql";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { prisma } from "../src/server/db";
import {
  ensureUniqueSlug,
  isAlreadyArabicSlug,
  remapJsonSlugArray,
  toArabicSlug,
} from "../src/lib/slug/arabic-slug";

type SlugMaps = {
  serviceCategory: Record<string, string>;
  service: Record<string, string>;
  location: Record<string, string>;
  diyCategory: Record<string, string>;
  diyGuide: Record<string, string>;
};

const MAP_PATH = join(process.cwd(), "scripts/_slug-maps.json");
const AR = /[\u0600-\u06FF]/;

function parseArgs(argv: string[]) {
  let dryRun = false;
  let limit = 0;
  let entities = new Set(["serviceCategory", "service", "location", "diyCategory", "diyGuide"]);
  for (const a of argv) {
    if (a === "--dry-run") dryRun = true;
    else if (a.startsWith("--limit=")) limit = Math.max(0, Number(a.slice(8)) || 0);
    else if (a.startsWith("--entities=")) {
      entities = new Set(
        a
          .slice(11)
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
      );
    }
  }
  return { dryRun, limit, entities };
}

function loadMaps(): SlugMaps {
  if (!existsSync(MAP_PATH)) {
    return { serviceCategory: {}, service: {}, location: {}, diyCategory: {}, diyGuide: {} };
  }
  return JSON.parse(readFileSync(MAP_PATH, "utf8")) as SlugMaps;
}

function saveMaps(maps: SlugMaps) {
  writeFileSync(MAP_PATH, JSON.stringify(maps, null, 2), "utf8");
}

function arName(translations: Array<{ locale: string; name: string }>) {
  const ar = translations.find((t) => t.locale === "ar")?.name;
  if (ar && AR.test(ar) && ar !== "REVIEW_REQUIRED") return ar;
  return null;
}

async function main() {
  const { dryRun, limit, entities } = parseArgs(process.argv.slice(2));
  const maps = loadMaps();
  const summary: Record<string, number> = {};
  const samples: Array<{ entity: string; from: string; to: string }> = [];

  if (entities.has("serviceCategory")) {
    const rows = await prisma.serviceCategory.findMany({
      include: { translations: true },
      orderBy: { slug: "asc" },
    });
    const taken = new Set(rows.map((r) => r.slug));
    // Free Latin slots we will rename
    for (const row of rows) {
      if (!isAlreadyArabicSlug(row.slug)) taken.delete(row.slug);
    }
    let n = 0;
    for (const row of rows) {
      if (limit && n >= limit) break;
      if (isAlreadyArabicSlug(row.slug) && maps.serviceCategory[row.slug] === row.slug) continue;
      const name = arName(row.translations);
      if (!name) continue;
      if (isAlreadyArabicSlug(row.slug) && toArabicSlug(name) === row.slug) {
        maps.serviceCategory[row.slug] = row.slug;
        continue;
      }
      const desired = toArabicSlug(name);
      // Keep old in taken until we update — ensureUnique against other Arabic
      const next = ensureUniqueSlug(desired, taken, row.slug);
      // ensureUnique added next; also map old→new
      // If old was latin, remove from conflict set already
      maps.serviceCategory[row.slug] = next;
      samples.push({ entity: "serviceCategory", from: row.slug, to: next });
      if (!dryRun && next !== row.slug) {
        await prisma.serviceCategory.update({ where: { id: row.id }, data: { slug: next } });
      }
      n += 1;
    }
    summary.serviceCategory = n;
  }

  if (entities.has("service")) {
    const rows = await prisma.service.findMany({
      include: { translations: true, category: true },
      orderBy: { slug: "asc" },
    });
    const taken = new Set(rows.map((r) => r.slug));
    for (const row of rows) {
      if (!isAlreadyArabicSlug(row.slug)) taken.delete(row.slug);
    }
    let n = 0;
    for (const row of rows) {
      if (limit && n >= limit) break;
      const name = arName(row.translations);
      if (!name) continue;
      if (isAlreadyArabicSlug(row.slug)) {
        maps.service[row.slug] = row.slug;
        continue;
      }
      const catDis = maps.serviceCategory[row.category.slug] || row.category.slug;
      const next = ensureUniqueSlug(toArabicSlug(name), taken, catDis);
      maps.service[row.slug] = next;
      samples.push({ entity: "service", from: row.slug, to: next });
      if (!dryRun && next !== row.slug) {
        await prisma.service.update({ where: { id: row.id }, data: { slug: next } });
      }
      n += 1;
    }
    summary.service = n;
  }

  if (entities.has("location")) {
    const rows = await prisma.location.findMany({
      include: { translations: true, parent: { include: { translations: true } } },
      orderBy: { slug: "asc" },
    });
    const taken = new Set(rows.map((r) => r.slug));
    for (const row of rows) {
      if (!isAlreadyArabicSlug(row.slug)) taken.delete(row.slug);
    }
    let n = 0;
    for (const row of rows) {
      if (limit && n >= limit) break;
      const name = arName(row.translations);
      if (!name) continue;
      if (isAlreadyArabicSlug(row.slug)) {
        maps.location[row.slug] = row.slug;
        continue;
      }
      const parentAr = row.parent ? arName(row.parent.translations) : null;
      const next = ensureUniqueSlug(toArabicSlug(name), taken, parentAr || row.parent?.slug || row.type);
      maps.location[row.slug] = next;
      samples.push({ entity: "location", from: row.slug, to: next });
      if (!dryRun && next !== row.slug) {
        await prisma.location.update({ where: { id: row.id }, data: { slug: next } });
      }
      n += 1;
    }
    summary.location = n;
  }

  if (entities.has("diyCategory")) {
    const rows = await prisma.diyCategory.findMany({
      include: { translations: true },
      orderBy: { slug: "asc" },
    });
    const taken = new Set(rows.map((r) => r.slug));
    for (const row of rows) {
      if (!isAlreadyArabicSlug(row.slug)) taken.delete(row.slug);
    }
    let n = 0;
    for (const row of rows) {
      if (limit && n >= limit) break;
      const name = arName(row.translations);
      if (!name) continue;
      if (isAlreadyArabicSlug(row.slug)) {
        maps.diyCategory[row.slug] = row.slug;
        continue;
      }
      // Prefer matching service category map when same Latin slug existed
      const preferred = maps.serviceCategory[row.slug];
      const next = preferred && !taken.has(preferred)
        ? (taken.add(preferred), preferred)
        : ensureUniqueSlug(toArabicSlug(name), taken, row.slug);
      maps.diyCategory[row.slug] = next;
      samples.push({ entity: "diyCategory", from: row.slug, to: next });
      if (!dryRun && next !== row.slug) {
        await prisma.diyCategory.update({ where: { id: row.id }, data: { slug: next } });
      }
      n += 1;
    }
    summary.diyCategory = n;
  }

  if (entities.has("diyGuide")) {
    const rows = await prisma.diyGuide.findMany({
      include: { translations: { where: { locale: "ar" }, select: { title: true } }, service: true },
      orderBy: { slug: "asc" },
    });
    const taken = new Set(rows.map((r) => r.slug));
    for (const row of rows) {
      if (!isAlreadyArabicSlug(row.slug)) taken.delete(row.slug);
    }
    let n = 0;
    for (const row of rows) {
      if (limit && n >= limit) break;
      if (isAlreadyArabicSlug(row.slug)) {
        maps.diyGuide[row.slug] = row.slug;
        continue;
      }
      const title = row.translations[0]?.title;
      const svcSlugNew = row.serviceId && row.service ? maps.service[row.service.slug] || row.service.slug : null;
      const fromTitle = title && AR.test(title) ? toArabicSlug(title) : null;
      const desired = fromTitle || (svcSlugNew ? `diy-${svcSlugNew}` : toArabicSlug(`diy-${row.slug}`));
      const next = ensureUniqueSlug(desired.replace(/^diy-diy-/, "diy-"), taken, "diy");
      const prefixed = next.startsWith("diy-") || /[\u0600-\u06FF]/.test(next) ? next : `diy-${next}`;
      // re-check uniqueness if we changed prefix
      let final = prefixed;
      if (final !== next) {
        taken.delete(next);
        final = ensureUniqueSlug(prefixed, taken, "diy");
      }
      maps.diyGuide[row.slug] = final;
      const newCat = maps.diyCategory[row.categorySlug] || row.categorySlug;
      const related = remapJsonSlugArray(row.relatedServiceSlugs, maps.service);
      const locs = remapJsonSlugArray(row.locationSlugs, maps.location);
      samples.push({ entity: "diyGuide", from: row.slug, to: final });
      if (!dryRun && (final !== row.slug || newCat !== row.categorySlug)) {
        await prisma.diyGuide.update({
          where: { id: row.id },
          data: {
            slug: final,
            categorySlug: newCat,
            relatedServiceSlugs: related,
            locationSlugs: locs,
          },
        });
      }
      n += 1;
    }
    summary.diyGuide = n;
  }

  if (!dryRun) saveMaps(maps);
  else {
    // still save dry-run preview maps separately
    writeFileSync(join(process.cwd(), "scripts/_slug-maps.dry-run.json"), JSON.stringify(maps, null, 2), "utf8");
  }

  console.log(
    JSON.stringify(
      {
        dryRun,
        limit: limit || null,
        entities: [...entities],
        summary,
        mapCounts: {
          serviceCategory: Object.keys(maps.serviceCategory).length,
          service: Object.keys(maps.service).length,
          location: Object.keys(maps.location).length,
          diyCategory: Object.keys(maps.diyCategory).length,
          diyGuide: Object.keys(maps.diyGuide).length,
        },
        samples: samples.slice(0, 20),
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
