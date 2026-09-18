/**
 * Phase 3 — recompose SEC ArticleI18n AR (and EN) from fixed Arabic service/estate/city names.
 * Also rewrites Article.slug to Arabic SEC pattern. Resume-safe. No OpenAI.
 *
 * Matching strategy:
 * - Prefer relatedServiceSlugs (may still be Latin) + parse remaining Latin slug parts via maps.
 * - Skip FAQ (slug starts with faq- OR category contains service-faq).
 *
 * Usage:
 *   npx tsx scripts/phase3-recompose-sec-ar.ts --dry-run --limit=10
 *   npx tsx scripts/phase3-recompose-sec-ar.ts --batch=100 --limit=500
 *   npx tsx scripts/phase3-recompose-sec-ar.ts --batch=200
 */
import "./load-env-mysql";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { prisma } from "../src/server/db";
import { composeServiceEstateCityArticle } from "../src/lib/blog/service-estate-city-article";
import { evaluateBlogPublicationGates } from "../src/lib/blog/publication-gates";
import { isAlreadyArabicSlug, remapJsonSlugArray } from "../src/lib/slug/arabic-slug";

type SlugMaps = {
  service: Record<string, string>;
  location: Record<string, string>;
  diyGuide: Record<string, string>;
  serviceCategory: Record<string, string>;
  diyCategory: Record<string, string>;
};

const MAP_PATH = join(process.cwd(), "scripts/_slug-maps.json");
const CURSOR_PATH = join(process.cwd(), "scripts/_phase3-sec-recompose-cursor.json");
const AR = /[\u0600-\u06FF]/;

function parseArgs(argv: string[]) {
  let dryRun = false;
  let limit = 0;
  let batch = 100;
  let concurrency = 8;
  let cursor = "";
  let skipGates = false;
  for (const a of argv) {
    if (a === "--dry-run") dryRun = true;
    else if (a === "--skip-gates") skipGates = true;
    else if (a.startsWith("--limit=")) limit = Math.max(0, Number(a.slice(8)) || 0);
    else if (a.startsWith("--batch=")) batch = Math.max(1, Number(a.slice(8)) || 100);
    else if (a.startsWith("--concurrency=")) concurrency = Math.max(1, Math.min(32, Number(a.slice(14)) || 8));
    else if (a.startsWith("--cursor=")) cursor = a.slice(9);
  }
  return { dryRun, limit, batch, cursor, skipGates, concurrency };
}

function parseSecParts(slug: string, serviceOlds: string[], locationOlds: string[]) {
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
  for (const loc of locationOlds) {
    if (rest === loc) return { serviceOld, estateOld: loc, cityOld: null as string | null };
    if (rest.endsWith(`-${loc}`)) {
      const estate = rest.slice(0, rest.length - loc.length - 1);
      if (estate) return { serviceOld, estateOld: estate, cityOld: loc };
    }
  }
  return null;
}

