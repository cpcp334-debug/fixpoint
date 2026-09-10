import { cache } from "react";
import type { Prisma } from "@prisma/client";
import { getSiteUrl } from "@/config/site";
import { prisma } from "@/server/db";
import { parseJson, pickI18n } from "@/lib/utils";
import { arabicConfidenceForSlug } from "@/lib/service-location/arabic";
import { isLegacyCompatRow } from "@/lib/service-location/content-completeness";
import { isPubliclyEligible } from "@/lib/service-location/coverage";
import { evaluateServiceLocationGates, localeShouldIndex } from "@/lib/service-location/gates";
import { resolveDiyInheritance } from "@/lib/service-location/diy";
import { resolveImageInheritance } from "@/lib/service-location/images";
import { resolveEffectiveOps } from "@/lib/service-location/overrides";
import {
  buildAeoBlocks,
  parseRevisionSnapshot,
  workingCopyFromContent,
  type LocationBreadcrumb,
  type ServiceLocationPageModel,
} from "@/lib/service-location/page-model";
import type { WorkingCopy } from "@/lib/service-location/types";
import { parseContentJson } from "@/lib/service-location/content-parse";
import { ensureDiySelfHelpSection } from "@/lib/service-location/content-builders";
import { emptyContentJson, type ServiceLocationContentJson } from "@/lib/service-location/content-contract";
import { parseFaqJson } from "@/lib/faq";

const RELATED_LIMIT = 6;

const resolveInclude = {
  translations: true,
  revisions: {
    where: { status: "published" as const },
    orderBy: { revisionNumber: "desc" as const },
  },
  service: {
    include: {
      translations: true,
      primaryDiyGuide: { include: { translations: true } },
      diyGuides: {
        where: { status: "published", indexable: true },
        include: { translations: true },
        take: 3,
      },
    },
  },
  location: {
    include: {
      translations: true,
      parent: {
        include: {
          translations: true,
          parent: { include: { translations: true, parent: { include: { translations: true } } } },
        },
      },
    },
  },
} satisfies Prisma.ServiceLocationInclude;

type ResolveRow = Prisma.ServiceLocationGetPayload<{ include: typeof resolveInclude }>;

export type ResolveMode = "public" | "preview";

function asLocale(locale: string): "en" | "ar" {
  return locale === "ar" ? "ar" : "en";
}

function emptyCopy(locale: string): WorkingCopy {
  return {
    locale,
    intro: "",
    localInfo: "",
    seoTitle: "",
    metaDescription: "",
    faq: "[]",
  };
}

function workingFromI18n(row: ResolveRow, locale: string): WorkingCopy | null {
  const t = row.translations.find((x) => x.locale === locale);
  if (!t) return null;
  return {
    locale,
    intro: t.intro,
    localInfo: t.localInfo,
    seoTitle: t.seoTitle,
    metaDescription: t.metaDescription,
    faq: t.faq,
    h1: t.h1,
    body: t.body,
    directAnswer: t.directAnswer,
    geoIntro: t.geoIntro,
    imageAlt: t.imageAlt,
  };
}

function locationChain(row: ResolveRow, locale: string): LocationBreadcrumb[] {
  const chain: LocationBreadcrumb[] = [];
  let cur: ResolveRow["location"] | null | undefined = row.location;
  while (cur) {
    const name = pickI18n(cur.translations, locale)?.name || cur.slug;
    chain.push({ slug: cur.slug, type: cur.type, name });
    cur = cur.parent as ResolveRow["location"] | null | undefined;
  }
  return chain.reverse();
}

function hierarchyLabels(chain: LocationBreadcrumb[]) {
  return {
    emirate: chain.find((c) => c.type === "emirate")?.name,
    city: chain.find((c) => c.type === "city")?.name,
    community: chain.find((c) => c.type === "community")?.name,
  };
}

