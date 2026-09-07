import { parseJson } from "@/lib/utils";
import { prisma } from "@/server/db";
import { resolveJourneyGraph } from "@/lib/journey/graph";
import { sanitizeFacts } from "@/lib/journey/privacy";
import {
  canViewIdentifiableJourney,
  kindAllowed,
  mayLink,
  maySeeInvoiceAmounts,
  maySeeLeadQuality,
} from "@/lib/journey/rbac";
import {
  ANALYTICS_EVENT_CAP,
  JOURNEY_PAGE_SIZE,
  type JourneyPage,
  type JourneyScope,
  type LeadQualitySnapshot,
  type TimelineItem,
  type TimelineKind,
} from "@/lib/journey/types";

const CONVERSION_EVENTS = new Set([
  "QUOTE_START",
  "QUOTE_SUBMIT",
  "BOOKING_START",
  "BOOKING_SUBMIT",
  "CONTACT_SUBMIT",
  "AI_OPEN",
]);

const IMPORTANT_VIEWS = new Set(["SERVICE_VIEW", "LOCATION_VIEW", "DIY_VIEW"]);

type BuildOpts = {
  role: string;
  staffId?: string | null;
  page?: number;
};

function item(
  partial: Omit<TimelineItem, "facts"> & { facts?: TimelineItem["facts"] },
): TimelineItem {
  return {
    ...partial,
    facts: sanitizeFacts(partial.kind, partial.facts || {}),
  };
}

function hrefFor(role: string, entity: string, id: string) {
  if (!mayLink(role, entity)) return undefined;
  if (entity === "Lead") return `/admin/leads/${id}`;
  if (entity === "Customer") return `/admin/customers/${id}`;
  if (entity === "Booking") return `/admin/bookings/${id}`;
  if (entity === "WorkOrder") return `/admin/work-orders/${id}`;
  if (entity === "Quote") return `/admin/quotes/${id}`;
  if (entity === "Invoice") return `/admin/invoices/${id}`;
  if (entity === "Review") return `/admin/reviews`;
  return undefined;
}

