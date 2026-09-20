import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/config/site";

/** Keep in sync with SITEMAP_PAIR_SHARDS in sitemap.ts. Do not import sitemap.ts (it loads Prisma). */
const SITEMAP_PAIR_SHARDS = 64;

const publicSiteAllow = "/";
const crawlerDisallow = [
  "/admin",
  "/login",
  "/account",
  "/api/",
  "/api/reviews",
  "/api/questions",
  "/api/trust",
  "/api/ai",
];

export default function robots(): MetadataRoute.Robots {
  const site = getSiteUrl();
  const rule = {
    allow: publicSiteAllow,
    disallow: crawlerDisallow,
  };
  return {
    rules: [
      { userAgent: "*", ...rule },
      { userAgent: "Googlebot", ...rule },
      { userAgent: "Bingbot", ...rule },
      { userAgent: "OAI-SearchBot", ...rule },
    ],
    // generateSitemaps serves /sitemap/{id}.xml. /sitemap.xml is not a live index in this app.
    sitemap: Array.from({ length: SITEMAP_PAIR_SHARDS }, (_, id) => `${site}/sitemap/${id}.xml`),
  };
}