export function isCoverageEligible(row: {
  covered: boolean;
  coverageStatus: string;
  service: { status: string };
  location: { status: string; serves: boolean };
}) {
  return isPubliclyEligible({
    covered: row.covered,
    coverageStatus: row.coverageStatus as "draft" | "review" | "approved" | "published" | "archived",
    serviceStatus: row.service.status as "draft" | "active" | "requires_approval" | "subcontracted" | "unavailable" | "archived",
    locationStatus: row.location.status as "draft" | "active" | "archived",
    locationServes: row.location.serves,
  });
}

async function loadBySlugs(serviceSlug: string, locationSlug: string) {
  return prisma.serviceLocation.findFirst({
    where: {
      service: { slug: serviceSlug },
      location: { slug: locationSlug },
    },
    include: resolveInclude,
  });
}

async function loadById(id: string) {
  return prisma.serviceLocation.findUnique({
    where: { id },
    include: resolveInclude,
  });
}

async function relatedFor(
  row: ResolveRow,
  locale: "en" | "ar",
): Promise<{ services: ServiceLocationPageModel["relatedServices"]; locations: ServiceLocationPageModel["relatedLocations"] }> {
  const relatedSlugs = parseJson<string[]>(row.service.relatedServiceSlugs, []).slice(0, RELATED_LIMIT);
  const relatedServices =
    relatedSlugs.length === 0
      ? []
      : (
          await prisma.service.findMany({
            where: { slug: { in: relatedSlugs }, status: "active", indexable: true },
            include: { translations: true },
            take: RELATED_LIMIT,
          })
        ).map((svc) => ({
          href: `/${svc.slug}`,
          label: pickI18n(svc.translations, locale)?.name || svc.slug,
        }));

  const emirate =
    row.location.type === "emirate"
      ? row.location
      : row.location.parent?.type === "emirate"
        ? row.location.parent
        : row.location.parent?.parent?.type === "emirate"
          ? row.location.parent.parent
          : null;

  const locationRows = await prisma.serviceLocation.findMany({
    where: {
      serviceId: row.serviceId,
      id: { not: row.id },
      covered: true,
      coverageStatus: "published",
      indexable: true,
      service: { status: "active", indexable: true },
      location: {
        status: "active",
        indexable: true,
        serves: true,
        ...(emirate
          ? {
              OR: [{ id: emirate.id }, { parentId: emirate.id }, { parent: { parentId: emirate.id } }],
            }
          : {}),
      },
    },
    include: { location: { include: { translations: true } } },
    take: RELATED_LIMIT,
    orderBy: { updatedAt: "desc" },
  });

  const relatedLocations = locationRows.map((item) => ({
    href: `/${row.service.slug}/${item.location.slug}`,
    label: pickI18n(item.location.translations, locale)?.name || item.location.slug,
  }));

  return { services: relatedServices.slice(0, RELATED_LIMIT), locations: relatedLocations.slice(0, RELATED_LIMIT) };
}

