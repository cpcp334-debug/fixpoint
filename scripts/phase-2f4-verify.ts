import { PrismaClient } from "@prisma/client";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { resolveWindow } from "../src/lib/insights/dates";
import { isEngagedEvent } from "../src/lib/insights/engagement";
import { canViewAnalytics, insightsSections } from "../src/lib/insights/rbac";
import { CRM_QUALIFIED, loadInsights } from "../src/lib/insights/query";

const prisma = new PrismaClient();
const visitorIds: string[] = [];

function assert(cond: unknown, message: string): asserts cond {
  if (!cond) throw new Error(message);
}

function walkFiles(dir: string, acc: string[] = []) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const stat = statSync(full);
    if (stat.isDirectory()) walkFiles(full, acc);
    else if (/\.(ts|tsx)$/.test(name)) acc.push(full);
  }
  return acc;
}

function assertNoInsightsImport(dir: string) {
  for (const file of walkFiles(dir)) {
    const text = readFileSync(file, "utf8");
    assert(!text.includes("@/lib/insights"), `${file} must not import insights`);
  }
}

async function wipeFixtures() {
  const invoices = await prisma.invoice.findMany({
    where: { number: { in: ["ALN-INV-2F4-PAID", "ALN-INV-2F4-DRAFT"] } },
    select: { id: true },
  });
  const invoiceIds = invoices.map((row) => row.id);
  if (invoiceIds.length) {
    await prisma.payment.deleteMany({ where: { invoiceId: { in: invoiceIds } } });
    await prisma.invoice.deleteMany({ where: { id: { in: invoiceIds } } });
  }
  await prisma.quote.deleteMany({ where: { quoteNumber: "ALN-Q-2F4-001" } });
  const bookings = await prisma.booking.findMany({
    where: { number: { in: ["ALN-2F4-INSIGHTS", "ALN-2F4-AMC-VISIT"] } },
    select: { id: true },
  });
  const bookingIds = bookings.map((row) => row.id);
  if (bookingIds.length) await prisma.review.deleteMany({ where: { bookingId: { in: bookingIds } } });
  await prisma.review.deleteMany({ where: { authorName: "2F4 Qualified", body: "Good" } });
  await prisma.review.deleteMany({ where: { authorName: "DIY", body: "guide" } });
  if (bookingIds.length) await prisma.booking.deleteMany({ where: { id: { in: bookingIds } } });
  const leads = await prisma.lead.findMany({
    where: { phone: { startsWith: "+97150901811" } },
    select: { id: true },
  });
  const leadIds = leads.map((row) => row.id);
  if (leadIds.length) {
    await prisma.leadScoreHistory.deleteMany({ where: { leadId: { in: leadIds } } });
    await prisma.leadScore.deleteMany({ where: { leadId: { in: leadIds } } });
    await prisma.lead.deleteMany({ where: { id: { in: leadIds } } });
  }
  const customers = await prisma.customer.findMany({
    where: { phone: "+971509018111", name: "2F4 Insights" },
    select: { id: true },
  });
  const customerIds = customers.map((row) => row.id);
  if (customerIds.length) {
    await prisma.amcContract.deleteMany({ where: { customerId: { in: customerIds } } });
    await prisma.customer.deleteMany({ where: { id: { in: customerIds } } });
  }
  const leftoverVisitors = await prisma.analyticsEvent.findMany({
    where: { path: { startsWith: "/en/2f4-insights-verify" } },
    select: { visitorId: true },
  });
  const leftoverIds = [...new Set(leftoverVisitors.map((row) => row.visitorId))];
  if (leftoverIds.length) {
    await prisma.analyticsEvent.deleteMany({ where: { visitorId: { in: leftoverIds } } });
    await prisma.visitSession.deleteMany({ where: { visitorId: { in: leftoverIds } } });
    await prisma.visitor.deleteMany({ where: { id: { in: leftoverIds } } });
  }
}

async function cleanup() {
  await wipeFixtures();
  const allVisitors = [...new Set([...visitorIds])];
  if (allVisitors.length) {
    await prisma.analyticsEvent.deleteMany({ where: { visitorId: { in: allVisitors } } });
    await prisma.visitSession.deleteMany({ where: { visitorId: { in: allVisitors } } });
    await prisma.visitor.deleteMany({ where: { id: { in: allVisitors } } });
  }
}

