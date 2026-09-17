import { z } from "zod";
import { prisma } from "@/server/db";
import { rateLimit } from "@/server/rate-limit";
import { maxUploadBytes, resolvePrivatePath } from "@/lib/ai/uploads";
import { pickI18n } from "@/lib/utils";
import { stampVisitor, trackServer } from "@/lib/analytics/server";
import { emitDomainEventSafe } from "@/lib/automation/emit";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

export const publicReviewSchema = z.object({
  type: z.enum(["service", "guide"]).default("service"),
  stars: z.number().int().min(1).max(5),
  title: z.string().trim().max(120).optional(),
  body: z.string().trim().min(8).max(4000),
  authorName: z.string().trim().min(2).max(80),
  serviceSlug: z.string().trim().max(80).optional(),
  locationSlug: z.string().trim().max(80).optional(),
  area: z.string().trim().min(2).max(120).optional(),
  guideSlug: z.string().trim().max(120).optional(),
  locale: z.enum(["en", "ar"]).optional(),
  website: z.string().optional(),
});

export type PublicReviewInput = z.infer<typeof publicReviewSchema>;

async function emitReviewEvents(review: { id: string; stars: number }) {
  await emitDomainEventSafe({
    trigger: "REVIEW_RECEIVED",
    subjectId: review.id,
    occurrenceKey: "received",
    payload: { stars: review.stars },
  });
  if (review.stars <= 2) {
    await emitDomainEventSafe({
      trigger: "LOW_RATING_REVIEW",
      subjectId: review.id,
      occurrenceKey: "low",
      payload: { stars: review.stars },
    });
  }
}

const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp"]);

function sniffMime(buf: Buffer): string | null {
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  if (buf.length >= 8 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return "image/png";
  if (buf.length >= 12 && buf.toString("ascii", 0, 4) === "RIFF" && buf.toString("ascii", 8, 12) === "WEBP") {
    return "image/webp";
  }
  return null;
}

export async function createPublicReview(input: PublicReviewInput, ip: string, file?: File) {
  if (input.website) return { ok: true as const, ignored: true };
  const parsed = publicReviewSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "invalid" as const };

  const limited = await rateLimit(`review:${ip}`, 3, 60 * 60 * 1000);
  if (!limited.ok) return { ok: false as const, error: "rateLimit" as const };

  const data = parsed.data;
  if (data.type === "guide") {
    if (!data.guideSlug) return { ok: false as const, error: "invalid" as const };
    const guide = await prisma.diyGuide.findFirst({
      where: { slug: data.guideSlug, status: "published", indexable: true },
    });
    if (!guide) return { ok: false as const, error: "invalid" as const };
    const dup = await prisma.review.findFirst({
      where: {
        type: "guide",
        guideId: guide.id,
        authorName: data.authorName,
        body: data.body,
        createdAt: { gt: new Date(Date.now() - 2 * 60 * 1000) },
      },
    });
    if (dup) return { ok: true as const, duplicate: true, id: dup.id };
    const review = await prisma.review.create({
      data: {
        type: "guide",
        status: "PENDING",
        stars: data.stars,
        title: data.title || "",
        body: data.body,
        authorName: data.authorName,
        guideId: guide.id,
        verified: false,
        locale: data.locale || "en",
      },
    });
    try {
      await stampVisitor({ reviewId: review.id });
      await trackServer("REVIEW_SUBMIT", { locale: data.locale, entityType: "diy", entityId: data.guideSlug });
    } catch {
      // Analytics must never fail a review write.
    }
    await emitReviewEvents(review);
    return { ok: true as const, id: review.id };
  }

  const service = data.serviceSlug
    ? await prisma.service.findFirst({ where: { slug: data.serviceSlug, status: "active", indexable: true } })
    : null;
  const location = data.locationSlug
    ? await prisma.location.findFirst({
        where: { slug: data.locationSlug, status: "active", indexable: true, serves: true },
      })
    : null;
  const dup = await prisma.review.findFirst({
    where: {
      type: "service",
      authorName: data.authorName,
      body: data.body,
      createdAt: { gt: new Date(Date.now() - 2 * 60 * 1000) },
    },
  });
  if (dup) return { ok: true as const, duplicate: true, id: dup.id };

  let photoKey: string | undefined;
  if (file) {
    const stored = await storeReviewPhoto(file);
    if (!stored.ok) return stored;
    photoKey = stored.storageKey;
  }

  const review = await prisma.review.create({
    data: {
      type: "service",
      status: "PENDING",
      stars: data.stars,
      title: data.title || "",
      body: data.body,
      authorName: data.authorName,
      serviceId: service?.id,
      locationId: location?.id,
      area: data.area,
      locale: data.locale || "en",
      verified: false,
      photoKey,
    },
  });
  try {
    await stampVisitor({ reviewId: review.id });
    await trackServer("REVIEW_SUBMIT", { locale: data.locale, entityType: "service", entityId: data.serviceSlug });
    if (photoKey) await trackServer("PHOTO_UPLOAD", { meta: { count: 1 } });
  } catch {
    // Analytics must never fail a review write.
  }
  await emitReviewEvents(review);
  return { ok: true as const, id: review.id };
}

