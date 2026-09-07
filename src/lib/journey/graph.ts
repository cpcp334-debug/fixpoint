import { prisma } from "@/server/db";
import type { JourneyScope } from "@/lib/journey/types";

export type JourneyGraph = {
  visitorIds: string[];
  optedOut: boolean;
  customerIds: string[];
  leadIds: string[];
  bookingIds: string[];
  quoteIds: string[];
  workOrderIds: string[];
  invoiceIds: string[];
  reviewIds: string[];
  amcIds: string[];
  conversationIds: string[];
};

function emptyGraph(): JourneyGraph {
  return {
    visitorIds: [],
    optedOut: false,
    customerIds: [],
    leadIds: [],
    bookingIds: [],
    quoteIds: [],
    workOrderIds: [],
    invoiceIds: [],
    reviewIds: [],
    amcIds: [],
    conversationIds: [],
  };
}

function uniq(ids: Array<string | null | undefined>) {
  return [...new Set(ids.filter((id): id is string => Boolean(id)))];
}

function pushIds(list: string[], ids: Array<string | null | undefined>) {
  for (const id of ids) {
    if (id) list.push(id);
  }
}

export async function resolveJourneyGraph(
  scope: JourneyScope,
  opts: { role: string; staffId?: string | null },
): Promise<JourneyGraph> {
  if (opts.role === "content_manager") return emptyGraph();

  if (opts.role === "technician") {
    if (scope.type !== "workOrder") return emptyGraph();
    const wo = await prisma.workOrder.findUnique({
      where: { id: scope.id },
      select: { id: true, technicianId: true, bookingId: true },
    });
    if (!wo || !opts.staffId || wo.technicianId !== opts.staffId) return emptyGraph();
    return {
      ...emptyGraph(),
      workOrderIds: [wo.id],
      bookingIds: wo.bookingId ? [wo.bookingId] : [],
    };
  }

  if (opts.role === "supervisor") {
    if (scope.type === "booking") {
      const booking = await prisma.booking.findUnique({
        where: { id: scope.id },
        select: { id: true },
      });
      if (!booking) return emptyGraph();
      const workOrders = await prisma.workOrder.findMany({
        where: { bookingId: booking.id },
        select: { id: true },
      });
      return { ...emptyGraph(), bookingIds: [booking.id], workOrderIds: workOrders.map((row) => row.id) };
    }
    if (scope.type === "workOrder") {
      const wo = await prisma.workOrder.findUnique({
        where: { id: scope.id },
        select: { id: true, bookingId: true },
      });
      if (!wo) return emptyGraph();
      return { ...emptyGraph(), workOrderIds: [wo.id], bookingIds: wo.bookingId ? [wo.bookingId] : [] };
    }
    return emptyGraph();
  }

  const graph: JourneyGraph = { ...emptyGraph(), visitorIds: [], customerIds: [], leadIds: [], bookingIds: [], quoteIds: [], workOrderIds: [], invoiceIds: [], reviewIds: [], amcIds: [], conversationIds: [] };

  if (scope.type === "customer") {
    const row = await prisma.customer.findUnique({
      where: { id: scope.id },
      select: { id: true, visitorId: true },
    });
    if (!row) return emptyGraph();
    graph.customerIds.push(row.id);
    if (row.visitorId) graph.visitorIds.push(row.visitorId);
  } else if (scope.type === "lead") {
    const row = await prisma.lead.findUnique({
      where: { id: scope.id },
      select: { id: true, customerId: true, visitorId: true },
    });
    if (!row) return emptyGraph();
    graph.leadIds.push(row.id);
    if (row.customerId) graph.customerIds.push(row.customerId);
    if (row.visitorId) graph.visitorIds.push(row.visitorId);
  } else if (scope.type === "booking") {
    const row = await prisma.booking.findUnique({
      where: { id: scope.id },
      select: { id: true, customerId: true, leadId: true, visitorId: true },
    });
    if (!row) return emptyGraph();
    graph.bookingIds.push(row.id);
    if (row.customerId) graph.customerIds.push(row.customerId);
    if (row.leadId) graph.leadIds.push(row.leadId);
    if (row.visitorId) graph.visitorIds.push(row.visitorId);
  } else {
    const row = await prisma.workOrder.findUnique({
      where: { id: scope.id },
      select: { id: true, customerId: true, bookingId: true },
    });
    if (!row) return emptyGraph();
    graph.workOrderIds.push(row.id);
    if (row.customerId) graph.customerIds.push(row.customerId);
    if (row.bookingId) graph.bookingIds.push(row.bookingId);
  }

  if (graph.customerIds.length) {
    const extraVisitors = await prisma.visitor.findMany({
      where: { customerId: { in: graph.customerIds } },
      select: { id: true, optedOut: true },
    });
    graph.visitorIds.push(...extraVisitors.map((row) => row.id));
    const [leads, bookings, quotes, invoices, workOrders, reviews, amcs] = await Promise.all([
      prisma.lead.findMany({ where: { customerId: { in: graph.customerIds } }, select: { id: true, visitorId: true } }),
      prisma.booking.findMany({ where: { customerId: { in: graph.customerIds } }, select: { id: true, visitorId: true, leadId: true } }),
      prisma.quote.findMany({ where: { customerId: { in: graph.customerIds } }, select: { id: true, leadId: true } }),
      prisma.invoice.findMany({ where: { customerId: { in: graph.customerIds } }, select: { id: true } }),
      prisma.workOrder.findMany({ where: { customerId: { in: graph.customerIds } }, select: { id: true, bookingId: true } }),
      prisma.review.findMany({ where: { customerId: { in: graph.customerIds } }, select: { id: true, visitorId: true } }),
      prisma.amcContract.findMany({ where: { customerId: { in: graph.customerIds } }, select: { id: true } }),
    ]);
    graph.leadIds.push(...leads.map((row) => row.id));
    pushIds(graph.visitorIds, leads.map((row) => row.visitorId));
    graph.bookingIds.push(...bookings.map((row) => row.id));
    pushIds(graph.visitorIds, bookings.map((row) => row.visitorId));
    pushIds(graph.leadIds, bookings.map((row) => row.leadId));
    graph.quoteIds.push(...quotes.map((row) => row.id));
    pushIds(graph.leadIds, quotes.map((row) => row.leadId));
    graph.invoiceIds.push(...invoices.map((row) => row.id));
    graph.workOrderIds.push(...workOrders.map((row) => row.id));
    pushIds(graph.bookingIds, workOrders.map((row) => row.bookingId));
    graph.reviewIds.push(...reviews.map((row) => row.id));
    pushIds(graph.visitorIds, reviews.map((row) => row.visitorId));
    graph.amcIds.push(...amcs.map((row) => row.id));
  }

  graph.visitorIds = uniq(graph.visitorIds);
  graph.customerIds = uniq(graph.customerIds);
  graph.leadIds = uniq(graph.leadIds);
  graph.bookingIds = uniq(graph.bookingIds);
  graph.quoteIds = uniq(graph.quoteIds);
  graph.workOrderIds = uniq(graph.workOrderIds);
  graph.invoiceIds = uniq(graph.invoiceIds);
  graph.reviewIds = uniq(graph.reviewIds);
  graph.amcIds = uniq(graph.amcIds);

  if (graph.visitorIds.length) {
    const [vLeads, vBookings, vReviews, vConvos, visitors] = await Promise.all([
      prisma.lead.findMany({ where: { visitorId: { in: graph.visitorIds } }, select: { id: true, customerId: true } }),
      prisma.booking.findMany({ where: { visitorId: { in: graph.visitorIds } }, select: { id: true, leadId: true, customerId: true } }),
      prisma.review.findMany({ where: { visitorId: { in: graph.visitorIds } }, select: { id: true } }),
      prisma.aiConversation.findMany({
        where: { visitorId: { in: graph.visitorIds } },
        select: { id: true, leadId: true, bookingId: true },
      }),
      prisma.visitor.findMany({
        where: { id: { in: graph.visitorIds } },
        select: { optedOut: true },
      }),
    ]);
    graph.optedOut = visitors.some((row) => row.optedOut);
    graph.leadIds.push(...vLeads.map((row) => row.id));
    pushIds(graph.customerIds, vLeads.map((row) => row.customerId));
    graph.bookingIds.push(...vBookings.map((row) => row.id));
    pushIds(graph.leadIds, vBookings.map((row) => row.leadId));
    pushIds(graph.customerIds, vBookings.map((row) => row.customerId));
    graph.reviewIds.push(...vReviews.map((row) => row.id));
    graph.conversationIds.push(...vConvos.map((row) => row.id));
    pushIds(graph.leadIds, vConvos.map((row) => row.leadId));
    pushIds(graph.bookingIds, vConvos.map((row) => row.bookingId));
  }

  graph.leadIds = uniq(graph.leadIds);
  graph.bookingIds = uniq(graph.bookingIds);
  graph.customerIds = uniq(graph.customerIds);
  graph.reviewIds = uniq(graph.reviewIds);

  if (graph.leadIds.length) {
    const [leadQuotes, leadBookings, leadConvos] = await Promise.all([
      prisma.quote.findMany({ where: { leadId: { in: graph.leadIds } }, select: { id: true } }),
      prisma.booking.findMany({ where: { leadId: { in: graph.leadIds } }, select: { id: true, customerId: true } }),
      prisma.aiConversation.findMany({ where: { leadId: { in: graph.leadIds } }, select: { id: true } }),
    ]);
    graph.quoteIds.push(...leadQuotes.map((row) => row.id));
    graph.bookingIds.push(...leadBookings.map((row) => row.id));
    pushIds(graph.customerIds, leadBookings.map((row) => row.customerId));
    graph.conversationIds.push(...leadConvos.map((row) => row.id));
  }

  graph.bookingIds = uniq(graph.bookingIds);
  graph.quoteIds = uniq(graph.quoteIds);

  if (graph.bookingIds.length) {
    const [wo, bookingInvoices, bookingReviews, bookingConvos] = await Promise.all([
      prisma.workOrder.findMany({ where: { bookingId: { in: graph.bookingIds } }, select: { id: true } }),
      prisma.invoice.findMany({ where: { bookingId: { in: graph.bookingIds } }, select: { id: true } }),
      prisma.review.findMany({ where: { bookingId: { in: graph.bookingIds } }, select: { id: true } }),
      prisma.aiConversation.findMany({ where: { bookingId: { in: graph.bookingIds } }, select: { id: true } }),
    ]);
    graph.workOrderIds.push(...wo.map((row) => row.id));
    graph.invoiceIds.push(...bookingInvoices.map((row) => row.id));
    graph.reviewIds.push(...bookingReviews.map((row) => row.id));
    graph.conversationIds.push(...bookingConvos.map((row) => row.id));
  }

  graph.workOrderIds = uniq(graph.workOrderIds);
  const invoiceOr = [
    ...(graph.quoteIds.length ? [{ quoteId: { in: graph.quoteIds } }] : []),
    ...(graph.workOrderIds.length ? [{ workOrderId: { in: graph.workOrderIds } }] : []),
  ];
  if (invoiceOr.length) {
    const invoices = await prisma.invoice.findMany({
      where: { OR: invoiceOr },
      select: { id: true },
    });
    graph.invoiceIds.push(...invoices.map((row) => row.id));
  }

  return {
    visitorIds: uniq(graph.visitorIds),
    optedOut: graph.optedOut,
    customerIds: uniq(graph.customerIds),
    leadIds: uniq(graph.leadIds),
    bookingIds: uniq(graph.bookingIds),
    quoteIds: uniq(graph.quoteIds),
    workOrderIds: uniq(graph.workOrderIds),
    invoiceIds: uniq(graph.invoiceIds),
    reviewIds: uniq(graph.reviewIds),
    amcIds: uniq(graph.amcIds),
    conversationIds: uniq(graph.conversationIds),
  };
}
