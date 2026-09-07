import { z } from "zod";
import { prisma } from "@/server/db";
import { rateLimit } from "@/server/rate-limit";
import { createPublicBooking } from "@/lib/bookings";
import { stampVisitor, trackServer } from "@/lib/analytics/server";
import { scoreLeadSafe } from "@/lib/quality/run";

export const leadSchema = z.object({
  name: z.string().trim().min(2).max(120),
  phone: z.string().trim().min(8).max(20),
  email: z.string().trim().max(200).optional(),
  whatsapp: z.string().trim().min(8).max(20).optional(),
  serviceSlug: z.string().optional(),
  locationSlug: z.string().optional(),
  propertyType: z.string().optional(),
  city: z.string().trim().min(2).max(120).optional(),
  area: z.string().trim().min(2).max(120).optional(),
  requirement: z.string().trim().min(8).max(4000),
  urgency: z.enum(["normal", "urgent"]).optional(),
  preferredDate: z.string().optional(),
  preferredTime: z.string().optional(),
  locale: z.string().optional(),
  source: z.enum(["quote", "booking", "contact", "ai"]),
  website: z.string().optional(),
  photoIds: z.array(z.string().min(1).max(40)).max(5).optional(),
  aiSummary: z.string().max(2000).optional(),
});

export type LeadInput = z.infer<typeof leadSchema>;

export async function createLead(input: LeadInput, ip: string) {
  if (input.website) {
    return { ok: true as const, ignored: true };
  }

  const parsed = leadSchema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] || "form");
      if (!fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { ok: false as const, error: "invalid" as const, fieldErrors };
  }

  const limited = rateLimit(`lead:${ip}`, 5, 10 * 60 * 1000);
  if (!limited.ok) {
    return { ok: false as const, error: "rateLimit" as const };
  }

  const data = parsed.data;
  if (data.source === "booking") {
    return createPublicBooking(
      {
        type: "standard",
        name: data.name,
        phone: data.phone,
        whatsapp: data.whatsapp,
        email: data.email,
        serviceSlug: data.serviceSlug,
        locationSlug: data.locationSlug,
        city: data.city,
        area: data.area,
        propertyType: data.propertyType,
        requirement: data.requirement,
        preferredDate: data.preferredDate,
        preferredTime: data.preferredTime,
        locale: data.locale === "ar" ? "ar" : "en",
        source: "booking",
        photoIds: data.photoIds,
        website: data.website,
      },
      ip,
    );
  }

  const recent = await prisma.lead.findFirst({
    where: {
      phone: data.phone,
      requirement: data.requirement,
      createdAt: { gt: new Date(Date.now() - 2 * 60 * 1000) },
    },
  });
  if (recent) {
    return { ok: true as const, duplicate: true, id: recent.id };
  }

  const service = data.serviceSlug
    ? await prisma.service.findFirst({ where: { slug: data.serviceSlug, status: "active" } })
    : null;
  const location = data.locationSlug
    ? await prisma.location.findFirst({ where: { slug: data.locationSlug, status: "active" } })
    : null;

  const lead = await prisma.lead.create({
    data: {
      source: data.source,
      name: data.name,
      phone: data.phone,
      email: data.email && data.email.includes("@") ? data.email : null,
      whatsapp: data.whatsapp || null,
      serviceId: service?.id,
      locationId: location?.id,
      propertyType: data.propertyType || null,
      city: data.city || null,
      requirement: data.requirement,
      urgency: data.urgency || "normal",
      status: data.source === "quote" ? "QUOTATION" : "NEW",
      locale: data.locale || "en",
      preferredDate: data.preferredDate || null,
      preferredTime: data.preferredTime || null,
      ...(data.area ? { area: data.area } : {}),
      ...(data.photoIds?.length ? { photos: JSON.stringify(data.photoIds) } : {}),
      ...(data.aiSummary ? { aiSummary: data.aiSummary } : {}),
    },
  });

  await prisma.auditLog.create({
    data: {
      action: "lead.create",
      entity: "Lead",
      entityId: lead.id,
      meta: JSON.stringify({ source: data.source, ip }),
    },
  });

  try {
    await stampVisitor({ leadId: lead.id });
    if (data.source === "quote") await trackServer("QUOTE_SUBMIT", { locale: data.locale });
    if (data.source === "contact") await trackServer("CONTACT_SUBMIT", { locale: data.locale });
  } catch {
    // Analytics must never fail a lead write.
  }

  await scoreLeadSafe(lead.id);

  return { ok: true as const, id: lead.id };
}

export async function updateAiLead(id: string, input: Partial<LeadInput>) {
  const existing = await prisma.lead.findUnique({ where: { id } });
  if (!existing || existing.source !== "ai") return { ok: false as const };

  const service = input.serviceSlug
    ? await prisma.service.findFirst({ where: { slug: input.serviceSlug, status: "active" } })
    : null;
  const location = input.locationSlug
    ? await prisma.location.findFirst({ where: { slug: input.locationSlug, status: "active" } })
    : null;

  await prisma.lead.update({
    where: { id },
    data: {
      name: existing.name || input.name,
      phone: existing.phone || input.phone,
      email: existing.email || (input.email && input.email.includes("@") ? input.email : null),
      whatsapp: existing.whatsapp || input.whatsapp || null,
      serviceId: existing.serviceId || service?.id,
      locationId: existing.locationId || location?.id,
      propertyType: existing.propertyType || input.propertyType || null,
      city: existing.city || input.city || null,
      area: existing.area || input.area || null,
      requirement: existing.requirement || input.requirement,
      urgency: input.urgency || existing.urgency,
      photos: input.photoIds ? JSON.stringify(input.photoIds) : existing.photos,
      aiSummary: input.aiSummary || existing.aiSummary,
      preferredDate: input.preferredDate || existing.preferredDate,
      preferredTime: input.preferredTime || existing.preferredTime,
    },
  });
  return { ok: true as const, id };
}
