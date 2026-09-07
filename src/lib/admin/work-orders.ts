import { prisma } from "@/server/db";
import { adminAudit, nextWorkOrderNumber } from "@/lib/admin/numbers";

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
  return row;
}
