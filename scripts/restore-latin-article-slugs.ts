/**
 * Restore Arabic Article.slug → Latin primary (Hostinger cannot serve Unicode paths).
 * Builds latin SEC slugs from relatedServiceSlugs + EN title ("Service in Estate, City").
 * Writes scripts/_slug-maps.json → article (latin → prior Arabic) for soft recovery.
 *
 * Usage:
 *   npx tsx scripts/restore-latin-article-slugs.ts --dry-run --limit=20
 *   npx tsx scripts/restore-latin-article-slugs.ts --batch=200
 */
import "./load-env-mysql";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { prisma } from "../src/server/db";
import { parseJson } from "../src/lib/utils";

const MAP_PATH = join(process.cwd(), "scripts/_slug-maps.json");
const AR = /[\u0600-\u06FF]/;

type SlugMaps = {
  service?: Record<string, string>;
  location?: Record<string, string>;
  diyGuide?: Record<string, string>;
  article?: Record<string, string>;
  faq?: Record<string, string>;
  [key: string]: Record<string, string> | undefined;
};

function parseArgs(argv: string[]) {
  let dryRun = false;
  let limit = 0;
  let batch = 200;
  for (const a of argv) {
    if (a === "--dry-run") dryRun = true;
    else if (a.startsWith("--limit=")) limit = Math.max(0, Number(a.slice(8)) || 0);
    else if (a.startsWith("--batch=")) batch = Math.max(1, Number(a.slice(8)) || 200);
  }
  return { dryRun, limit, batch };
}

function reverseMap(forward: Record<string, string> | undefined) {
  const rev: Record<string, string> = {};
  for (const [latin, ar] of Object.entries(forward || {})) {
    if (ar) rev[ar] = latin;
  }
  return rev;
}

