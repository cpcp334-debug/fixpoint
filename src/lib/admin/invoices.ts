import type { Invoice, InvoiceItem, InvoiceStatus } from "@prisma/client";
import { prisma } from "@/server/db";
import { adminAudit, nextDocumentNumber } from "@/lib/admin/numbers";
import { renderBrandedPdf, type BrandedDoc } from "@/lib/admin/pdf";
import type { LineItemInput } from "@/lib/admin/forms";

export type InvoiceInput = {
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  customerId?: string;
  quoteId?: string;
  bookingId?: string;
  workOrderId?: string;
  locationLabel: string;
  serviceLabel: string;
  notes: string;
  subtotalLabel: string;
  discountLabel: string;
  taxLabel: string;
  totalLabel: string;
  issueDate?: string;
  dueDate?: string;
  paymentRef?: string;
  status: InvoiceStatus;
  items: LineItemInput[];
};

export async function createInvoice(input: InvoiceInput, actor: { id: string; email: string }) {
  const number = await nextDocumentNumber("invoice");
  const row = await prisma.invoice.create({
    data: {
      number,
      status: input.status,
      customerId: input.customerId,
      quoteId: input.quoteId,
      bookingId: input.bookingId,
      workOrderId: input.workOrderId,
      createdByUserId: actor.id,
      customerName: input.customerName,
      customerPhone: input.customerPhone,
      customerEmail: input.customerEmail,
      locationLabel: input.locationLabel,
      serviceLabel: input.serviceLabel,
      notes: input.notes,
      subtotalLabel: input.subtotalLabel,
      discountLabel: input.discountLabel,
      taxLabel: input.taxLabel,
      totalLabel: input.totalLabel,
      issueDate: input.issueDate,
      dueDate: input.dueDate,
      paymentRef: input.paymentRef,
      items: { create: input.items.map((item, sortOrder) => ({ ...item, sortOrder })) },
    },
    include: { items: true },
  });
  await adminAudit({ actor: actor.email, action: "invoice.create", entity: "Invoice", entityId: row.id, meta: { number } });
  return row;
}

export async function updateInvoice(id: string, input: InvoiceInput, actorEmail: string) {
  const existing = await prisma.invoice.findUnique({ where: { id } });
  if (!existing) return null;
  await prisma.invoiceItem.deleteMany({ where: { invoiceId: id } });
  const row = await prisma.invoice.update({
    where: { id },
    data: {
      status: input.status,
      customerId: input.customerId,
      quoteId: input.quoteId,
      bookingId: input.bookingId,
      workOrderId: input.workOrderId,
      customerName: input.customerName,
      customerPhone: input.customerPhone,
      customerEmail: input.customerEmail,
      locationLabel: input.locationLabel,
      serviceLabel: input.serviceLabel,
      notes: input.notes,
      subtotalLabel: input.subtotalLabel,
      discountLabel: input.discountLabel,
      taxLabel: input.taxLabel,
      totalLabel: input.totalLabel,
      issueDate: input.issueDate,
      dueDate: input.dueDate,
      paymentRef: input.paymentRef,
      items: { create: input.items.map((item, sortOrder) => ({ ...item, sortOrder })) },
    },
    include: { items: true },
  });
  await adminAudit({ actor: actorEmail, action: "invoice.update", entity: "Invoice", entityId: id });
  return row;
}

export async function invoiceFromQuote(quoteId: string, actor: { id: string; email: string }) {
  const quote = await prisma.quote.findUnique({ where: { id: quoteId }, include: { items: true } });
  if (!quote) return null;
  return createInvoice(
    {
      customerName: quote.customerName,
      customerPhone: quote.customerPhone,
      customerEmail: quote.customerEmail || undefined,
      customerId: quote.customerId || undefined,
      quoteId: quote.id,
      locationLabel: quote.locationLabel,
      serviceLabel: quote.serviceLabel,
      notes: quote.notes,
      subtotalLabel: quote.subtotalLabel,
      discountLabel: quote.discountLabel,
      taxLabel: quote.taxLabel,
      totalLabel: quote.totalLabel,
      issueDate: new Date().toISOString().slice(0, 10),
      status: "DRAFT",
      items: quote.items.map((item) => ({
        description: item.description,
        quantity: item.quantity,
        unit: item.unit,
        unitPrice: item.unitPrice,
        lineTotal: item.lineTotal,
      })),
    },
    actor,
  );
}

export function invoiceToPdfDoc(invoice: Invoice & { items: InvoiceItem[] }): BrandedDoc {
  return {
    kind: "invoice",
    number: invoice.number,
    dateLabel: invoice.issueDate || invoice.createdAt.toISOString().slice(0, 10),
    customerName: invoice.customerName,
    customerPhone: invoice.customerPhone,
    customerEmail: invoice.customerEmail,
    locationLabel: invoice.locationLabel,
    serviceLabel: invoice.serviceLabel,
    notes: [invoice.notes, invoice.dueDate ? `Due: ${invoice.dueDate}` : "", invoice.paymentRef ? `Payment reference (manual): ${invoice.paymentRef}` : ""]
      .filter(Boolean)
      .join("\n"),
    items: invoice.items.map((item) => ({
      description: item.description,
      quantity: item.quantity,
      unit: item.unit,
      unitPrice: item.unitPrice,
      lineTotal: item.lineTotal,
    })),
    subtotalLabel: invoice.subtotalLabel,
    discountLabel: invoice.discountLabel,
    taxLabel: invoice.taxLabel,
    totalLabel: invoice.totalLabel,
  };
}

export async function invoicePdfBuffer(id: string) {
  const invoice = await prisma.invoice.findUnique({ where: { id }, include: { items: { orderBy: { sortOrder: "asc" } } } });
  if (!invoice) return null;
  return { file: `${invoice.number}.pdf`, buffer: await renderBrandedPdf(invoiceToPdfDoc(invoice)) };
}
