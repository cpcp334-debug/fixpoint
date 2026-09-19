import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/config/site";
import { publicServiceLocationWhere } from "@/lib/catalog";
import { prisma } from "@/server/db";
import { servicePathSlug, locationPathSlug } from "@/lib/slug/locale-slug";
import { diyGuidePathSlug, diyCategoryPathSlug } from "@/lib/slug/diy-slug-map";
import { blogPathSlug } from "@/lib/slug/blog-slug-map";
import { faqPathSlug } from "@/lib/slug/faq-slug-map";

/**
 * Serve sitemaps on demand so Hostinger `next build` does not prerender
 * 32 DB-heavy shards (P1001 / MySQL blips mid-SSG must not fail deploy).
 */
export const dynamic = "force-dynamic";
export const revalidate = 3600;

/** Fixed shard count for service×location URLs (scales toward ~124k locale URLs). */
export const SITEMAP_PAIR_SHARDS = 32;

/**
 * Stable non-crypto hash → bucket in [0, shards).
 * Same pair always lands in the same shard across builds.
 */
export function pairShardId(serviceSlug: string, locationSlug: string, shards = SITEMAP_PAIR_SHARDS): number {
  const key = `${serviceSlug}/${locationSlug}`;
  let h = 2166136261;
  for (let i = 0; i < key.length; i += 1) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) % shards;
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

async function staticAndCatalogEntries(site: string): Promise<MetadataRoute.Sitemap> {
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

  const [services, locations, guides, categories, articles] = await Promise.all([
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
    withDbRetry(
      "article.findMany",
      () =>
        prisma.article.findMany({
          where: { status: "published", indexable: true },
          select: { slug: true, updatedAt: true, publishedAt: true, categorySlugs: true },
        }),
      [] as { slug: string; updatedAt: Date; publishedAt: Date | null; categorySlugs: string | null }[],
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
    for (const article of articles) {
      const isFaq =
        article.slug.startsWith("faq-") ||
        article.slug.startsWith("أسئلة") ||
        (article.categorySlugs || "").includes("service-faq");
      const segment = isFaq ? faqPathSlug(locale, article.slug) : blogPathSlug(locale, article.slug);
      const path = isFaq ? `/faq/${segment}` : `/blog/${segment}`;
      entries.push({
        url: `${site}/${locale}${path}`,
        lastModified: article.publishedAt ?? article.updatedAt,
      });
    }
  }

  return entries;
}

export default async function sitemap(props: {
  id: Promise<string>;
}): Promise<MetadataRoute.Sitemap> {
  const idRaw = await props.id;
  const shard = Number(idRaw);
  if (!Number.isInteger(shard) || shard < 0 || shard >= SITEMAP_PAIR_SHARDS) {
    return [];
  }

  const site = getSiteUrl();

  try {
    // Static + service + emirate + diy catalog only on shard 0 (avoid duplicate URLs across shards).
    const entries: MetadataRoute.Sitemap =
      shard === 0 ? await staticAndCatalogEntries(site) : [];

    const pairs = await withDbRetry(
      "serviceLocation.findMany",
      () =>
        prisma.serviceLocation.findMany({
          where: publicServiceLocationWhere,
          select: {
            updatedAt: true,
            service: { select: { slug: true } },
            location: { select: { slug: true } },
          },
        }),
      [],
    );

    const locales = ["en", "ar"] as const;
    for (const pair of pairs) {
      if (pairShardId(pair.service.slug, pair.location.slug) !== shard) continue;
      for (const locale of locales) {
        entries.push({
          url: `${site}/${locale}/${servicePathSlug(locale, pair.service.slug)}/${locationPathSlug(locale, pair.location.slug)}`,
          lastModified: pair.updatedAt,
        });
      }
    }

    return entries;
  } catch (err) {
    // Last-resort soft-fail: never crash Hostinger build / request over sitemap.
    console.error("[sitemap] soft-fail:", err instanceof Error ? err.message : err);
    if (shard !== 0) return [];
    return [
      { url: `${site}/en`, changeFrequency: "weekly", priority: 1 },
      { url: `${site}/ar`, changeFrequency: "weekly", priority: 1 },
    ];
  }
}
