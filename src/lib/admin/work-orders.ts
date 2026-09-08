import { prisma } from "@/server/db";
import { adminAudit, nextWorkOrderNumber } from "@/lib/admin/numbers";
import { emitDomainEventSafe } from "@/lib/automation/emit";

type WorkOrderSnapshot = { status: string; technicianId?: string | null };

export async function emitWorkOrderEvents(id: string, next: WorkOrderSnapshot, previous: WorkOrderSnapshot | null) {
  const assignedNow = Boolean(next.technicianId) || next.status === "assigned";
  const assignedBefore = Boolean(previous?.technicianId) || previous?.status === "assigned";
  const technicianChanged = Boolean(next.technicianId) && next.technicianId !== previous?.technicianId;
  if (assignedNow && (!previous || !assignedBefore || technicianChanged)) {
    await emitDomainEventSafe({
      trigger: "WORK_ORDER_ASSIGNED",
      subjectId: id,
      occurrenceKey: `assigned:${next.technicianId || "status"}`,
      payload: { status: next.status },
    });
  }
  if (next.status === "in_progress" && previous?.status !== "in_progress") {
    await emitDomainEventSafe({
      trigger: "WORK_ORDER_STARTED",
      subjectId: id,
      occurrenceKey: "started",
      payload: { status: next.status },
    });
  }
  if (next.status === "completed" && previous?.status !== "completed") {
    await emitDomainEventSafe({
      trigger: "WORK_ORDER_COMPLETED",
      subjectId: id,
      occurrenceKey: "completed",
      payload: { status: next.status },
    });
  }
}

export async function createWorkOrderFromBooking(bookingId: string, actorEmail: string) {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { service: { include: { translations: true } }, location: { include: { translations: true } } },
  });
  if (!booking) return null;
  const existing = await prisma.workOrder.findFirst({ where: { bookingId } });
  if (existing) return existing;
  const number = await nextWorkOrderNumber();
  const row = await prisma.workOrder.create({
    data: {
      number,
      customerId: booking.customerId,
      serviceId: booking.serviceId,
      locationId: booking.locationId,
      bookingId: booking.id,
      locationLabel: booking.location?.translations.find((t) => t.locale === "en")?.name || booking.city || "",
      propertyLabel: booking.propertyType || "",
      serviceLabel: booking.service?.translations.find((t) => t.locale === "en")?.name || "",
      scope: booking.requirement,
      technicianId: booking.technicianId,
      supervisorId: booking.supervisorId,
      scheduledDate: booking.confirmedDate || booking.preferredDate,
      scheduledTime: booking.confirmedTime || booking.preferredTime,
      status: booking.technicianId ? "assigned" : "created",
    },
  });
  await adminAudit({ actor: actorEmail, action: "work_order.create", entity: "WorkOrder", entityId: row.id, meta: { bookingId } });
  await emitWorkOrderEvents(row.id, { status: row.status, technicianId: row.technicianId }, null);
  return row;
}

export async function persistWorkOrderUpdate(
  id: string,
  data: {
    status?: string;
    notes?: string;
    qcResult?: string;
    customerSignOff?: boolean;
    technicianId?: string | null;
    supervisorId?: string | null;
    scheduledDate?: string | null;
    scheduledTime?: string | null;
    scope?: string;
  },
  actorEmail: string,
) {
  const existing = await prisma.workOrder.findUnique({ where: { id } });
  if (!existing) return null;
  const row = await prisma.workOrder.update({ where: { id }, data });
  await adminAudit({ actor: actorEmail, action: "work_order.update", entity: "WorkOrder", entityId: id });
  await emitWorkOrderEvents(
    row.id,
    { status: row.status, technicianId: row.technicianId },
    { status: existing.status, technicianId: existing.technicianId },
  );
  return row;
}
