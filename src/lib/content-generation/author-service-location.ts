/**
 * Compose ServiceLocation EN/AR working copies from canonical service + location facts.
 * Never invents coverage. Never publishes. Skips already-published pairs at call sites.
 */
import type { PrismaClient } from "@prisma/client";
import { createHash } from "node:crypto";
import { pickI18n } from "@/lib/utils";
import {
  assembleContentJson,
  buildAeoContent,
  buildDiyContentBlocks,
  buildExpertCta,
  buildGeoContent,
  buildMainContent,
} from "@/lib/service-location/content-builders";
import { buildServiceLocationTitle } from "@/lib/service-location/seo-title";
import { resolveDiyInheritance } from "@/lib/service-location/diy";
import { resolveEffectiveOps } from "@/lib/service-location/overrides";
import { resolveImageInheritance } from "@/lib/service-location/images";
import type { WorkingCopy } from "@/lib/service-location/types";
import { buildLongFormSections } from "./author-service-location-long";
import { UNMAPPED_LEGACY_DRAFT_SLUGS } from "../../../prisma/data/catalog-a1";

export type ComposedLocaleResult = {
  copy: WorkingCopy;
  contentHash: string;
  qualityHints: string[];
};

function locationChain(
  location: {
    slug: string;
    type: string;
    translations: Array<{ locale: string; name: string }>;
    parent: { slug: string; type: string; translations: Array<{ locale: string; name: string }> } | null;
  },
  locale: "en" | "ar",
) {
  const chain: Array<{ slug: string; type: any; name: string }> = [];
  const selfName = pickI18n(location.translations, locale)?.name || location.slug;
  chain.push({ slug: location.slug, type: location.type as any, name: selfName });
  if (location.parent) {
    const pName = pickI18n(location.parent.translations, locale)?.name || location.parent.slug;
    chain.unshift({ slug: location.parent.slug, type: location.parent.type as any, name: pName });
  }
  return chain;
}

function toBulletLines(text: string | null | undefined): string[] {
  const raw = (text || "").trim();
  if (!raw) return [];
  return raw
    .split(/\n+|•|\u2022|;/)
    .map((s) => s.replace(/^[-*]\s*/, "").trim())
    .filter((s) => s.length > 0)
    .slice(0, 12);
}

export async function composeServiceLocationLocale(
  prisma: PrismaClient,
  args: { serviceLocationId: string; locale: "en" | "ar" },
): Promise<ComposedLocaleResult> {
  const row = await prisma.serviceLocation.findUniqueOrThrow({
    where: { id: args.serviceLocationId },
    include: {
      translations: true,
      service: {
        include: {
          translations: true,
          category: { include: { translations: true } },
          primaryDiyGuide: { include: { translations: true } },
          diyGuides: { include: { translations: true } },
        },
      },
      location: {
        include: {
          translations: true,
          parent: { include: { translations: true } },
        },
      },
    },
  });

  const locale = args.locale;
  const serviceT =
    locale === "ar"
      ? row.service.translations.find((t) => t.locale === "ar")
      : row.service.translations.find((t) => t.locale === "en") || pickI18n(row.service.translations, locale);
  const locationT =
    locale === "ar"
      ? row.location.translations.find((t) => t.locale === "ar")
      : row.location.translations.find((t) => t.locale === "en") || pickI18n(row.location.translations, locale);
  if (locale === "ar" && (!serviceT || !locationT)) {
    throw new Error("arabic_translation_missing_no_english_fallback");
  }
  const serviceName = serviceT?.name || row.service.slug;
  const locationName = locationT?.name || row.location.slug;
  const parentName = row.location.parent
    ? (locale === "ar"
        ? row.location.parent.translations.find((t) => t.locale === "ar")?.name
        : pickI18n(row.location.parent.translations, locale)?.name) || null
    : null;

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

  const chain = locationChain(row.location, locale);
  const isLegacy = (UNMAPPED_LEGACY_DRAFT_SLUGS as readonly string[]).includes(row.service.slug);
  const long = buildLongFormSections({
    locale,
    serviceName,
    serviceSlug: row.service.slug,
    locationName,
    locationType: row.location.type,
    parentName: parentName || undefined,
    emirate: chain.find((c) => c.type === "emirate")?.name,
    city: chain.find((c) => c.type === "city")?.name,
    community: chain.find((c) => c.type === "community")?.name,
    shortDescription: serviceT?.shortDescription || "",
    longDescription: serviceT?.longDescription || "",
    whoItIsFor: serviceT?.whoItIsFor || "",
    whatWeDo: serviceT?.whatWeDo || "",
    whenProfessional: serviceT?.whenProfessional || "",
    process: serviceT?.process || "",
    safetyNotes: serviceT?.safetyNotes || "",
    professionalFallback: serviceT?.professionalFallback || "",
    diySafety: diy.safetyClass,
    diyVisible: diy.visible,
    covered: row.covered,
    ops,
    isLegacyOutsideMatrix: isLegacy,
  });

  const geo = buildGeoContent({
    chain,
    covered: row.covered,
    serviceName,
    locationName,
    locale,
    localInfo: long.localInfo,
  });

  const aeo = buildAeoContent({
    locale,
    serviceName,
    locationName,
    serviceShort: serviceT?.shortDescription || "",
    whenProfessional: serviceT?.whenProfessional || "",
    diySafety: diy.safetyClass,
    diyQuickAnswer: long.faqs[1]?.answer,
    diyVisible: diy.visible,
    ops,
    covered: row.covered,
  });

  const faqs = long.faqs;

  const diyBlocks = buildDiyContentBlocks({
    safetyState: diy.safetyClass,
    guideSlug: diy.guideSlug,
    professionalFallback: long.expert,
    safetyNotes: long.diyDont,
    safeSelfChecks: long.diyChecks,
    steps: diy.safetyClass === "RED" || diy.safetyClass === "REVIEW_REQUIRED" ? [] : long.diySteps,
    whatNotToDo: long.diyDont,
  });

  const expert = buildExpertCta({
    helpSummary: long.expert,
    ops,
  });

  const main = buildMainContent({
    serviceExplanation: long.serviceExplanation,
    problems: long.problems,
    symptomsUseCases: long.symptoms,
    process: long.process,
    propertyTypes: toBulletLines(serviceT?.whoItIsFor),
    professionalRecommendation: long.whenPro.join("\n"),
  });

  const contentJson = assembleContentJson({ main, aeo, geo, diy: diyBlocks, faq: faqs, expert });

  const titleResult = buildServiceLocationTitle({
    serviceName,
    locationName,
    parentName,
    locale,
    serviceId: row.serviceId,
    locationId: row.locationId,
  });
  const title = typeof titleResult === "string" ? titleResult : titleResult.title;

  const image = resolveImageInheritance({
    heroImageOverride: row.heroImageOverride,
    serviceHeroImage: row.service.heroImage,
    imageAlt: undefined,
    serviceName,
    locationName,
    locale,
  });

  const copy: WorkingCopy = {
    locale,
    intro: long.intro,
    localInfo: long.localInfo,
    seoTitle: title,
    metaDescription:
      locale === "ar"
        ? `${serviceName} في ${locationName}. اطلب تقييمًا من النجاح الدائم · Fixpoint.`
        : `${serviceName} in ${locationName}. Request assessment from Al Najah Al Daem · Fixpoint.`,
    faq: JSON.stringify(faqs.map((f) => ({ q: f.question, a: f.answer }))),
    h1: locale === "ar" ? `${serviceName} في ${locationName}` : `${serviceName} in ${locationName}`,
    body: long.body,
    directAnswer: aeo.directAnswer,
    geoIntro: geo.coverageStatement,
    imageAlt: image.alt,
    contentJson,
  };

  const contentHash = createHash("sha256").update(JSON.stringify({ v: 2, locale, copy })).digest("hex");
  const qualityHints: string[] = [`longform_est_words:${long.estimatedWords}`];
  if (row.covered) qualityHints.push("covered");
  else qualityHints.push("uncovered_noindex");
  if (isLegacy) qualityHints.push("legacy_outside_matrix");
  if (diy.safetyClass === "RED" || diy.safetyClass === "REVIEW_REQUIRED") qualityHints.push("diy_safety_conservative");
  if (locale === "ar") qualityHints.push("arabic_msa_draft");

  return { copy, contentHash, qualityHints };
}

