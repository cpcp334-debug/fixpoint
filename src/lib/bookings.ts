import { z } from "zod";
import type { BookingStatus, BookingType } from "@prisma/client";
import { prisma } from "@/server/db";
import { rateLimit } from "@/server/rate-limit";
import { maxUploadBytes, resolvePrivatePath } from "@/lib/ai/uploads";
import { pickI18n, parseJson } from "@/lib/utils";
import { stampVisitor, trackServer } from "@/lib/analytics/server";
import { scoreLeadSafe } from "@/lib/quality/run";
import { emitDomainEventSafe } from "@/lib/automation/emit";
import { attributionToColumns, sanitizeAttribution } from "@/lib/attribution/shared";
import { notifyStaffAlert } from "@/lib/mail/staff-alert";
import { assertTechnicianAssignmentAllowed } from "@/lib/automation/assign";
import { loadSubjectFacts } from "@/lib/automation/subject";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

export const bookingTypeSchema = z.enum([
  "standard",
  "site_inspection",
  "emergency",
  "recurring_cleaning",
  "amc_visit",
]);

export type PublicBookingType = z.infer<typeof bookingTypeSchema>;

export const publicBookingSchema = z.object({
  type: bookingTypeSchema.default("standard"),
  name: z.string().trim().min(2).max(120),
  phone: z.string().trim().min(8).max(20),
  whatsapp: z.string().trim().min(8).max(20).optional(),
  email: z.string().trim().max(200).optional(),
  serviceSlug: z.string().trim().max(80).optional(),
  locationSlug: z.string().trim().max(80).optional(),
  city: z.string().trim().min(2).max(120).optional(),
  area: z.string().trim().min(2).max(120).optional(),
  propertyType: z.string().trim().max(40).optional(),
  requirement: z.string().trim().min(8).max(4000),
  preferredDate: z.string().trim().max(40).optional(),
  preferredTime: z.string().trim().max(40).optional(),
  frequency: z.enum(["weekly", "biweekly", "monthly"]).optional(),
  amcReference: z.string().trim().max(80).optional(),
  locale: z.enum(["en", "ar"]).optional(),
  source: z.enum(["booking", "ai"]).optional(),
  leadId: z.string().trim().max(40).optional(),
  conversationId: z.string().trim().max(40).optional(),
  photoIds: z.array(z.string().min(1).max(40)).max(5).optional(),
  website: z.string().optional(),
  attribution: z.record(z.string(), z.unknown()).optional(),
});

export type PublicBookingInput = z.infer<typeof publicBookingSchema>;

const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp"]);

const TRANSITIONS: Record<BookingStatus, BookingStatus[]> = {
  requested: ["pending_confirmation", "cancelled"],
  pending_confirmation: ["confirmed", "cancelled", "rescheduled"],
  confirmed: ["assigned", "cancelled", "rescheduled"],
  assigned: ["in_progress", "cancelled", "rescheduled"],
  in_progress: ["completed", "cancelled"],
  rescheduled: ["pending_confirmation", "cancelled"],
  completed: [],
  cancelled: [],
};

export function parseBookingTypeParam(raw?: string | null): PublicBookingType {
  switch (raw) {
    case "inspection":
    case "site_inspection":
      return "site_inspection";
    case "emergency":
      return "emergency";
    case "recurring":
    case "recurring_cleaning":
      return "recurring_cleaning";
    case "amc":
    case "amc_visit":
      return "amc_visit";
    default:
      return "standard";
  }
}

export function detectBookingIntent(text: string, collectedType?: PublicBookingType): PublicBookingType | undefined {
  if (collectedType) return collectedType;
  const t = text.toLowerCase();
  if (/\b(emergency|urgent leak|water on (the )?electrics|ØºØ§Ø²|Ø·ÙˆØ§Ø±Ø¦|ØªØ³Ø±ÙŠØ¨ Ø·Ø§Ø±Ø¦)\b/i.test(t)) return "emergency";
  if (/\b(site inspection|inspect(ion)?|Ù…Ø¹Ø§ÙŠÙ†Ø©)\b/i.test(t)) return "site_inspection";
  if (/\b(recurring|weekly clean|monthly clean|ØªÙ†Ø¸ÙŠÙ Ø¯ÙˆØ±ÙŠ)\b/i.test(t)) return "recurring_cleaning";
  if (/\b(amc|annual maintenance|Ø¹Ù‚Ø¯ ØµÙŠØ§Ù†Ø©)\b/i.test(t)) return "amc_visit";
  if (/\b(book (a )?(service|technician|visit)|schedule a visit|Ø§Ø­Ø¬Ø²|Ù…ÙˆØ¹Ø¯)\b/i.test(t)) return "standard";
  return undefined;
}

