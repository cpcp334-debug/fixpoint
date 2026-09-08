import type { Quote, QuoteItem, QuoteStatus } from "@prisma/client";
import { prisma } from "@/server/db";
import { adminAudit, nextDocumentNumber } from "@/lib/admin/numbers";
import { renderBrandedPdf, type BrandedDoc } from "@/lib/admin/pdf";
import type { LineItemInput } from "@/lib/admin/forms";
import { emitDomainEventSafe } from "@/lib/automation/emit";

export type QuoteInput = {
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  customerId?: string;
  leadId?: string;
  serviceId?: string;
  locationId?: string;
  locationLabel: string;
  serviceLabel: string;
  scope: string;
  materials: string;
  labor: string;
  exclusions: string;
  taxesNote: string;
  validity: string;
  paymentTerms: string;
  estimatedDuration: string;
  warrantyTerms: string;
  notes: string;
  subtotalLabel: string;
  discountLabel: string;
  taxLabel: string;
  totalLabel: string;
  humanApproved: boolean;
  status: QuoteStatus;
  items: LineItemInput[];
  sourceKey?: string | null;
};

export type QuoteWithItems = Quote & { items: QuoteItem[] };

export type QuoteRefError = "invalid_service" | "invalid_location";
export type QuoteMutationError = QuoteRefError | "missing";
export type QuoteMutationResult =
  | { ok: true; quote: QuoteWithItems }
  | { ok: false; error: QuoteMutationError };

/** Empty string → null. Non-null IDs must exist; never coerce invalid IDs to null. */
export async function resolveQuoteCatalogRefs(input: {
  serviceId?: string | null;
  locationId?: string | null;
}): Promise<{ ok: true; serviceId: string | null; locationId: string | null } | { ok: false; error: QuoteRefError }> {
  const serviceId = input.serviceId?.trim() ? input.serviceId.trim() : null;
  const locationId = input.locationId?.trim() ? input.locationId.trim() : null;
  if (serviceId) {
    const service = await prisma.service.findUnique({ where: { id: serviceId }, select: { id: true } });
    if (!service) return { ok: false, error: "invalid_service" };
  }
  if (locationId) {
    const location = await prisma.location.findUnique({ where: { id: locationId }, select: { id: true } });
    if (!location) return { ok: false, error: "invalid_location" };
  }
  return { ok: true, serviceId, locationId };
}

async function emitQuoteEvents(
  quote: { id: string; status: QuoteStatus; sentAt: Date | null },
  previous: QuoteStatus | null,
) {
  if (!previous) {
    await emitDomainEventSafe({
      trigger: "QUOTE_CREATED",
      subjectId: quote.id,
      occurrenceKey: "created",
    });
  }
  if (quote.status === "SENT" && previous !== "SENT") {
    await emitDomainEventSafe({
      trigger: "QUOTE_SENT",
      subjectId: quote.id,
      occurrenceKey: quote.sentAt?.toISOString() || "sent",
    });
  }
  if (quote.status === "ACCEPTED" && previous !== "ACCEPTED") {
    await emitDomainEventSafe({
      trigger: "QUOTE_ACCEPTED",
      subjectId: quote.id,
      occurrenceKey: "accepted",
    });
  }
  if (quote.status === "REJECTED" && previous !== "REJECTED") {
    await emitDomainEventSafe({
      trigger: "QUOTE_REJECTED",
      subjectId: quote.id,
      occurrenceKey: "rejected",
    });
  }
}

async function labels(input: QuoteInput, serviceId: string | null, locationId: string | null) {
  const [service, location] = await Promise.all([
    serviceId ? prisma.service.findUnique({ where: { id: serviceId }, include: { translations: true } }) : null,
    locationId ? prisma.location.findUnique({ where: { id: locationId }, include: { translations: true } }) : null,
  ]);
  const serviceLabel =
    input.serviceLabel || service?.translations.find((t) => t.locale === "en")?.name || "";
  const locationLabel =
    input.locationLabel || location?.translations.find((t) => t.locale === "en")?.name || "";
  return { serviceLabel, locationLabel };
}