async function storeReviewPhoto(file: File) {
  const max = maxUploadBytes();
  if (file.size <= 0 || file.size > max) return { ok: false as const, error: "size" as const };
  const buf = Buffer.from(await file.arrayBuffer());
  const sniffed = sniffMime(buf);
  if (!sniffed || !ALLOWED_MIME.has(sniffed) || (file.type && !ALLOWED_MIME.has(file.type))) {
    return { ok: false as const, error: "type" as const };
  }
  const ext = sniffed === "image/png" ? "png" : sniffed === "image/webp" ? "webp" : "jpg";
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  const rel = path.posix.join("uploads/private/reviews", `${id}.${ext}`);
  const abs = resolvePrivatePath(rel);
  if (!abs) return { ok: false as const, error: "invalid" as const };
  await mkdir(path.dirname(abs), { recursive: true });
  await writeFile(/* turbopackIgnore: true */ abs, buf);
  return { ok: true as const, storageKey: rel };
}

export async function getApprovedServiceReviews(opts: {
  serviceId?: string;
  locationId?: string;
  minStars?: number;
  verifiedOnly?: boolean;
  take?: number;
}) {
  return prisma.review.findMany({
    where: {
      type: "service",
      status: "APPROVED",
      verified: opts.verifiedOnly ? true : undefined,
      serviceId: opts.serviceId,
      locationId: opts.locationId,
      stars: opts.minStars ? { gte: opts.minStars } : undefined,
    },
    include: {
      service: { include: { translations: true } },
      location: { include: { translations: true } },
      workOrder: { select: { status: true } },
    },
    orderBy: { createdAt: "desc" },
    take: opts.take ?? 50,
  });
}

export async function summarizeApprovedServiceReviews(opts: { serviceId?: string; locationId?: string }) {
  try {
    const where = {
      type: "service" as const,
      status: "APPROVED" as const,
      serviceId: opts.serviceId,
      locationId: opts.locationId,
    };
    const [count, agg] = await Promise.all([
      prisma.review.count({ where }),
      prisma.review.aggregate({ where, _avg: { stars: true } }),
    ]);
    return { count, average: count ? agg._avg.stars : null };
  } catch {
    // Missing tables during Hostinger first deploy / empty MySQL
    return { count: 0, average: null };
  }
}

export function canShowVerifiedBadge(review: {
  type: string;
  verified: boolean;
  workOrderId: string | null;
  workOrder?: { status: string } | null;
}) {
  if (review.type !== "service" || review.verified !== true || !review.workOrderId) return false;
  if (review.workOrder && review.workOrder.status !== "completed") return false;
  return true;
}

export async function voteReviewHelpful(reviewId: string, helpful: boolean, ip: string) {
  const limited = await rateLimit(`review-vote:${ip}:${reviewId}`, 5, 60 * 60 * 1000);
  if (!limited.ok) return { ok: false as const, error: "rateLimit" as const };
  const review = await prisma.review.findFirst({
    where: { id: reviewId, type: "service", status: "APPROVED" },
  });
  if (!review) return { ok: false as const, error: "invalid" as const };
  await prisma.reviewVote.create({ data: { reviewId, helpful } });
  return { ok: true as const };
}

export async function reportContent(entity: "review" | "question", entityId: string, reason: string, ip: string) {
  const limited = await rateLimit(`report:${ip}`, 8, 60 * 60 * 1000);
  if (!limited.ok) return { ok: false as const, error: "rateLimit" as const };
  await prisma.contentReport.create({
    data: { entity, entityId, reason: reason.slice(0, 400) },
  });
  if (entity === "review") {
    const row = await prisma.review.findUnique({ where: { id: entityId } });
    if (!row) return { ok: false as const, error: "invalid" as const };
    const flagCount = row.flagCount + 1;
    await prisma.review.update({
      where: { id: entityId },
      data: {
        flagCount,
        status: row.status === "PENDING" ? "FLAGGED" : row.status,
      },
    });
  } else {
    const row = await prisma.question.findUnique({ where: { id: entityId } });
    if (!row) return { ok: false as const, error: "invalid" as const };
    const flagCount = row.flagCount + 1;
    await prisma.question.update({
      where: { id: entityId },
      data: {
        flagCount,
        moderationStatus: row.moderationStatus === "PENDING" ? "FLAGGED" : row.moderationStatus,
      },
    });
  }
  return { ok: true as const };
}

export async function getApprovedReviewPhoto(id: string) {
  const review = await prisma.review.findFirst({
    where: { id, type: "service", status: "APPROVED", photoKey: { not: null } },
  });
  if (!review?.photoKey) return null;
  const abs = resolvePrivatePath(review.photoKey);
  if (!abs) return null;
  return { abs, mime: review.photoKey.endsWith("png") ? "image/png" : review.photoKey.endsWith("webp") ? "image/webp" : "image/jpeg" };
}

export function toPublicReview(
  row: Awaited<ReturnType<typeof getApprovedServiceReviews>>[number],
  locale: string,
) {
  return {
    id: row.id,
    stars: row.stars,
    title: row.title,
    body: row.body,
    authorName: row.authorName,
    verified: row.verified,
    showVerified: canShowVerifiedBadge(row),
    adminResponse: row.adminResponse,
    photoUrl: row.photoKey ? `/api/reviews/photos/${row.id}` : null,
    serviceName: row.service ? pickI18n(row.service.translations, locale)?.name : undefined,
    locationName: row.location ? pickI18n(row.location.translations, locale)?.name : undefined,
    area: row.area,
  };
}
