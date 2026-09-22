import type { MetadataRoute } from "next";
import { unstable_cache } from "next/cache";
import { getSiteUrl } from "@/config/site";
import { publicServiceLocationWhere } from "@/lib/catalog";
import { prisma } from "@/server/db";
import { servicePathSlug, locationPathSlug } from "@/lib/slug/locale-slug";
import { diyGuidePathSlug, diyCategoryPathSlug } from "@/lib/slug/diy-slug-map";
import { blogPathSlug } from "@/lib/slug/blog-slug-map";
import { faqPathSlug } from "@/lib/slug/faq-slug-map";

/**
 * Serve sitemaps on demand so Hostinger `next build` does not prerender
 * DB-heavy shards (P1001 / MySQL blips mid-SSG must not fail deploy).
 *
 * Google limits: 50,000 URLs and 50MB per sitemap file.
 * Articles (~119k SEC × 2 locales) MUST be spread across shards — never dump the
 * full catalog into shard 0 (live regression: ~242k URLs / ~50MB in one file).
 *
 * Hostinger OOM risk: Googlebot often fetches many shards at once. Each request
 * must NOT hold the full article/pair tables in memory — cursor batches + cache.
 */
export const dynamic = "force-dynamic";
export const revalidate = 3600;

/** Shard count for article + service×location URLs. Keep in sync with sitemap-index route. */
export const SITEMAP_PAIR_SHARDS = 64;

/** Soft ceiling under Google's 50k limit (headroom for lastModified noise). */
const MAX_URLS_PER_SHARD = 45_000;

const ARTICLE_BATCH = 1500;
const PAIR_BATCH = 1500;

/**
 * Stable non-crypto hash → bucket in [0, shards).
 * Same key always lands in the same shard across builds.
 */
export function pairShardId(key: string, shards = SITEMAP_PAIR_SHARDS): number {
  let h = 2166136261;
  for (let i = 0; i < key.length; i += 1) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) % shards;
}

export function articleShardId(slug: string, shards = SITEMAP_PAIR_SHARDS): number {
  return pairShardId(`article:${slug}`, shards);
}

export async function generateSitemaps() {
  return Array.from({ length: SITEMAP_PAIR_SHARDS }, (_, id) => ({ id }));
}

function isTransientDbError(err: unknown): boolean {
  const code =
    err && typeof err === "object" && "code" in err ? String((err as { code?: unknown }).code) : "";
  const message = err instanceof Error ? err.message : String(err ?? "");
  return (
    code === "P1001" ||
    code === "P1002" ||
    code === "P1017" ||
    /Can't reach database server/i.test(message) ||
    /Server has closed the connection/i.test(message) ||
    /Connection (?:reset|refused|timed out|terminated)/i.test(message) ||
    /Timed out fetching a new connection/i.test(message)
  );
}

/** One retry on transient MySQL/Prisma connection errors, then soft-fail. */
async function withDbRetry<T>(label: string, fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    if (!isTransientDbError(err)) {
      console.error(`[sitemap] ${label} failed:`, err instanceof Error ? err.message : err);
      return fallback;
    }
    console.warn(`[sitemap] ${label} transient DB error; retrying once…`);
    try {
      await new Promise((r) => setTimeout(r, 500));
      return await fn();
    } catch (retryErr) {
      console.error(
        `[sitemap] ${label} soft-fail after retry:`,
        retryErr instanceof Error ? retryErr.message : retryErr,
      );
      return fallback;
    }
  }
}

function softFailShard(site: string, shard: number): MetadataRoute.Sitemap {
  if (shard !== 0) return [];
  return [
    { url: `${site}/en`, changeFrequency: "weekly", priority: 1 },
    { url: `${site}/ar`, changeFrequency: "weekly", priority: 1 },
  ];
}

/** Static routes + small catalogs only (safe on shard 0). */
async function staticAndSmallCatalogEntries(site: string): Promise<MetadataRoute.Sitemap> {
  const locales = ["en", "ar"] as const;
  const staticPaths = [
    "",
    "/about",
    "/services",
    "/blog",
    "/diy",
    "/faq",
    "/locations",
    "/reviews",
    "/get-a-quote",
    "/book-a-service",
    "/contact",
    "/privacy-policy",
    "/terms",
    "/cancellation-policy",
    "/cookie-policy",
  ];

  const entries: MetadataRoute.Sitemap = [];
  for (const locale of locales) {
    for (const path of staticPaths) {
      entries.push({
        url: `${site}/${locale}${path}`,
        changeFrequency: "weekly",
        priority: path === "" ? 1 : 0.7,
      });
    }
  }

  const [services, locations, guides, categories] = await Promise.all([
    withDbRetry(
      "service.findMany",
      () =>
        prisma.service.findMany({
          where: { status: "active", indexable: true },
          select: { slug: true, updatedAt: true },
        }),
      [] as { slug: string; updatedAt: Date }[],
    ),
    withDbRetry(
      "location.findMany",
      () =>
        prisma.location.findMany({
          where: {
            status: "active",
            indexable: true,
            serves: true,
            type: { in: ["emirate", "city", "community"] },
          },
          select: { slug: true, updatedAt: true },
        }),
      [] as { slug: string; updatedAt: Date }[],
    ),
    withDbRetry(
      "diyGuide.findMany",
      () =>
        prisma.diyGuide.findMany({
          where: { status: "published", indexable: true },
          select: { slug: true, updatedAt: true },
        }),
      [] as { slug: string; updatedAt: Date }[],
    ),
    withDbRetry(
      "diyCategory.findMany",
      () =>
        prisma.diyCategory.findMany({
          where: { status: "published", indexable: true },
          select: { slug: true, updatedAt: true },
        }),
      [] as { slug: string; updatedAt: Date }[],
    ),
  ]);

  for (const locale of locales) {
    for (const service of services) {
      entries.push({
        url: `${site}/${locale}/${servicePathSlug(locale, service.slug)}`,
        lastModified: service.updatedAt,
      });
    }
    for (const location of locations) {
      entries.push({
        url: `${site}/${locale}/locations/${locationPathSlug(locale, location.slug)}`,
        lastModified: location.updatedAt,
      });
    }
    for (const guide of guides) {
      entries.push({
        url: `${site}/${locale}/diy/${diyGuidePathSlug(locale, guide.slug)}`,
        lastModified: guide.updatedAt,
      });
    }
    for (const category of categories) {
      entries.push({
        url: `${site}/${locale}/diy/${diyCategoryPathSlug(locale, category.slug)}`,
        lastModified: category.updatedAt,
      });
    }
  }

  return entries;
}

