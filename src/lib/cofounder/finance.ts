import { prisma } from "@/server/db";
import { createInvoice, type InvoiceInput } from "@/lib/admin/invoices";
import { createQuote, type QuoteInput } from "@/lib/admin/quotes";
import type { LineItemInput } from "@/lib/admin/forms";

function proposalActionKey(proposalId: string, index: number) {
  return `cofounder:${proposalId}:${index}`;
}

const EMPTY = "";

export type FinanceLine = {
  description: string;
  quantity: string;
  unit: string;
};

export type ProposalDraft = {
  customerId?: string;
  leadId?: string;
  serviceId?: string;
  locationId?: string;
  quoteId?: string;
  bookingId?: string;
  workOrderId?: string;
  locationLabel?: string;
  serviceLabel?: string;
  propertyLabel?: string;
  scope?: string;
  exclusions?: string;
  notes?: string;
  amountsSource?: "none" | "quote";
  lines?: FinanceLine[];
};

function clip(value: string, max: number) {
  return value.trim().slice(0, max);
}

function asLine(row: unknown): FinanceLine | null {
  if (!row || typeof row !== "object") return null;
  const item = row as Record<string, unknown>;
  const description = typeof item.description === "string" ? clip(item.description, 240) : "";
  if (!description) return null;
  return {
    description,
    quantity: typeof item.quantity === "string" && item.quantity.trim() ? clip(item.quantity, 40) : "1",
    unit: typeof item.unit === "string" ? clip(item.unit, 40) : "",
  };
}

export function sanitizeProposalDraft(raw: unknown): ProposalDraft {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const input = raw as Record<string, unknown>;
  const lines = Array.isArray(input.lines) ? input.lines.map(asLine).filter((row): row is FinanceLine => Boolean(row)).slice(0, 20) : [];
  const id = (key: string) => (typeof input[key] === "string" ? clip(input[key] as string, 80) : undefined);
  return {
    customerId: id("customerId") || undefined,
    leadId: id("leadId") || undefined,
    serviceId: id("serviceId") || undefined,
    locationId: id("locationId") || undefined,
    quoteId: id("quoteId") || undefined,
    bookingId: id("bookingId") || undefined,
    workOrderId: id("workOrderId") || undefined,
    locationLabel: typeof input.locationLabel === "string" ? clip(input.locationLabel, 160) : "",
    serviceLabel: typeof input.serviceLabel === "string" ? clip(input.serviceLabel, 160) : "",
    propertyLabel: typeof input.propertyLabel === "string" ? clip(input.propertyLabel, 160) : "",
    scope: typeof input.scope === "string" ? clip(input.scope, 2000) : "",
    exclusions: typeof input.exclusions === "string" ? clip(input.exclusions, 1000) : "",
    notes: typeof input.notes === "string" ? clip(input.notes, 1000) : "",
    amountsSource: input.amountsSource === "quote" ? "quote" : "none",
    lines,
  };
}

function emptyItems(lines: FinanceLine[] | undefined): LineItemInput[] {
  const rows = lines?.length ? lines : [{ description: "Scope to be priced by staff", quantity: "1", unit: "" }];
  return rows.map((line) => ({
    description: line.description,
    quantity: line.quantity || "1",
    unit: line.unit || "",
    unitPrice: EMPTY,
    lineTotal: EMPTY,
  }));
}

function copyQuoteItems(items: Array<{ description: string; quantity: string; unit: string; unitPrice: string; lineTotal: string }>): LineItemInput[] {
  return items.map((item) => ({
    description: item.description,
    quantity: item.quantity,
    unit: item.unit,
    unitPrice: item.unitPrice,
    lineTotal: item.lineTotal,
  }));
}