function buildModel(
  row: ResolveRow,
  locale: "en" | "ar",
  mode: ResolveMode,
  related: { services: ServiceLocationPageModel["relatedServices"]; locations: ServiceLocationPageModel["relatedLocations"] },
): ServiceLocationPageModel | null {
  const publishedRev = row.revisions.find((r) => r.locale === locale && r.status === "published") ?? null;
  const content =
    (publishedRev ? parseRevisionSnapshot(publishedRev.snapshotJson, locale) : null) ??
    (mode === "preview" ? (() => {
      const w = workingFromI18n(row, locale);
      if (!w) return null;
      return {
        ...w,
        h1: w.h1 ?? "",
        body: w.body ?? "",
        directAnswer: w.directAnswer ?? "",
        geoIntro: w.geoIntro ?? "",
        imageAlt: w.imageAlt ?? "",
        faqs: parseFaqJson(w.faq),
      };
    })() : null);

  if (!content && mode === "public") return null;

  const previewContent = content ?? {
    locale,
    intro: "",
    localInfo: "",
    seoTitle: "",
    metaDescription: "",
    faq: "[]",
    h1: "",
    body: "",
    directAnswer: "",
    geoIntro: "",
    imageAlt: "",
    faqs: [],
  };

  const enPub = row.revisions.find((r) => r.locale === "en" && r.status === "published");
  const arPub = row.revisions.find((r) => r.locale === "ar" && r.status === "published");
  const enWorking: WorkingCopy =
    (enPub ? parseRevisionSnapshot(enPub.snapshotJson, "en") : null) ?? workingFromI18n(row, "en") ?? emptyCopy("en");
  const arWorking: WorkingCopy =
    (arPub ? parseRevisionSnapshot(arPub.snapshotJson, "ar") : null) ?? workingFromI18n(row, "ar") ?? emptyCopy("ar");

  const serviceT = pickI18n(row.service.translations, locale);
  const locationT = pickI18n(row.location.translations, locale);
  // Never use EN as fake AR for public AR pages.
  if (mode === "public" && locale === "ar") {
    const arName = row.service.translations.find((t) => t.locale === "ar");
    const arLoc = row.location.translations.find((t) => t.locale === "ar");
    if (!arName || !arLoc) return null;
  }

  const primary = row.service.primaryDiyGuide;
  const publishedGuide =
    primary && primary.status === "published" && primary.indexable
      ? primary
      : row.service.diyGuides[0] ?? null;
  const guideT = publishedGuide ? pickI18n(publishedGuide.translations, locale) : null;
  const diyBase = resolveDiyInheritance({
    serviceRiskLevel: row.service.riskLevel,
    serviceDiyAvailable: row.service.diyAvailable,
    diyRestricted: row.diyRestricted,
    serviceSlug: row.service.slug,
    guide: publishedGuide
      ? {
          id: publishedGuide.id,
          slug: publishedGuide.slug,
          riskLevel: publishedGuide.riskLevel,
          status: publishedGuide.status,
        }
      : primary
        ? { id: primary.id, slug: primary.slug, riskLevel: primary.riskLevel, status: primary.status }
        : null,
  });
  const diy = {
    ...diyBase,
    title: guideT?.title ?? pickI18n(primary?.translations || [], locale)?.title,
    quickAnswer: guideT?.quickAnswer ?? pickI18n(primary?.translations || [], locale)?.quickAnswer,
    whenToStop: guideT?.whenToStop ?? pickI18n(primary?.translations || [], locale)?.whenToStop,
    guideHref: diyBase.visible && publishedGuide ? `/diy/${publishedGuide.slug}` : null,
    guideSlug: primary?.slug ?? publishedGuide?.slug ?? diyBase.guideSlug,
  };
  const contentMode = isLegacyCompatRow(row) ? "LEGACY_COMPAT" : "STRICT_NEW_CONTENT";

  const ops = resolveEffectiveOps({
    bookingEnabledOverride: row.bookingEnabledOverride,
    amcAvailableOverride: row.amcAvailableOverride,
    emergencyAvailableOverride: row.emergencyAvailableOverride,
    diyRestricted: row.diyRestricted,
    serviceBookingEnabled: row.service.bookingEnabled,
    serviceAmcAvailable: row.service.amcAvailable,
    serviceEmergencyAvailable: row.service.emergencyAvailable,
    serviceDiyAvailable: row.service.diyAvailable,
    serviceRiskLevel: row.service.riskLevel,
  });

  const serviceName =
    locale === "ar"
      ? row.service.translations.find((t) => t.locale === "ar")?.name || row.service.slug
      : serviceT?.name || row.service.slug;
  const locationName =
    locale === "ar"
      ? row.location.translations.find((t) => t.locale === "ar")?.name || row.location.slug
      : locationT?.name || row.location.slug;

  const image = resolveImageInheritance({
    heroImageOverride: row.heroImageOverride,
    serviceHeroImage: row.service.heroImage,
    imageAlt: previewContent.imageAlt,
    serviceName,
    locationName,
    locale,
  });

  const gates = evaluateServiceLocationGates({
    covered: row.covered,
    coverageStatus: row.coverageStatus,
    serviceStatus: row.service.status,
    locationStatus: row.location.status,
    locationServes: row.location.serves,
    bookingEnabledOverride: row.bookingEnabledOverride,
    amcAvailableOverride: row.amcAvailableOverride,
    emergencyAvailableOverride: row.emergencyAvailableOverride,
    diyRestricted: row.diyRestricted,
    serviceBookingEnabled: row.service.bookingEnabled,
    serviceAmcAvailable: row.service.amcAvailable,
    serviceEmergencyAvailable: row.service.emergencyAvailable,
    serviceDiyAvailable: row.service.diyAvailable,
    serviceRiskLevel: row.service.riskLevel,
    indexableStored: row.indexable,
    qualityStatus: row.qualityStatus,
    qualityScore: row.qualityScore,
    serviceIndexable: row.service.indexable,
    locationIndexable: row.location.indexable,
    locationSlug: row.location.slug,
    serviceSlug: row.service.slug,
    serviceHeroImage: row.service.heroImage,
    heroImageOverride: row.heroImageOverride,
    en: workingCopyFromContent({
      locale: "en",
      intro: enWorking.intro,
      localInfo: enWorking.localInfo,
      seoTitle: enWorking.seoTitle,
      metaDescription: enWorking.metaDescription,
      faq: enWorking.faq,
      h1: enWorking.h1 ?? "",
      body: enWorking.body ?? "",
      directAnswer: enWorking.directAnswer ?? "",
      geoIntro: enWorking.geoIntro ?? "",
      imageAlt: enWorking.imageAlt ?? "",
      faqs: [],
    }),
    ar: workingCopyFromContent({
      locale: "ar",
      intro: arWorking.intro,
      localInfo: arWorking.localInfo,
      seoTitle: arWorking.seoTitle,
      metaDescription: arWorking.metaDescription,
      faq: arWorking.faq,
      h1: arWorking.h1 ?? "",
      body: arWorking.body ?? "",
      directAnswer: arWorking.directAnswer ?? "",
      geoIntro: arWorking.geoIntro ?? "",
      imageAlt: arWorking.imageAlt ?? "",
      faqs: [],
    }),
    arabicConfidence: arabicConfidenceForSlug(row.location.slug),
    diySafetyClass: diy.safetyClass,
    safetyReviewComplete: diy.safetyClass !== "RED" && diy.safetyClass !== "REVIEW_REQUIRED",
    // Grandfathered pairs keep A3 scanner stubs; new content uses STRICT quality path separately.
    uniqueTitleEn: true,
    uniqueTitleAr: true,
    uniqueMetaEn: true,
    uniqueMetaAr: true,
    duplicateSimilarityOk: true,
    claimScanOk: true,
    thinContentOk: true,
    humanApproved: Boolean(row.approvedBy),
    contentMode,
  });

  const coverageOk = isCoverageEligible(row);
  const localeIndexable = localeShouldIndex(gates, locale);

  if (mode === "public") {
    if (!coverageOk) return null;
    if (!publishedRev) return null;
    if (!localeShouldIndex(gates, locale)) return null;
  }

  const chain = locationChain(row, locale);
  const site = getSiteUrl();
  const path = `/${row.service.slug}/${row.location.slug}`;
  const enIndexable = gates.indexableEn;
  const arIndexable = gates.indexableAr;
  const hreflang: { en?: string; ar?: string } = {};
  if (enIndexable) hreflang.en = `${site}/en${path}`;
  if (arIndexable) hreflang.ar = `${site}/ar${path}`;

  const serviceShort =
    (locale === "ar"
      ? row.service.translations.find((t) => t.locale === "ar")?.shortDescription
      : serviceT?.shortDescription) || "";
  const whenProfessional =
    (locale === "ar"
      ? row.service.translations.find((t) => t.locale === "ar")?.whenProfessional
      : serviceT?.whenProfessional) || "";
  const serviceLong =
    (locale === "ar"
      ? row.service.translations.find((t) => t.locale === "ar")?.longDescription
      : serviceT?.longDescription) || "";

  const h1 =
    previewContent.h1.trim() ||
    (locale === "ar" ? `${serviceName} — ${locationName}` : `${serviceName} — ${locationName}`);

  // P2: every Service×Location article gets a safety-aware DIY/self-help block (public + preview).
  const existingParsed = previewContent.contentJson
    ? parseContentJson(
        typeof previewContent.contentJson === "string"
          ? previewContent.contentJson
          : JSON.stringify(previewContent.contentJson),
      )
    : null;
  const diyBlock = ensureDiySelfHelpSection({
    existing: existingParsed?.ok ? existingParsed.value.diy : null,
    safetyState: diy.safetyClass,
    serviceName,
    locale,
    guideSlug: diy.guideSlug,
  });
  const contentJson: ServiceLocationContentJson = existingParsed?.ok
    ? { ...existingParsed.value, diy: diyBlock }
    : { ...emptyContentJson(), diy: diyBlock };

  return {
    mode,
    locale,
    serviceSlug: row.service.slug,
    locationSlug: row.location.slug,
    path,
    serviceId: row.service.id,
    locationId: row.location.id,
    serviceName,
    locationName,
    serviceLongDescription: serviceLong,
    serviceShortDescription: serviceShort,
    whenProfessional,
    content: { ...previewContent, h1, contentJson },
    revisionNumber: publishedRev?.revisionNumber ?? null,
    revisionStatus: publishedRev?.status ?? null,
    breadcrumbs: chain,
    hierarchyLabels: hierarchyLabels(chain),
    ops,
    diy,
    image: { ...image, width: 1200, height: 630 },
    gates,
    localeIndexable: mode === "preview" ? false : localeIndexable,
    aeo: buildAeoBlocks({
      locale,
      serviceName,
      locationName,
      serviceShort,
      whenProfessional,
      diy,
      ops,
      coveredPublished: coverageOk,
    }),
    relatedServices: related.services,
    relatedLocations: related.locations,
    hreflang,
    seoTitle: previewContent.seoTitle || h1,
    metaDescription: previewContent.metaDescription || serviceShort,
  };
}

