import type { LeadStatus, Prisma } from "@prisma/client";
import { prisma } from "@/server/db";
import { pickI18n } from "@/lib/utils";
import { createdAtRange, resolveWindow, type DateWindow } from "@/lib/insights/dates";
import { ENGAGED_EVENT_NAMES } from "@/lib/insights/engagement";
import { hasSection, type InsightsSection } from "@/lib/insights/rbac";

export const CRM_QUALIFIED: LeadStatus[] = [
  "QUALIFIED",
  "INSPECTION",
  "QUOTATION",
  "QUOTATION_SENT",
  "FOLLOW_UP",
  "APPROVED",
  "SCHEDULED",
  "COMPLETED",
];

export const INVOICED_STATUSES = ["ISSUED", "PARTIALLY_PAID", "PAID", "OVERDUE"] as const;
const SCORE_BUCKETS = [
  { id: "0-19", gte: 0, lte: 19 },
  { id: "20-39", gte: 20, lte: 39 },
  { id: "40-59", gte: 40, lte: 59 },
  { id: "60-79", gte: 60, lte: 79 },
  { id: "80-100", gte: 80, lte: 100 },
] as const;

export type InsightsFilters = {
  range?: string;
  from?: string;
  to?: string;
  serviceId?: string;
  locationId?: string;
  source?: string;
};

export type NamedCount = { id: string; label: string; count: number; href?: string };

export type InsightsPayload = {
  window: DateWindow;
  sections: InsightsSection[];
  kpis: NamedCount[];
  funnel: Array<{ id: string; label: string; count: number; rate: number | null; delta: number | null; href?: string }>;
  quality: {
    avgScore: number | null;
    classes: Array<{ id: string; count: number; href?: string }>;
    buckets: Array<{ id: string; count: number }>;
  };
  services: Array<Record<string, string | number>>;
  locations: Array<Record<string, string | number>>;
  sources: NamedCount[];
  operations: NamedCount[];
  reviews: { total: number; stars: Array<{ stars: number; count: number }>; conversion: number | null };
  amc: { active: number; expiring: number; expired: number; visits: number; renewals: "none" };
};

function notQuarantined(): Prisma.LeadWhereInput {
  return { OR: [{ score: { is: null } }, { score: { is: { quarantined: false } } }] };
}

function leadWhere(start: Date, end: Date, filters: InsightsFilters): Prisma.LeadWhereInput {
  return {
    createdAt: createdAtRange(start, end),
    ...(filters.serviceId ? { serviceId: filters.serviceId } : {}),
    ...(filters.locationId ? { locationId: filters.locationId } : {}),
    ...(filters.source ? { source: filters.source } : {}),
    AND: [notQuarantined()],
  };
}

function bookingWhere(start: Date, end: Date, filters: InsightsFilters): Prisma.BookingWhereInput {
  return {
    createdAt: createdAtRange(start, end),
    ...(filters.serviceId ? { serviceId: filters.serviceId } : {}),
    ...(filters.locationId ? { locationId: filters.locationId } : {}),
  };
}

function quoteWhere(start: Date, end: Date, filters: InsightsFilters): Prisma.QuoteWhereInput {
  return {
    createdAt: createdAtRange(start, end),
    ...(filters.serviceId ? { serviceId: filters.serviceId } : {}),
    ...(filters.locationId ? { locationId: filters.locationId } : {}),
  };
}

function invoiceWhere(start: Date, end: Date, filters: InsightsFilters, field: "createdAt" | "updatedAt"): Prisma.InvoiceWhereInput {
  const scoped: Prisma.InvoiceWhereInput[] = [];
  if (filters.serviceId) {
    scoped.push({
      OR: [{ quote: { is: { serviceId: filters.serviceId } } }, { booking: { is: { serviceId: filters.serviceId } } }],
    });
  }
  if (filters.locationId) {
    scoped.push({
      OR: [{ quote: { is: { locationId: filters.locationId } } }, { booking: { is: { locationId: filters.locationId } } }],
    });
  }
  return {
    [field]: createdAtRange(start, end),
    ...(scoped.length ? { AND: scoped } : {}),
  };
}