export async function executeDraftQuote(opts: {
  item: { subjectType: string; subjectId: string; draft?: ProposalDraft };
  proposalId: string;
  index: number;
  actor: { id: string; email: string };
}) {
  const key = proposalActionKey(opts.proposalId, opts.index);
  const existing = await prisma.quote.findUnique({ where: { sourceKey: key }, include: { items: true } });
  if (existing) return { status: "success" as const, resultRef: existing.id, error: undefined as string | undefined };

  const draft = sanitizeProposalDraft(opts.item.draft);
  let customerName = "";
  let customerPhone = "";
  let customerEmail: string | undefined;
  let customerId = draft.customerId;
  let leadId = draft.leadId;
  let serviceId = draft.serviceId;
  let locationId = draft.locationId;
  let locationLabel = draft.locationLabel || "";
  let serviceLabel = draft.serviceLabel || "";
  let scope = draft.scope || "";

  if (opts.item.subjectType === "Lead" || leadId) {
    const lead = await prisma.lead.findUnique({ where: { id: leadId || opts.item.subjectId } });
    if (!lead) return { status: "failed" as const, error: "subject_missing" };
    customerName = lead.name;
    customerPhone = lead.phone;
    customerEmail = lead.email || undefined;
    customerId = customerId || lead.customerId || undefined;
    leadId = lead.id;
    serviceId = serviceId || lead.serviceId || undefined;
    locationId = locationId || lead.locationId || undefined;
    if (!locationLabel) locationLabel = [lead.city, lead.area].filter(Boolean).join(", ");
    if (!scope) scope = clip(lead.requirement, 2000);
  } else if (opts.item.subjectType === "Customer") {
    const customer = await prisma.customer.findUnique({ where: { id: opts.item.subjectId } });
    if (!customer) return { status: "failed" as const, error: "subject_missing" };
    customerName = customer.name;
    customerPhone = customer.phone || "";
    customerEmail = customer.email || undefined;
    customerId = customer.id;
  } else if (opts.item.subjectType === "Quote") {
    const quote = await prisma.quote.findUnique({ where: { id: opts.item.subjectId } });
    if (!quote) return { status: "failed" as const, error: "subject_missing" };
    customerName = quote.customerName;
    customerPhone = quote.customerPhone;
    customerEmail = quote.customerEmail || undefined;
    customerId = quote.customerId || undefined;
    leadId = quote.leadId || undefined;
    serviceId = serviceId || quote.serviceId || undefined;
    locationId = locationId || quote.locationId || undefined;
    if (!locationLabel) locationLabel = quote.locationLabel;
    if (!serviceLabel) serviceLabel = quote.serviceLabel;
    if (!scope) scope = quote.scope;
  }

  const notes = [draft.notes, draft.propertyLabel ? `Property: ${draft.propertyLabel}` : ""].filter(Boolean).join("\n");
  const input: QuoteInput = {
    customerName,
    customerPhone,
    customerEmail,
    customerId,
    leadId,
    serviceId,
    locationId,
    locationLabel,
    serviceLabel,
    scope,
    materials: EMPTY,
    labor: EMPTY,
    exclusions: draft.exclusions || EMPTY,
    taxesNote: EMPTY,
    validity: EMPTY,
    paymentTerms: EMPTY,
    estimatedDuration: EMPTY,
    warrantyTerms: EMPTY,
    notes,
    subtotalLabel: EMPTY,
    discountLabel: EMPTY,
    taxLabel: EMPTY,
    totalLabel: EMPTY,
    humanApproved: false,
    status: "DRAFT",
    items: emptyItems(draft.lines),
    sourceKey: key,
  };
  const created = await createQuote(input, opts.actor);
  if (!created.ok) return { status: "failed" as const, error: created.error };
  const row = created.quote;
  if (row.status !== "DRAFT") return { status: "failed" as const, error: "not_draft" };
  return { status: "success" as const, resultRef: row.id, error: undefined as string | undefined };
}

