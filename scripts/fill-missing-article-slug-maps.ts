/**
 * Fill missing scripts/_slug-maps.json → article entries for Latin primary blog slugs.
 * Derives Arabic public slugs from AR titles and/or SEC service×estate×city AR names.
 * Does NOT rewrite DB Article.slug.
 *
 * Usage:
 *   npx tsx scripts/fill-missing-article-slug-maps.ts --dry-run
 *   npx tsx scripts/fill-missing-article-slug-maps.ts
 */
import "./load-env-mysql";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { prisma } from "../src/server/db";
import { ensureUniqueSlug, toArabicSlug, buildArabicSecSlug } from "../src/lib/slug/arabic-slug";
import { buildSecSlugArabic } from "../src/lib/blog/service-estate-city-article";
import { parseJson } from "../src/lib/utils";

const AR = /[\u0600-\u06FF]/;
const MAP_PATH = join(process.cwd(), "scripts/_slug-maps.json");

type SlugMaps = {
  article?: Record<string, string>;
  service?: Record<string, string>;
  location?: Record<string, string>;
  [k: string]: unknown;
};

function arabicFromTitle(title: string) {
  const cleaned = title
    .replace(/REVIEW_REQUIRED/gi, " ")
    .replace(/\s+في\s+/g, " ")
    .replace(/[،,|·]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return toArabicSlug(cleaned);
}

function parseSecParts(slug: string, serviceSlugs: string[], locationSlugs: string[]) {
  let service: string | null = null;
  for (const s of serviceSlugs) {
    if (slug === s || slug.startsWith(`${s}-`)) {
      service = s;
      break;
    }
  }
  if (!service) return null;
  const rest = slug.slice(service.length + 1);
  if (!rest) return null;
  for (const loc of locationSlugs) {
    if (rest === loc) return { service, estate: loc, city: null as string | null };
    if (rest.endsWith(`-${loc}`)) {
      const estate = rest.slice(0, rest.length - loc.length - 1);
      if (estate) return { service, estate, city: loc };
    }
  }
  return null;
}

function usableArName(name: string | undefined | null) {
  if (!name) return false;
  if (/REVIEW_REQUIRED/i.test(name)) return false;
  return AR.test(name);
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  if (!existsSync(MAP_PATH)) throw new Error("missing _slug-maps.json");

  const maps = JSON.parse(readFileSync(MAP_PATH, "utf8")) as SlugMaps;
  const articleForward: Record<string, string> = { ...(maps.article || {}) };
  const taken = new Set<string>(Object.values(articleForward).filter((v) => AR.test(v)));

  const [services, locations, rows] = await Promise.all([
    prisma.service.findMany({
      select: { slug: true, translations: { select: { locale: true, name: true } } },
    }),
    prisma.location.findMany({
      select: { slug: true, translations: { select: { locale: true, name: true } } },
    }),
    prisma.article.findMany({
      where: {
        status: "published",
        NOT: [{ slug: { startsWith: "faq-" } }, { slug: { startsWith: "__restore_" } }],
      },
      select: {
        slug: true,
        relatedServiceSlugs: true,
        translations: { select: { locale: true, title: true } },
      },
    }),
  ]);

  const serviceAr = new Map<string, string>();
  for (const s of services) {
    const ar = s.translations.find((t) => t.locale === "ar")?.name?.trim();
    if (usableArName(ar)) serviceAr.set(s.slug, ar!);
  }
  const locationAr = new Map<string, string>();
  for (const l of locations) {
    const ar = l.translations.find((t) => t.locale === "ar")?.name?.trim();
    if (usableArName(ar)) locationAr.set(l.slug, ar!);
  }

  // Longest-first for SEC parse (current Latin DB slugs).
  const serviceSlugs = [...serviceAr.keys()].sort((a, b) => b.length - a.length);
  const locationSlugs = [...locationAr.keys()].sort((a, b) => b.length - a.length);

  // Also accept map keys (old→new) if present.
  const mapServiceKeys = Object.keys(maps.service || {}).sort((a, b) => b.length - a.length);
  const mapLocationKeys = Object.keys(maps.location || {}).sort((a, b) => b.length - a.length);
  const allServiceKeys = [...new Set([...serviceSlugs, ...mapServiceKeys])].sort((a, b) => b.length - a.length);
  const allLocationKeys = [...new Set([...locationSlugs, ...mapLocationKeys])].sort((a, b) => b.length - a.length);

  function resolveServiceAr(latin: string) {
    if (serviceAr.has(latin)) return serviceAr.get(latin)!;
    const neu = maps.service?.[latin];
    if (neu && serviceAr.has(neu)) return serviceAr.get(neu)!;
    return null;
  }
  function resolveLocationAr(latin: string) {
    if (locationAr.has(latin)) return locationAr.get(latin)!;
    const neu = maps.location?.[latin];
    if (neu && locationAr.has(neu)) return locationAr.get(neu)!;
    return null;
  }

  let added = 0;
  let skipped = 0;
  let fromTitle = 0;
  let fromSec = 0;
  const samples: Array<{ latin: string; ar: string; from: string }> = [];

  for (const row of rows) {
    if (AR.test(row.slug)) {
      skipped += 1;
      continue;
    }
    const existing = articleForward[row.slug];
    if (existing && AR.test(existing) && existing !== row.slug) {
      skipped += 1;
      continue;
    }

    let desired = "";
    let source = "";

    const arTitle = row.translations.find((t) => t.locale === "ar")?.title?.trim() || "";
    if (arTitle && AR.test(arTitle) && !/REVIEW_REQUIRED/i.test(arTitle)) {
      const secMatch = arTitle.match(/^(.+?)\s+في\s+(.+?)[،,]\s*(.+)$/);
      if (secMatch) {
        desired = buildSecSlugArabic(secMatch[1]!, secMatch[2]!, secMatch[3]!);
        source = "title-sec";
      } else {
        desired = arabicFromTitle(arTitle);
        source = "title";
      }
      fromTitle += 1;
    }

    if (!desired || !AR.test(desired) || desired === "صفحة") {
      const related = parseJson<string[]>(row.relatedServiceSlugs, []);
      const relatedService = related.find((s) => s && !AR.test(s)) || null;
      const parts =
        parseSecParts(row.slug, allServiceKeys, allLocationKeys) ||
        (relatedService
          ? parseSecParts(row.slug, [relatedService, ...allServiceKeys], allLocationKeys)
          : null);
      if (parts) {
        const svcAr = resolveServiceAr(parts.service) || (relatedService ? resolveServiceAr(relatedService) : null);
        const estateAr = resolveLocationAr(parts.estate);
        const cityAr = parts.city ? resolveLocationAr(parts.city) : null;
        if (svcAr && estateAr && cityAr) {
          desired = buildSecSlugArabic(svcAr, estateAr, cityAr);
          source = "sec-names";
          fromSec += 1;
        } else if (svcAr && estateAr) {
          desired = buildArabicSecSlug(svcAr, estateAr, cityAr || "");
          source = "sec-partial";
          fromSec += 1;
        }
      }
    }

    if (!desired || !AR.test(desired) || desired === "صفحة") {
      skipped += 1;
      continue;
    }

    const unique = ensureUniqueSlug(desired, taken, row.slug.slice(-12));
    articleForward[row.slug] = unique;
    added += 1;
    if (samples.length < 16) {
      samples.push({ latin: row.slug, ar: unique, from: `${source}:${arTitle.slice(0, 60) || row.slug}` });
    }
  }

  maps.article = articleForward;

  const report = {
    dryRun,
    publishedLatinBlogs: rows.filter((r) => !AR.test(r.slug)).length,
    added,
    skipped,
    fromTitle,
    fromSec,
    mapEntries: Object.keys(articleForward).length,
    targetSportsCity: articleForward["electrical-preventive-maintenance-dubai-sports-city-dubai"] || null,
    targetWood: articleForward["wood-painting-rashidiya-2-ajman"] || null,
    samples,
  };

  if (!dryRun) {
    writeFileSync(MAP_PATH, JSON.stringify(maps, null, 2) + "\n", "utf8");
  }
  console.log(JSON.stringify(report, null, 2));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