function workOrderWhere(start: Date, end: Date, filters: InsightsFilters, field: "createdAt" | "updatedAt"): Prisma.WorkOrderWhereInput {
  return {
    [field]: createdAtRange(start, end),
    ...(filters.serviceId ? { serviceId: filters.serviceId } : {}),
    ...(filters.locationId ? { locationId: filters.locationId } : {}),
  };
}

async function distinctVisitors(start: Date, end: Date, names?: readonly string[]) {
  const rows = await prisma.analyticsEvent.groupBy({
    by: ["visitorId"],
    where: {
      createdAt: createdAtRange(start, end),
      visitor: { optedOut: false },
      ...(names ? { name: { in: [...names] } } : {}),
    },
  });
  return rows.length;
}

function rate(num: number, den: number) {
  if (!den) return null;
  return Math.round((num / den) * 1000) / 10;
}

function delta(current: number, previous: number) {
  if (!previous) return null;
  return current - previous;
}

function qs(filters: InsightsFilters, extra: Record<string, string>) {
  const params = new URLSearchParams();
  if (filters.from) params.set("from", filters.from);
  if (filters.to) params.set("to", filters.to);
  if (filters.serviceId) params.set("serviceId", filters.serviceId);
  if (filters.locationId) params.set("locationId", filters.locationId);
  if (filters.source) params.set("source", filters.source);
  for (const [key, value] of Object.entries(extra)) params.set(key, value);
  const encoded = params.toString();
  return encoded ? `?${encoded}` : "";
}

