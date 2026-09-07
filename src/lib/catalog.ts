import { cache } from "react";
import { prisma } from "@/server/db";
import { pickI18n } from "@/lib/utils";

export const getActiveServices = cache(async (locale: string) => {
  const rows = await prisma.service.findMany({
    where: { status: "active", indexable: true },
    include: { translations: true, category: true },
    orderBy: { slug: "asc" },
  });
  return rows.map((row) => ({
    ...row,
    t: pickI18n(row.translations, locale)!,
  }));
});

export const getServiceBySlug = cache(async (slug: string, locale: string) => {
  const row = await prisma.service.findFirst({
    where: { slug, status: "active", indexable: true },
    include: { translations: true, category: true },
  });
  if (!row) return null;
  return { ...row, t: pickI18n(row.translations, locale)! };
});

export const getActiveEmirates = cache(async (locale: string) => {
  const rows = await prisma.location.findMany({
    where: { type: "emirate", status: "active", indexable: true, serves: true },
    include: { translations: true },
    orderBy: { sortOrder: "asc" },
  });
  return rows.map((row) => ({
    ...row,
    t: pickI18n(row.translations, locale)!,
  }));
});

export const getEmirateBySlug = cache(async (slug: string, locale: string) => {
  const row = await prisma.location.findFirst({
    where: { slug, type: "emirate", status: "active", indexable: true, serves: true },
    include: { translations: true },
  });
  if (!row) return null;
  return { ...row, t: pickI18n(row.translations, locale)! };
});

export const getServiceLocation = cache(async (serviceSlug: string, locationSlug: string, locale: string) => {
  const row = await prisma.serviceLocation.findFirst({
    where: {
      indexable: true,
      service: { slug: serviceSlug, status: "active", indexable: true },
      location: { slug: locationSlug, status: "active", indexable: true, serves: true },
    },
    include: {
      translations: true,
      service: { include: { translations: true } },
      location: { include: { translations: true } },
    },
  });
  if (!row) return null;
  return {
    ...row,
    t: pickI18n(row.translations, locale)!,
    serviceT: pickI18n(row.service.translations, locale)!,
    locationT: pickI18n(row.location.translations, locale)!,
  };
});

export const getPublishedGuides = cache(async (locale: string) => {
  const rows = await prisma.diyGuide.findMany({
    where: { status: "published", indexable: true },
    include: { translations: true, service: true, category: { include: { translations: true } } },
    orderBy: { slug: "asc" },
  });
  return rows.map((row) => ({
    ...row,
    t: pickI18n(row.translations, locale)!,
    categoryT: pickI18n(row.category.translations, locale),
  }));
});

export const getPublishedDiyCategories = cache(async (locale: string) => {
  const rows = await prisma.diyCategory.findMany({
    where: { status: "published", indexable: true },
    include: {
      translations: true,
      guides: {
        where: { status: "published", indexable: true },
        include: { translations: true },
        orderBy: { slug: "asc" },
      },
    },
    orderBy: { sortOrder: "asc" },
  });
  return rows.map((row) => ({
    ...row,
    t: pickI18n(row.translations, locale)!,
    publishedGuides: row.guides.map((guide) => ({
      ...guide,
      t: pickI18n(guide.translations, locale)!,
    })),
  }));
});

export const getDiyCategoryBySlug = cache(async (slug: string, locale: string) => {
  const row = await prisma.diyCategory.findFirst({
    where: { slug, status: "published", indexable: true },
    include: {
      translations: true,
      guides: {
        where: { status: "published", indexable: true },
        include: { translations: true, service: { include: { translations: true } } },
        orderBy: { slug: "asc" },
      },
    },
  });
  if (!row) return null;
  return {
    ...row,
    t: pickI18n(row.translations, locale)!,
    publishedGuides: row.guides.map((guide) => ({
      ...guide,
      t: pickI18n(guide.translations, locale)!,
    })),
  };
});

export const getGuideBySlug = cache(async (slug: string, locale: string) => {
  const row = await prisma.diyGuide.findFirst({
    where: { slug, status: "published", indexable: true },
    include: {
      translations: true,
      service: { include: { translations: true } },
      category: { include: { translations: true } },
    },
  });
  if (!row) return null;
  return {
    ...row,
    t: pickI18n(row.translations, locale)!,
    serviceT: row.service ? pickI18n(row.service.translations, locale) : null,
    categoryT: pickI18n(row.category.translations, locale),
  };
});

export const getApprovedGuideQuestions = cache(async (guideId: string) => {
  return prisma.question.findMany({
    where: { guideId, moderationStatus: "APPROVED", status: "published", answer: { not: "" } },
    orderBy: { createdAt: "desc" },
    take: 20,
  });
});

export const getApprovedGuideFeedback = cache(async (guideId: string) => {
  return prisma.review.findMany({
    where: { guideId, type: "guide", status: "APPROVED", verified: false },
    orderBy: { createdAt: "desc" },
    take: 20,
  });
});

export const getGlobalFaqs = cache(async (locale: string) => {
  const rows = await prisma.faq.findMany({
    where: { status: "published", serviceId: null, locationId: null },
    include: { translations: true },
    orderBy: { sortOrder: "asc" },
  });
  return rows
    .map((row) => pickI18n(row.translations, locale))
    .filter(Boolean)
    .map((t) => ({ q: t!.question, a: t!.answer }));
});

export const getRelatedServices = cache(async (slugs: string[], locale: string) => {
  if (!slugs.length) return [];
  const rows = await prisma.service.findMany({
    where: { slug: { in: slugs }, status: "active", indexable: true },
    include: { translations: true },
  });
  return rows.map((row) => ({ ...row, t: pickI18n(row.translations, locale)! }));
});