async function resolveServiceLocationPageImpl(args: {
  serviceSlug: string;
  locationSlug: string;
  locale: string;
  mode?: ResolveMode;
}): Promise<ServiceLocationPageModel | null> {
  const locale = asLocale(args.locale);
  const mode = args.mode ?? "public";
  const row = await loadBySlugs(args.serviceSlug, args.locationSlug);
  if (!row) return null;
  const related = mode === "public" ? await relatedFor(row, locale) : { services: [], locations: [] };
  return buildModel(row, locale, mode, related);
}

/** Public resolver (React cache). Prefer this in RSC. */
export const resolveServiceLocationPage = cache(resolveServiceLocationPageImpl);

/** Uncached resolver for scripts / mutation verification. */
export const resolveServiceLocationPageFresh = resolveServiceLocationPageImpl;

export async function resolveServiceLocationPreviewImpl(id: string, locale: string = "en") {
  const row = await loadById(id);
  if (!row) return null;
  return buildModel(row, asLocale(locale), "preview", { services: [], locations: [] });
}

export const resolveServiceLocationPreview = cache(resolveServiceLocationPreviewImpl);

/** Compatibility wrapper used by catalog/sitemap callers that still expect the older shape. */
export const getServiceLocation = cache(async (serviceSlug: string, locationSlug: string, locale: string) => {
  const model = await resolveServiceLocationPageFresh({ serviceSlug, locationSlug, locale, mode: "public" });
  if (!model) return null;
  return {
    id: `${model.serviceId}:${model.locationId}`,
    serviceId: model.serviceId,
    locationId: model.locationId,
    heroImageOverride: model.image.source === "override" ? model.image.src : null,
    t: model.content,
    serviceT: {
      name: model.serviceName,
      longDescription: model.serviceLongDescription,
      shortDescription: model.serviceShortDescription,
      whenProfessional: model.whenProfessional,
    },
    locationT: { name: model.locationName },
    service: {
      id: model.serviceId,
      slug: model.serviceSlug,
      heroImage: model.image.source === "service" ? model.image.src : null,
    },
    location: { id: model.locationId, slug: model.locationSlug },
    gates: model.gates,
    localeIndexable: model.localeIndexable,
    model,
  };
});
