/**
 * Finish leftover Arabic Article.slug rows using JS Unicode detection (not MySQL REGEXP).
 * Usage: npx tsx scripts/finish-article-latin-restore.ts
 */
import "./load-env-mysql";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { prisma } from "../src/server/db";
import { parseJson } from "../src/lib/utils";

const MAP_PATH = join(process.cwd(), "scripts/_slug-maps.json");
const AR = /[\u0600-\u06FF]/;

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
  return (base || "article").slice(0, maxLen).replace(/-$/g, "");
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
  if (!existsSync(MAP_PATH)) throw new Error(`Missing ${MAP_PATH}`);
  const maps = JSON.parse(readFileSync(MAP_PATH, "utf8")) as {
    service?: Record<string, string>;
    diyGuide?: Record<string, string>;
    article?: Record<string, string>;
  };
  const serviceRev = reverseMap(maps.service);
  const diyRev = reverseMap(maps.diyGuide);

  const services = await prisma.service.findMany({
    select: { slug: true, translations: { where: { locale: "en" }, select: { name: true } } },
  });
  const locations = await prisma.location.findMany({
    select: { slug: true, translations: { where: { locale: "en" }, select: { name: true } } },
  });
  const serviceByEnName = new Map(
    services
      .map((s) => [s.translations[0]?.name?.trim().toLowerCase() || "", s.slug] as const)
      .filter(([n]) => n),
  );
  const locationByEnName = new Map(
    locations
      .map((l) => [l.translations[0]?.name?.trim().toLowerCase() || "", l.slug] as const)
      .filter(([n]) => n),
  );
  const serviceNames = [...serviceByEnName.keys()].sort((a, b) => b.length - a.length);

  const arabicRows: Array<{ id: string; slug: string }> = [];
  let cursor: string | undefined;
  for (;;) {
    const batch = await prisma.article.findMany({
      where: {
        ...(cursor ? { id: { gt: cursor } } : {}),
        NOT: [{ categorySlugs: { contains: "service-faq" } }],
      },
      take: 3000,
      orderBy: { id: "asc" },
      select: { id: true, slug: true },
    });
    if (!batch.length) break;
    for (const row of batch) {
      if (AR.test(row.slug)) arabicRows.push(row);
    }
    cursor = batch[batch.length - 1]!.id;
    if (batch.length < 3000) break;
  }

  const taken = new Set((await prisma.article.findMany({ select: { slug: true } })).map((r) => r.slug));
  const articleForward: Record<string, string> = { ...(maps.article || {}) };
  let updated = 0;
  let failed = 0;
  const samples: Array<{ from: string; to: string }> = [];
  const failures: Array<{ slug: string; reason: string }> = [];

  for (const hit of arabicRows) {
    const row = await prisma.article.findUnique({
      where: { id: hit.id },
      select: {
        id: true,
        slug: true,
        relatedServiceSlugs: true,
        relatedDiySlugs: true,
        translations: { where: { locale: "en" }, select: { title: true } },
      },
    });
    if (!row || !AR.test(row.slug)) continue;

    const relSvc = parseJson<string[]>(row.relatedServiceSlugs, [])
      .map((s) => (!AR.test(s) ? s : serviceRev[s] || ""))
      .filter(Boolean);
    let latinSvc = relSvc[0] || "";
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
    }

    let desired =
      latinSvc && estateSlug && citySlug
        ? `${latinSvc}-${estateSlug}-${citySlug}`
        : latinSvc && estateSlug
          ? `${latinSvc}-${estateSlug}`
          : enTitle
            ? slugifyLatin(enTitle.replace(/\bin\b/gi, " ").replace(/,/g, " "))
            : slugifyLatin(latinSvc || row.slug);
    desired = slugifyLatin(desired);
    if (!desired || AR.test(desired)) {
      failed += 1;
      if (failures.length < 20) failures.push({ slug: row.slug, reason: "non-latin-desired" });
      continue;
    }

    taken.delete(row.slug);
    const next = uniquify(desired, taken);
    articleForward[next] = row.slug;

    try {
      await prisma.article.update({
        where: { id: row.id },
        data: {
          slug: next,
          relatedServiceSlugs: JSON.stringify(relSvc.length ? relSvc : latinSvc ? [latinSvc] : []),
          relatedDiySlugs: JSON.stringify(
            parseJson<string[]>(row.relatedDiySlugs, []).map((s) => (!AR.test(s) ? s : diyRev[s] || s)),
          ),
        },
      });
    } catch {
      await prisma.article.update({ where: { id: row.id }, data: { slug: `__restore_blog_${row.id}` } });
      await prisma.article.update({
        where: { id: row.id },
        data: {
          slug: next,
          relatedServiceSlugs: JSON.stringify(relSvc.length ? relSvc : latinSvc ? [latinSvc] : []),
        },
      });
    }
    updated += 1;
    if (samples.length < 12) samples.push({ from: row.slug, to: next });
  }

  maps.article = articleForward;
  writeFileSync(MAP_PATH, JSON.stringify(maps, null, 2), "utf8");
  console.log(
    JSON.stringify({ found: arabicRows.length, updated, failed, samples, failures, mapEntries: Object.keys(articleForward).length }, null, 2),
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
