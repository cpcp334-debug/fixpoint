import { cache } from "react";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/server/db";
import { pickI18n } from "@/lib/utils";
import { isApprovedPublicServiceSlug } from "@/lib/catalog/approved-nav";
import {
  getServiceLocation as resolvePublicServiceLocation,
  resolveServiceLocationPage,
} from "@/lib/service-location/page-resolve";

type ServiceWithTranslations = Prisma.ServiceGetPayload<{ include: { translations: true; category: true } }>;

function pickServiceTranslation(row: ServiceWithTranslations, locale: string) {
  if (locale === "ar") {
    return row.translations.find((x) => x.locale === "ar") || undefined;
  }
  return row.translations.find((x) => x.locale === "en") || pickI18n(row.translations, locale);
}

/** Public catalog: active + indexable. Hide is draft or indexable off — not a delete, and not coverage. */
export const publicServiceWhere = {
  status: "active",
  indexable: true,
} satisfies Prisma.ServiceWhereInput;

/** Public place page: active, indexable, and marked as a serving area. Does not create coverage. */
export const publicLocationWhere = {
  status: "active",
  indexable: true,
  serves: true,
} satisfies Prisma.LocationWhereInput;

export const publicServiceLocationWhere = {
  indexable: true,
  covered: true,
  coverageStatus: "published",
  service: publicServiceWhere,
  location: publicLocationWhere,
} satisfies Prisma.ServiceLocationWhereInput;

export { resolveServiceLocationPage };
export const getServiceLocation = resolvePublicServiceLocation;

/** Empty catalog when MySQL schema/data is not ready yet (Hostinger first deploy). */
async function safeList<T>(fn: () => Promise<T[]>, fallback: T[] = []): Promise<T[]> {
  try {
    return await fn();
  } catch {
    return fallback;
  }
}

export const getActiveServices = cache(async (locale: string) =>
  safeList(async () => {
    const rows = await prisma.service.findMany({
      where: publicServiceWhere,
      include: { translations: true, category: true },
      orderBy: { slug: "asc" },
    });
    return rows.map((row) => ({
      ...row,
      t: pickI18n(row.translations, locale)!,
    }));
  }),
);

export const getServiceBySlug = cache(async (slug: string, locale: string) => {
  const row = await prisma.service.findFirst({
    where: { slug, ...publicServiceWhere },
    include: { translations: true, category: true },
  });
  if (!row) return null;
  const t = pickServiceTranslation(row, locale);
  if (!t) return null;
  return {
    ...row,
    t,
    publicIndexable: true,
  };
});

/** Approved catalog slugs: any status (draft OK). Used for category hubs and noindex service pages. */
export const getApprovedCatalogServiceBySlug = cache(async (slug: string, locale: string) => {
  if (!isApprovedPublicServiceSlug(slug)) return null;
  const row = await prisma.service.findFirst({
    where: { slug },
    include: { translations: true, category: true },
  });
  if (!row) return null;
  const t = pickServiceTranslation(row, locale);
  if (!t) return null;
  return {
    ...row,
    t,
    publicIndexable: row.status === "active" && row.indexable,
  };
});

export const getActiveEmirates = cache(async (locale: string) =>
  safeList(async () => {
    const rows = await prisma.location.findMany({
      where: { type: "emirate", ...publicLocationWhere },
      include: { translations: true },
      orderBy: { sortOrder: "asc" },
    });
    return rows.map((row) => ({
      ...row,
      t: pickI18n(row.translations, locale)!,
    }));
  }),
);

export async function publishedServingLocationSlugs() {
  try {
    const rows = await prisma.location.findMany({
      where: publicLocationWhere,
      select: { slug: true },
    });
    return new Set(rows.map((row) => row.slug));
  } catch {
    return new Set<string>();
  }
}

export const getPublishedLocation = cache(async (slug: string, locale: string) => {
  const row = await prisma.location.findFirst({
    where: { slug, ...publicLocationWhere, type: { in: ["emirate", "city", "community"] } },
    include: {
      translations: true,
      parent: { include: { translations: true, parent: { include: { translations: true } } } },
    },
  });
  if (!row) return null;
  const t = pickI18n(row.translations, locale);
  if (!t) return null;
  const name = t.name === "REVIEW_REQUIRED" ? pickI18n(row.translations, "en")?.name || row.slug : t.name;
  return { ...row, t: { ...t, name } };
});

export const getEmirateBySlug = cache(async (slug: string, locale: string) => {
  const row = await prisma.location.findFirst({
    where: { slug, type: "emirate", ...publicLocationWhere },
    include: { translations: true },
  });
  if (!row) return null;
  return { ...row, t: pickI18n(row.translations, locale)! };
});

export const getPublishedGuides = cache(async (locale: string) =>
  safeList(async () => {
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
  }),
);

export const getPublishedDiyCategories = cache(async (locale: string) =>
  safeList(async () => {
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
  }),
);

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

export const getGlobalFaqs = cache(async (locale: string) =>
  safeList(async () => {
    const rows = await prisma.faq.findMany({
      where: { status: "published", serviceId: null, locationId: null },
      include: { translations: true },
      orderBy: { sortOrder: "asc" },
    });
    return rows
      .map((row) => pickI18n(row.translations, locale))
      .filter(Boolean)
      .map((t) => ({ q: t!.question, a: t!.answer }));
  }),
);

export const getRelatedServices = cache(async (slugs: string[], locale: string) => {
  if (!slugs.length) return [];
  return safeList(async () => {
    const rows = await prisma.service.findMany({
      where: { slug: { in: slugs }, status: "active", indexable: true },
      include: { translations: true },
    });
    return rows.map((row) => ({ ...row, t: pickI18n(row.translations, locale)! }));
  });
});