export async function buildJourney(scope: JourneyScope, opts: BuildOpts): Promise<JourneyPage> {
  const page = Math.max(1, opts.page || 1);
  if (!canViewIdentifiableJourney(opts.role, scope.type)) {
    return { items: [], quality: [], optedOut: false, page, pageSize: JOURNEY_PAGE_SIZE, total: 0 };
  }

  const graph = await resolveJourneyGraph(scope, { role: opts.role, staffId: opts.staffId });
  const items: TimelineItem[] = [];

  const [
    visitors,
    leads,
    bookings,
    quotes,
    workOrders,
    invoices,
    payments,
    reviews,
    amcs,
    conversations,
    scores,
    scoreHistory,
  ] = await Promise.all([
    graph.visitorIds.length
      ? prisma.visitor.findMany({
          where: { id: { in: graph.visitorIds } },
          select: { id: true, createdAt: true, optedOut: true },
        })
      : Promise.resolve([]),
    graph.leadIds.length
      ? prisma.lead.findMany({
          where: { id: { in: graph.leadIds } },
          select: {
            id: true,
            createdAt: true,
            source: true,
            service: { select: { slug: true } },
            location: { select: { slug: true } },
          },
        })
      : Promise.resolve([]),
    graph.bookingIds.length
      ? prisma.booking.findMany({
          where: { id: { in: graph.bookingIds } },
          select: {
            id: true,
            number: true,
            type: true,
            status: true,
            createdAt: true,
            updatedAt: true,
            confirmedAt: true,
            technicianId: true,
            supervisorId: true,
          },
        })
      : Promise.resolve([]),
    graph.quoteIds.length
      ? prisma.quote.findMany({
          where: { id: { in: graph.quoteIds } },
          select: {
            id: true,
            quoteNumber: true,
            status: true,
            createdAt: true,
            updatedAt: true,
            sentAt: true,
            serviceLabel: true,
            locationLabel: true,
            totalLabel: true,
          },
        })
      : Promise.resolve([]),
    graph.workOrderIds.length
      ? prisma.workOrder.findMany({
          where: { id: { in: graph.workOrderIds } },
          select: {
            id: true,
            number: true,
            status: true,
            createdAt: true,
            updatedAt: true,
            qcResult: true,
            serviceLabel: true,
            locationLabel: true,
          },
        })
      : Promise.resolve([]),
    graph.invoiceIds.length
      ? prisma.invoice.findMany({
          where: { id: { in: graph.invoiceIds } },
          select: { id: true, number: true, status: true, createdAt: true, updatedAt: true, totalLabel: true },
        })
      : Promise.resolve([]),
    graph.invoiceIds.length
      ? prisma.payment.findMany({
          where: { invoiceId: { in: graph.invoiceIds } },
          select: { id: true, invoiceId: true, status: true, createdAt: true, reference: true },
        })
      : Promise.resolve([]),
    graph.reviewIds.length
      ? prisma.review.findMany({
          where: { id: { in: graph.reviewIds } },
          select: { id: true, stars: true, status: true, createdAt: true },
        })
      : Promise.resolve([]),
    graph.amcIds.length
      ? prisma.amcContract.findMany({
          where: { id: { in: graph.amcIds } },
          select: {
            id: true,
            createdAt: true,
            startDate: true,
            endDate: true,
            frequency: true,
            contractValue: true,
          },
        })
      : Promise.resolve([]),
    graph.conversationIds.length
      ? prisma.aiConversation.findMany({
          where: { id: { in: graph.conversationIds } },
          select: { id: true, createdAt: true, photoIds: true },
        })
      : Promise.resolve([]),
    graph.leadIds.length && maySeeLeadQuality(opts.role)
      ? prisma.leadScore.findMany({ where: { leadId: { in: graph.leadIds } } })
      : Promise.resolve([]),
    graph.leadIds.length && maySeeLeadQuality(opts.role)
      ? prisma.leadScoreHistory.findMany({
          where: { leadId: { in: graph.leadIds } },
          orderBy: { createdAt: "desc" },
          take: 40,
        })
      : Promise.resolve([]),
  ]);

  const optedOut = visitors.some((row) => row.optedOut) || graph.optedOut;

  for (const visitor of visitors) {
    items.push(
      item({
        id: `visitor-first-${visitor.id}`,
        kind: "visitor.first_seen",
        occurredAt: visitor.createdAt,
        actorKind: "system",
        entity: "Visitor",
        entityId: visitor.id,
        title: "Anonymous first visit",
        certainty: "historical",
        facts: { optedOut: visitor.optedOut },
      }),
    );
  }

  if (!optedOut && graph.visitorIds.length && kindAllowed(opts.role, "visit.landing")) {
    const events = await prisma.analyticsEvent.findMany({
      where: { visitorId: { in: graph.visitorIds } },
      orderBy: { createdAt: "asc" },
      take: 300,
      select: { id: true, name: true, path: true, entityId: true, entityType: true, meta: true, createdAt: true },
    });
    const pageViews = events.filter((row) => row.name === "PAGE_VIEW");
    const firstView = pageViews[0];
    if (firstView) {
      items.push(
        item({
          id: `landing-${firstView.id}`,
          kind: "visit.landing",
          occurredAt: firstView.createdAt,
          actorKind: "customer",
          entity: "AnalyticsEvent",
          entityId: firstView.id,
          title: "Landing page",
          certainty: "historical",
          facts: { path: firstView.path || "/", attribution: "unknown" },
        }),
      );
    }
    const conversion = events.find((row) => CONVERSION_EVENTS.has(row.name));
    const lastTouch = [...pageViews]
      .reverse()
      .find((row) => !conversion || row.createdAt <= conversion.createdAt);
    if (lastTouch && lastTouch.id !== firstView?.id) {
      items.push(
        item({
          id: `last-touch-${lastTouch.id}`,
          kind: "visit.last_touch",
          occurredAt: lastTouch.createdAt,
          actorKind: "customer",
          entity: "AnalyticsEvent",
          entityId: lastTouch.id,
          title: "Last-touch path before conversion",
          certainty: "historical",
          facts: { path: lastTouch.path || "/", attribution: "unknown" },
        }),
      );
    }

    const viewCounts = new Map<string, { count: number; last: Date; name: string; entityId: string | null }>();
    for (const row of events) {
      if (!IMPORTANT_VIEWS.has(row.name)) continue;
      const key = `${row.name}:${row.entityType || ""}:${row.entityId || row.path || ""}`;
      const current = viewCounts.get(key);
      if (current) {
        current.count += 1;
        current.last = row.createdAt;
      } else {
        viewCounts.set(key, { count: 1, last: row.createdAt, name: row.name, entityId: row.entityId });
      }
    }
    let emittedViews = 0;
    for (const [key, value] of viewCounts) {
      if (emittedViews >= ANALYTICS_EVENT_CAP) break;
      emittedViews += 1;
      items.push(
        item({
          id: `view-${key}`,
          kind: "visit.important_view",
          occurredAt: value.last,
          actorKind: "customer",
          entity: "AnalyticsEvent",
          entityId: value.entityId || key,
          title: value.name.replace("_", " ").toLowerCase(),
          certainty: "historical",
          facts: { view: value.name, slug: value.entityId, count: value.count },
        }),
      );
    }

    const aiEvents = events.filter((row) => row.name.startsWith("AI_") || row.name === "PHOTO_UPLOAD");
    if (aiEvents.some((row) => row.name === "AI_OPEN")) {
      const opened = aiEvents.find((row) => row.name === "AI_OPEN")!;
      items.push(
        item({
          id: `ai-open-${opened.id}`,
          kind: "ai.opened",
          occurredAt: opened.createdAt,
          actorKind: "customer",
          entity: "AnalyticsEvent",
          entityId: opened.id,
          title: "AI opened",
          certainty: "historical",
          facts: { opened: true },
        }),
      );
    }
    const messageCount = aiEvents.filter((row) => row.name === "AI_MESSAGE").length;
    const photoCount = conversations.reduce((sum, row) => {
      const ids = parseJson<string[]>(row.photoIds, []);
      return sum + ids.length;
    }, 0) || aiEvents.filter((row) => row.name === "PHOTO_UPLOAD").length;
    if (messageCount || photoCount) {
      const lastAi = aiEvents[aiEvents.length - 1] || conversations[0];
      if (lastAi) {
        items.push(
          item({
            id: "ai-summary",
            kind: "ai.summary",
            occurredAt: "createdAt" in lastAi ? lastAi.createdAt : new Date(),
            actorKind: "system",
            entity: "AiConversation",
            entityId: conversations[0]?.id || "ai",
            title: "AI activity",
            certainty: "historical",
            facts: { messageCount, photoCount },
          }),
        );
      }
    }
    for (const row of aiEvents.filter((event) => event.name === "AI_SERVICE_SUGGESTION")) {
      const meta = parseJson<Record<string, string | number>>(row.meta, {});
      items.push(
        item({
          id: `ai-suggest-${row.id}`,
          kind: "ai.suggestion",
          occurredAt: row.createdAt,
          actorKind: "system",
          entity: "AnalyticsEvent",
          entityId: row.id,
          title: "AI service suggestion",
          certainty: "historical",
          facts: {
            suggestion: String(meta.slug || row.entityId || ""),
            riskClass: String(meta.riskClass || ""),
          },
        }),
      );
    }
    for (const row of aiEvents.filter((event) => event.name === "AI_HANDOVER")) {
      items.push(
        item({
          id: `ai-handover-${row.id}`,
          kind: "ai.handover",
          occurredAt: row.createdAt,
          actorKind: "system",
          entity: "AnalyticsEvent",
          entityId: row.id,
          title: "AI handover",
          certainty: "historical",
          facts: { handover: true },
        }),
      );
    }
  }

  for (const lead of leads) {
    items.push(
      item({
        id: `lead-created-${lead.id}`,
        kind: "lead.created",
        occurredAt: lead.createdAt,
        actorKind: "customer",
        entity: "Lead",
        entityId: lead.id,
        title: "Lead created",
        certainty: "historical",
        facts: { source: lead.source, service: lead.service?.slug || null, location: lead.location?.slug || null },
        href: hrefFor(opts.role, "Lead", lead.id),
      }),
    );
  }

  const quality: LeadQualitySnapshot[] = scores.map((row) => ({
    leadId: row.leadId,
    score: row.score,
    systemClass: row.systemClass,
    humanClass: row.humanClass,
    effectiveClass: row.effectiveClass,
    reasons: parseJson(row.reasonsJson, [] as LeadQualitySnapshot["reasons"]),
    computedAt: row.computedAt,
    overrideAt: row.overrideAt,
  }));

  for (const row of scores) {
    items.push(
      item({
        id: `lead-scored-${row.id}`,
        kind: "lead.scored",
        occurredAt: row.computedAt,
        actorKind: "system",
        entity: "LeadScore",
        entityId: row.id,
        title: "Lead quality scored",
        certainty: "current",
        facts: {
          score: row.score,
          systemClass: row.systemClass,
          humanClass: row.humanClass,
          effectiveClass: row.effectiveClass,
        },
        href: hrefFor(opts.role, "Lead", row.leadId),
      }),
    );
  }
  for (const row of scoreHistory.filter((history) => history.cause === "OVERRIDE")) {
    items.push(
      item({
        id: `lead-override-${row.id}`,
        kind: "lead.override",
        occurredAt: row.createdAt,
        actorKind: "staff",
        actor: row.actor,
        entity: "LeadScoreHistory",
        entityId: row.id,
        title: "Human quality override",
        certainty: "historical",
        facts: { effectiveClass: row.effectiveClass, systemClass: row.systemClass, note: row.note },
      }),
    );
  }

  const showAmounts = maySeeInvoiceAmounts(opts.role);
  for (const quote of quotes) {
    items.push(
      item({
        id: `quote-created-${quote.id}`,
        kind: "quote.created",
        occurredAt: quote.createdAt,
        actorKind: "staff",
        entity: "Quote",
        entityId: quote.id,
        title: "Quote created",
        certainty: "historical",
        facts: { number: quote.quoteNumber, service: quote.serviceLabel, location: quote.locationLabel },
        href: hrefFor(opts.role, "Quote", quote.id),
      }),
    );
    items.push(
      item({
        id: `quote-current-${quote.id}`,
        kind: "quote.status_current",
        occurredAt: quote.updatedAt,
        actorKind: "transaction",
        entity: "Quote",
        entityId: quote.id,
        title: "Quote current status",
        certainty: "current",
        facts: { status: quote.status, ...(showAmounts && quote.totalLabel ? { total: quote.totalLabel } : {}) },
        href: hrefFor(opts.role, "Quote", quote.id),
      }),
    );
    if (quote.sentAt) {
      items.push(
        item({
          id: `quote-sent-${quote.id}`,
          kind: "quote.sent",
          occurredAt: quote.sentAt,
          actorKind: "staff",
          entity: "Quote",
          entityId: quote.id,
          title: "Quote sent",
          certainty: "historical",
          facts: { status: "SENT" },
        }),
      );
    }
    if (quote.status === "ACCEPTED" || quote.status === "REJECTED") {
      items.push(
        item({
          id: `quote-decided-${quote.id}`,
          kind: "quote.decided",
          occurredAt: quote.updatedAt,
          actorKind: "customer",
          entity: "Quote",
          entityId: quote.id,
          title: `Quote ${quote.status.toLowerCase()}`,
          certainty: "historical",
          facts: { status: quote.status },
        }),
      );
    }
  }

  for (const booking of bookings) {
    items.push(
      item({
        id: `booking-requested-${booking.id}`,
        kind: "booking.requested",
        occurredAt: booking.createdAt,
        actorKind: "customer",
        entity: "Booking",
        entityId: booking.id,
        title: "Booking requested",
        certainty: "historical",
        facts: { number: booking.number, type: booking.type },
        href: hrefFor(opts.role, "Booking", booking.id),
      }),
    );
    items.push(
      item({
        id: `booking-current-${booking.id}`,
        kind: "booking.status_current",
        occurredAt: booking.updatedAt,
        actorKind: "transaction",
        entity: "Booking",
        entityId: booking.id,
        title: "Booking current status",
        certainty: "current",
        facts: { status: booking.status, number: booking.number },
        href: hrefFor(opts.role, "Booking", booking.id),
      }),
    );
    if (booking.confirmedAt) {
      items.push(
        item({
          id: `booking-confirmed-${booking.id}`,
          kind: "booking.confirmed",
          occurredAt: booking.confirmedAt,
          actorKind: "staff",
          entity: "Booking",
          entityId: booking.id,
          title: "Booking confirmed",
          certainty: "historical",
          facts: { number: booking.number },
        }),
      );
    }
  }

  for (const wo of workOrders) {
    items.push(
      item({
        id: `wo-created-${wo.id}`,
        kind: "work_order.created",
        occurredAt: wo.createdAt,
        actorKind: "staff",
        entity: "WorkOrder",
        entityId: wo.id,
        title: "Work order created",
        certainty: "historical",
        facts: { number: wo.number, service: wo.serviceLabel, location: wo.locationLabel },
        href: hrefFor(opts.role, "WorkOrder", wo.id),
      }),
    );
    items.push(
      item({
        id: `wo-current-${wo.id}`,
        kind: "work_order.status_current",
        occurredAt: wo.updatedAt,
        actorKind: "transaction",
        entity: "WorkOrder",
        entityId: wo.id,
        title: "Work order current status",
        certainty: "current",
        facts: { status: wo.status, number: wo.number },
        href: hrefFor(opts.role, "WorkOrder", wo.id),
      }),
    );
    if (wo.status === "in_progress") {
      items.push(
        item({
          id: `wo-started-${wo.id}`,
          kind: "work_order.started",
          occurredAt: wo.updatedAt,
          actorKind: "staff",
          entity: "WorkOrder",
          entityId: wo.id,
          title: "Job in progress",
          certainty: "current",
          facts: { status: wo.status },
        }),
      );
    }
    if (wo.qcResult || wo.status === "qc_failed") {
      items.push(
        item({
          id: `wo-qc-${wo.id}`,
          kind: "work_order.qc",
          occurredAt: wo.updatedAt,
          actorKind: "staff",
          entity: "WorkOrder",
          entityId: wo.id,
          title: "QC recorded",
          certainty: wo.status === "qc_failed" ? "current" : "historical",
          facts: { qcResult: wo.qcResult || wo.status },
        }),
      );
    }
    if (wo.status === "completed") {
      items.push(
        item({
          id: `wo-completed-${wo.id}`,
          kind: "work_order.completed",
          occurredAt: wo.updatedAt,
          actorKind: "staff",
          entity: "WorkOrder",
          entityId: wo.id,
          title: "Job completed",
          certainty: "current",
          facts: { status: wo.status },
        }),
      );
    }
  }

  for (const invoice of invoices) {
    items.push(
      item({
        id: `invoice-created-${invoice.id}`,
        kind: "invoice.created",
        occurredAt: invoice.createdAt,
        actorKind: "transaction",
        entity: "Invoice",
        entityId: invoice.id,
        title: "Invoice created",
        certainty: "historical",
        facts: { number: invoice.number, ...(showAmounts && invoice.totalLabel ? { total: invoice.totalLabel } : {}) },
        href: hrefFor(opts.role, "Invoice", invoice.id),
      }),
    );
    items.push(
      item({
        id: `invoice-current-${invoice.id}`,
        kind: "invoice.status_current",
        occurredAt: invoice.updatedAt,
        actorKind: "transaction",
        entity: "Invoice",
        entityId: invoice.id,
        title: "Invoice current status",
        certainty: "current",
        facts: { status: invoice.status, number: invoice.number },
      }),
    );
  }

  for (const payment of payments) {
    items.push(
      item({
        id: `payment-${payment.id}`,
        kind: "payment.recorded",
        occurredAt: payment.createdAt,
        actorKind: "transaction",
        entity: "Payment",
        entityId: payment.id,
        title: "Payment record",
        certainty: "current",
        facts: { status: payment.status, reference: payment.reference },
      }),
    );
  }

  for (const review of reviews) {
    items.push(
      item({
        id: `review-${review.id}`,
        kind: "review.submitted",
        occurredAt: review.createdAt,
        actorKind: "customer",
        entity: "Review",
        entityId: review.id,
        title: "Review submitted",
        certainty: "historical",
        facts: { stars: review.stars, status: review.status },
        href: hrefFor(opts.role, "Review", review.id),
      }),
    );
  }

  for (const amc of amcs) {
    items.push(
      item({
        id: `amc-${amc.id}`,
        kind: "amc.active",
        occurredAt: amc.startDate || amc.createdAt,
        actorKind: "transaction",
        entity: "AmcContract",
        entityId: amc.id,
        title: "AMC relationship",
        certainty: "current",
        facts: {
          frequency: amc.frequency,
          start: amc.startDate ? amc.startDate.toISOString().slice(0, 10) : null,
          end: amc.endDate ? amc.endDate.toISOString().slice(0, 10) : null,
          ...(showAmounts && amc.contractValue ? { value: amc.contractValue } : {}),
        },
      }),
    );
  }

  const entityIds = [
    ...graph.leadIds,
    ...graph.bookingIds,
    ...graph.quoteIds,
    ...graph.workOrderIds,
    ...graph.invoiceIds,
  ];
  if (entityIds.length) {
    const audits = await prisma.auditLog.findMany({
      where: { entityId: { in: entityIds } },
      orderBy: { createdAt: "desc" },
      take: 80,
      select: { id: true, action: true, entity: true, entityId: true, actor: true, createdAt: true, meta: true },
    });
    const assigned = new Set<string>();
    for (const audit of audits) {
      if (audit.action === "booking.assign" || audit.action === "booking.admin.assign") {
        if (assigned.has(audit.entityId)) continue;
        assigned.add(audit.entityId);
        const meta = parseJson<Record<string, string | null>>(audit.meta, {});
        items.push(
          item({
            id: `booking-assigned-${audit.id}`,
            kind: "booking.assigned",
            occurredAt: audit.createdAt,
            actorKind: "staff",
            actor: audit.actor,
            entity: "Booking",
            entityId: audit.entityId,
            title: "Staff assigned",
            certainty: "historical",
            facts: { technicianId: meta.technicianId || null, supervisorId: meta.supervisorId || null },
            href: hrefFor(opts.role, "Booking", audit.entityId),
          }),
        );
        continue;
      }
      if (audit.action === "lead.quality.override" || audit.action === "lead.quality.score" || audit.action === "lead.quality.recompute") {
        continue;
      }
      if (audit.action === "booking.confirm") continue;
      const gate: Partial<Record<string, TimelineKind>> = {
        Invoice: "invoice.created",
        Quote: "quote.created",
        Lead: "lead.created",
        Booking: "booking.requested",
        WorkOrder: "work_order.created",
      };
      const required = gate[audit.entity];
      if (required && !kindAllowed(opts.role, required)) continue;
      items.push(
        item({
          id: `audit-${audit.id}`,
          kind: "audit.historical",
          occurredAt: audit.createdAt,
          actorKind: "staff",
          actor: audit.actor,
          entity: audit.entity,
          entityId: audit.entityId,
          title: `Historical audit: ${audit.action}`,
          certainty: "historical",
          facts: { action: audit.action },
        }),
      );
    }
  }

  const filtered = items
    .filter((row) => kindAllowed(opts.role, row.kind as TimelineKind))
    .sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime());
  const start = (page - 1) * JOURNEY_PAGE_SIZE;
  return {
    items: filtered.slice(start, start + JOURNEY_PAGE_SIZE),
    quality,
    optedOut,
    page,
    pageSize: JOURNEY_PAGE_SIZE,
    total: filtered.length,
  };
}