function newBookingNumber() {
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `ALN-${Date.now().toString(36).toUpperCase()}-${rand}`;
}

function sniffMime(buf: Buffer): string | null {
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  if (buf.length >= 8 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return "image/png";
  if (buf.length >= 12 && buf.toString("ascii", 0, 4) === "RIFF" && buf.toString("ascii", 8, 12) === "WEBP") {
    return "image/webp";
  }
  return null;
}

async function storeBookingPhoto(file: File) {
  const max = maxUploadBytes();
  if (file.size <= 0 || file.size > max) return { ok: false as const, error: "size" as const };
  const buf = Buffer.from(await file.arrayBuffer());
  const sniffed = sniffMime(buf);
  if (!sniffed || !ALLOWED_MIME.has(sniffed) || (file.type && !ALLOWED_MIME.has(file.type))) {
    return { ok: false as const, error: "type" as const };
  }
  const ext = sniffed === "image/png" ? "png" : sniffed === "image/webp" ? "webp" : "jpg";
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  const rel = path.posix.join("uploads/private/bookings", `${id}.${ext}`);
  const abs = resolvePrivatePath(rel);
  if (!abs) return { ok: false as const, error: "invalid" as const };
  await mkdir(path.dirname(abs), { recursive: true });
  await writeFile(/* turbopackIgnore: true */ abs, buf);
  return { ok: true as const, storageKey: rel };
}

export function serviceAllowsBookingType(
  service: { slug: string; status: string; bookingEnabled: boolean; amcAvailable: boolean },
  type: PublicBookingType,
) {
  if (service.status !== "active" || !service.bookingEnabled) return false;
  if (type === "recurring_cleaning") return service.slug === "cleaning-services";
  if (type === "amc_visit") return service.amcAvailable;
  return true;
}

async function upsertCustomer(opts: {
  name: string;
  phone: string;
  whatsapp?: string | null;
  email?: string | null;
  locale?: string;
}) {
  const existing = await prisma.customer.findFirst({ where: { phone: opts.phone } });
  if (existing) {
    return prisma.customer.update({
      where: { id: existing.id },
      data: {
        name: existing.name || opts.name,
        whatsapp: existing.whatsapp || opts.whatsapp || opts.phone,
        email: existing.email || opts.email,
      },
    });
  }
  return prisma.customer.create({
    data: {
      name: opts.name,
      phone: opts.phone,
      whatsapp: opts.whatsapp || opts.phone,
      email: opts.email,
      preferredLanguage: opts.locale || "en",
    },
  });
}

export async function createPublicBooking(input: PublicBookingInput, ip: string, files: File[] = []) {
  if (input.website) return { ok: true as const, ignored: true };
  const parsed = publicBookingSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "invalid" as const };

  const limited = await rateLimit(`booking:${ip}`, 5, 10 * 60 * 1000);
  if (!limited.ok) return { ok: false as const, error: "rateLimit" as const };

  const data = parsed.data;
  const attrCols = attributionToColumns(sanitizeAttribution(data.attribution));
  if (data.type === "recurring_cleaning" && !data.frequency) {
    return { ok: false as const, error: "invalid" as const };
  }

  const service = data.serviceSlug
    ? await prisma.service.findFirst({
        where: { slug: data.serviceSlug, status: "active", indexable: true, bookingEnabled: true },
      })
    : null;
  if (data.serviceSlug && !service) return { ok: false as const, error: "invalid" as const };
  if (service && !serviceAllowsBookingType(service, data.type)) {
    return { ok: false as const, error: "invalid" as const };
  }

  const location = data.locationSlug
    ? await prisma.location.findFirst({
        where: { slug: data.locationSlug, type: "emirate", status: "active", indexable: true, serves: true },
      })
    : null;
  if (data.locationSlug && !location) return { ok: false as const, error: "invalid" as const };

  const dup = await prisma.booking.findFirst({
    where: {
      phone: data.phone,
      type: data.type,
      requirement: data.requirement,
      createdAt: { gt: new Date(Date.now() - 2 * 60 * 1000) },
    },
  });
  if (dup) return { ok: true as const, duplicate: true, id: dup.id, number: dup.number };

  const photoKeys: string[] = [...(data.photoIds || [])];
  for (const file of files.slice(0, 5 - photoKeys.length)) {
    const stored = await storeBookingPhoto(file);
    if (!stored.ok) return stored;
    photoKeys.push(stored.storageKey);
  }

  const email = data.email && data.email.includes("@") ? data.email : null;
  const whatsapp = data.whatsapp || data.phone;
  const customer = await upsertCustomer({
    name: data.name,
    phone: data.phone,
    whatsapp,
    email,
    locale: data.locale,
  });

  let leadId = data.leadId;
  let createdNewLead = false;
  if (leadId) {
    const existingLead = await prisma.lead.findUnique({ where: { id: leadId } });
    if (!existingLead) leadId = undefined;
    else {
      await prisma.lead.update({
        where: { id: leadId },
        data: {
          whatsapp,
          city: data.city,
          area: data.area,
          preferredDate: data.preferredDate,
          preferredTime: data.preferredTime,
          serviceId: existingLead.serviceId || service?.id,
          locationId: existingLead.locationId || location?.id,
          photos: photoKeys.length ? JSON.stringify(photoKeys) : existingLead.photos,
        },
      });
    }
  }
  if (!leadId) {
    const lead = await prisma.lead.create({
      data: {
        source: data.source || "booking",
        customerId: customer.id,
        name: data.name,
        phone: data.phone,
        email,
        whatsapp,
        serviceId: service?.id,
        locationId: location?.id,
        propertyType: data.propertyType || null,
        city: data.city,
        area: data.area,
        requirement: data.requirement,
        urgency: data.type === "emergency" ? "urgent" : "normal",
        status: "NEW",
        locale: data.locale || "en",
        photos: JSON.stringify(photoKeys),
        preferredDate: data.preferredDate,
        preferredTime: data.preferredTime,
        ...attrCols,
      },
    });
    leadId = lead.id;
    createdNewLead = true;
  }

  if (data.conversationId) {
    const existing = await prisma.booking.findFirst({
      where: { conversationId: data.conversationId, status: "requested" },
    });
    if (existing) {
      const updated = await prisma.booking.update({
        where: { id: existing.id },
        data: {
          type: data.type,
          priority: data.type === "emergency" ? "emergency" : "normal",
          serviceId: service?.id || existing.serviceId,
          locationId: location?.id || existing.locationId,
          city: data.city || existing.city,
          area: data.area || existing.area,
          preferredDate: data.preferredDate || existing.preferredDate,
          preferredTime: data.preferredTime || existing.preferredTime,
          frequency: data.frequency || existing.frequency,
          amcReference: data.amcReference || existing.amcReference,
          requirement: data.requirement,
          photos: JSON.stringify(photoKeys.length ? photoKeys : parseJson<string[]>(existing.photos, [])),
        },
      });
      if (data.type === "site_inspection") {
        const inspect = await prisma.inspection.findFirst({ where: { bookingId: updated.id } });
        if (!inspect) {
          await prisma.inspection.create({
            data: {
              bookingId: updated.id,
              locationLabel: [location?.slug, data.city, data.area].filter(Boolean).join(" · "),
            },
          });
        }
      }
      if (leadId) await scoreLeadSafe(leadId, createdNewLead ? "SYSTEM" : "RECOMPUTE");
      if (createdNewLead && leadId) {
        await emitDomainEventSafe({
          trigger: "NEW_LEAD",
          subjectId: leadId,
          occurrenceKey: "new",
        });
      }
      return { ok: true as const, id: updated.id, number: updated.number };
    }
  }

  const booking = await prisma.booking.create({
    data: {
      number: newBookingNumber(),
      type: data.type,
      priority: data.type === "emergency" ? "emergency" : "normal",
      customerId: customer.id,
      leadId,
      conversationId: data.conversationId,
      serviceId: service?.id,
      locationId: location?.id,
      name: data.name,
      phone: data.phone,
      whatsapp,
      email,
      propertyType: data.propertyType || null,
      city: data.city,
      area: data.area,
      preferredDate: data.preferredDate || null,
      preferredTime: data.preferredTime || null,
      frequency: data.frequency,
      amcReference: data.amcReference,
      requirement: data.requirement,
      photos: JSON.stringify(photoKeys),
      status: "requested",
      locale: data.locale || "en",
      ...attrCols,
    },
  });

  if (data.type === "site_inspection") {
    await prisma.inspection.create({
      data: {
        bookingId: booking.id,
        locationLabel: [location?.slug, data.city, data.area].filter(Boolean).join(" · "),
      },
    });
  }

  if (data.conversationId) {
    await prisma.aiConversation.updateMany({
      where: { id: data.conversationId },
      data: { bookingId: booking.id, leadId },
    });
  }

  await prisma.auditLog.create({
    data: {
      action: "booking.request",
      entity: "Booking",
      entityId: booking.id,
      meta: JSON.stringify({ type: data.type, ip, number: booking.number }),
    },
  });

  try {
    await stampVisitor({ bookingId: booking.id, leadId, customerId: customer.id });
    await trackServer("BOOKING_SUBMIT", { locale: data.locale });
    if (files.length) await trackServer("PHOTO_UPLOAD", { meta: { count: files.length } });
  } catch {
    // Analytics must never fail a booking write.
  }

  if (leadId) await scoreLeadSafe(leadId, createdNewLead ? "SYSTEM" : "RECOMPUTE");
  if (createdNewLead && leadId) {
    await emitDomainEventSafe({
      trigger: "NEW_LEAD",
      subjectId: leadId,
      occurrenceKey: "new",
    });
  }
  await emitDomainEventSafe({
    trigger: "BOOKING_REQUESTED",
    subjectId: booking.id,
    occurrenceKey: "requested",
  });

  void notifyStaffAlert({
    kind: "booking",
    id: leadId || booking.id,
    name: data.name,
    phone: data.phone,
    email,
    serviceLabel: service?.slug || data.serviceSlug || null,
    locationLabel: location?.slug || data.locationSlug || null,
    cityArea: [data.city, data.area].filter(Boolean).join(" · ") || null,
    requirement: data.requirement,
    locale: data.locale || "en",
    bookingNumber: booking.number,
  });

  return { ok: true as const, id: booking.id, number: booking.number };
}

