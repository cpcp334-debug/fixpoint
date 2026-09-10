import type { Prisma } from "@prisma/client";
import { prisma } from "@/server/db";
import { pickI18n } from "@/lib/utils";
import { arabicConfidenceForSlug } from "@/lib/service-location/arabic";
import { isLegacyCompatRow } from "@/lib/service-location/content-completeness";
import {
  evaluateContentQuality,
  gateScannerFlagsFromReport,
  type ContentQualityReport,
} from "@/lib/service-location/content-quality";
import { evaluateServiceLocationGates } from "@/lib/service-location/gates";
import { resolveDiyInheritance } from "@/lib/service-location/diy";
import { resolveEffectiveOps } from "@/lib/service-location/overrides";
import { resolveImageInheritance } from "@/lib/service-location/images";
import { buildServiceLocationTitle } from "@/lib/service-location/seo-title";
import type { DiySafetyClass, GateInput, WorkingCopy } from "@/lib/service-location/types";

const listInclude = {
  translations: true,
  service: {
    include: {
      translations: true,
      category: { include: { translations: true } },
      diyGuides: { include: { translations: true } },
      primaryDiyGuide: { include: { translations: true } },
    },
  },
  location: { include: { translations: true, parent: { include: { translations: true } } } },
  revisions: { orderBy: { revisionNumber: "desc" as const } },
} satisfies Prisma.ServiceLocationInclude;

export type ServicePageRow = Prisma.ServiceLocationGetPayload<{ include: typeof listInclude }>;

export type ServicePageFilters = {
  service?: string;
  parent?: string;
  emirate?: string;
  location?: string;
  city?: string;
  coverage?: string;
  status?: string;
  quality?: string;
  booking?: string;
  amc?: string;
  emergency?: string;
  diy?: string;
  language?: string;
};

