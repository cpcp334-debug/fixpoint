/**
 * Fill missing scripts/_slug-maps.json → article entries for Latin primary blog slugs.
 * Derives Arabic public slugs from AR titles (does NOT rewrite DB Article.slug).
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

const AR = /[\u0600-\u06FF]/;
const MAP_PATH = join(process.cwd(), "scripts/_slug-maps.json");

type SlugMaps = {
  article?: Record<string, string>;
  [k: string]: unknown;
};

function arabicFromTitle(title: string) {
  const cleaned = title
    .replace(/\s+في\s+/g, " ")
    .replace(/[،,|·]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return toArabicSlug(cleaned);
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  if (!existsSync(MAP_PATH)) throw new Error("missing _slug-maps.json");

  const maps = JSON.parse(readFileSync(MAP_PATH, "utf8")) as SlugMaps;
  const articleForward: Record<string, string> = { ...(maps.article || {}) };
  const taken = new Set<string>(Object.values(articleForward).filter((v) => AR.test(v)));

  const rows = await prisma.article.findMany({
    where: {
      status: "published",
      NOT: [{ slug: { startsWith: "faq-" } }, { slug: { startsWith: "__restore_" } }],
    },
    select: {
      slug: true,
      relatedServiceSlugs: true,
      translations: { select: { locale: true, title: true } },
    },
  });

  let added = 0;
  let skipped = 0;
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

    const arTitle = row.translations.find((t) => t.locale === "ar")?.title?.trim() || "";
    if (!arTitle || !AR.test(arTitle) || /REVIEW_REQUIRED/i.test(arTitle)) {
      skipped += 1;
      continue;
    }

    let desired = arabicFromTitle(arTitle);
    // Prefer SEC-style when title looks like "X في Y، Z"
    const secMatch = arTitle.match(/^(.+?)\s+في\s+(.+?)[،,]\s*(.+)$/);
    if (secMatch) {
      desired = buildSecSlugArabic(secMatch[1]!, secMatch[2]!, secMatch[3]!);
    } else if (!desired || desired === "صفحة") {
      desired = buildArabicSecSlug(arTitle, "", "");
    }

    const unique = ensureUniqueSlug(desired, taken, row.slug.slice(-12));
    articleForward[row.slug] = unique;
    added += 1;
    if (samples.length < 12) samples.push({ latin: row.slug, ar: unique, from: arTitle.slice(0, 80) });
  }

  maps.article = articleForward;

  const report = {
    dryRun,
    publishedLatinBlogs: rows.filter((r) => !AR.test(r.slug)).length,
    added,
    skipped,
    mapEntries: Object.keys(articleForward).length,
    target: articleForward["electrical-cable-repair-south-ajman-ajman"] || null,
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