function slugifyLatin(input: string, maxLen = 180) {
  const base = String(input || "")
    .normalize("NFC")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  if (!base) return "article";
  return base.length <= maxLen ? base : base.slice(0, maxLen).replace(/-$/g, "");
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
  const { dryRun, limit, batch } = parseArgs(process.argv.slice(2));
  if (!existsSync(MAP_PATH)) throw new Error(`Missing ${MAP_PATH}`);
  const maps = JSON.parse(readFileSync(MAP_PATH, "utf8")) as SlugMaps;
  const serviceRev = reverseMap(maps.service);
  const diyRev = reverseMap(maps.diyGuide);

  const services = await prisma.service.findMany({
    select: {
      slug: true,
      translations: { where: { locale: "en" }, select: { name: true } },
    },
  });
  const locations = await prisma.location.findMany({
    select: {
      slug: true,
      translations: { where: { locale: "en" }, select: { name: true } },
    },
  });

  const serviceByEnName = new Map<string, string>();
  for (const s of services) {
    const name = s.translations[0]?.name?.trim();
    if (name) serviceByEnName.set(name.toLowerCase(), s.slug);
  }
  const serviceNames = [...serviceByEnName.keys()].sort((a, b) => b.length - a.length);

  const locationByEnName = new Map<string, string>();
  for (const loc of locations) {
    const name = loc.translations[0]?.name?.trim();
    if (name) locationByEnName.set(name.toLowerCase(), loc.slug);
  }
  const locationNames = [...locationByEnName.keys()].sort((a, b) => b.length - a.length);

  // JS Unicode detection — MySQL REGEXP on Arabic ranges is unreliable across collations.
  const arabicIds: string[] = [];
  let scanCursor: string | undefined;
  for (;;) {
    const scanBatch = await prisma.article.findMany({
      where: {
        ...(scanCursor ? { id: { gt: scanCursor } } : {}),
        NOT: [{ categorySlugs: { contains: "service-faq" } }],
      },
      take: 2000,
      orderBy: { id: "asc" },
      select: { id: true, slug: true },
    });
    if (!scanBatch.length) break;
    for (const row of scanBatch) {
      if (AR.test(row.slug)) arabicIds.push(row.id);
    }
    scanCursor = scanBatch[scanBatch.length - 1]!.id;
    if (scanBatch.length < 2000) break;
  }
  const targetIds = limit ? arabicIds.slice(0, limit) : arabicIds;
  console.log(JSON.stringify({ arabicCount: arabicIds.length, targeting: targetIds.length, dryRun, batch }));

  const takenRows = await prisma.article.findMany({ select: { slug: true } });
  const taken = new Set(takenRows.map((r) => r.slug));

  const articleForward: Record<string, string> = { ...(maps.article || {}) };
  let updated = 0;
  let failed = 0;
  const failures: Array<{ slug: string; reason: string }> = [];
  const samples: Array<{ from: string; to: string }> = [];

  const toLatinService = (raw: string) => {
    if (!raw) return "";
    if (!AR.test(raw)) return raw;
    return serviceRev[raw] || "";
  };
  const toLatinDiy = (raw: string) => {
    if (!raw) return raw;
    if (!AR.test(raw)) return raw;
    return diyRev[raw] || raw;
  };

  for (let offset = 0; offset < targetIds.length; offset += batch) {
    const chunkIds = targetIds.slice(offset, offset + batch);
    const rows = await prisma.article.findMany({
      where: { id: { in: chunkIds } },
      select: {
        id: true,
        slug: true,
        relatedServiceSlugs: true,
        relatedDiySlugs: true,
        translations: { where: { locale: "en" }, select: { title: true } },
      },
    });

    const plan: Array<{
      id: string;
      from: string;
      to: string;
      relatedServiceSlugs: string;
      relatedDiySlugs: string;
    }> = [];

    for (const row of rows) {
      if (!AR.test(row.slug)) continue;

      const relSvcRaw = parseJson<string[]>(row.relatedServiceSlugs, []);
      const latinSvcList = relSvcRaw.map(toLatinService).filter(Boolean);
      let latinSvc = latinSvcList[0] || "";

      const enTitle = row.translations[0]?.title?.trim() || "";
      let estateSlug = "";
      let citySlug = "";

      const titleMatch = enTitle.match(/^(.+?) in (.+), (.+)$/i);
      if (titleMatch) {
        const svcName = titleMatch[1]!.trim().toLowerCase();
        const estateName = titleMatch[2]!.trim().toLowerCase();
        const cityName = titleMatch[3]!.trim().toLowerCase();
        if (!latinSvc) {
          for (const name of serviceNames) {
            if (svcName === name || svcName.startsWith(name)) {
              latinSvc = serviceByEnName.get(name) || "";
              break;
            }
          }
        }
        estateSlug = locationByEnName.get(estateName) || "";
        citySlug = locationByEnName.get(cityName) || "";
        if (!estateSlug) {
          for (const name of locationNames) {
            if (estateName === name || estateName.startsWith(name)) {
              estateSlug = locationByEnName.get(name) || "";
              break;
            }
          }
        }
      }

      let desired = "";
      if (latinSvc && estateSlug && citySlug && !AR.test(estateSlug) && !AR.test(citySlug)) {
        desired = `${latinSvc}-${estateSlug}-${citySlug}`;
      } else if (latinSvc && estateSlug && !AR.test(estateSlug)) {
        desired = `${latinSvc}-${estateSlug}`;
      } else if (enTitle) {
        desired = slugifyLatin(enTitle.replace(/\bin\b/gi, " ").replace(/,/g, " "));
      } else if (latinSvc) {
        desired = slugifyLatin(`${latinSvc}-${row.slug}`);
      } else {
        failed += 1;
        if (failures.length < 40) failures.push({ slug: row.slug, reason: "no-latin-parts" });
        continue;
      }

      // Hostinger 404s any Unicode path segment — force pure Latin.
      desired = slugifyLatin(desired);
      if (!desired || AR.test(desired)) {
        failed += 1;
        if (failures.length < 40) failures.push({ slug: row.slug, reason: "non-latin-desired" });
        continue;
      }

      taken.delete(row.slug);
      const nextSlug = uniquify(desired, taken);
      articleForward[nextSlug] = row.slug;

      plan.push({
        id: row.id,
        from: row.slug,
        to: nextSlug,
        relatedServiceSlugs: JSON.stringify(latinSvcList.length ? latinSvcList : latinSvc ? [latinSvc] : []),
        relatedDiySlugs: JSON.stringify(parseJson<string[]>(row.relatedDiySlugs, []).map(toLatinDiy)),
      });
    }

    if (!dryRun && plan.length) {
      const concurrency = 40;
      for (let i = 0; i < plan.length; i += concurrency) {
        const slice = plan.slice(i, i + concurrency);
        await Promise.all(
          slice.map(async (step) => {
            try {
              await prisma.article.update({
                where: { id: step.id },
                data: {
                  slug: step.to,
                  relatedServiceSlugs: step.relatedServiceSlugs,
                  relatedDiySlugs: step.relatedDiySlugs,
                },
              });
            } catch {
              await prisma.article.update({
                where: { id: step.id },
                data: { slug: `__restore_blog_${step.id}` },
              });
              await prisma.article.update({
                where: { id: step.id },
                data: {
                  slug: step.to,
                  relatedServiceSlugs: step.relatedServiceSlugs,
                  relatedDiySlugs: step.relatedDiySlugs,
                },
              });
            }
            updated += 1;
            if (samples.length < 12) samples.push({ from: step.from, to: step.to });
          }),
        );
      }
    } else {
      for (const step of plan) {
        updated += 1;
        if (samples.length < 12) samples.push({ from: step.from, to: step.to });
      }
    }

    console.log(JSON.stringify({ progress: Math.min(offset + batch, targetIds.length), of: targetIds.length, updated, failed }));
  }

  if (!dryRun) {
    maps.article = articleForward;
    writeFileSync(MAP_PATH, JSON.stringify(maps, null, 2), "utf8");
  }

  let arLeft: number | null = null;
  if (!dryRun) {
    arLeft = 0;
    let leftCursor: string | undefined;
    for (;;) {
      const leftBatch = await prisma.article.findMany({
        where: {
          ...(leftCursor ? { id: { gt: leftCursor } } : {}),
          NOT: [{ categorySlugs: { contains: "service-faq" } }],
        },
        take: 2000,
        orderBy: { id: "asc" },
        select: { id: true, slug: true },
      });
      if (!leftBatch.length) break;
      for (const row of leftBatch) {
        if (AR.test(row.slug)) arLeft += 1;
      }
      leftCursor = leftBatch[leftBatch.length - 1]!.id;
      if (leftBatch.length < 2000) break;
    }
  }

  const stuckTemp = dryRun
    ? null
    : await prisma.article.count({ where: { slug: { startsWith: "__restore_blog_" } } });

  console.log(
    JSON.stringify(
      {
        dryRun,
        targeting: targetIds.length,
        updated,
        failed,
        failures,
        samples,
        articleMapEntries: Object.keys(articleForward).length,
        arLeft,
        stuckTemp,
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