/** Persist draft working copy into i18n + draft revision. Never publishes. Never touches published pairs. */
export async function saveServiceLocationDraftContent(
  prisma: PrismaClient,
  args: {
    serviceLocationId: string;
    locale: "en" | "ar";
    copy: WorkingCopy;
    contentHash: string;
    batchKey: string;
  },
) {
  const row = await prisma.serviceLocation.findUniqueOrThrow({
    where: { id: args.serviceLocationId },
    select: { coverageStatus: true, covered: true, indexable: true },
  });
  if (row.coverageStatus === "published") {
    throw new Error("refusing_to_mutate_published_service_location");
  }

  await prisma.serviceLocationI18n.upsert({
    where: {
      serviceLocationId_locale: { serviceLocationId: args.serviceLocationId, locale: args.locale },
    },
    create: {
      serviceLocationId: args.serviceLocationId,
      locale: args.locale,
      intro: args.copy.intro,
      localInfo: args.copy.localInfo,
      seoTitle: args.copy.seoTitle,
      metaDescription: args.copy.metaDescription,
      faq: args.copy.faq,
      h1: args.copy.h1 ?? "",
      body: args.copy.body ?? "",
      directAnswer: args.copy.directAnswer ?? "",
      geoIntro: args.copy.geoIntro ?? "",
      imageAlt: args.copy.imageAlt ?? "",
    },
    update: {
      intro: args.copy.intro,
      localInfo: args.copy.localInfo,
      seoTitle: args.copy.seoTitle,
      metaDescription: args.copy.metaDescription,
      faq: args.copy.faq,
      h1: args.copy.h1 ?? "",
      body: args.copy.body ?? "",
      directAnswer: args.copy.directAnswer ?? "",
      geoIntro: args.copy.geoIntro ?? "",
      imageAlt: args.copy.imageAlt ?? "",
    },
  });

  const current = await prisma.serviceLocationRevision.findFirst({
    where: { serviceLocationId: args.serviceLocationId, locale: args.locale },
    orderBy: { revisionNumber: "desc" },
  });

  // Do not supersede published revisions; only append draft when latest is not published.
  if (current?.status === "published") {
    return { skipped: "published_revision_present" as const };
  }

  const { workingCopySnapshot } = await import("@/lib/service-location/revisions");
  await prisma.serviceLocationRevision.create({
    data: {
      serviceLocationId: args.serviceLocationId,
      locale: args.locale,
      revisionNumber: (current?.revisionNumber ?? 0) + 1,
      snapshotJson: workingCopySnapshot(args.copy),
      generatedBy: `content-gen:${args.batchKey}`,
      changeReason: `draft_generation:${args.contentHash.slice(0, 12)}`,
      previousRevisionId: current?.id ?? null,
      status: "draft",
    },
  });

  // Keep lifecycle draft / non-indexable — quality may move to ready_for_review later.
  await prisma.serviceLocation.update({
    where: { id: args.serviceLocationId },
    data: {
      qualityStatus: "ready_for_review",
      // never flip covered/indexable here
    },
  });

  return { skipped: null };
}
