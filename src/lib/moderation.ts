import { prisma } from "@/server/db";
import type { ReviewStatus } from "@prisma/client";

/** Admin-ready. Never expose as a public route in Phase 2C. */
export async function setReviewModeration(id: string, status: ReviewStatus) {
  const existing = await prisma.review.findUnique({ where: { id } });
  if (!existing) return { ok: false as const };
  await prisma.review.update({ where: { id }, data: { status } });
  await prisma.auditLog.create({
    data: { action: `review.${status.toLowerCase()}`, entity: "Review", entityId: id },
  });
  return { ok: true as const };
}

export async function respondToReview(id: string, response: string) {
  const existing = await prisma.review.findUnique({ where: { id } });
  if (!existing) return { ok: false as const };
  await prisma.review.update({
    where: { id },
    data: { adminResponse: response.slice(0, 4000), adminRespondedAt: new Date() },
  });
  return { ok: true as const };
}

/**
 * Verified Customer only when a completed work order is linked.
 * Does not approve the review and does not invent a work order.
 */
export async function verifyServiceReview(id: string) {
  const review = await prisma.review.findUnique({
    where: { id },
    include: { workOrder: true },
  });
  if (!review || review.type !== "service") return { ok: false as const, error: "not_service" as const };
  if (!review.workOrderId || !review.workOrder) return { ok: false as const, error: "no_work_order" as const };
  if (review.workOrder.status !== "completed") return { ok: false as const, error: "not_completed" as const };
  if (review.serviceId && review.workOrder.serviceId && review.serviceId !== review.workOrder.serviceId) {
    return { ok: false as const, error: "service_mismatch" as const };
  }
  if (review.locationId && review.workOrder.locationId && review.locationId !== review.workOrder.locationId) {
    return { ok: false as const, error: "location_mismatch" as const };
  }
  await prisma.review.update({ where: { id }, data: { verified: true } });
  await prisma.auditLog.create({
    data: { action: "review.verify", entity: "Review", entityId: id, meta: JSON.stringify({ workOrderId: review.workOrderId }) },
  });
  return { ok: true as const };
}

export async function setQuestionModeration(id: string, status: ReviewStatus, answer?: string) {
  const existing = await prisma.question.findUnique({ where: { id } });
  if (!existing) return { ok: false as const };
  const published = status === "APPROVED" && (answer ?? existing.answer).trim().length > 0;
  await prisma.question.update({
    where: { id },
    data: {
      moderationStatus: status,
      status: published ? "published" : "draft",
      ...(answer !== undefined ? { answer } : {}),
    },
  });
  await prisma.auditLog.create({
    data: { action: `question.${status.toLowerCase()}`, entity: "Question", entityId: id },
  });
  return { ok: true as const };
}