async function score(leadId: string, effectiveClass: "HOT" | "WARM" | "NORMAL" | "SPAM", extra?: { quarantined?: boolean; score?: number }) {
  await prisma.leadScore.create({
    data: {
      leadId,
      score: extra?.score ?? 50,
      systemClass: effectiveClass,
      effectiveClass,
      quarantined: extra?.quarantined ?? effectiveClass === "SPAM",
      reasonsJson: "[]",
    },
  });
}

async function main() {
  assertNoInsightsImport("src/app/[locale]");
  assertNoInsightsImport("src/app/api");
  const tracker = readFileSync("src/components/analytics/Tracker.tsx", "utf8");
  assert(!tracker.includes("@/lib/insights"), "public tracker does not import insights");
  assert(!isEngagedEvent("PAGE_VIEW"), "PAGE_VIEW is not engagement");
  assert(isEngagedEvent("SERVICE_VIEW"), "SERVICE_VIEW is engagement");
  assert(isEngagedEvent("AI_OPEN"), "AI_OPEN is engagement");
  assert(!canViewAnalytics("technician"), "technician blocked");
  assert(!canViewAnalytics("content_manager"), "content manager blocked");
  assert(canViewAnalytics("sales"), "sales allowed");
  assert(canViewAnalytics("manager"), "manager allowed");
  assert(canViewAnalytics("super_admin"), "super_admin allowed");
  assert(!insightsSections("sales").includes("invoices"), "sales has no invoices section");
  assert(!insightsSections("supervisor").includes("quality"), "supervisor has no quality");
  assert(!insightsSections("customer_service").includes("quotes"), "customer service has no quotes");
  assert(CRM_QUALIFIED.includes("QUALIFIED") && !CRM_QUALIFIED.includes("NEW") && !CRM_QUALIFIED.includes("LOST") && !CRM_QUALIFIED.includes("CANCELLED"), "CRM qualified set");

  const today = resolveWindow({ preset: "today" });
  const seven = resolveWindow({ range: "7d" });
  assert(today.end.getTime() > today.start.getTime(), "today window positive");
  assert(seven.end.getTime() - seven.start.getTime() === 7 * 24 * 60 * 60 * 1000, "7d is seven Dubai days");
  const custom = resolveWindow({ range: "custom", from: "2018-06-11", to: "2018-06-11" });
  assert(custom.fromDate === "2018-06-11" && custom.toDate === "2018-06-11", "custom inclusive dates");
  assert(custom.end.getTime() - custom.start.getTime() === 24 * 60 * 60 * 1000, "custom day is exclusive end");

  const empty = await loadInsights("manager", { range: "custom", from: "1990-01-01", to: "1990-01-02" });
  assert(empty.kpis.every((row) => row.count === 0), "empty range has zero KPIs");
  assert(empty.funnel.every((row) => row.rate === null), "empty funnel conversion is — not 0% from zero denominator");
  assert(empty.services.length === 0, "no invented service rows");
  assert(empty.locations.every((row) => Number(row.leads) + Number(row.bookings) + Number(row.completed) > 0) || empty.locations.length === 0, "no zero-activity locations");

  await wipeFixtures();

  const at = new Date("2018-06-11T10:00:00+04:00");
  const service = await prisma.service.findFirst({ where: { status: "active" } });
  const emirate = await prisma.location.findFirst({ where: { type: "emirate", status: "active" } });

  const bounce = await prisma.visitor.create({ data: { locale: "en" } });
  visitorIds.push(bounce.id);
  const bounceSession = await prisma.visitSession.create({ data: { visitorId: bounce.id } });
  await prisma.analyticsEvent.create({
    data: {
      visitorId: bounce.id,
      sessionId: bounceSession.id,
      name: "PAGE_VIEW",
      path: "/en/2f4-insights-verify",
      meta: "{}",
      source: "client",
      createdAt: at,
    },
  });
  const engagedVisitor = await prisma.visitor.create({ data: { locale: "en" } });
  visitorIds.push(engagedVisitor.id);
  const engagedSession = await prisma.visitSession.create({ data: { visitorId: engagedVisitor.id } });
  await prisma.analyticsEvent.create({
    data: {
      visitorId: engagedVisitor.id,
      sessionId: engagedSession.id,
      name: "SERVICE_VIEW",
      path: "/en/2f4-insights-verify",
      entityType: "service",
      entityId: service?.slug || "cleaning-services",
      meta: "{}",
      source: "client",
      createdAt: at,
    },
  });
  const optedOut = await prisma.visitor.create({ data: { locale: "en", optedOut: true } });
  visitorIds.push(optedOut.id);
  const optedSession = await prisma.visitSession.create({ data: { visitorId: optedOut.id } });
  await prisma.analyticsEvent.create({
    data: {
      visitorId: optedOut.id,
      sessionId: optedSession.id,
      name: "SERVICE_VIEW",
      path: "/en/2f4-insights-verify",
      entityType: "service",
      entityId: service?.slug || "cleaning-services",
      meta: "{}",
      source: "client",
      createdAt: at,
    },
  });

  const customer = await prisma.customer.create({ data: { name: "2F4 Insights", phone: "+971509018111" } });

  await prisma.lead.create({
    data: {
      source: "contact",
      name: "2F4 New",
      phone: "+971509018111",
      requirement: "Please inspect a dripping tap tomorrow morning.",
      status: "NEW",
      locale: "en",
      createdAt: at,
      serviceId: service?.id,
      locationId: emirate?.id,
    },
  });

  const qualifiedLead = await prisma.lead.create({
    data: {
      source: "quote",
      name: "2F4 Qualified",
      phone: "+971509018112",
      requirement: "Need a villa kitchen and bathroom clean this week please.",
      status: "QUALIFIED",
      locale: "en",
      customerId: customer.id,
      createdAt: at,
      serviceId: service?.id,
      locationId: emirate?.id,
    },
  });
  await score(qualifiedLead.id, "NORMAL", { score: 45 });

  const hotLead = await prisma.lead.create({
    data: {
      source: "booking",
      name: "2F4 Hot New",
      phone: "+971509018113",
      requirement: "Need a villa kitchen and bathroom clean this week please.",
      status: "NEW",
      locale: "en",
      createdAt: at,
      serviceId: service?.id,
    },
  });
  await score(hotLead.id, "HOT", { score: 88 });

  const warmLead = await prisma.lead.create({
    data: {
      source: "ai",
      name: "2F4 Warm",
      phone: "+971509018114",
      requirement: "Need a villa kitchen and bathroom clean this week please.",
      status: "NEW",
      locale: "en",
      createdAt: at,
    },
  });
  await score(warmLead.id, "WARM", { score: 62 });

  await prisma.lead.create({
    data: {
      source: "contact",
      name: "2F4 Lost",
      phone: "+971509018115",
      requirement: "Need a villa kitchen and bathroom clean this week please.",
      status: "LOST",
      locale: "en",
      createdAt: at,
    },
  });

  await prisma.lead.create({
    data: {
      source: "contact",
      name: "2F4 Cancelled",
      phone: "+971509018116",
      requirement: "Need a villa kitchen and bathroom clean this week please.",
      status: "CANCELLED",
      locale: "en",
      createdAt: at,
    },
  });

  const spam = await prisma.lead.create({
    data: {
      source: "contact",
      name: "2F4 Spam",
      phone: "+971509018117",
      requirement: "Need a villa kitchen and bathroom clean this week please.",
      status: "NEW",
      locale: "en",
      createdAt: at,
    },
  });
  await score(spam.id, "SPAM", { quarantined: true, score: 5 });

  const booking = await prisma.booking.create({
    data: {
      number: "ALN-2F4-INSIGHTS",
      name: "2F4 Qualified",
      phone: "+971509018112",
      requirement: "Need a villa kitchen and bathroom clean this week please.",
      status: "completed",
      customerId: customer.id,
      leadId: qualifiedLead.id,
      serviceId: service?.id,
      locationId: emirate?.id,
      createdAt: at,
      updatedAt: at,
    },
  });
  await prisma.booking.create({
    data: {
      number: "ALN-2F4-AMC-VISIT",
      name: "2F4 Qualified",
      phone: "+971509018112",
      requirement: "Scheduled AMC visit for the villa this week please.",
      type: "amc_visit",
      status: "requested",
      customerId: customer.id,
      createdAt: at,
      updatedAt: at,
    },
  });
  const quote = await prisma.quote.create({
    data: {
      quoteNumber: "ALN-Q-2F4-001",
      customerName: "2F4 Qualified",
      customerPhone: "+971509018112",
      totalLabel: "AED 99999",
      status: "SENT",
      customerId: customer.id,
      leadId: qualifiedLead.id,
      serviceId: service?.id,
      locationId: emirate?.id,
      createdAt: at,
    },
  });
  const paidInvoice = await prisma.invoice.create({
    data: {
      number: "ALN-INV-2F4-PAID",
      customerName: "2F4 Qualified",
      customerPhone: "+971509018112",
      totalLabel: "AED 99999",
      status: "PAID",
      customerId: customer.id,
      quoteId: quote.id,
      createdAt: at,
      updatedAt: at,
    },
  });
  await prisma.payment.create({ data: { invoiceId: paidInvoice.id, status: "unconfigured" } });
  const draftInvoice = await prisma.invoice.create({
    data: {
      number: "ALN-INV-2F4-DRAFT",
      customerName: "2F4 Qualified",
      customerPhone: "+971509018112",
      totalLabel: "AED 50",
      status: "DRAFT",
      createdAt: at,
      updatedAt: at,
    },
  });
  await prisma.payment.create({ data: { invoiceId: draftInvoice.id, status: "unconfigured" } });
  await prisma.review.create({
    data: {
      type: "service",
      status: "APPROVED",
      stars: 5,
      authorName: "2F4 Qualified",
      body: "Good",
      bookingId: booking.id,
      createdAt: at,
    },
  });
  await prisma.review.create({
    data: { type: "guide", status: "APPROVED", stars: 1, authorName: "DIY", body: "guide", createdAt: at },
  });
  await prisma.amcContract.create({
    data: { customerId: customer.id, startDate: at, endDate: new Date("2018-09-11T10:00:00+04:00") },
  });

  const filters = { range: "custom", from: "2018-06-11", to: "2018-06-11" };
  const report = await loadInsights("manager", filters);
  assert((report.kpis.find((row) => row.id === "visitors")?.count || 0) === 2, "opted-out and only two countable visitors");
  assert((report.kpis.find((row) => row.id === "engaged")?.count || 0) === 1, "PAGE_VIEW-only and opted-out are not engaged");
  assert((report.kpis.find((row) => row.id === "leads")?.count || 0) === 6, "quarantined SPAM excluded from funnel leads");
  assert((report.kpis.find((row) => row.id === "qualified")?.count || 0) === 1, "CRM qualified excludes NEW/LOST/CANCELLED");
  assert((report.kpis.find((row) => row.id === "hot")?.count || 0) === 1, "HOT quality counted");
  assert((report.kpis.find((row) => row.id === "warm")?.count || 0) === 1, "WARM quality counted");
  assert((report.kpis.find((row) => row.id === "spam")?.count || 0) === 1, "quarantined SPAM is a separate KPI");
  assert(!report.funnel.some((row) => row.id === "hot" || row.id === "warm"), "HOT/WARM are not funnel stages");
  assert((report.kpis.find((row) => row.id === "paid")?.count || 0) === 1, "only Invoice.status PAID counts as paid");
  assert((report.kpis.find((row) => row.id === "invoices")?.count || 0) === 1, "DRAFT is not invoiced");
  assert(!JSON.stringify(report).includes("99999"), "totalLabel is not parsed or summed");
  assert(report.reviews.total === 1, "only approved service reviews count");
  assert(!report.reviews.stars.some((row) => row.stars === 1), "DIY/guide reviews excluded");
  assert(report.amc.visits === 1, "AMC visits counted from booking type");
  assert(report.amc.renewals === "none", "renewals not invented");
  assert(report.sources.some((row) => row.label.includes("Unknown / not captured")), "unknown attribution shown");
  assert(report.funnel[0].rate === null, "first funnel stage has no conversion percent");
  const engagedStage = report.funnel.find((row) => row.id === "engaged");
  assert(engagedStage && engagedStage.rate === 50, "engaged conversion uses previous visitor count");
  if (service) {
    assert(report.services.some((row) => row.id === service.id && Number(row.leads) >= 1), "service aggregation uses stored serviceId");
  }
  if (emirate) {
    assert(report.locations.some((row) => row.id === emirate.id && Number(row.bookings) >= 1), "location aggregation uses stored locationId");
  }
  const sales = await loadInsights("sales", filters);
  assert(!sales.kpis.some((row) => row.id === "paid" || row.id === "invoices"), "sales cannot see paid KPIs");
  assert(!sales.funnel.some((row) => row.id === "paid"), "sales funnel omits paid");
  const cs = await loadInsights("customer_service", filters);
  assert(!cs.kpis.some((row) => row.id === "quotes"), "customer service cannot see quotes");
  const tech = await loadInsights("technician", filters);
  assert(tech.sections.length === 0 && tech.kpis.length === 0, "technician gets empty insights");
  const cm = await loadInsights("content_manager", filters);
  assert(cm.sections.length === 0, "content manager gets empty insights");

  await cleanup();
  console.log("phase-2f4-verify: ok");
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