export async function executeDraftInvoice(opts: {
  item: { subjectType: string; subjectId: string; draft?: ProposalDraft };
  proposalId: string;
  index: number;
  actor: { id: string; email: string };
}) {
  const key = proposalActionKey(opts.proposalId, opts.index);
  const existing = await prisma.invoice.findUnique({ where: { sourceKey: key }, include: { items: true } });
  if (existing) return { status: "success" as const, resultRef: existing.id, error: undefined as string | undefined };

  const draft = sanitizeProposalDraft(opts.item.draft);
  let sourceQuote: {
    id: string;
    status: string;
    customerName: string;
    customerPhone: string;
    customerEmail: string | null;
    customerId: string | null;
    locationLabel: string;
    serviceLabel: string;
    notes: string;
    subtotalLabel: string;
    discountLabel: string;
    taxLabel: string;
    totalLabel: string;
    items: Array<{ description: string; quantity: string; unit: string; unitPrice: string; lineTotal: string }>;
  } | null = null;
  if (opts.item.subjectType === "Quote" || draft.quoteId) {
    sourceQuote = await prisma.quote.findUnique({
      where: { id: draft.quoteId || opts.item.subjectId },
      include: { items: { orderBy: { sortOrder: "asc" } } },
    });
    if (!sourceQuote) return { status: "failed" as const, error: "subject_missing" };
    if (sourceQuote.status !== "ACCEPTED") return { status: "failed" as const, error: "quote_not_accepted" };
  }

  const workOrder =
    opts.item.subjectType === "WorkOrder" || draft.workOrderId
      ? await prisma.workOrder.findUnique({ where: { id: draft.workOrderId || opts.item.subjectId } })
      : null;
  if ((opts.item.subjectType === "WorkOrder" || draft.workOrderId) && !workOrder) {
    return { status: "failed" as const, error: "subject_missing" };
  }
  if (workOrder && workOrder.status !== "completed") return { status: "failed" as const, error: "work_order_not_completed" };

  let booking =
    opts.item.subjectType === "Booking" || draft.bookingId
      ? await prisma.booking.findUnique({ where: { id: draft.bookingId || opts.item.subjectId } })
      : null;
  if ((opts.item.subjectType === "Booking" || draft.bookingId) && !booking) {
    return { status: "failed" as const, error: "subject_missing" };
  }
  if (!booking && workOrder?.bookingId) {
    booking = await prisma.booking.findUnique({ where: { id: workOrder.bookingId } });
  }

  let customer =
    opts.item.subjectType === "Customer" || draft.customerId
      ? await prisma.customer.findUnique({ where: { id: draft.customerId || opts.item.subjectId } })
      : null;
  if (!customer && (workOrder?.customerId || booking?.customerId)) {
    customer = await prisma.customer.findUnique({ where: { id: (workOrder?.customerId || booking?.customerId)! } });
  }

  const verified = Boolean(sourceQuote);
  const input: InvoiceInput = {
    customerName: sourceQuote?.customerName || customer?.name || booking?.name || "",
    customerPhone: sourceQuote?.customerPhone || customer?.phone || booking?.phone || "",
    customerEmail: sourceQuote?.customerEmail || customer?.email || booking?.email || undefined,
    customerId: sourceQuote?.customerId || customer?.id || workOrder?.customerId || booking?.customerId || undefined,
    quoteId: sourceQuote?.id,
    bookingId: booking?.id || workOrder?.bookingId || undefined,
    workOrderId: workOrder?.id,
    locationLabel: draft.locationLabel || sourceQuote?.locationLabel || workOrder?.locationLabel || booking?.city || "",
    serviceLabel: draft.serviceLabel || sourceQuote?.serviceLabel || workOrder?.serviceLabel || "",
    notes: draft.notes || sourceQuote?.notes || workOrder?.notes || "",
    subtotalLabel: verified ? sourceQuote!.subtotalLabel : EMPTY,
    discountLabel: verified ? sourceQuote!.discountLabel : EMPTY,
    taxLabel: verified ? sourceQuote!.taxLabel : EMPTY,
    totalLabel: verified ? sourceQuote!.totalLabel : EMPTY,
    issueDate: undefined,
    status: "DRAFT",
    items: verified && sourceQuote ? copyQuoteItems(sourceQuote.items) : emptyItems(draft.lines),
    sourceKey: key,
  };
  if (!input.customerName) return { status: "failed" as const, error: "subject_missing" };
  const row = await createInvoice(input, opts.actor);
  if (row.status !== "DRAFT") return { status: "failed" as const, error: "not_draft" };
  return { status: "success" as const, resultRef: row.id, error: undefined as string | undefined };
}

export function isFinanceAction(actionType: string) {
  return actionType === "CREATE_DRAFT_QUOTE" || actionType === "CREATE_DRAFT_INVOICE";
}

export function financeSideEffects(actionType: string) {
  if (actionType === "CREATE_DRAFT_QUOTE") {
    return "Creates a DRAFT quotation. Amounts stay empty unless copied from a verified existing record. Does not send or accept the quote, confirm bookings, or change prices.";
  }
  if (actionType === "CREATE_DRAFT_INVOICE") {
    return "Creates a DRAFT invoice. Only verified existing quote amounts are copied as stored labels. Does not issue, mark paid, or change payments.";
  }
  return "";
}