async function main() {
  const { dryRun, limit, batch, cursor: cursorArg, skipGates } = parseArgs(process.argv.slice(2));
  if (!existsSync(MAP_PATH)) throw new Error("Missing slug maps — run phase2-rebuild-slug-maps.ts");
  const maps = JSON.parse(readFileSync(MAP_PATH, "utf8")) as Omit<SlugMaps, never> & {
    service: Record<string, string>;
    location: Record<string, string>;
    diyGuide: Record<string, string>;
    serviceCategory: Record<string, string>;
    diyCategory: Record<string, string>;
  };

  const serviceOlds = Object.keys(maps.service).sort((a, b) => b.length - a.length);
  const locationOlds = Object.keys(maps.location).sort((a, b) => b.length - a.length);

  const services = await prisma.service.findMany({
    select: {
      slug: true,
      category: { select: { slug: true } },
      translations: { select: { locale: true, name: true } },
    },
  });
  const locations = await prisma.location.findMany({
    select: {
      slug: true,
      type: true,
      parentId: true,
      translations: { select: { locale: true, name: true } },
    },
  });
  const byNewService = new Map(services.map((s) => [s.slug, s]));
  const byOldService = new Map(Object.entries(maps.service).map(([old, neu]) => [old, byNewService.get(neu)]));
  const byNewLoc = new Map(locations.map((l) => [l.slug, l]));
  const byOldLoc = new Map(Object.entries(maps.location).map(([old, neu]) => [old, byNewLoc.get(neu)]));
  const locById = new Map(locations.map((l) => [l.id, l]));

  function nameOf(translations: Array<{ locale: string; name: string }>, locale: string, fallback: string) {
    return translations.find((t) => t.locale === locale)?.name?.trim() || fallback;
  }

  function cityOf(estate: (typeof locations)[number]) {
    let cur = estate.parentId ? locById.get(estate.parentId) : undefined;
    const seen = new Set<string>();
    let emirate: (typeof locations)[number] | undefined;
    while (cur && !seen.has(cur.slug)) {
      seen.add(cur.slug);
      if (cur.type === "city") return cur;
      if (cur.type === "emirate") emirate = cur;
      cur = cur.parentId ? locById.get(cur.parentId) : undefined;
    }
    return emirate || estate;
  }

  let cursor =
    cursorArg ||
    (existsSync(CURSOR_PATH) ? (JSON.parse(readFileSync(CURSOR_PATH, "utf8")) as { id?: string }).id || "" : "");

  let processed = 0;
  let updated = 0;
  let skipped = 0;
  let gateFail = 0;
  const samples: Array<{ from: string; to: string; titleAr: string }> = [];

  while (true) {
    if (limit && processed >= limit) break;
    const take = limit ? Math.min(batch, limit - processed) : batch;
    // Scan by id only (Hostinger cannot afford LIKE '%REVIEW_REQUIRED%' joins at this scale).
    // Skip already-fixed rows in JS; resume via cursor file.
    const rows = await prisma.article.findMany({
      where: cursor ? { id: { gt: cursor } } : undefined,
      orderBy: { id: "asc" },
      take: Math.max(take * 3, 150), // over-fetch; many rows may already be clean
      select: {
        id: true,
        slug: true,
        categorySlugs: true,
        relatedServiceSlugs: true,
        relatedDiySlugs: true,
        heroImage: true,
        translations: true,
      },
    });
    if (!rows.length) break;

    const dirty = rows.filter((row) => {
      if (row.categorySlugs.includes("service-faq") || row.slug.startsWith("faq-") || row.slug.startsWith("أسئلة-")) {
        return false;
      }
      const arRow = row.translations.find((t) => t.locale === "ar");
      if (!arRow) return false;
      // Keep Latin primary slugs; only recompose when AR copy still has REVIEW_REQUIRED.
      return arRow.title.includes("REVIEW_REQUIRED") || arRow.body.includes("REVIEW_REQUIRED");
    });

    // Advance cursor even across clean stretches
    cursor = rows[rows.length - 1]!.id;
    if (!dirty.length) {
      if (!dryRun) {
        writeFileSync(
          CURSOR_PATH,
          JSON.stringify({ id: cursor, processed, updated, skipped, gateFail, at: new Date().toISOString(), note: "clean_stretch" }),
          "utf8",
        );
      }
      console.log(JSON.stringify({ phase: "skip_clean", scanned: rows.length, cursor, processed, updated }));
      continue;
    }

    for (const row of dirty.slice(0, take)) {
      processed += 1;
      // keep cursor at furthest scanned id (set above); also bump if we process mid-batch
      if (row.id > cursor) cursor = row.id;

      if (row.categorySlugs.includes("service-faq") || row.slug.startsWith("faq-")) {
        skipped += 1;
        continue;
      }

      // Already recomposed Arabic slug + no REVIEW_REQUIRED in AR title
      const arRow = row.translations.find((t) => t.locale === "ar");
      if (
        isAlreadyArabicSlug(row.slug) &&
        arRow &&
        AR.test(arRow.title) &&
        !arRow.title.includes("REVIEW_REQUIRED") &&
        !arRow.body.includes("REVIEW_REQUIRED")
      ) {
        skipped += 1;
        continue;
      }

      let serviceOld: string | null = null;
      let estateOld: string | null = null;
      let cityOld: string | null = null;

      try {
        const related = JSON.parse(row.relatedServiceSlugs || "[]") as string[];
        if (related[0]) serviceOld = related[0];
      } catch {
        /* ignore */
      }

      if (!isAlreadyArabicSlug(row.slug)) {
        const parts = parseSecParts(row.slug, serviceOlds, locationOlds);
        if (parts) {
          serviceOld = parts.serviceOld;
          estateOld = parts.estateOld;
          cityOld = parts.cityOld;
        }
      }

      if (!serviceOld || !estateOld) {
        skipped += 1;
        continue;
      }

      const service = byOldService.get(serviceOld) || byNewService.get(serviceOld);
      const estate = byOldLoc.get(estateOld) || byNewLoc.get(estateOld);
      if (!service || !estate) {
        skipped += 1;
        continue;
      }
      const city =
        (cityOld ? byOldLoc.get(cityOld) || byNewLoc.get(cityOld) : undefined) || cityOf(estate);
      if (!city) {
        skipped += 1;
        continue;
      }

      const serviceNameEn = nameOf(service.translations, "en", service.slug);
      const serviceNameAr = nameOf(service.translations, "ar", serviceNameEn);
      const estateNameEn = nameOf(estate.translations, "en", estate.slug);
      const estateNameAr = nameOf(estate.translations, "ar", estateNameEn);
      const cityNameEn = nameOf(city.translations, "en", city.slug);
      const cityNameAr = nameOf(city.translations, "ar", cityNameEn);
      if (![serviceNameAr, estateNameAr, cityNameAr].every((n) => AR.test(n) && !n.includes("REVIEW_REQUIRED"))) {
        skipped += 1;
        continue;
      }

      const composed = composeServiceEstateCityArticle({
        serviceSlug: service.slug,
        serviceNameEn,
        serviceNameAr,
        categorySlug: service.category?.slug || "general-maintenance",
        estateSlug: estate.slug,
        estateNameEn,
        estateNameAr,
        citySlug: city.slug,
        cityNameEn,
        cityNameAr,
      });

      if (!skipGates) {
        const gate = evaluateBlogPublicationGates({
          slug: composed.slug,
          status: "published",
          indexable: true,
          heroImage: composed.heroImage || row.heroImage,
          en: composed.en,
          ar: composed.ar,
        });
        if (!gate.pass) {
          gateFail += 1;
          // still write — names are fixed; gate may fail on edge SEO
        }
      }

      samples.push({ from: row.slug, to: composed.slug, titleAr: composed.ar.title });

      if (!dryRun) {
        const writeOnce = async (slug: string) => {
          await prisma.article.update({
            where: { id: row.id },
            data: {
              slug,
              categorySlugs: JSON.stringify(composed.categorySlugs),
              relatedServiceSlugs: JSON.stringify(composed.relatedServiceSlugs),
              relatedDiySlugs: remapJsonSlugArray(row.relatedDiySlugs, maps.diyGuide),
              heroImage: composed.heroImage || row.heroImage,
            },
          });
          for (const locale of ["en", "ar"] as const) {
            const fields = composed[locale];
            await prisma.articleI18n.upsert({
              where: { articleId_locale: { articleId: row.id, locale } },
              create: { articleId: row.id, locale, ...fields },
              update: { ...fields },
            });
          }
        };
        try {
          await writeOnce(composed.slug);
          updated += 1;
        } catch (e) {
          const alt = `${composed.slug}-${row.id.slice(-5)}`;
          try {
            await writeOnce(alt);
            updated += 1;
          } catch (e2) {
            skipped += 1;
            console.error("recompose failed", row.slug, String(e2).slice(0, 200));
          }
        }
      } else {
        updated += 1;
      }
    }

    if (!dryRun) {
      writeFileSync(
        CURSOR_PATH,
        JSON.stringify({ id: cursor, processed, updated, skipped, gateFail, at: new Date().toISOString() }),
        "utf8",
      );
    }
    console.log(JSON.stringify({ processed, updated, skipped, gateFail, cursor, last: samples.slice(-3) }));
    if (rows.length < take) break;
  }

  console.log(JSON.stringify({ dryRun, processed, updated, skipped, gateFail, samples: samples.slice(0, 10) }, null, 2));
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
