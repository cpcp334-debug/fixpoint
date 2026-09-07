import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/config/site";
import { prisma } from "@/server/db";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const site = getSiteUrl();
  const locales = ["en", "ar"] as const;
  const staticPaths = [
    "",
    "/about",
    "/services",
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

  const services = await prisma.service.findMany({
    where: { status: "active", indexable: true },
    select: { slug: true, updatedAt: true },
  });
  const locations = await prisma.location.findMany({
    where: { type: "emirate", status: "active", indexable: true, serves: true },
    select: { slug: true, updatedAt: true },
  });
  const pairs = await prisma.serviceLocation.findMany({
    where: {
      indexable: true,
      service: { status: "active", indexable: true },
      location: { status: "active", indexable: true, serves: true },
    },
    include: { service: true, location: true },
  });
  const guides = await prisma.diyGuide.findMany({
    where: { status: "published", indexable: true },
    select: { slug: true, updatedAt: true },
  });
  const diyCategories = await prisma.diyCategory.findMany({
    where: { status: "published", indexable: true },
    select: { slug: true, updatedAt: true },
  });

  for (const locale of locales) {
    for (const service of services) {
      entries.push({ url: `${site}/${locale}/${service.slug}`, lastModified: service.updatedAt });
    }
    for (const location of locations) {
      entries.push({ url: `${site}/${locale}/locations/${location.slug}`, lastModified: location.updatedAt });
    }
    for (const pair of pairs) {
      entries.push({
        url: `${site}/${locale}/${pair.service.slug}/${pair.location.slug}`,
        lastModified: pair.updatedAt,
      });
    }
    for (const category of diyCategories) {
      entries.push({ url: `${site}/${locale}/diy/${category.slug}`, lastModified: category.updatedAt });
    }
    for (const guide of guides) {
      entries.push({ url: `${site}/${locale}/diy/${guide.slug}`, lastModified: guide.updatedAt });
    }
  }

  return entries;
}
