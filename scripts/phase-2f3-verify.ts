import { PrismaClient } from "@prisma/client";
import { readFileSync } from "node:fs";
import { assignBookingStaff } from "../src/lib/bookings";
import { buildJourney } from "../src/lib/journey/aggregate";
import { resolveJourneyGraph } from "../src/lib/journey/graph";
import { containsBlockedKey } from "../src/lib/journey/privacy";
import { canViewIdentifiableJourney, kindAllowed } from "../src/lib/journey/rbac";
import { scoreLead } from "../src/lib/quality/run";

const prisma = new PrismaClient();
const ids = {
  visitors: [] as string[],
  sessions: [] as string[],
  customers: [] as string[],
  leads: [] as string[],
  bookings: [] as string[],
  workOrders: [] as string[],
  quotes: [] as string[],
  invoices: [] as string[],
  staff: [] as string[],
  reviews: [] as string[],
  amcs: [] as string[],
};

function assert(cond: unknown, message: string): asserts cond {
  if (!cond) throw new Error(message);
}

async function cleanup() {
  if (ids.invoices.length) {
    await prisma.payment.deleteMany({ where: { invoiceId: { in: ids.invoices } } });
    await prisma.invoiceItem.deleteMany({ where: { invoiceId: { in: ids.invoices } } });
    await prisma.invoice.deleteMany({ where: { id: { in: ids.invoices } } });
  }
  if (ids.quotes.length) {
    await prisma.quoteItem.deleteMany({ where: { quoteId: { in: ids.quotes } } });
    await prisma.quote.deleteMany({ where: { id: { in: ids.quotes } } });
  }
  if (ids.reviews.length) await prisma.review.deleteMany({ where: { id: { in: ids.reviews } } });
  if (ids.amcs.length) await prisma.amcContract.deleteMany({ where: { id: { in: ids.amcs } } });
  if (ids.workOrders.length) await prisma.workOrder.deleteMany({ where: { id: { in: ids.workOrders } } });
  if (ids.bookings.length) await prisma.booking.deleteMany({ where: { id: { in: ids.bookings } } });
  if (ids.leads.length) {
    await prisma.leadScoreHistory.deleteMany({ where: { leadId: { in: ids.leads } } });
    await prisma.leadScore.deleteMany({ where: { leadId: { in: ids.leads } } });
    await prisma.lead.deleteMany({ where: { id: { in: ids.leads } } });
  }
  if (ids.customers.length) await prisma.customer.deleteMany({ where: { id: { in: ids.customers } } });
  if (ids.visitors.length) {
    await prisma.analyticsEvent.deleteMany({ where: { visitorId: { in: ids.visitors } } });
    await prisma.visitSession.deleteMany({ where: { visitorId: { in: ids.visitors } } });
    await prisma.visitor.deleteMany({ where: { id: { in: ids.visitors } } });
  }
  if (ids.staff.length) await prisma.staff.deleteMany({ where: { id: { in: ids.staff } } });
}