export async function getPublicBookingReceipt(number: string, locale: string) {
  const row = await prisma.booking.findUnique({
    where: { number },
    include: {
      service: { include: { translations: true } },
      location: { include: { translations: true } },
    },
  });
  if (!row) return null;
  return {
    number: row.number,
    type: row.type,
    serviceName: row.service ? pickI18n(row.service.translations, locale)?.name : undefined,
    emirateName: row.location ? pickI18n(row.location.translations, locale)?.name : undefined,
    city: row.city,
    area: row.area,
    preferredDate: row.preferredDate,
    preferredTime: row.preferredTime,
    status: row.status,
  };
}

/** Admin-ready. Never expose as a public route in Phase 2D. */
export async function setBookingStatus(id: string, status: BookingStatus) {
  const existing = await prisma.booking.findUnique({ where: { id } });
  if (!existing) return { ok: false as const, error: "missing" as const };
  if (!TRANSITIONS[existing.status].includes(status)) return { ok: false as const, error: "illegal" as const };
  await prisma.booking.update({ where: { id }, data: { status } });
  await prisma.auditLog.create({
    data: { action: `booking.${status}`, entity: "Booking", entityId: id },
  });
  if (status === "rescheduled") {
    await emitDomainEventSafe({
      trigger: "BOOKING_RESCHEDULED",
      subjectId: id,
      occurrenceKey: `rescheduled:${Date.now()}`,
    });
  }
  return { ok: true as const };
}