export async function createQuote(input: QuoteInput, actor: { id: string; email: string }): Promise<QuoteMutationResult> {
  if (input.sourceKey) {
    const existing = await prisma.quote.findUnique({ where: { sourceKey: input.sourceKey }, include: { items: true } });
    if (existing) return { ok: true, quote: existing };
  }
  const refs = await resolveQuoteCatalogRefs(input);
  if (!refs.ok) return refs;
  const fromCofounder = Boolean(input.sourceKey?.startsWith("cofounder:"));
  const status = fromCofounder ? "DRAFT" : input.status;
  const humanApproved = fromCofounder ? false : input.humanApproved;
  const quoteNumber = await nextDocumentNumber("quote");
  const { serviceLabel, locationLabel } = await labels(input, refs.serviceId, refs.locationId);
  const row = await prisma.quote.create({
    data: {
      quoteNumber,
      status,
      customerId: input.customerId,
      leadId: input.leadId,
      serviceId: refs.serviceId,
      locationId: refs.locationId,
      createdByUserId: actor.id,
      customerName: input.customerName,
      customerPhone: input.customerPhone,
      customerEmail: input.customerEmail,
      locationLabel,
      serviceLabel,
      scope: input.scope,
      materials: input.materials,
      labor: input.labor,
      exclusions: input.exclusions,
      taxesNote: input.taxesNote,
      validity: input.validity,
      paymentTerms: input.paymentTerms,
      estimatedDuration: input.estimatedDuration,
      warrantyTerms: input.warrantyTerms,
      notes: input.notes,
      subtotalLabel: input.subtotalLabel,
      discountLabel: input.discountLabel,
      taxLabel: input.taxLabel,
      totalLabel: input.totalLabel,
      humanApproved,
      sentAt: status === "SENT" ? new Date() : null,
      sourceKey: input.sourceKey || null,
      items: {
        create: input.items.map((item, sortOrder) => ({ ...item, sortOrder })),
      },
    },
    include: { items: true },
  });
  await adminAudit({ actor: actor.email, action: "quote.create", entity: "Quote", entityId: row.id, meta: { quoteNumber } });
  await emitQuoteEvents(row, null);
  return { ok: true, quote: row };
}

export async function updateQuote(id: string, input: QuoteInput, actorEmail: string): Promise<QuoteMutationResult> {
  const existing = await prisma.quote.findUnique({ where: { id } });
  if (!existing) return { ok: false, error: "missing" };
  const refs = await resolveQuoteCatalogRefs(input);
  if (!refs.ok) return refs;
  const { serviceLabel, locationLabel } = await labels(input, refs.serviceId, refs.locationId);
  await prisma.quoteItem.deleteMany({ where: { quoteId: id } });
  const row = await prisma.quote.update({
    where: { id },
    data: {
      status: input.status,
      customerId: input.customerId,
      leadId: input.leadId,
      serviceId: refs.serviceId,
      locationId: refs.locationId,
      customerName: input.customerName,
      customerPhone: input.customerPhone,
      customerEmail: input.customerEmail,
      locationLabel,
      serviceLabel,
      scope: input.scope,
      materials: input.materials,
      labor: input.labor,
      exclusions: input.exclusions,
      taxesNote: input.taxesNote,
      validity: input.validity,
      paymentTerms: input.paymentTerms,
      estimatedDuration: input.estimatedDuration,
      warrantyTerms: input.warrantyTerms,
      notes: input.notes,
      subtotalLabel: input.subtotalLabel,
      discountLabel: input.discountLabel,
      taxLabel: input.taxLabel,
      totalLabel: input.totalLabel,
      humanApproved: input.humanApproved,
      sentAt: input.status === "SENT" ? existing.sentAt || new Date() : existing.sentAt,
      items: {
        create: input.items.map((item, sortOrder) => ({ ...item, sortOrder })),
      },
    },
    include: { items: true },
  });
  await adminAudit({ actor: actorEmail, action: "quote.update", entity: "Quote", entityId: id });
  await emitQuoteEvents(row, existing.status);
  return { ok: true, quote: row };
}

export function quoteToPdfDoc(quote: Quote & { items: QuoteItem[] }): BrandedDoc {
  return {
    kind: "quotation",
    number: quote.quoteNumber,
    dateLabel: quote.createdAt.toISOString().slice(0, 10),
    customerName: quote.customerName,
    customerPhone: quote.customerPhone,
    customerEmail: quote.customerEmail,
    locationLabel: quote.locationLabel,
    serviceLabel: quote.serviceLabel,
    scope: quote.scope,
    exclusions: quote.exclusions,
    validity: quote.validity,
    paymentTerms: quote.paymentTerms,
    notes: quote.notes,
    items: quote.items.map((item) => ({
      description: item.description,
      quantity: item.quantity,
      unit: item.unit,
      unitPrice: item.unitPrice,
      lineTotal: item.lineTotal,
    })),
    subtotalLabel: quote.subtotalLabel,
    discountLabel: quote.discountLabel,
    taxLabel: quote.taxLabel,
    totalLabel: quote.totalLabel,
  };
}

export async function quotePdfBuffer(id: string) {
  const quote = await prisma.quote.findUnique({ where: { id }, include: { items: { orderBy: { sortOrder: "asc" } } } });
  if (!quote) return null;
  return { file: `${quote.quoteNumber}.pdf`, buffer: await renderBrandedPdf(quoteToPdfDoc(quote)) };
}
