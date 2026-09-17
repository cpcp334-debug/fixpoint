import { getSiteUrl } from "@/config/site";

/** Keep in sync with SITEMAP_PAIR_SHARDS in sitemap.ts. */
const SITEMAP_PAIR_SHARDS = 32;

export function GET() {
  const site = getSiteUrl().replace(/\/$/, "");
  const body = [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
    ...Array.from({ length: SITEMAP_PAIR_SHARDS }, (_, id) => `  <sitemap><loc>${site}/sitemap/${id}.xml</loc></sitemap>`),
    `</sitemapindex>`,
  ].join("\n");

  return new Response(body, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
