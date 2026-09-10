/**
 * ContentGenerationJob processor — runs offline, never during public requests.
 */
import type { ContentGenerationJob, PrismaClient } from "@prisma/client";
import { prisma as defaultPrisma } from "@/server/db";
import { markFailed, markRunning, markSucceeded } from "./jobs";
import { buildCanonicalServiceEn, isPhaseA1Stub } from "./author-service-canonical";
import { buildCanonicalServiceAr } from "./author-service-arabic";
import { composeServiceLocationLocale, saveServiceLocationDraftContent } from "./author-service-location";
import { UNMAPPED_LEGACY_DRAFT_SLUGS } from "../../../prisma/data/catalog-a1";
import { DIY_SAFETY_A411_UNRESOLVED_MISSING_HUBS } from "../../../prisma/data/diy-safety-alignment-a411";

function db(client?: PrismaClient) {
  return client ?? defaultPrisma;
}

async function processServiceCanonical(job: ContentGenerationJob, client?: PrismaClient) {
  if (!job.serviceId) throw new Error("serviceId_required");
  const service = await db(client).service.findUniqueOrThrow({
    where: { id: job.serviceId },
    include: { translations: true, category: { include: { translations: true } } },
  });
  if ((DIY_SAFETY_A411_UNRESOLVED_MISSING_HUBS as readonly string[]).includes(service.slug)) {
    throw new Error("category_only_hub");
  }

  const enExisting = service.translations.find((t) => t.locale === "en");
  const catEn = service.category.translations.find((t) => t.locale === "en")?.name || service.category.slug;
  const input = {
    slug: service.slug,
    nameEn: enExisting?.name || service.slug,
    categorySlug: service.category.slug,
    categoryNameEn: catEn,
    riskLevel: service.riskLevel as "green" | "yellow" | "red",
    diyAvailable: service.diyAvailable,
    bookingEnabled: service.bookingEnabled,
    amcAvailable: service.amcAvailable,
    emergencyAvailable: service.emergencyAvailable,
    inspectionRequired: service.inspectionRequired,
  };

  if (job.locale === "ar") {
    const arExisting = service.translations.find((t) => t.locale === "ar");
    const built = buildCanonicalServiceAr(
      input,
      arExisting?.name && arExisting.name !== "REVIEW_REQUIRED" ? arExisting.name : undefined,
    );
    await db(client).serviceI18n.upsert({
      where: { serviceId_locale: { serviceId: service.id, locale: "ar" } },
      create: {
        serviceId: service.id,
        locale: "ar",
        name: built.name,
        shortDescription: built.shortDescription,
        longDescription: built.longDescription,
        whoItIsFor: built.whoItIsFor,
        whatWeDo: built.whatWeDo,
        whenProfessional: built.whenProfessional,
        process: built.process,
        pricingInfo: built.pricingInfo,
        professionalFallback: built.professionalFallback,
        safetyNotes: built.safetyNotes,
        seoTitle: built.seoTitle,
        metaDescription: built.metaDescription,
        keywords: built.keywords,
        faq: built.faq,
      },
      update: {
        name: built.name,
        shortDescription: built.shortDescription,
        longDescription: built.longDescription,
        whoItIsFor: built.whoItIsFor,
        whatWeDo: built.whatWeDo,
        whenProfessional: built.whenProfessional,
        process: built.process,
        pricingInfo: built.pricingInfo,
        professionalFallback: built.professionalFallback,
        safetyNotes: built.safetyNotes,
        seoTitle: built.seoTitle,
        metaDescription: built.metaDescription,
        keywords: built.keywords,
        faq: built.faq,
      },
    });
    return { contentHash: built.contentHash, arabicReviewStatus: built.arabicReviewStatus, reviewReasons: built.reviewReasons };
  }

  // EN default
  if (enExisting && !isPhaseA1Stub(enExisting.longDescription) && (enExisting.faq || "[]") !== "[]") {
    // Already substantive — refresh only if forced via payload
    const payload = JSON.parse(job.payloadJson || "{}") as { force?: boolean };
    if (!payload.force) {
      return { contentHash: job.contentHash || "skip_existing", skipped: true };
    }
  }
  const built = buildCanonicalServiceEn(input);
  await db(client).serviceI18n.upsert({
    where: { serviceId_locale: { serviceId: service.id, locale: "en" } },
    create: {
      serviceId: service.id,
      locale: "en",
      name: input.nameEn,
      shortDescription: built.shortDescription,
      longDescription: built.longDescription,
      whoItIsFor: built.whoItIsFor,
      whatWeDo: built.whatWeDo,
      whenProfessional: built.whenProfessional,
      process: built.process,
      pricingInfo: built.pricingInfo,
      professionalFallback: built.professionalFallback,
      safetyNotes: built.safetyNotes,
      seoTitle: built.seoTitle,
      metaDescription: built.metaDescription,
      keywords: built.keywords,
      faq: built.faq,
    },
    update: {
      shortDescription: built.shortDescription,
      longDescription: built.longDescription,
      whoItIsFor: built.whoItIsFor,
      whatWeDo: built.whatWeDo,
      whenProfessional: built.whenProfessional,
      process: built.process,
      pricingInfo: built.pricingInfo,
      professionalFallback: built.professionalFallback,
      safetyNotes: built.safetyNotes,
      seoTitle: built.seoTitle,
      metaDescription: built.metaDescription,
      keywords: built.keywords,
      faq: built.faq,
    },
  });
  return { contentHash: built.contentHash };
}