export async function loadInsights(role: string, raw: InsightsFilters): Promise<InsightsPayload> {
  const window = resolveWindow(raw);
  const filters: InsightsFilters = { ...raw, from: window.fromDate, to: window.toDate };
  const sections = (["visitors", "funnel", "quality", "quotes", "bookings", "operations", "invoices", "reviews", "amc", "services", "locations", "sources"] as InsightsSection[]).filter(
    (section) => hasSection(role, section),
  );
  const { start, end, previousStart, previousEnd } = window;
  const empty: InsightsPayload = {
    window,
    sections,
    kpis: [],
    funnel: [],
    quality: { avgScore: null, classes: [], buckets: [] },
    services: [],
    locations: [],
    sources: [],
    operations: [],
    reviews: { total: 0, stars: [], conversion: null },
    amc: { active: 0, expiring: 0, expired: 0, visits: 0, renewals: "none" },
  };
  if (!sections.length) return empty;

  const currentLead = leadWhere(start, end, filters);
  const prevLead = leadWhere(previousStart, previousEnd, filters);
  const wantVisitors = sections.includes("visitors") || sections.includes("funnel");

  const [
    visitors,
    engaged,
    prevVisitors,
    prevEngaged,
    leads,
    prevLeads,
    qualified,
    prevQualified,
    hot,
    warm,
    reviewClass,
    spam,
    quotes,
    prevQuotes,
    bookings,
    prevBookings,
    confirmed,
    completed,
    prevCompleted,
    invoiced,
    paid,
    prevPaid,
  ] = await Promise.all([
    wantVisitors ? distinctVisitors(start, end) : 0,
    wantVisitors ? distinctVisitors(start, end, ENGAGED_EVENT_NAMES) : 0,
    wantVisitors ? distinctVisitors(previousStart, previousEnd) : 0,
    wantVisitors ? distinctVisitors(previousStart, previousEnd, ENGAGED_EVENT_NAMES) : 0,
    sections.includes("funnel") || sections.includes("quality") ? prisma.lead.count({ where: currentLead }) : 0,
    sections.includes("funnel") ? prisma.lead.count({ where: prevLead }) : 0,
    sections.includes("funnel") || sections.includes("quality")
      ? prisma.lead.count({ where: { ...currentLead, status: { in: CRM_QUALIFIED } } })
      : 0,
    sections.includes("funnel") ? prisma.lead.count({ where: { ...prevLead, status: { in: CRM_QUALIFIED } } }) : 0,
    sections.includes("quality")
      ? prisma.lead.count({ where: { ...currentLead, score: { is: { effectiveClass: "HOT", quarantined: false } } } })
      : 0,
    sections.includes("quality")
      ? prisma.lead.count({ where: { ...currentLead, score: { is: { effectiveClass: "WARM", quarantined: false } } } })
      : 0,
    sections.includes("quality")
      ? prisma.lead.count({ where: { ...currentLead, score: { is: { effectiveClass: "REVIEW", quarantined: false } } } })
      : 0,
    sections.includes("quality")
      ? prisma.lead.count({
          where: {
            createdAt: createdAtRange(start, end),
            score: { is: { quarantined: true } },
            ...(filters.serviceId ? { serviceId: filters.serviceId } : {}),
            ...(filters.locationId ? { locationId: filters.locationId } : {}),
            ...(filters.source ? { source: filters.source } : {}),
          },
        })
      : 0,
    sections.includes("quotes") || sections.includes("funnel")
      ? prisma.quote.count({ where: quoteWhere(start, end, filters) })
      : 0,
    sections.includes("funnel") ? prisma.quote.count({ where: quoteWhere(previousStart, previousEnd, filters) }) : 0,
    sections.includes("bookings") || sections.includes("funnel")
      ? prisma.booking.count({ where: bookingWhere(start, end, filters) })
      : 0,
    sections.includes("funnel") ? prisma.booking.count({ where: bookingWhere(previousStart, previousEnd, filters) }) : 0,
    sections.includes("bookings")
      ? prisma.booking.count({
          where: {
            confirmedAt: createdAtRange(start, end),
            ...(filters.serviceId ? { serviceId: filters.serviceId } : {}),
            ...(filters.locationId ? { locationId: filters.locationId } : {}),
          },
        })
      : 0,
    sections.includes("funnel") || sections.includes("operations") || sections.includes("bookings")
      ? prisma.booking.count({
          where: {
            status: "completed",
            updatedAt: createdAtRange(start, end),
            ...(filters.serviceId ? { serviceId: filters.serviceId } : {}),
            ...(filters.locationId ? { locationId: filters.locationId } : {}),
          },
        })
      : 0,
    sections.includes("funnel")
      ? prisma.booking.count({
          where: {
            status: "completed",
            updatedAt: createdAtRange(previousStart, previousEnd),
            ...(filters.serviceId ? { serviceId: filters.serviceId } : {}),
            ...(filters.locationId ? { locationId: filters.locationId } : {}),
          },
        })
      : 0,
    sections.includes("invoices")
      ? prisma.invoice.count({
          where: { ...invoiceWhere(start, end, filters, "createdAt"), status: { in: [...INVOICED_STATUSES] } },
        })
      : 0,
    sections.includes("invoices") || sections.includes("funnel")
      ? prisma.invoice.count({
          where: { ...invoiceWhere(start, end, filters, "updatedAt"), status: "PAID" },
        })
      : 0,
    sections.includes("funnel")
      ? prisma.invoice.count({
          where: { ...invoiceWhere(previousStart, previousEnd, filters, "updatedAt"), status: "PAID" },
        })
      : 0,
  ]);

  const kpis: NamedCount[] = [];
  if (sections.includes("visitors")) {
    kpis.push({ id: "visitors", label: "Visitors", count: visitors });
    kpis.push({ id: "engaged", label: "Engaged visitors", count: engaged });
  }
  if (sections.includes("funnel") || sections.includes("quality")) {
    kpis.push({ id: "leads", label: "Leads", count: leads, href: `/admin/leads${qs(filters, {})}` });
    kpis.push({
      id: "qualified",
      label: "CRM qualified",
      count: qualified,
      href: `/admin/leads${qs(filters, { qualified: "1" })}`,
    });
  }
  if (sections.includes("quality")) {
    kpis.push({ id: "hot", label: "HOT leads", count: hot, href: `/admin/leads${qs(filters, { class: "HOT" })}` });
    kpis.push({ id: "warm", label: "WARM leads", count: warm, href: `/admin/leads${qs(filters, { class: "WARM" })}` });
    kpis.push({ id: "review", label: "REVIEW leads", count: reviewClass, href: `/admin/leads${qs(filters, { class: "REVIEW" })}` });
    kpis.push({ id: "spam", label: "SPAM / quarantined", count: spam, href: `/admin/leads${qs(filters, { quarantine: "1" })}` });
  }
  if (sections.includes("quotes")) {
    kpis.push({ id: "quotes", label: "Quotes", count: quotes, href: `/admin/quotes${qs(filters, {})}` });
  }
  if (sections.includes("bookings")) {
    kpis.push({ id: "bookings", label: "Booking requests", count: bookings, href: `/admin/bookings${qs(filters, {})}` });
    kpis.push({
      id: "confirmed",
      label: "Confirmed bookings",
      count: confirmed,
      href: `/admin/bookings${qs(filters, { status: "confirmed" })}`,
    });
    kpis.push({
      id: "completed",
      label: "Completed jobs",
      count: completed,
      href: `/admin/bookings${qs(filters, { status: "completed" })}`,
    });
  }
  if (sections.includes("invoices")) {
    kpis.push({ id: "invoices", label: "Invoiced", count: invoiced, href: `/admin/invoices${qs(filters, { invoiced: "1" })}` });
    kpis.push({ id: "paid", label: "Paid invoices", count: paid, href: `/admin/invoices${qs(filters, { status: "PAID" })}` });
  }

  const funnelDefs = [
    sections.includes("visitors") || sections.includes("funnel")
      ? { id: "visitors", label: "Visitors", count: visitors, prev: prevVisitors }
      : null,
    sections.includes("visitors") || sections.includes("funnel")
      ? { id: "engaged", label: "Engaged", count: engaged, prev: prevEngaged }
      : null,
    sections.includes("funnel") ? { id: "leads", label: "Leads", count: leads, prev: prevLeads, href: `/admin/leads${qs(filters, {})}` } : null,
    sections.includes("funnel")
      ? { id: "qualified", label: "CRM qualified", count: qualified, prev: prevQualified, href: `/admin/leads${qs(filters, { qualified: "1" })}` }
      : null,
    sections.includes("quotes") || (sections.includes("funnel") && hasSection(role, "quotes"))
      ? { id: "quotes", label: "Quotes", count: quotes, prev: prevQuotes, href: `/admin/quotes${qs(filters, {})}` }
      : null,
    sections.includes("funnel") || sections.includes("bookings")
      ? { id: "bookings", label: "Bookings", count: bookings, prev: prevBookings, href: `/admin/bookings${qs(filters, {})}` }
      : null,
    sections.includes("funnel") || sections.includes("bookings")
      ? { id: "completed", label: "Completed", count: completed, prev: prevCompleted, href: `/admin/bookings${qs(filters, { status: "completed" })}` }
      : null,
    sections.includes("invoices") || (sections.includes("funnel") && hasSection(role, "invoices"))
      ? { id: "paid", label: "Paid", count: paid, prev: prevPaid, href: `/admin/invoices${qs(filters, { status: "PAID" })}` }
      : null,
  ].filter(Boolean) as Array<{ id: string; label: string; count: number; prev: number; href?: string }>;

  const funnel = funnelDefs.map((row, index) => ({
    id: row.id,
    label: row.label,
    count: row.count,
    rate: index === 0 ? null : rate(row.count, funnelDefs[index - 1].count),
    delta: delta(row.count, row.prev),
    href: row.href,
  }));

  let quality = empty.quality;
  if (sections.includes("quality")) {
    const [avg, normal, buckets] = await Promise.all([
      prisma.leadScore.aggregate({
        where: { lead: currentLead },
        _avg: { score: true },
      }),
      prisma.lead.count({ where: { ...currentLead, score: { is: { effectiveClass: "NORMAL", quarantined: false } } } }),
      Promise.all(
        SCORE_BUCKETS.map(async (bucket) => ({
          id: bucket.id,
          count: await prisma.leadScore.count({
            where: { score: { gte: bucket.gte, lte: bucket.lte }, lead: currentLead },
          }),
        })),
      ),
    ]);
    quality = {
      avgScore: avg._avg.score === null ? null : Math.round(avg._avg.score * 10) / 10,
      classes: [
        { id: "HOT", count: hot, href: `/admin/leads${qs(filters, { class: "HOT" })}` },
        { id: "WARM", count: warm, href: `/admin/leads${qs(filters, { class: "WARM" })}` },
        { id: "NORMAL", count: normal, href: `/admin/leads${qs(filters, { class: "NORMAL" })}` },
        { id: "REVIEW", count: reviewClass, href: `/admin/leads${qs(filters, { class: "REVIEW" })}` },
        { id: "SPAM", count: spam, href: `/admin/leads${qs(filters, { quarantine: "1" })}` },
      ],
      buckets,
    };
  }

  let services: InsightsPayload["services"] = [];
  if (sections.includes("services")) {
    const [leadGroups, bookingGroups, viewGroups, active] = await Promise.all([
      prisma.lead.groupBy({ by: ["serviceId"], where: currentLead, _count: { _all: true } }),
      prisma.booking.groupBy({ by: ["serviceId"], where: bookingWhere(start, end, filters), _count: { _all: true } }),
      prisma.analyticsEvent.groupBy({
        by: ["entityId"],
        where: {
          name: "SERVICE_VIEW",
          createdAt: createdAtRange(start, end),
          visitor: { optedOut: false },
          entityId: { not: null },
        },
        _count: { _all: true },
      }),
      prisma.service.findMany({
        where: { status: "active" },
        include: { translations: true },
      }),
    ]);
    const hotByService = await prisma.lead.groupBy({
      by: ["serviceId"],
      where: { ...currentLead, score: { is: { effectiveClass: "HOT", quarantined: false } } },
      _count: { _all: true },
    });
    const qualifiedByService = await prisma.lead.groupBy({
      by: ["serviceId"],
      where: { ...currentLead, status: { in: CRM_QUALIFIED } },
      _count: { _all: true },
    });
    const slugById = new Map(active.map((row) => [row.slug, row.id]));
    for (const service of active) {
      const leadsCount = leadGroups.find((row) => row.serviceId === service.id)?._count._all || 0;
      const bookingsCount = bookingGroups.find((row) => row.serviceId === service.id)?._count._all || 0;
      const views = viewGroups.find((row) => row.entityId === service.slug || slugById.get(row.entityId || "") === service.id)?._count._all || 0;
      if (!leadsCount && !bookingsCount && !views) continue;
      services.push({
        id: service.id,
        label: pickI18n(service.translations, "en")?.name || service.slug,
        views,
        leads: leadsCount,
        qualified: qualifiedByService.find((row) => row.serviceId === service.id)?._count._all || 0,
        hot: hotByService.find((row) => row.serviceId === service.id)?._count._all || 0,
        bookings: bookingsCount,
        href: `/admin/leads${qs(filters, { serviceId: service.id })}`,
      });
    }
    services = services.slice(0, 50);
  }

  const locations: InsightsPayload["locations"] = [];
  if (sections.includes("locations")) {
    const [leadLoc, bookingLoc, emirates] = await Promise.all([
      prisma.lead.groupBy({ by: ["locationId"], where: currentLead, _count: { _all: true } }),
      prisma.booking.groupBy({ by: ["locationId"], where: bookingWhere(start, end, filters), _count: { _all: true } }),
      prisma.location.findMany({
        where: { type: "emirate", status: "active" },
        include: { translations: true },
      }),
    ]);
    const completedLoc = await prisma.booking.groupBy({
      by: ["locationId"],
      where: {
        status: "completed",
        updatedAt: createdAtRange(start, end),
        ...(filters.serviceId ? { serviceId: filters.serviceId } : {}),
        ...(filters.locationId ? { locationId: filters.locationId } : {}),
      },
      _count: { _all: true },
    });
    for (const loc of emirates) {
      const leadsCount = leadLoc.find((row) => row.locationId === loc.id)?._count._all || 0;
      const bookingsCount = bookingLoc.find((row) => row.locationId === loc.id)?._count._all || 0;
      const done = completedLoc.find((row) => row.locationId === loc.id)?._count._all || 0;
      if (!leadsCount && !bookingsCount && !done) continue;
      locations.push({
        id: loc.id,
        label: pickI18n(loc.translations, "en")?.name || loc.slug,
        leads: leadsCount,
        bookings: bookingsCount,
        completed: done,
        href: `/admin/leads${qs(filters, { locationId: loc.id })}`,
      });
    }
    const unknownLeads = leadLoc.find((row) => !row.locationId)?._count._all || 0;
    const unknownBookings = bookingLoc.find((row) => !row.locationId)?._count._all || 0;
    const unknownCompleted = completedLoc.find((row) => !row.locationId)?._count._all || 0;
    if (unknownLeads || unknownBookings || unknownCompleted) {
      locations.push({
        id: "unknown",
        label: "Unknown / not captured",
        leads: unknownLeads,
        bookings: unknownBookings,
        completed: unknownCompleted,
      });
    }
  }

  let sources: NamedCount[] = [];
  if (sections.includes("sources")) {
    const grouped = await prisma.lead.groupBy({
      by: ["source"],
      where: currentLead,
      _count: { _all: true },
    });
    sources = grouped.map((row) => ({
      id: row.source,
      label: row.source || "Unknown / not captured",
      count: row._count._all,
      href: `/admin/leads${qs(filters, { source: row.source })}`,
    }));
    sources.push({ id: "traffic", label: "Traffic campaign / UTM / referrer: Unknown / not captured", count: 0 });
  }

  let operations: NamedCount[] = [];
  if (sections.includes("operations")) {
    const [openWo, doneWo] = await Promise.all([
      prisma.workOrder.count({
        where: { ...workOrderWhere(start, end, filters, "createdAt"), status: { not: "completed" } },
      }),
      prisma.workOrder.count({
        where: { ...workOrderWhere(start, end, filters, "updatedAt"), status: "completed" },
      }),
    ]);
    operations = [
      { id: "open-wo", label: "Open work orders created", count: openWo, href: `/admin/work-orders${qs(filters, {})}` },
      { id: "done-wo", label: "Work orders completed", count: doneWo, href: `/admin/work-orders${qs(filters, { status: "completed" })}` },
      {
        id: "completed-bookings",
        label: "Bookings completed",
        count: completed,
        href: `/admin/bookings${qs(filters, { status: "completed" })}`,
      },
    ];
  }

  let reviews = empty.reviews;
  if (sections.includes("reviews")) {
    const where: Prisma.ReviewWhereInput = {
      type: "service",
      status: { in: ["APPROVED", "VERIFIED"] },
      createdAt: createdAtRange(start, end),
    };
    const [total, stars, completedWithReview] = await Promise.all([
      prisma.review.count({ where }),
      prisma.review.groupBy({ by: ["stars"], where, _count: { _all: true } }),
      completed
        ? prisma.review.count({
            where: {
              type: "service",
              status: { in: ["APPROVED", "VERIFIED"] },
              booking: { status: "completed", updatedAt: createdAtRange(start, end) },
            },
          })
        : Promise.resolve(0),
    ]);
    reviews = {
      total,
      stars: stars.map((row) => ({ stars: row.stars, count: row._count._all })),
      conversion: rate(completedWithReview, completed),
    };
    kpis.push({
      id: "reviews",
      label: "Approved service reviews",
      count: total,
      href: `/admin/reviews${qs(filters, { type: "service", approved: "1" })}`,
    });
  }

  let amc = empty.amc;
  if (sections.includes("amc")) {
    const now = new Date();
    const soon = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const [active, expiring, expired, visits] = await Promise.all([
      prisma.amcContract.count({
        where: {
          AND: [
            { OR: [{ startDate: null }, { startDate: { lte: now } }] },
            { OR: [{ endDate: null }, { endDate: { gte: now } }] },
          ],
        },
      }),
      prisma.amcContract.count({ where: { endDate: { gte: now, lte: soon } } }),
      prisma.amcContract.count({ where: { endDate: { lt: now } } }),
      prisma.booking.count({ where: { type: "amc_visit", createdAt: createdAtRange(start, end) } }),
    ]);
    amc = { active, expiring, expired, visits, renewals: "none" };
    kpis.push({ id: "amc", label: "Active AMC contracts", count: active });
  }

  return { window, sections, kpis, funnel, quality, services, locations, sources, operations, reviews, amc };
}
