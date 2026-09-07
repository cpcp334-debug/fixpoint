import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/config/site";

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
    sitemap: `${site}/sitemap.xml`,
  };
}