async function processServiceLocationLocale(job: ContentGenerationJob, client?: PrismaClient) {
  if (!job.serviceLocationId) throw new Error("serviceLocationId_required");
  const locale = (job.locale === "ar" ? "ar" : "en") as "en" | "ar";
  const sl = await db(client).serviceLocation.findUniqueOrThrow({
    where: { id: job.serviceLocationId },
    include: { service: { select: { slug: true } } },
  });
  if (sl.coverageStatus === "published") {
    return { skipped: "published_pair", contentHash: job.contentHash || null };
  }
  if ((UNMAPPED_LEGACY_DRAFT_SLUGS as readonly string[]).includes(sl.service.slug)) {
    // Allowed to draft-generate but mark as outside approved matrix in result
  }
  const composed = await composeServiceLocationLocale(db(client), {
    serviceLocationId: job.serviceLocationId,
    locale,
  });
  await saveServiceLocationDraftContent(db(client), {
    serviceLocationId: job.serviceLocationId,
    locale,
    copy: composed.copy,
    contentHash: composed.contentHash,
    batchKey: job.batchKey,
  });
  return { contentHash: composed.contentHash, hints: composed.qualityHints };
}

export async function processContentJob(jobId: string, client?: PrismaClient) {
  const job = await markRunning(jobId, client);
  try {
    let result: Record<string, unknown> = {};
    if (job.kind === "service_canonical" || job.kind === "arabic_locale") {
      // arabic_locale on service uses same processor with locale=ar
      result = await processServiceCanonical(
        job.kind === "arabic_locale" ? { ...job, locale: job.locale || "ar" } : job,
        client,
      );
    } else if (job.kind === "service_location_locale") {
      result = await processServiceLocationLocale(job, client);
    } else if (job.kind === "diy_profile") {
      result = { skipped: "diy_profile_handled_by_diy_authoring_scripts" };
    } else if (job.kind === "image_asset") {
      const { buildImageAssetMetadata } = await import("./image-assets");
      const service = job.serviceId
        ? await db(client).service.findUnique({
            where: { id: job.serviceId },
            include: { translations: true },
          })
        : null;
      const enName = service?.translations.find((t) => t.locale === "en")?.name || service?.slug || "service";
      const arName = service?.translations.find((t) => t.locale === "ar")?.name || enName;
      result = buildImageAssetMetadata({
        serviceSlug: service?.slug || "unknown",
        serviceNameEn: enName,
        serviceNameAr: arName,
        serviceHeroImage: service?.heroImage,
        riskLevel: service?.riskLevel || "yellow",
      }) as unknown as Record<string, unknown>;
      result.note = "No binary fabricated. Use approved_fallback until real assets + object storage exist.";
    } else if (job.kind === "sitemap_shard") {
      result = { skipped: "sitemap_is_runtime_sharded" };
    } else {
      throw new Error(`unsupported_kind:${job.kind}`);
    }
    const contentHash = typeof result.contentHash === "string" ? result.contentHash : null;
    await markSucceeded(jobId, { resultJson: JSON.stringify(result), contentHash }, client);
    return { ok: true as const, result };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await markFailed(jobId, message, client);
    return { ok: false as const, error: message };
  }
}

export async function processPendingJobs(opts: {
  take?: number;
  kind?: ContentGenerationJob["kind"];
  batchKey?: string;
  client?: PrismaClient;
}) {
  const pending = await db(opts.client).contentGenerationJob.findMany({
    where: {
      status: { in: ["pending", "failed"] },
      ...(opts.kind ? { kind: opts.kind } : {}),
      ...(opts.batchKey ? { batchKey: opts.batchKey } : {}),
    },
    orderBy: [{ priority: "desc" }, { createdAt: "asc" }],
    take: opts.take ?? 25,
  });
  const results = [];
  for (const job of pending) {
    results.push({ id: job.id, kind: job.kind, ...(await processContentJob(job.id, opts.client)) });
  }
  return results;
}
