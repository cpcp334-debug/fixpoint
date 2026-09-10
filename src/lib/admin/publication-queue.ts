/**
 * Admin publication queue buckets (counts + sample rows).
 */
import type { Prisma } from "@prisma/client";
import { prisma } from "@/server/db";
import type { PublicationQueueBucket } from "@/lib/service-location/publication-eligibility";
import { loadEligibilityForId } from "@/lib/service-location/publication-ops";

export type QueueFilter = {
  bucket?: PublicationQueueBucket | string;
  service?: string;
  take?: number;
};

export async function publicationQueueCounts() {
  const [
    ready,
    review,
    coverageMissing,
    qualityFailed,
    published,
    enMissing,
  ] = await Promise.all([
    prisma.serviceLocation.count({
      where: { covered: true, qualityStatus: "publishable", coverageStatus: { not: "published" } },
    }),
    prisma.serviceLocation.count({ where: { qualityStatus: "ready_for_review" } }),
    prisma.serviceLocation.count({
      where: { covered: false, coverageStatus: { not: "published" } },
    }),
    prisma.serviceLocation.count({ where: { qualityStatus: "failed_quality" } }),
    prisma.serviceLocation.count({ where: { coverageStatus: "published" } }),
    prisma.serviceLocation.count({
      where: {
        coverageStatus: { not: "published" },
        translations: { none: { locale: "en", h1: { not: "" }, intro: { not: "" } } },
      },
    }),
  ]);

  return {
    READY_FOR_PUBLISH: ready,
    REVIEW_REQUIRED: review,
    COVERAGE_MISSING: coverageMissing,
    QUALITY_FAILED: qualityFailed,
    ALREADY_PUBLISHED: published,
    EN_MISSING: enMissing,
  } as Record<string, number>;
}

export async function listPublicationQueue(filters: QueueFilter = {}) {
  const take = Math.min(Math.max(filters.take ?? 50, 1), 100);
  const where: Prisma.ServiceLocationWhereInput = {
    coverageStatus: { not: "published" },
  };
  if (filters.service) where.service = { slug: filters.service };

  const bucket = filters.bucket || "READY_FOR_PUBLISH";
  if (bucket === "READY_FOR_PUBLISH") {
    where.covered = true;
    where.qualityStatus = "publishable";
  } else if (bucket === "REVIEW_REQUIRED") {
    where.qualityStatus = "ready_for_review";
  } else if (bucket === "COVERAGE_MISSING") {
    where.covered = false;
  } else if (bucket === "QUALITY_FAILED") {
    where.qualityStatus = "failed_quality";
  } else if (bucket === "ALREADY_PUBLISHED") {
    where.coverageStatus = "published";
  }

  const rows = await prisma.serviceLocation.findMany({
    where,
    include: {
      service: { include: { translations: true, category: { include: { translations: true } } } },
      location: { include: { translations: true, parent: true } },
      translations: true,
    },
    orderBy: [{ updatedAt: "desc" }],
    take,
  });

  const out = [];
  for (const row of rows) {
    const { eligibility } = await loadEligibilityForId(prisma, row.id);
    out.push({
      id: row.id,
      serviceSlug: row.service.slug,
      categorySlug: row.service.category.slug,
      locationSlug: row.location.slug,
      covered: row.covered,
      lifecycle: row.coverageStatus,
      qualityStatus: row.qualityStatus,
      bucket: eligibility.primaryBucket,
      eligibleEn: eligibility.eligibleEn,
      eligibleAr: eligibility.eligibleAr,
      blockReasons: eligibility.blockReasons,
    });
  }
  return out;
}