/** Blog + FAQ article URLs for one shard — cursor batches (no full-table RAM). */
async function articleEntriesForShard(site: string, shard: number): Promise<MetadataRoute.Sitemap> {
  const locales = ["en", "ar"] as const;
  const entries: MetadataRoute.Sitemap = [];
  let cursor: string | undefined;

  for (;;) {
    const batch = await withDbRetry(
      "article.findMany.batch",
      () =>
        prisma.article.findMany({
          where: { status: "published", indexable: true },
          select: { id: true, slug: true, updatedAt: true, publishedAt: true },
          orderBy: { id: "asc" },
          take: ARTICLE_BATCH,
          ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
        }),
      [] as { id: string; slug: string; updatedAt: Date; publishedAt: Date | null }[],
    );
    if (!batch.length) break;

    for (const article of batch) {
      if (articleShardId(article.slug) !== shard) continue;
      const isFaq = article.slug.startsWith("faq-") || article.slug.startsWith("أسئلة");
      for (const locale of locales) {
        const segment = isFaq ? faqPathSlug(locale, article.slug) : blogPathSlug(locale, article.slug);
        const path = isFaq ? `/faq/${segment}` : `/blog/${segment}`;
        entries.push({
          url: `${site}/${locale}${path}`,
          lastModified: article.publishedAt ?? article.updatedAt,
        });
      }
    }

    cursor = batch[batch.length - 1]?.id;
    if (batch.length < ARTICLE_BATCH) break;
    if (entries.length >= MAX_URLS_PER_SHARD) break;
  }

  return entries;
}

/** Service×location pairs for one shard — cursor batches. */
async function pairEntriesForShard(site: string, shard: number): Promise<MetadataRoute.Sitemap> {
  const locales = ["en", "ar"] as const;
  const entries: MetadataRoute.Sitemap = [];
  let cursor: string | undefined;

  for (;;) {
    const batch = await withDbRetry(
      "serviceLocation.findMany.batch",
      () =>
        prisma.serviceLocation.findMany({
          where: publicServiceLocationWhere,
          select: {
            id: true,
            updatedAt: true,
            service: { select: { slug: true } },
            location: { select: { slug: true } },
          },
          orderBy: { id: "asc" },
          take: PAIR_BATCH,
          ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
        }),
      [] as {
        id: string;
        updatedAt: Date;
        service: { slug: string };
        location: { slug: string };
      }[],
    );
    if (!batch.length) break;

    for (const pair of batch) {
      if (pairShardId(`${pair.service.slug}/${pair.location.slug}`) !== shard) continue;
      for (const locale of locales) {
        entries.push({
          url: `${site}/${locale}/${servicePathSlug(locale, pair.service.slug)}/${locationPathSlug(locale, pair.location.slug)}`,
          lastModified: pair.updatedAt,
        });
      }
    }

    cursor = batch[batch.length - 1]?.id;
    if (batch.length < PAIR_BATCH) break;
    if (entries.length >= MAX_URLS_PER_SHARD) break;
  }

  return entries;
}

async function buildShardEntries(site: string, shard: number): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = [];

  if (shard === 0) {
    entries.push(...(await staticAndSmallCatalogEntries(site)));
  }

  entries.push(...(await articleEntriesForShard(site, shard)));
  if (entries.length < MAX_URLS_PER_SHARD) {
    entries.push(...(await pairEntriesForShard(site, shard)));
  }

  if (entries.length > MAX_URLS_PER_SHARD) {
    console.error(
      `[sitemap] shard ${shard} truncated from ${entries.length} to ${MAX_URLS_PER_SHARD} (Google 50k cap)`,
    );
    return entries.slice(0, MAX_URLS_PER_SHARD);
  }

  return entries;
}

/** Cache built shards so concurrent Googlebot fetches do not re-scan the DB 64×. */
const getCachedShardEntries = unstable_cache(
  async (site: string, shard: number) => buildShardEntries(site, shard),
  ["sitemap-shard-v3"],
  { revalidate: 3600 },
);

export default async function sitemap(props: {
  id: Promise<string> | string;
}): Promise<MetadataRoute.Sitemap> {
  const idRaw = await Promise.resolve(props.id);
  const shard = Number(idRaw);
  const site = getSiteUrl();

  if (!Number.isInteger(shard) || shard < 0 || shard >= SITEMAP_PAIR_SHARDS) {
    return [];
  }

  try {
    return await getCachedShardEntries(site, shard);
  } catch (err) {
    console.error("[sitemap] soft-fail:", err instanceof Error ? err.message : err);
    return softFailShard(site, shard);
  }
}
