/**
 * Phase 2b — rewrite Article.slug to Arabic + remap relatedServiceSlugs / relatedDiySlugs / categorySlugs.
 * Uses scripts/_slug-maps.json from phase2-arabic-primary-slugs.ts.
 * Resume-safe via --cursor= and batch size. No redirects.
 *
 * SEC: parse Latin `{service}-{estate}-{city}` via longest service/location slug match.
 * FAQ: `faq-{service}` → `أسئلة-{serviceAr}` (or title-based).
 *
 * Usage:
 *   npx tsx scripts/phase2-arabic-article-slugs.ts --dry-run --limit=20
 *   npx tsx scripts/phase2-arabic-article-slugs.ts --batch=200 --limit=1000
 *   npx tsx scripts/phase2-arabic-article-slugs.ts --batch=500
 */
import "./load-env-mysql";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { prisma } from "../src/server/db";
import {
  buildArabicSecSlug,
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
const CURSOR_PATH = join(process.cwd(), "scripts/_phase2-article-slug-cursor.json");
const AR = /[\u0600-\u06FF]/;

function parseArgs(argv: string[]) {
  let dryRun = false;
  let limit = 0;
  let batch = 200;
  let cursor = "";
  for (const a of argv) {
    if (a === "--dry-run") dryRun = true;
    else if (a.startsWith("--limit=")) limit = Math.max(0, Number(a.slice(8)) || 0);
    else if (a.startsWith("--batch=")) batch = Math.max(1, Number(a.slice(8)) || 200);
    else if (a.startsWith("--cursor=")) cursor = a.slice(9);
  }
  return { dryRun, limit, batch, cursor };
}

function loadMaps(): SlugMaps {
  if (!existsSync(MAP_PATH)) throw new Error(`Missing ${MAP_PATH} — run phase2-arabic-primary-slugs.ts first`);
  return JSON.parse(readFileSync(MAP_PATH, "utf8")) as SlugMaps;
}

function invert(map: Record<string, string>) {
  // old→new only (skip identity)
  return Object.fromEntries(Object.entries(map).filter(([k, v]) => k !== v));
}

function parseSecParts(slug: string, serviceOlds: string[], locationOlds: string[]) {
  // longest service prefix
  let serviceOld: string | null = null;
  for (const s of serviceOlds) {
    if (slug === s || slug.startsWith(`${s}-`)) {
      serviceOld = s;
      break;
    }
  }
  if (!serviceOld) return null;
  const rest = slug.slice(serviceOld.length + 1);
  if (!rest) return null;
  let estateOld: string | null = null;
  let cityOld: string | null = null;
  for (const loc of locationOlds) {
    if (rest === loc) {
      estateOld = loc;
      break;
    }
    if (rest.endsWith(`-${loc}`)) {
      const estate = rest.slice(0, rest.length - loc.length - 1);
      if (locationOlds.includes(estate) || estate.length > 0) {
        estateOld = estate;
        cityOld = loc;
        break;
      }
    }
  }
  if (!estateOld) return null;
  return { serviceOld, estateOld, cityOld };
}

async function main() {
  const { dryRun, limit, batch, cursor: cursorArg } = parseArgs(process.argv.slice(2));
  const maps = loadMaps();
  const serviceMap = invert(maps.service);
  const locationMap = invert(maps.location);
  const diyMap = invert(maps.diyGuide);
  const catMap = { ...invert(maps.serviceCategory), ...invert(maps.diyCategory) };

  // Prefer longest Latin keys first for parsing
  const serviceOlds = Object.keys(serviceMap).sort((a, b) => b.length - a.length);
  const locationOlds = Object.keys(locationMap).sort((a, b) => b.length - a.length);

  // Reverse new→ for current AR name lookup by new slug
  const serviceNewToOld = Object.fromEntries(Object.entries(serviceMap).map(([o, n]) => [n, o]));
  const locationNewToOld = Object.fromEntries(Object.entries(locationMap).map(([o, n]) => [n, o]));

  // Load AR names keyed by NEW slug (after phase2) and also by OLD for parsing-time
  const services = await prisma.service.findMany({
    select: { slug: true, translations: { where: { locale: "ar" }, select: { name: true } } },
  });
  const locations = await prisma.location.findMany({
    select: { slug: true, translations: { where: { locale: "ar" }, select: { name: true } } },
  });
  const nameByServiceSlug: Record<string, string> = {};
  for (const s of services) {
    const name = s.translations[0]?.name;
    if (name && AR.test(name)) {
      nameByServiceSlug[s.slug] = name;
      const old = serviceNewToOld[s.slug];
      if (old) nameByServiceSlug[old] = name;
    }
  }
  const nameByLocationSlug: Record<string, string> = {};
  for (const l of locations) {
    const name = l.translations[0]?.name;
    if (name && AR.test(name)) {
      nameByLocationSlug[l.slug] = name;
      const old = locationNewToOld[l.slug];
      if (old) nameByLocationSlug[old] = name;
    }
  }

  let cursor =
    cursorArg ||
    (existsSync(CURSOR_PATH) ? (JSON.parse(readFileSync(CURSOR_PATH, "utf8")) as { id?: string }).id || "" : "");

  const taken = new Set<string>();
  // Preload existing Arabic slugs to avoid collisions
  const existingAr = await prisma.article.findMany({
    where: { slug: { not: { equals: "" } } },
    select: { slug: true },
    take: 5000,
  });
  // Can't load all 120k into memory easily for "taken" of Arabic-only — use DB unique constraint + retry
  for (const e of existingAr) {
    if (isAlreadyArabicSlug(e.slug)) taken.add(e.slug);
  }

  let processed = 0;
  let updated = 0;
  let skipped = 0;
  const samples: Array<{ from: string; to: string; kind: string }> = [];

  while (true) {
    if (limit && processed >= limit) break;
    const take = limit ? Math.min(batch, limit - processed) : batch;
    const rows = await prisma.article.findMany({
      where: cursor ? { id: { gt: cursor } } : undefined,
      orderBy: { id: "asc" },
      take,
      select: {
        id: true,
        slug: true,
        categorySlugs: true,
        relatedServiceSlugs: true,
        relatedDiySlugs: true,
        translations: { where: { locale: "ar" }, select: { title: true } },
      },
    });
    if (!rows.length) break;

    for (const row of rows) {
      processed += 1;
      cursor = row.id;
      if (isAlreadyArabicSlug(row.slug)) {
        skipped += 1;
        continue;
      }

      let nextSlug: string | null = null;
      let kind = "other";

      if (row.slug.startsWith("faq-")) {
        kind = "faq";
        const svcOld = row.slug.slice(4);
        const svcNew = serviceMap[svcOld] || svcOld;
        const name = nameByServiceSlug[svcOld] || nameByServiceSlug[svcNew] || row.translations[0]?.title || svcOld;
        nextSlug = toArabicSlug(`أسئلة-${name}`);
      } else {
        const parts = parseSecParts(row.slug, serviceOlds, locationOlds);
        if (parts) {
          kind = "sec";
          const sName = nameByServiceSlug[parts.serviceOld];
          const eName = nameByLocationSlug[parts.estateOld];
          const cName = parts.cityOld ? nameByLocationSlug[parts.cityOld] : "";
          if (sName && eName) {
            nextSlug = cName ? buildArabicSecSlug(sName, eName, cName) : buildArabicSecSlug(sName, eName, eName);
          }
        }
        if (!nextSlug && row.translations[0]?.title && AR.test(row.translations[0].title)) {
          kind = "title";
          nextSlug = toArabicSlug(row.translations[0].title.replace(/،/g, "-").replace(/في/g, "-"));
        }
      }

      if (!nextSlug) {
        skipped += 1;
        continue;
      }

      // uniquify locally; DB unique will catch races
      let candidate = nextSlug;
      let i = 2;
      while (taken.has(candidate) && i < 1000) {
        candidate = toArabicSlug(`${nextSlug}-${i}`);
        i += 1;
      }
      taken.add(candidate);

      const relatedServices = remapJsonSlugArray(row.relatedServiceSlugs, maps.service);
      const relatedDiy = remapJsonSlugArray(row.relatedDiySlugs, maps.diyGuide);
      const categories = remapJsonSlugArray(row.categorySlugs, {
        ...maps.serviceCategory,
        ...maps.diyCategory,
        ...catMap,
      });

      samples.push({ from: row.slug, to: candidate, kind });
      if (!dryRun) {
        try {
          await prisma.article.update({
            where: { id: row.id },
            data: {
              slug: candidate,
              relatedServiceSlugs: relatedServices,
              relatedDiySlugs: relatedDiy,
              categorySlugs: categories,
            },
          });
          updated += 1;
        } catch (e) {
          // unique collision — suffix and retry once
          const alt = toArabicSlug(`${candidate}-${row.id.slice(-4)}`);
          try {
            await prisma.article.update({
              where: { id: row.id },
              data: {
                slug: alt,
                relatedServiceSlugs: relatedServices,
                relatedDiySlugs: relatedDiy,
                categorySlugs: categories,
              },
            });
            updated += 1;
          } catch (e2) {
            skipped += 1;
            console.error("slug update failed", row.slug, e2);
          }
        }
      } else {
        updated += 1;
      }
    }

    if (!dryRun) {
      writeFileSync(CURSOR_PATH, JSON.stringify({ id: cursor, updated, processed, at: new Date().toISOString() }), "utf8");
    }

    console.log(JSON.stringify({ processed, updated, skipped, cursor, lastSamples: samples.slice(-5) }));
    if (rows.length < take) break;
  }

  console.log(
    JSON.stringify(
      {
        dryRun,
        processed,
        updated,
        skipped,
        cursor,
        samples: samples.slice(0, 15),
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