/** Human confirmation only. Does not accept preferred time as confirmed. */
export async function confirmBookingTime(id: string, confirmedDate: string, confirmedTime: string) {
  const existing = await prisma.booking.findUnique({ where: { id } });
  if (!existing) return { ok: false as const, error: "missing" as const };
  if (!["pending_confirmation", "rescheduled"].includes(existing.status)) {
    return { ok: false as const, error: "illegal" as const };
  }
  const confirmedAt = new Date();
  await prisma.booking.update({
    where: { id },
    data: {
      status: "confirmed",
      confirmedDate,
      confirmedTime,
      confirmedAt,
    },
  });
  await prisma.auditLog.create({
    data: { action: "booking.confirm", entity: "Booking", entityId: id },
  });
  await emitDomainEventSafe({
    trigger: "BOOKING_CONFIRMED",
    subjectId: id,
    occurrenceKey: confirmedAt.toISOString(),
  });
  return { ok: true as const };
}

export async function assignBookingStaff(
  id: string,
  technicianId?: string,
  supervisorId?: string,
  actorEmail?: string,
) {
  const existing = await prisma.booking.findUnique({ where: { id } });
  if (!existing) return { ok: false as const, error: "missing" as const };
  const facts = (await loadSubjectFacts("Booking", id)) || {};
  const allowed = await assertTechnicianAssignmentAllowed(technicianId, facts);
  if (!allowed.ok) return allowed;
  await prisma.booking.update({
    where: { id },
    data: {
      technicianId: technicianId || null,
      supervisorId: supervisorId || null,
      status: existing.status === "confirmed" ? "assigned" : existing.status,
    },
  });
  await prisma.auditLog.create({
    data: {
      actor: actorEmail || "system",
      action: "booking.assign",
      entity: "Booking",
      entityId: id,
      meta: JSON.stringify({
        technicianId: technicianId || null,
        supervisorId: supervisorId || null,
      }),
    },
  });
  return { ok: true as const };
}

export type { BookingType };