async function main() {
  const schema = readFileSync("prisma/schema.prisma", "utf8");
  assert(!schema.includes("model TimelineEvent"), "no TimelineEvent table");
  assert(!schema.includes("utm"), "no UTM fields in schema");
  assert(schema.includes("fields: [leadId], references: [id], onDelete: SetNull"), "Quote.lead FK present");
  assert(schema.includes("fields: [quoteId], references: [id], onDelete: SetNull"), "Invoice.quote FK present");
  assert(schema.includes("fields: [bookingId], references: [id], onDelete: SetNull"), "Invoice.booking FK present");
  assert(schema.includes("fields: [workOrderId], references: [id], onDelete: SetNull"), "Invoice.workOrder FK present");

  assert(!canViewIdentifiableJourney("content_manager", "customer"), "content manager cannot view customer journey");
  assert(!canViewIdentifiableJourney("technician", "customer"), "technician cannot view customer journey");
  assert(canViewIdentifiableJourney("technician", "workOrder"), "technician can view work-order journey");
  assert(!kindAllowed("sales", "invoice.created"), "sales cannot see invoices");
  assert(!kindAllowed("technician", "ai.opened"), "technician cannot see AI");
  assert(!kindAllowed("technician", "lead.created"), "technician cannot see leads");

  const visitor = await prisma.visitor.create({ data: { locale: "en" } });
  ids.visitors.push(visitor.id);
  const session = await prisma.visitSession.create({ data: { visitorId: visitor.id } });
  ids.sessions.push(session.id);
  await prisma.analyticsEvent.createMany({
    data: [
      { visitorId: visitor.id, sessionId: session.id, name: "PAGE_VIEW", path: "/en/cleaning-services", meta: "{}", source: "client" },
      { visitorId: visitor.id, sessionId: session.id, name: "SERVICE_VIEW", path: "/en/cleaning-services", entityType: "service", entityId: "cleaning-services", meta: "{}", source: "client" },
      { visitorId: visitor.id, sessionId: session.id, name: "AI_OPEN", path: "/en", meta: "{}", source: "server" },
      { visitorId: visitor.id, sessionId: session.id, name: "AI_MESSAGE", path: "/en", meta: JSON.stringify({ riskClass: "yellow" }), source: "server" },
      { visitorId: visitor.id, sessionId: session.id, name: "AI_HANDOVER", path: "/en", meta: "{}", source: "server" },
    ],
  });

  const customer = await prisma.customer.create({
    data: { name: "2F3 Journey", phone: "+971504444001", email: "journey@example.com", visitorId: visitor.id },
  });
  ids.customers.push(customer.id);
  await prisma.visitor.update({ where: { id: visitor.id }, data: { customerId: customer.id } });

  const lead = await prisma.lead.create({
    data: {
      source: "quote",
      name: "2F3 Journey",
      phone: "+971504444001",
      email: "journey@example.com",
      requirement: "Need a villa kitchen and bathroom clean this week please.",
      status: "QUOTATION",
      locale: "en",
      customerId: customer.id,
      visitorId: visitor.id,
    },
  });
  ids.leads.push(lead.id);
  await scoreLead(lead.id);

  const strangerVisitor = await prisma.visitor.create({ data: { locale: "en" } });
  ids.visitors.push(strangerVisitor.id);
  const stranger = await prisma.lead.create({
    data: {
      source: "contact",
      name: "2F3 Stranger",
      phone: "+971504444001",
      requirement: "Same phone but a different visitor must not merge.",
      status: "NEW",
      locale: "en",
      visitorId: strangerVisitor.id,
    },
  });
  ids.leads.push(stranger.id);

  const staff = await prisma.staff.create({ data: { staffCode: "2F3-TECH", role: "technician" } });
  ids.staff.push(staff.id);

  const booking = await prisma.booking.create({
    data: {
      number: "ALN-2F3-JOURNEY",
      type: "standard",
      name: "2F3 Journey",
      phone: "+971504444001",
      requirement: "Need a villa kitchen and bathroom clean this week please.",
      status: "confirmed",
      customerId: customer.id,
      leadId: lead.id,
      visitorId: visitor.id,
      confirmedAt: new Date(),
    },
  });
  ids.bookings.push(booking.id);

  const assigned = await assignBookingStaff(booking.id, staff.id, undefined, "manager@example.com");
  assert(assigned.ok, "assignment succeeded");
  const assignAudit = await prisma.auditLog.findFirst({
    where: { action: "booking.assign", entityId: booking.id },
  });
  assert(assignAudit, "booking.assign audit exists");

  const wo = await prisma.workOrder.create({
    data: {
      number: "ALN-WO-2F3-001",
      customerId: customer.id,
      bookingId: booking.id,
      technicianId: staff.id,
      status: "assigned",
      serviceLabel: "Cleaning",
      locationLabel: "Sharjah",
      scope: "Kitchen and bathroom",
    },
  });
  ids.workOrders.push(wo.id);

  const quote = await prisma.quote.create({
    data: {
      quoteNumber: "ALN-Q-2F3-001",
      status: "SENT",
      customerId: customer.id,
      leadId: lead.id,
      customerName: "2F3 Journey",
      customerPhone: "+971504444001",
      sentAt: new Date(),
      totalLabel: "AED 500",
    },
  });
  ids.quotes.push(quote.id);
  const quoteWithLead = await prisma.quote.findUnique({ where: { id: quote.id }, include: { lead: true } });
  assert(quoteWithLead?.lead?.id === lead.id, "Quote.lead FK works");

  const invoice = await prisma.invoice.create({
    data: {
      number: "ALN-INV-2F3-001",
      status: "ISSUED",
      customerId: customer.id,
      quoteId: quote.id,
      bookingId: booking.id,
      workOrderId: wo.id,
      customerName: "2F3 Journey",
      customerPhone: "+971504444001",
      totalLabel: "AED 500",
    },
  });
  ids.invoices.push(invoice.id);
  const invoiceLinked = await prisma.invoice.findUnique({
    where: { id: invoice.id },
    include: { quote: true, booking: true, workOrder: true },
  });
  assert(invoiceLinked?.quote?.id === quote.id, "Invoice.quote FK works");
  assert(invoiceLinked?.booking?.id === booking.id, "Invoice.booking FK works");
  assert(invoiceLinked?.workOrder?.id === wo.id, "Invoice.workOrder FK works");
  await prisma.payment.create({ data: { invoiceId: invoice.id, status: "unconfigured" } });

  const review = await prisma.review.create({
    data: {
      type: "service",
      stars: 5,
      authorName: "2F3 Journey",
      body: "Good work",
      customerId: customer.id,
      bookingId: booking.id,
      visitorId: visitor.id,
    },
  });
  ids.reviews.push(review.id);
  const amc = await prisma.amcContract.create({
    data: { customerId: customer.id, frequency: "monthly", contractValue: "AED 1200" },
  });
  ids.amcs.push(amc.id);

  const customerJourney = await buildJourney(
    { type: "customer", id: customer.id },
    { role: "manager" },
  );
  const kinds = new Set(customerJourney.items.map((row) => row.kind));
  assert(kinds.has("visit.landing"), "customer timeline has landing");
  assert(kinds.has("lead.created"), "customer timeline has lead");
  assert(kinds.has("lead.scored"), "customer timeline has score");
  assert(kinds.has("quote.created"), "customer timeline has quote");
  assert(kinds.has("booking.requested"), "customer timeline has booking");
  assert(kinds.has("booking.assigned"), "customer timeline has assignment");
  assert(kinds.has("work_order.created"), "customer timeline has work order");
  assert(kinds.has("invoice.created"), "customer timeline has invoice");
  assert(kinds.has("payment.recorded"), "customer timeline has payment");
  assert(kinds.has("review.submitted"), "customer timeline has review");
  assert(kinds.has("amc.active"), "customer timeline has AMC");
  assert(customerJourney.quality.some((row) => row.leadId === lead.id), "quality snapshot present");
  assert(
    !customerJourney.items.some((row) => row.entityId === stranger.id || row.title.includes("Stranger")),
    "same-phone stranger lead is not merged",
  );
  const paymentItem = customerJourney.items.find((row) => row.kind === "payment.recorded");
  assert(paymentItem?.facts.status === "unconfigured", "payment stays unconfigured");
  assert(
    customerJourney.items.every((row) => !containsBlockedKey(row.facts)),
    "no private keys in facts",
  );
  const aiFacts = customerJourney.items.filter((row) => row.kind.startsWith("ai.")).flatMap((row) => Object.keys(row.facts));
  assert(aiFacts.every((key) => ["opened", "messageCount", "suggestion", "riskClass", "handover", "photoCount"].includes(key)), "AI facts allowlisted");

  const graph = await resolveJourneyGraph({ type: "customer", id: customer.id }, { role: "manager" });
  assert(!graph.leadIds.includes(stranger.id), "graph does not include same-phone stranger");

  const techDenied = await buildJourney({ type: "workOrder", id: wo.id }, { role: "technician", staffId: "other" });
  assert(techDenied.items.length === 0, "unassigned technician sees nothing");
  const techOk = await buildJourney({ type: "workOrder", id: wo.id }, { role: "technician", staffId: staff.id });
  assert(techOk.items.length > 0, "assigned technician sees operational slice");
  assert(
    techOk.items.every((row) => row.kind.startsWith("work_order.") || row.kind.startsWith("booking.")),
    "technician slice is booking/work-order only",
  );
  assert(!techOk.quality.length, "technician does not see lead quality");

  const cm = await buildJourney({ type: "customer", id: customer.id }, { role: "content_manager" });
  assert(cm.items.length === 0 && cm.quality.length === 0, "content manager sees no identifiable journey");

  const sales = await buildJourney({ type: "customer", id: customer.id }, { role: "sales" });
  assert(!sales.items.some((row) => row.kind.startsWith("invoice.") || row.kind === "payment.recorded"), "sales has no finance items");
  assert(sales.items.some((row) => row.kind === "quote.created"), "sales sees quotes");
  assert(!sales.items.some((row) => row.facts.value === "AED 1200"), "sales does not see AMC value");

  const opted = await prisma.visitor.create({ data: { optedOut: true, locale: "en" } });
  ids.visitors.push(opted.id);
  const optedSession = await prisma.visitSession.create({ data: { visitorId: opted.id } });
  await prisma.analyticsEvent.create({
    data: {
      visitorId: opted.id,
      sessionId: optedSession.id,
      name: "PAGE_VIEW",
      path: "/en",
      meta: "{}",
      source: "client",
    },
  });
  const optedLead = await prisma.lead.create({
    data: {
      source: "contact",
      name: "2F3 OptOut Journey",
      phone: "+971504444009",
      requirement: "Please quote a dripping tap tomorrow morning.",
      status: "NEW",
      locale: "en",
      visitorId: opted.id,
    },
  });
  ids.leads.push(optedLead.id);
  const optedJourney = await buildJourney({ type: "lead", id: optedLead.id }, { role: "manager" });
  assert(!optedJourney.items.some((row) => row.kind === "visit.landing"), "opt-out hides analytics events");
  assert(optedJourney.optedOut, "opt-out flagged");

  await cleanup();
  console.log("phase-2f3-verify: ok");
}

main()
  .catch(async (err) => {
    console.error(err);
    await cleanup().catch(() => undefined);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
