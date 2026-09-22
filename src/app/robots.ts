import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/config/site";

/**
 * Advertise ONE sitemap index in robots.txt.
 * Listing all 64 `/sitemap/{id}.xml` shards caused Googlebot to fetch many
 * shards in parallel (Hostinger OOM / intermittent 500 → GSC "Couldn't fetch").
 * Children are discovered from the index after a successful index fetch.
 */
export default function robots(): MetadataRoute.Robots {
  const site = getSiteUrl().replace(/\/$/, "");
  const rule = {
    allow: "/",
    disallow: [
      "/admin",
      "/login",
      "/account",
      "/api/",
      "/api/reviews",
      "/api/questions",
      "/api/trust",
      "/api/ai",
    ],
  };
  return {
    rules: [
      { userAgent: "*", ...rule },
      { userAgent: "Googlebot", ...rule },
      { userAgent: "Bingbot", ...rule },
      { userAgent: "OAI-SearchBot", ...rule },
    ],
    // Prefer index URL (also available as /sitemap.xml via rewrite).
    sitemap: `${site}/sitemap-index.xml`,
  };
}
