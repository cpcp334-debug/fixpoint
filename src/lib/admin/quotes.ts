import type { Quote, QuoteItem, QuoteStatus } from "@prisma/client";
import { prisma } from "@/server/db";
import { adminAudit, nextDocumentNumber } from "@/lib/admin/numbers";
import { renderBrandedPdf, type BrandedDoc } from "@/lib/admin/pdf";
import type { LineItemInput } from "@/lib/admin/forms";

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
};

async function labels(input: QuoteInput) {
  const [service, location] = await Promise.all([
    input.serviceId ? prisma.service.findUnique({ where: { id: input.serviceId }, include: { translations: true } }) : null,
    input.locationId ? prisma.location.findUnique({ where: { id: input.locationId }, include: { translations: true } }) : null,
  ]);
  const serviceLabel =
    input.serviceLabel || service?.translations.find((t) => t.locale === "en")?.name || "";
  const locationLabel =
    input.locationLabel || location?.translations.find((t) => t.locale === "en")?.name || "";
  return { serviceLabel, locationLabel };
}

export async function createQuote(input: QuoteInput, actor: { id: string; email: string }) {
  const quoteNumber = await nextDocumentNumber("quote");
  const { serviceLabel, locationLabel } = await labels(input);
  const row = await prisma.quote.create({
    data: {
      quoteNumber,
      status: input.status,
      customerId: input.customerId,
      leadId: input.leadId,
      serviceId: input.serviceId,
      locationId: input.locationId,
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
      humanApproved: input.humanApproved,
      sentAt: input.status === "SENT" ? new Date() : null,
      items: {
        create: input.items.map((item, sortOrder) => ({ ...item, sortOrder })),
      },
    },
    include: { items: true },
  });
  await adminAudit({ actor: actor.email, action: "quote.create", entity: "Quote", entityId: row.id, meta: { quoteNumber } });
  return row;
}

export async function updateQuote(id: string, input: QuoteInput, actorEmail: string) {
  const existing = await prisma.quote.findUnique({ where: { id } });
  if (!existing) return null;
  const { serviceLabel, locationLabel } = await labels(input);
  await prisma.quoteItem.deleteMany({ where: { quoteId: id } });
  const row = await prisma.quote.update({
    where: { id },
    data: {
      status: input.status,
      customerId: input.customerId,
      leadId: input.leadId,
      serviceId: input.serviceId,
      locationId: input.locationId,
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
  return row;
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
