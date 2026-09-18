import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/config/site";
import { publicServiceLocationWhere } from "@/lib/catalog";
import { prisma } from "@/server/db";

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
    prisma.service.findMany({
      where: { status: "active", indexable: true },
      select: { slug: true, updatedAt: true },
    }),
    prisma.location.findMany({
      where: { status: "active", indexable: true, serves: true, type: { in: ["emirate", "city", "community"] } },
      select: { slug: true, updatedAt: true },
    }),
    prisma.diyGuide.findMany({
      where: { status: "published", indexable: true },
      select: { slug: true, updatedAt: true },
    }),
    prisma.diyCategory.findMany({
      where: { status: "published", indexable: true },
      select: { slug: true, updatedAt: true },
    }),
    prisma.article.findMany({
      where: { status: "published", indexable: true },
      select: { slug: true, updatedAt: true, publishedAt: true, categorySlugs: true },
    }),
  ]);

  for (const locale of locales) {
    for (const service of services) {
      entries.push({ url: `${site}/${locale}/${service.slug}`, lastModified: service.updatedAt });
    }
    for (const location of locations) {
      entries.push({ url: `${site}/${locale}/locations/${location.slug}`, lastModified: location.updatedAt });
    }
    for (const guide of guides) {
      entries.push({ url: `${site}/${locale}/diy/${guide.slug}`, lastModified: guide.updatedAt });
    }
    for (const category of categories) {
      entries.push({ url: `${site}/${locale}/diy/${category.slug}`, lastModified: category.updatedAt });
    }
    for (const article of articles) {
      const isFaq =
        article.slug.startsWith("faq-") ||
        article.slug.startsWith("أسئلة") ||
        (article.categorySlugs || "").includes("service-faq");
      const path = isFaq ? `/faq/${article.slug}` : `/blog/${article.slug}`;
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
  // Static + service + emirate + diy catalog only on shard 0 (avoid duplicate URLs across shards).
  const entries: MetadataRoute.Sitemap = shard === 0 ? await staticAndCatalogEntries(site) : [];

  const pairs = await prisma.serviceLocation.findMany({
    where: publicServiceLocationWhere,
    select: {
      updatedAt: true,
      service: { select: { slug: true } },
      location: { select: { slug: true } },
    },
  });

  const locales = ["en", "ar"] as const;
  for (const pair of pairs) {
    if (pairShardId(pair.service.slug, pair.location.slug) !== shard) continue;
    for (const locale of locales) {
      entries.push({
        url: `${site}/${locale}/${pair.service.slug}/${pair.location.slug}`,
        lastModified: pair.updatedAt,
      });
    }
  }

  return entries;
}
