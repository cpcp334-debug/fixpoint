import { getSiteUrl } from "@/config/site";

/** Keep in sync with SITEMAP_PAIR_SHARDS in sitemap.ts. */
const SITEMAP_PAIR_SHARDS = 64;

export const dynamic = "force-dynamic";
export const revalidate = 3600;

export function GET() {
  try {
    const site = getSiteUrl().replace(/\/$/, "") || "https://fixpoint.ae";
    const body = [
      `<?xml version="1.0" encoding="UTF-8"?>`,
      `<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
      ...Array.from(
        { length: SITEMAP_PAIR_SHARDS },
        (_, id) => `  <sitemap><loc>${site}/sitemap/${id}.xml</loc></sitemap>`,
      ),
      `</sitemapindex>`,
    ].join("\n");

    return new Response(body, {
      status: 200,
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
      },
    });
  } catch (err) {
    console.error("[sitemap-index] failed:", err instanceof Error ? err.message : err);
    const fallback = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap><loc>https://fixpoint.ae/sitemap/0.xml</loc></sitemap>
</sitemapindex>`;
    return new Response(fallback, {
      status: 200,
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
        "Cache-Control": "public, max-age=60",
      },
    });
  }
}