function workingFromRow(row: ServicePageRow, locale: string): WorkingCopy | null {
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

function gateInputFromRow(row: ServicePageRow, report: ContentQualityReport): GateInput {
  const en = workingFromRow(row, "en");
  const ar = workingFromRow(row, "ar");
  const guide =
    row.service.primaryDiyGuide ??
    row.service.diyGuides.find((g) => g.status === "published") ??
    row.service.diyGuides[0] ??
    null;
  const diy = resolveDiyInheritance({
    serviceRiskLevel: row.service.riskLevel,
    serviceDiyAvailable: row.service.diyAvailable,
    diyRestricted: row.diyRestricted,
    serviceSlug: row.service.slug,
    guide: guide ? { id: guide.id, slug: guide.slug, riskLevel: guide.riskLevel, status: guide.status } : null,
  });
  const scanners = gateScannerFlagsFromReport(report);
  const mode = isLegacyCompatRow(row) ? "LEGACY_COMPAT" : "STRICT_NEW_CONTENT";
  return {
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
    en,
    ar,
    arabicConfidence: arabicConfidenceForSlug(row.location.slug),
    diySafetyClass: diy.safetyClass,
    safetyReviewComplete: diy.safetyClass !== "RED" && diy.safetyClass !== "REVIEW_REQUIRED",
    ...scanners,
    // Legacy pairs: do not let soft scanners unpublish A3 grandfathered rows
    ...(mode === "LEGACY_COMPAT"
      ? {
          uniqueTitleEn: true,
          uniqueTitleAr: true,
          uniqueMetaEn: true,
          uniqueMetaAr: true,
          duplicateSimilarityOk: true,
          claimScanOk: true,
          thinContentOk: true,
        }
      : {}),
    humanApproved: Boolean(row.approvedBy),
    contentMode: mode,
  };
}

export function evaluateRow(row: ServicePageRow) {
  const en = workingFromRow(row, "en");
  const ar = workingFromRow(row, "ar");
  const serviceEn = pickI18n(row.service.translations, "en");
  const locationEn = pickI18n(row.location.translations, "en");
  const serviceAr = pickI18n(row.service.translations, "ar");
  const locationAr = pickI18n(row.location.translations, "ar");
  const guide =
    row.service.primaryDiyGuide ??
    row.service.diyGuides.find((g) => g.status === "published") ??
    row.service.diyGuides[0] ??
    null;
  const diy = resolveDiyInheritance({
    serviceRiskLevel: row.service.riskLevel,
    serviceDiyAvailable: row.service.diyAvailable,
    diyRestricted: row.diyRestricted,
    serviceSlug: row.service.slug,
    guide: guide ? { id: guide.id, slug: guide.slug, riskLevel: guide.riskLevel, status: guide.status } : null,
  });
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
  const image = resolveImageInheritance({
    heroImageOverride: row.heroImageOverride,
    serviceHeroImage: row.service.heroImage,
    imageAlt: en?.imageAlt,
    serviceName: serviceEn?.name || row.service.slug,
    locationName: locationEn?.name || row.location.slug,
    locale: "en",
  });
  const titleEn = buildServiceLocationTitle({
    serviceName: serviceEn?.name || row.service.slug,
    locationName: locationEn?.name || row.location.slug,
    parentName: row.location.parent ? pickI18n(row.location.parent.translations, "en")?.name : null,
    locale: "en",
    serviceId: row.serviceId,
    locationId: row.locationId,
  });
  const titleAr = buildServiceLocationTitle({
    serviceName: serviceAr?.name || row.service.slug,
    locationName: locationAr?.name || row.location.slug,
    parentName: row.location.parent ? pickI18n(row.location.parent.translations, "ar")?.name : null,
    locale: "ar",
    serviceId: row.serviceId,
    locationId: row.locationId,
  });

  const mode = isLegacyCompatRow(row) ? "LEGACY_COMPAT" : "STRICT_NEW_CONTENT";
  const quality = evaluateContentQuality({
    mode,
    covered: row.covered,
    coverageStatus: row.coverageStatus,
    serviceExists: true,
    locationExists: true,
    serviceStatus: row.service.status,
    locationStatus: row.location.status,
    locationServes: row.location.serves,
    serviceIndexable: row.service.indexable,
    locationIndexable: row.location.indexable,
    serviceSlug: row.service.slug,
    locationSlug: row.location.slug,
    serviceName: serviceEn?.name || row.service.slug,
    locationName: locationEn?.name || row.location.slug,
    serviceHeroImage: row.service.heroImage,
    heroImageOverride: row.heroImageOverride,
    en,
    ar,
    arabicConfidence: arabicConfidenceForSlug(row.location.slug),
    diySafetyClass: diy.safetyClass,
    diyGuideId: diy.guideId,
    diyMatrixMapped: diy.matrixMapped,
    safetyReviewComplete: diy.safetyClass !== "RED" && diy.safetyClass !== "REVIEW_REQUIRED",
    humanApproved: Boolean(row.approvedBy),
    qualityScore: row.qualityScore,
    qualityStatusStored: row.qualityStatus,
  });

  return {
    gates: evaluateServiceLocationGates(gateInputFromRow(row, quality)),
    quality,
    diy,
    ops,
    image,
    titleEn,
    titleAr,
    en,
    ar,
    serviceEn,
    locationEn,
    contentMode: mode,
  };
}

export type AdminReadinessLabels = {
  coverage: string;
  en: string;
  ar: string;
  seo: string;
  geo: string;
  aeo: string;
  diy: string;
  image: string;
  quality: string;
  indexEn: string;
  indexAr: string;
  overall: string;
};

export function readinessLabels(quality: ContentQualityReport, gates: { indexableEn: boolean; indexableAr: boolean }): AdminReadinessLabels {
  return {
    coverage: quality.checks.find((c) => c.id === "coverage")?.status === "pass" ? "PASS" : "FAIL",
    en: quality.enComplete ? "PASS" : "FAIL",
    ar:
      quality.arStatus === "translation-review"
        ? "REVIEW_REQUIRED"
        : quality.arComplete
          ? "PASS"
          : "FAIL",
    seo: quality.seoStatus === "pass" ? "PASS" : "FAIL",
    geo: quality.geoStatus === "skip" ? "N/A" : quality.geoStatus === "pass" ? "PASS" : "FAIL",
    aeo: quality.aeoStatus === "skip" ? "N/A" : quality.aeoStatus === "pass" ? "PASS" : "FAIL",
    diy:
      quality.diyStatus === "safety-review"
        ? "SAFETY-REVIEW"
        : quality.diyStatus === "missing"
          ? "MISSING"
          : quality.diyStatus === "inherited"
            ? "INHERITED"
            : "PASS",
    image:
      quality.imageStatus === "ready" ? "READY" : quality.imageStatus === "fallback" ? "FALLBACK" : "MISSING",
    quality: quality.qualityStatus === "pass" ? "PASS" : "FAIL",
    indexEn: gates.indexableEn ? "YES" : "NO",
    indexAr: gates.indexableAr ? "YES" : "NO",
    overall: quality.overall === "publishable" ? "PUBLISHABLE" : "NOT PUBLISHABLE",
  };
}

export async function listServicePages(filters: ServicePageFilters) {
  const where: Prisma.ServiceLocationWhereInput = {};
  if (filters.service) where.service = { slug: filters.service };
  if (filters.status) where.coverageStatus = filters.status as Prisma.ServiceLocationWhereInput["coverageStatus"];
  if (filters.quality) where.qualityStatus = filters.quality as Prisma.ServiceLocationWhereInput["qualityStatus"];
  if (filters.coverage === "covered") where.covered = true;
  if (filters.coverage === "not_covered") where.covered = false;
  if (filters.parent) where.service = { ...(where.service as object), category: { slug: filters.parent } };
  if (filters.location) {
    where.location = { slug: filters.location };
  } else if (filters.emirate) {
    where.location = {
      OR: [{ slug: filters.emirate }, { parent: { slug: filters.emirate } }, { parent: { parent: { slug: filters.emirate } } }],
    };
  }
  // Hard bound — never load full 63k cartesian into admin memory
  const take = 100;
  const rows = await prisma.serviceLocation.findMany({
    where,
    include: listInclude,
    orderBy: [{ service: { slug: "asc" } }, { location: { sortOrder: "asc" } }],
    take,
  });
  return rows.filter((row) => {
    const evald = evaluateRow(row);
    if (filters.diy === "yes" && !evald.diy.visible) return false;
    if (filters.diy === "no" && evald.diy.visible) return false;
    if (filters.language === "en" && !evald.gates.indexableEn) return false;
    if (filters.language === "ar" && !evald.gates.indexableAr) return false;
    return true;
  });
}

export async function getServicePage(id: string) {
  return prisma.serviceLocation.findUnique({ where: { id }, include: listInclude });
}

export async function servicePageDashboard() {
  const { measureServiceLocationPopulation } = await import("@/lib/service-location/population");
  const [
    totalRows,
    covered,
    draft,
    review,
    approved,
    published,
    archived,
    indexable,
    missingEn,
    missingAr,
    population,
    qualityPublishable,
    qualityReadyReview,
    qualityFailed,
    qualityIncomplete,
    qualityIndexable,
    enReady,
    arReady,
    seoReady,
    geoReady,
    aeoReady,
    imageAltReady,
  ] = await Promise.all([
    prisma.serviceLocation.count(),
    prisma.serviceLocation.count({ where: { covered: true } }),
    prisma.serviceLocation.count({ where: { coverageStatus: "draft" } }),
    prisma.serviceLocation.count({ where: { coverageStatus: "review" } }),
    prisma.serviceLocation.count({ where: { coverageStatus: "approved" } }),
    prisma.serviceLocation.count({ where: { coverageStatus: "published" } }),
    prisma.serviceLocation.count({ where: { coverageStatus: "archived" } }),
    prisma.serviceLocation.count({ where: { indexable: true } }),
    prisma.serviceLocation.count({
      where: { translations: { none: { locale: "en", intro: { not: "" } } } },
    }),
    prisma.serviceLocation.count({
      where: { translations: { none: { locale: "ar", intro: { not: "" } } } },
    }),
    measureServiceLocationPopulation(prisma),
    prisma.serviceLocation.count({ where: { qualityStatus: "publishable" } }),
    prisma.serviceLocation.count({ where: { qualityStatus: "ready_for_review" } }),
    prisma.serviceLocation.count({ where: { qualityStatus: "failed_quality" } }),
    prisma.serviceLocation.count({ where: { qualityStatus: "incomplete" } }),
    prisma.serviceLocation.count({ where: { qualityStatus: "indexable" } }),
    prisma.serviceLocationI18n.count({ where: { locale: "en", h1: { not: "" }, intro: { not: "" }, seoTitle: { not: "" } } }),
    prisma.serviceLocationI18n.count({ where: { locale: "ar", h1: { not: "" }, intro: { not: "" }, seoTitle: { not: "" } } }),
    prisma.serviceLocationI18n.count({ where: { locale: "en", seoTitle: { not: "" }, metaDescription: { not: "" } } }),
    prisma.serviceLocationI18n.count({ where: { locale: "en", geoIntro: { not: "" } } }),
    prisma.serviceLocationI18n.count({ where: { locale: "en", directAnswer: { not: "" } } }),
    prisma.serviceLocationI18n.count({ where: { locale: "en", imageAlt: { not: "" } } }),
  ]);

  const approvedMatrixCandidates = population.classification.approvedMatrixRows;
  const legacyExtraRows = population.classification.legacyOutsideMatrixRows;
  const totalExpected = approvedMatrixCandidates + legacyExtraRows;
  return {
    possible: approvedMatrixCandidates,
    approvedMatrixCandidates,
    legacyExtraRows,
    totalExpected,
    theoreticalWithHubs: 62200,
    hubsNotMaterializedRows: population.hubsNotMaterializedRows,
    netVsTheoretical62200: population.netVsTheoretical62200,
    covered,
    notCovered: totalRows - covered,
    draft,
    review,
    approved,
    published,
    archived,
    indexable,
    noindex: totalRows - indexable,
    missingEn,
    missingAr,
    missingDiy: null as number | null,
    missingImage: null as number | null,
    qualityFailures: qualityFailed,
    qualityPublishable,
    qualityReadyReview,
    qualityIncomplete,
    qualityIndexable,
    readyForPublish: qualityPublishable,
    enReady,
    arReady,
    seoReady,
    geoReady,
    aeoReady,
    imageReady: imageAltReady,
    totalRows,
    publishedIndexable: population.published,
    pilotsPreserved: population.pilotsPreserved,
    unexplainedRows: population.classification.unexplainedRows,
    legitimacy: population.legitimacy,
    scalable: true,
  };
}

export function asDiyClass(value: string): DiySafetyClass | null {
  if (value === "GREEN" || value === "YELLOW" || value === "RED" || value === "REVIEW_REQUIRED") return value;
  return null;
}
