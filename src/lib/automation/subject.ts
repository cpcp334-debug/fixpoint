import { prisma } from "@/server/db";
import type { AutomationSubjectType } from "@/lib/automation/types";

export type SubjectFacts = Record<string, unknown> & {
  serviceId?: string | null;
  locationId?: string | null;
  categorySlug?: string | null;
  locationSlug?: string | null;
};

export function technicianMatchesSkill(
  skills: Array<{ categorySlug: string; locationSlug: string | null }>,
  facts: { categorySlug?: string | null; locationSlug?: string | null },
) {
  if (!facts.categorySlug) return false;
  return skills.some((skill) => {
    if (skill.categorySlug !== facts.categorySlug) return false;
    if (skill.locationSlug && facts.locationSlug && skill.locationSlug !== facts.locationSlug) return false;
    if (skill.locationSlug && !facts.locationSlug) return false;
    return true;
  });
}

export async function loadSubjectFacts(subjectType: string, subjectId: string): Promise<SubjectFacts | null> {
  if (!subjectId) return null;
  if (subjectType === "Lead") {
    const row = await prisma.lead.findUnique({
      where: { id: subjectId },
      include: {
        score: { select: { effectiveClass: true } },
        service: { include: { category: { select: { slug: true } } } },
        location: { select: { slug: true } },
      },
    });
    if (!row) return null;
    return {
      qualityClass: row.score?.effectiveClass || null,
      status: row.status,
      source: row.source,
      urgency: row.urgency,
      serviceId: row.serviceId,
      locationId: row.locationId,
      assignedStaffId: row.assignedStaffId,
      categorySlug: row.service?.category.slug || null,
      locationSlug: row.location?.slug || null,
    };
  }
  if (subjectType === "Quote") {
    const row = await prisma.quote.findUnique({ where: { id: subjectId } });
    if (!row) return null;
    return {
      status: row.status,
      humanApproved: row.humanApproved,
      serviceId: row.serviceId,
      locationId: row.locationId,
    };
  }
  if (subjectType === "Booking") {
    const row = await prisma.booking.findUnique({
      where: { id: subjectId },
      include: {
        service: { include: { category: { select: { slug: true } } } },
        location: { select: { slug: true } },
      },
    });
    if (!row) return null;
    return {
      status: row.status,
      type: row.type,
      priority: row.priority,
      serviceId: row.serviceId,
      locationId: row.locationId,
      technicianId: row.technicianId,
      supervisorId: row.supervisorId,
      categorySlug: row.service?.category.slug || null,
      locationSlug: row.location?.slug || null,
    };
  }
  if (subjectType === "WorkOrder") {
    const row = await prisma.workOrder.findUnique({
      where: { id: subjectId },
      include: {
        service: { include: { category: { select: { slug: true } } } },
        location: { select: { slug: true } },
      },
    });
    if (!row) return null;
    return {
      status: row.status,
      serviceId: row.serviceId,
      locationId: row.locationId,
      technicianId: row.technicianId,
      supervisorId: row.supervisorId,
      categorySlug: row.service?.category.slug || null,
      locationSlug: row.location?.slug || null,
    };
  }
  if (subjectType === "Invoice") {
    const row = await prisma.invoice.findUnique({ where: { id: subjectId } });
    if (!row) return null;
    return { status: row.status };
  }
  if (subjectType === "Review") {
    const row = await prisma.review.findUnique({ where: { id: subjectId } });
    if (!row) return null;
    return { stars: row.stars, type: row.type, status: row.status, serviceId: row.serviceId, locationId: row.locationId };
  }
  if (subjectType === "Question") {
    const row = await prisma.question.findUnique({ where: { id: subjectId } });
    if (!row) return null;
    return { moderationStatus: row.moderationStatus, serviceId: row.serviceId, locationId: row.locationId };
  }
  if (subjectType === "AmcContract") {
    const row = await prisma.amcContract.findUnique({ where: { id: subjectId } });
    if (!row) return null;
    const end = row.endDate;
    const daysUntilEnd = end ? Math.ceil((end.getTime() - Date.now()) / (24 * 60 * 60 * 1000)) : null;
    const endDate = end
      ? new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Dubai", year: "numeric", month: "2-digit", day: "2-digit" }).format(end)
      : null;
    return {
      status: row.status,
      endDate,
      daysUntilEnd,
    };
  }
  return null;
}

export function asSubjectType(value: string): AutomationSubjectType | string {
  return value;
}
