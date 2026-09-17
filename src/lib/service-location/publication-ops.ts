/**
 * Safe lifecycle promotion + controlled publish.
 * Never mutates already-published rows' content/URLs.
 * Never bulk-publishes.
 */
import type { PrismaClient, ServiceLocationLifecycle } from "@prisma/client";
import { adminAudit } from "@/lib/admin/numbers";
import { arabicConfidenceForSlug } from "./arabic";
import { coverageLifecycleAllowed } from "./coverage";
import { resolveDiyInheritance } from "./diy";
import { evaluatePublicationEligibility } from "./publication-eligibility";
import { publishRevision } from "./revisions";
import { estimateWorkingCopyWords } from "./rendered-words";
import type { WorkingCopy } from "./types";

const OBJECT_STORAGE_CONFIGURED = Boolean(
  process.env.OBJECT_STORAGE_BUCKET &&
    process.env.OBJECT_STORAGE_ACCESS_KEY_ID &&
    process.env.OBJECT_STORAGE_SECRET_ACCESS_KEY &&
    process.env.STORAGE_PROVIDER === "s3",
);

function workingFromI18n(
  t:
    | {
        locale: string;
        intro: string;
        localInfo: string;
        seoTitle: string;
        metaDescription: string;
        faq: string;
        h1: string;
        body: string;
        directAnswer: string;
        geoIntro: string;
        imageAlt: string;
      }
    | undefined,
  locale: string,
): WorkingCopy | null {
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

export async function loadEligibilityForId(prisma: PrismaClient, id: string) {
  const row = await prisma.serviceLocation.findUniqueOrThrow({
    where: { id },
    include: {
      translations: true,
      service: {
        include: {
          translations: true,
          primaryDiyGuide: true,
          diyGuides: true,
        },
      },
      location: { include: { translations: true } },
    },
  });

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

  const en = workingFromI18n(
    row.translations.find((t) => t.locale === "en"),
    "en",
  );
  const ar = workingFromI18n(
    row.translations.find((t) => t.locale === "ar"),
    "ar",
  );

  const eligibility = evaluatePublicationEligibility({
    serviceValid: Boolean(row.service),
    locationValid: Boolean(row.location),
    serviceActive: row.service.status === "active",
    locationActive: row.location.status === "active",
    locationServes: row.location.serves,
    covered: row.covered,
    coverageStatus: row.coverageStatus,
    qualityStatus: row.qualityStatus,
    qualityScore: row.qualityScore,
    indexable: row.indexable,
    indexableEn: row.indexableEn,
    indexableAr: row.indexableAr,
    diySafetyClass: diy.safetyClass,
    diySafetyOk: diy.safetyClass !== "REVIEW_REQUIRED" || Boolean(guide),
    arabicConfidence: arabicConfidenceForSlug(row.location.slug),
    en,
    ar,
    heroImageOverride: row.heroImageOverride,
    serviceHeroImage: row.service.heroImage,
    objectStorageConfigured: OBJECT_STORAGE_CONFIGURED,
    allowApprovedImageFallback: true,
    enRenderedWords: estimateWorkingCopyWords(en, "en"),
    arRenderedWords: estimateWorkingCopyWords(ar, "ar"),
  });

  return { row, diy, eligibility };
}

export async function promoteLifecycleStep(
  prisma: PrismaClient,
  args: {
    serviceLocationId: string;
    to: ServiceLocationLifecycle;
    actor: string;
    reason: string;
  },
) {
  const { row, eligibility } = await loadEligibilityForId(prisma, args.serviceLocationId);
  if (row.coverageStatus === "published") {
    throw new Error("refusing_to_mutate_published_lifecycle");
  }
  if (!coverageLifecycleAllowed(row.coverageStatus, args.to)) {
    throw new Error(`invalid_lifecycle_transition:${row.coverageStatus}->${args.to}`);
  }
  if (args.to === "approved" || args.to === "review") {
    if (!row.covered) throw new Error("coverage_required_before_promotion");
    if (!eligibility.checks.enOk) throw new Error("en_content_required");
  }
  if (args.to === "published") {
    throw new Error("use_publishServiceLocation_for_publish");
  }

  const updated = await prisma.serviceLocation.update({
    where: { id: row.id },
    data: {
      coverageStatus: args.to,
      ...(args.to === "approved"
        ? { approvedAt: new Date(), approvedBy: args.actor }
        : {}),
    },
  });

  await adminAudit({
    actor: args.actor,
    action: "service_location.lifecycle.promote",
    entity: "ServiceLocation",
    entityId: row.id,
    meta: {
      reason: args.reason,
      previous: row.coverageStatus,
      next: args.to,
      eligibility: eligibility.primaryBucket,
      qualityStatus: row.qualityStatus,
    },
  });

  return updated;
}

/**
 * Publish a single eligible ServiceLocation (EN required; AR if eligible).
 * Requires confirmToken. Does not touch other published rows.
 */
export async function publishServiceLocation(
  prisma: PrismaClient,
  args: {
    serviceLocationId: string;
    actor: string;
    reason: string;
    confirmToken: string;
    publishAr?: boolean;
  },
) {
  if (args.confirmToken !== "CONFIRM_PUBLISH") {
    throw new Error("confirmation_required");
  }

  const { row, eligibility } = await loadEligibilityForId(prisma, args.serviceLocationId);
  if (row.coverageStatus === "published") {
    throw new Error("already_published_protected");
  }
  if (!eligibility.eligibleEn) {
    throw new Error(`not_eligible:${eligibility.primaryBucket}`);
  }
  if (row.coverageStatus !== "approved") {
    throw new Error("must_be_approved_before_publish");
  }

  const en = workingFromI18n(
    row.translations.find((t) => t.locale === "en"),
    "en",
  );
  const ar = workingFromI18n(
    row.translations.find((t) => t.locale === "ar"),
    "ar",
  );
  if (!en) throw new Error("en_working_copy_missing");

  const enRev = await publishRevision(prisma, {
    serviceLocationId: row.id,
    locale: "en",
    copy: en,
    approvedBy: args.actor,
    changeReason: args.reason,
    generatedBy: "admin-publication",
  });

  let arRevId: string | null = null;
  const publishAr = Boolean(args.publishAr && eligibility.eligibleAr && ar);
  if (publishAr && ar) {
    const arRev = await publishRevision(prisma, {
      serviceLocationId: row.id,
      locale: "ar",
      copy: ar,
      approvedBy: args.actor,
      changeReason: args.reason,
      generatedBy: "admin-publication",
    });
    arRevId = arRev.id;
  }

  const updated = await prisma.serviceLocation.update({
    where: { id: row.id },
    data: {
      coverageStatus: "published",
      covered: true,
      indexable: true,
      indexableEn: true,
      indexableAr: publishAr,
      publishedAt: new Date(),
      approvedAt: row.approvedAt ?? new Date(),
      approvedBy: row.approvedBy ?? args.actor,
      qualityStatus: "indexable",
    },
  });

  await adminAudit({
    actor: args.actor,
    action: "service_location.publish",
    entity: "ServiceLocation",
    entityId: row.id,
    meta: {
      reason: args.reason,
      previousLifecycle: row.coverageStatus,
      enRevisionId: enRev.id,
      arRevisionId: arRevId,
      indexableEn: true,
      indexableAr: publishAr,
      qualitySnapshot: {
        qualityStatus: row.qualityStatus,
        qualityScore: row.qualityScore,
        bucket: eligibility.primaryBucket,
        checks: eligibility.checks,
      },
      serviceSlug: row.service.slug,
      locationSlug: row.location.slug,
      path: `/${row.service.slug}/${row.location.slug}`,
    },
  });

  return updated;
}

/** Build a diverse pilot candidate list (max 50). Does NOT publish. */
export async function buildPilotCandidateQueue(prisma: PrismaClient, limit = 50) {
  const coveredPublishable = await prisma.serviceLocation.findMany({
    where: {
      covered: true,
      coverageStatus: { not: "published" },
      qualityStatus: { in: ["publishable", "approved"] },
    },
    include: {
      service: { include: { category: true, translations: true } },
      location: { include: { translations: true, parent: true } },
    },
    take: 500,
    orderBy: [{ updatedAt: "desc" }],
  });

  const picked: typeof coveredPublishable = [];
  const seenCat = new Set<string>();
  const seenEmirate = new Set<string>();
  const seenService = new Set<string>();

  for (const row of coveredPublishable) {
    if (picked.length >= limit) break;
    const cat = row.service.category.slug;
    const emirate =
      row.location.type === "emirate"
        ? row.location.slug
        : row.location.parent?.type === "emirate"
          ? row.location.parent.slug
          : row.location.slug;
    // Prefer diversity first
    const diverse =
      !seenCat.has(cat) || !seenEmirate.has(emirate) || !seenService.has(row.service.slug);
    if (diverse || picked.length < Math.min(10, limit)) {
      picked.push(row);
      seenCat.add(cat);
      seenEmirate.add(emirate);
      seenService.add(row.service.slug);
    }
  }

  // Fill remaining if diversity exhausted
  for (const row of coveredPublishable) {
    if (picked.length >= limit) break;
    if (!picked.some((p) => p.id === row.id)) picked.push(row);
  }

  return picked.map((row) => ({
    id: row.id,
    serviceSlug: row.service.slug,
    categorySlug: row.service.category.slug,
    locationSlug: row.location.slug,
    locationType: row.location.type,
    covered: row.covered,
    lifecycle: row.coverageStatus,
    qualityStatus: row.qualityStatus,
  }));
}
