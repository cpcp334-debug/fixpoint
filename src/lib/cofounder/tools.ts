import { prisma } from "@/server/db";
import { loadInsights } from "@/lib/insights/query";
import { hasSection } from "@/lib/insights/rbac";
import { buildJourney } from "@/lib/journey/aggregate";
import type { JourneyScopeType } from "@/lib/journey/types";
import { journeyTypeAllowed, narrowerRole, toolAllowed } from "@/lib/cofounder/rbac";
import { sanitizeCofounderData } from "@/lib/cofounder/privacy";
import {
  isForbiddenCofounderTool,
  type CofounderSession,
  type ToolArgs,
  type ToolResult,
} from "@/lib/cofounder/types";
import { can } from "@/lib/admin/rbac";
import { getSopForSession, searchInternalSopsForSession } from "@/lib/knowledge/sops";
import { createTaskProposal, getFollowupGaps } from "@/lib/cofounder/proposals";
import { getPriorityActions } from "@/lib/cofounder/priority";
import { BUSINESS_TZ, resolveWindow } from "@/lib/insights/dates";

function argString(args: ToolArgs, key: string) {
  const value = args[key];
  return typeof value === "string" && value.trim() ? value.trim() : "";
}

function allowed(session: CofounderSession, tool: string) {
  return toolAllowed(session.role, tool) && toolAllowed(session.frozenRole, tool);
}

function deny(error: string): ToolResult {
  return { ok: false, denied: true, error };
}

function ok(data: unknown): ToolResult {
  return { ok: true, data: sanitizeCofounderData(data) };
}

export async function executeCofounderTool(session: CofounderSession, name: string, args: ToolArgs = {}): Promise<ToolResult> {
  if (isForbiddenCofounderTool(name)) return deny(name.startsWith("search") || name.includes("sop") ? "knowledge_unavailable" : "write_forbidden");
  if (!allowed(session, name)) return deny("forbidden");
  try {
    if (name === "get_daily_brief") return ok(await dailyBrief(session, argString(args, "range") || "today"));
    if (name === "get_lead_summary") return leadSummary(session, argString(args, "id"));
    if (name === "get_hot_leads") return hotLeads();
    if (name === "get_lead_quality") return leadQuality(argString(args, "id"));
    if (name === "get_quote_pipeline") return quotePipeline();
    if (name === "get_booking_pipeline") return bookingPipeline();
    if (name === "get_work_order_status") return workOrderStatus(session, argString(args, "id"));
    if (name === "get_invoice_status") return invoiceStatus();
    if (name === "get_payment_status") return paymentStatus();
    if (name === "get_review_summary") return reviewSummary();
    if (name === "get_qna_summary") return qnaSummary();
    if (name === "get_amc_expiring") return amcExpiring();
    if (name === "get_service_performance") return servicePerformance(session);
    if (name === "get_location_performance") return locationPerformance(session);
    if (name === "get_customer_journey") return customerJourney(session, args);
    if (name === "get_sop") return getSop(session, args);
    if (name === "search_internal_sop") return searchSop(session, args);
    if (name === "get_followup_gaps") return ok(await getFollowupGaps());
    if (name === "get_priority_actions") return ok({ actions: await getPriorityActions(session, 8), note: "Counts from existing records only." });
    if (name === "propose_follow_up") return propose(session, args, "CREATE_FOLLOW_UP");
    if (name === "propose_task") return propose(session, args, "CREATE_TASK");
    if (name === "propose_draft_quote") return proposeFinance(session, args, "CREATE_DRAFT_QUOTE");
    if (name === "propose_draft_invoice") return proposeFinance(session, args, "CREATE_DRAFT_INVOICE");
    return deny("unknown_tool");
  } catch {
    return { ok: false, error: "tool_failed" };
  }
}

async function dailyBrief(session: CofounderSession, range: string) {
  const role = narrowerRole(session.role, session.frozenRole);
  const insights = await loadInsights(role, { range: range || "today" });
  const window = resolveWindow({ range: range || "today" });
  const now = new Date();
  const business: Array<{ id: string; label: string; count: number; href?: string }> = [];
  const operations: Array<{ id: string; label: string; count: number; href?: string }> = [];
  const finance: Array<{ id: string; label: string; count: number; href?: string }> = [];
  const customerExperience: Array<{ id: string; label: string; count: number; href?: string }> = [];
  const amc: Array<{ id: string; label: string; count: number; href?: string }> = [];

  for (const kpi of insights.kpis) {
    if (["visitors", "engaged", "leads", "qualified", "hot", "warm", "quotes", "bookings"].includes(kpi.id)) {
      business.push(kpi);
    } else if (["invoices", "paid"].includes(kpi.id) && can(role, "invoices")) {
      finance.push(kpi);
    } else if (kpi.id === "amc" && hasSection(role, "amc")) {
      amc.push(kpi);
    } else if (kpi.id === "reviews") {
      customerExperience.push(kpi);
    }
  }
  for (const row of insights.operations || []) operations.push(row);

  if (can(role, "bookings")) {
    const pending = await prisma.booking.count({ where: { status: { in: ["requested", "pending_confirmation"] } } });
    operations.push({ id: "pending-bookings", label: "Pending bookings", count: pending, href: "/admin/bookings?status=requested" });
  }
  if (can(role, "work_orders") || role === "technician") {
    const todaysJobs =
      role === "technician"
        ? await prisma.workOrder.count({
            where: { technicianId: session.staffId || "__none__", status: { not: "completed" } },
          })
        : await prisma.workOrder.count({ where: { status: { not: "completed" } } });
    operations.push({
      id: "todays-jobs",
      label: role === "technician" ? "Assigned open jobs" : "Open jobs",
      count: todaysJobs,
      href: "/admin/work-orders",
    });
  }
  if (can(role, "leads") || can(role, "bookings") || can(role, "work_orders") || can(role, "quotes")) {
    const overdueTasks = await prisma.opsTask.count({ where: { status: "open", dueAt: { lt: now } } });
    operations.push({ id: "overdue-tasks", label: "Overdue tasks", count: overdueTasks, href: "/admin/tasks" });
  }
  if (can(role, "invoices")) {
    const overdue = await prisma.invoice.count({ where: { status: "OVERDUE" } });
    finance.push({ id: "overdue-invoices", label: "Overdue invoices", count: overdue, href: "/admin/invoices?status=OVERDUE" });
  }
  if (can(role, "reviews")) {
    const pendingReviews = await prisma.review.count({ where: { status: "PENDING" } });
    const low = await prisma.review.count({ where: { status: "PENDING", stars: { lte: 2 } } });
    customerExperience.push({ id: "pending-reviews", label: "Pending reviews", count: pendingReviews, href: "/admin/reviews?status=PENDING" });
    customerExperience.push({ id: "low-ratings", label: "Low ratings pending", count: low, href: "/admin/reviews?status=PENDING" });
  }
  if (can(role, "questions")) {
    const pendingQuestions = await prisma.question.count({ where: { moderationStatus: "PENDING" } });
    customerExperience.push({ id: "pending-questions", label: "Unanswered Q&A", count: pendingQuestions, href: "/admin/questions" });
  }
  if (hasSection(role, "amc")) {
    const soon = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    const expiring = await prisma.amcContract.count({ where: { endDate: { gte: now, lte: soon } } });
    amc.push({ id: "amc-expiring", label: "Approaching renewal", count: expiring, href: "/admin/amc" });
  }

  return {
    window: insights.window.label || window.label,
    timezone: BUSINESS_TZ,
    sections: {
      business: business.slice(0, 10),
      operations: operations.slice(0, 10),
      finance: can(role, "invoices") ? finance.slice(0, 10) : [],
      customerExperience: customerExperience.slice(0, 10),
      amc: hasSection(role, "amc") ? amc.slice(0, 10) : [],
    },
    kpis: insights.kpis,
    quality: hasSection(role, "quality") ? insights.quality : undefined,
    reviews: hasSection(role, "reviews") || can(role, "reviews") ? insights.reviews : undefined,
    note: "Figures come from approved aggregations and live status counts. Amounts are not summed from quote/invoice labels. Payment.unconfigured is not paid.",
  };
}

async function leadSummary(_session: CofounderSession, id: string): Promise<ToolResult> {
  if (!id) return deny("id_required");
  const row = await prisma.lead.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      phone: true,
      email: true,
      source: true,
      status: true,
      urgency: true,
      city: true,
      area: true,
      assignedStaffId: true,
      createdAt: true,
      service: { select: { slug: true } },
      location: { select: { slug: true } },
      score: { select: { score: true, systemClass: true, humanClass: true, effectiveClass: true, quarantined: true } },
    },
  });
  if (!row) return { ok: false, error: "missing" };
  return ok(row);
}

async function hotLeads(): Promise<ToolResult> {
  const rows = await prisma.lead.findMany({
    where: { score: { is: { effectiveClass: "HOT", quarantined: false } } },
    orderBy: { createdAt: "desc" },
    take: 10,
    select: {
      id: true,
      name: true,
      phone: true,
      source: true,
      status: true,
      assignedStaffId: true,
      createdAt: true,
      score: { select: { score: true, effectiveClass: true } },
      service: { select: { slug: true } },
    },
  });
  return ok({ count: rows.length, leads: rows });
}

async function leadQuality(id: string): Promise<ToolResult> {
  if (!id) return deny("id_required");
  const row = await prisma.leadScore.findUnique({
    where: { leadId: id },
    select: {
      score: true,
      systemClass: true,
      humanClass: true,
      effectiveClass: true,
      quarantined: true,
      modelVersion: true,
      computedAt: true,
      overrideAt: true,
      reasonsJson: true,
    },
  });
  if (!row) return { ok: false, error: "missing" };
  let reasons: unknown = [];
  try {
    reasons = JSON.parse(row.reasonsJson);
  } catch {
    reasons = [];
  }
  return ok({
    leadId: id,
    score: row.score,
    systemClass: row.systemClass,
    humanClass: row.humanClass,
    effectiveClass: row.effectiveClass,
    quarantined: row.quarantined,
    modelVersion: row.modelVersion,
    computedAt: row.computedAt,
    overrideAt: row.overrideAt,
    reasons,
    note: "Deterministic LeadScore. Co-Founder does not replace this class.",
  });
}

async function quotePipeline(): Promise<ToolResult> {
  const groups = await prisma.quote.groupBy({ by: ["status"], _count: { _all: true } });
  return ok({
    byStatus: groups.map((row) => ({ status: row.status, count: row._count._all })),
    note: "Counts only. Label amounts are not summed.",
  });
}

async function bookingPipeline(): Promise<ToolResult> {
  const groups = await prisma.booking.groupBy({ by: ["status"], _count: { _all: true } });
  return ok({ byStatus: groups.map((row) => ({ status: row.status, count: row._count._all })) });
}

async function workOrderStatus(session: CofounderSession, id: string): Promise<ToolResult> {
  if (id) {
    const row = await prisma.workOrder.findUnique({
      where: { id },
      select: {
        id: true,
        number: true,
        status: true,
        serviceLabel: true,
        locationLabel: true,
        technicianId: true,
        supervisorId: true,
        scheduledDate: true,
        scheduledTime: true,
      },
    });
    if (!row) return { ok: false, error: "missing" };
    if (session.frozenRole === "technician" || session.role === "technician") {
      if (row.technicianId !== session.staffId) return deny("forbidden");
    }
    return ok(row);
  }
  const tech = session.frozenRole === "technician" || session.role === "technician";
  const where = tech ? { technicianId: session.staffId || "__none__" } : {};
  const groups = await prisma.workOrder.groupBy({ by: ["status"], where, _count: { _all: true } });
  return ok({ byStatus: groups.map((row) => ({ status: row.status, count: row._count._all })) });
}

async function invoiceStatus(): Promise<ToolResult> {
  const groups = await prisma.invoice.groupBy({ by: ["status"], _count: { _all: true } });
  return ok({
    byStatus: groups.map((row) => ({ status: row.status, count: row._count._all })),
    note: "Counts only. Do not treat label strings as numeric totals.",
  });
}

async function paymentStatus(): Promise<ToolResult> {
  const groups = await prisma.payment.groupBy({ by: ["status"], _count: { _all: true } });
  return ok({
    byStatus: groups.map((row) => ({ status: row.status, count: row._count._all })),
    note: "Payment.unconfigured is not paid.",
  });
}

async function reviewSummary(): Promise<ToolResult> {
  const [byStatus, byStars] = await Promise.all([
    prisma.review.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.review.groupBy({ by: ["stars"], _count: { _all: true } }),
  ]);
  return ok({
    byStatus: byStatus.map((row) => ({ status: row.status, count: row._count._all })),
    byStars: byStars.map((row) => ({ stars: row.stars, count: row._count._all })),
  });
}

async function qnaSummary(): Promise<ToolResult> {
  const groups = await prisma.question.groupBy({ by: ["moderationStatus"], _count: { _all: true } });
  return ok({ byModeration: groups.map((row) => ({ status: row.moderationStatus, count: row._count._all })) });
}

async function amcExpiring(): Promise<ToolResult> {
  const now = new Date();
  const soon = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  const rows = await prisma.amcContract.findMany({
    where: { endDate: { gte: now, lte: soon } },
    orderBy: { endDate: "asc" },
    take: 20,
    select: { id: true, propertyLabel: true, endDate: true, frequency: true, customerId: true },
  });
  return ok({ count: rows.length, contracts: rows, windowDays: 30 });
}

async function servicePerformance(session: CofounderSession): Promise<ToolResult> {
  const insights = await loadInsights(narrowerRole(session.role, session.frozenRole), { range: "30d" });
  return ok({ window: insights.window.label, services: insights.services });
}

async function locationPerformance(session: CofounderSession): Promise<ToolResult> {
  const insights = await loadInsights(narrowerRole(session.role, session.frozenRole), { range: "30d" });
  return ok({ window: insights.window.label, locations: insights.locations });
}

async function customerJourney(session: CofounderSession, args: ToolArgs): Promise<ToolResult> {
  const type = argString(args, "type") as JourneyScopeType;
  const id = argString(args, "id");
  if (!id || !journeyTypeAllowed(session.frozenRole, type) || !journeyTypeAllowed(session.role, type)) {
    return deny("forbidden");
  }
  const page = await buildJourney(
    { type, id },
    { role: narrowerRole(session.role, session.frozenRole), staffId: session.staffId, page: 1 },
  );
  return ok({
    type,
    id,
    total: page.total,
    optedOut: page.optedOut,
    items: page.items.slice(0, 20).map((item) => ({
      kind: item.kind,
      occurredAt: item.occurredAt,
      title: item.title,
      entity: item.entity,
      certainty: item.certainty,
      facts: item.facts,
    })),
    quality: page.quality.map((row) => ({
      leadId: row.leadId,
      score: row.score,
      systemClass: row.systemClass,
      effectiveClass: row.effectiveClass,
    })),
  });
}

async function getSop(session: CofounderSession, args: ToolArgs): Promise<ToolResult> {
  const result = await getSopForSession(
    { email: session.email, role: session.role, staffId: session.staffId, frozenRole: session.frozenRole },
    { id: argString(args, "id"), sopCode: argString(args, "sopCode"), serviceSlug: argString(args, "serviceSlug") },
  );
  if (!result.ok) return { ok: false, error: result.error };
  return ok(result.data);
}

async function searchSop(session: CofounderSession, args: ToolArgs): Promise<ToolResult> {
  const result = await searchInternalSopsForSession(
    { email: session.email, role: session.role, staffId: session.staffId, frozenRole: session.frozenRole },
    { q: argString(args, "q") || argString(args, "query"), audience: argString(args, "audience"), categorySlug: argString(args, "categorySlug") },
  );
  return ok(result.data);
}

function subjectIdsFromArgs(args: ToolArgs) {
  const ids: string[] = [];
  const single = argString(args, "subjectId") || argString(args, "id");
  if (single) ids.push(single);
  const raw = args.subjectIds;
  if (typeof raw === "string") {
    ids.push(...raw.split(",").map((value) => value.trim()).filter(Boolean));
  } else if (Array.isArray(raw)) {
    for (const value of raw) {
      if (typeof value === "string" && value.trim()) ids.push(value.trim());
    }
  }
  return [...new Set(ids)].slice(0, 10);
}

async function propose(session: CofounderSession, args: ToolArgs, actionType: "CREATE_TASK" | "CREATE_FOLLOW_UP"): Promise<ToolResult> {
  const ids = subjectIdsFromArgs(args);
  if (!ids.length) return deny("id_required");
  const subjectType = argString(args, "subjectType") || (actionType === "CREATE_FOLLOW_UP" ? "Lead" : "");
  if (!subjectType) return deny("subject_type_required");
  const dueInHours = Number(args.dueInHours);
  const result = await createTaskProposal(session, {
    conversationId: session.conversationId,
    title: argString(args, "title"),
    reason: argString(args, "reason"),
    sopCode: argString(args, "sopCode"),
    sopTitle: argString(args, "sopTitle"),
    items: ids.map((subjectId) => ({
      actionType,
      subjectType,
      subjectId,
      title: argString(args, "title") || (actionType === "CREATE_FOLLOW_UP" ? "Follow-up" : "Task"),
      kind: argString(args, "kind") || (actionType === "CREATE_FOLLOW_UP" ? "follow_up" : "generic"),
      dueInHours: Number.isFinite(dueInHours) && dueInHours > 0 ? dueInHours : 2,
      assigneeStaffId: argString(args, "assigneeStaffId") || null,
      reason: argString(args, "reason"),
    })),
  });
  if (!result.ok) return { ok: false, denied: "denied" in result ? result.denied : false, error: result.error };
  return ok(result);
}

function parseLines(args: ToolArgs) {
  const raw = args.lines;
  if (Array.isArray(raw)) return raw;
  if (typeof raw === "string" && raw.trim()) {
    try {
      const parsed = JSON.parse(raw) as unknown;
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

async function proposeFinance(session: CofounderSession, args: ToolArgs, actionType: "CREATE_DRAFT_QUOTE" | "CREATE_DRAFT_INVOICE"): Promise<ToolResult> {
  const ids = subjectIdsFromArgs(args);
  if (!ids.length) return deny("id_required");
  const subjectType =
    argString(args, "subjectType") || (actionType === "CREATE_DRAFT_QUOTE" ? "Lead" : "Quote");
  const result = await createTaskProposal(session, {
    conversationId: session.conversationId,
    title: argString(args, "title") || (actionType === "CREATE_DRAFT_QUOTE" ? "Draft quotation" : "Draft invoice"),
    reason: argString(args, "reason"),
    items: ids.map((subjectId) => ({
      actionType,
      subjectType,
      subjectId,
      title: argString(args, "title") || (actionType === "CREATE_DRAFT_QUOTE" ? "Draft quotation" : "Draft invoice"),
      draft: {
        scope: argString(args, "scope"),
        exclusions: argString(args, "exclusions"),
        notes: argString(args, "notes"),
        propertyLabel: argString(args, "propertyLabel"),
        serviceId: argString(args, "serviceId") || undefined,
        locationId: argString(args, "locationId") || undefined,
        quoteId: argString(args, "quoteId") || undefined,
        workOrderId: argString(args, "workOrderId") || undefined,
        bookingId: argString(args, "bookingId") || undefined,
        customerId: argString(args, "customerId") || undefined,
        lines: parseLines(args),
        amountsSource: actionType === "CREATE_DRAFT_INVOICE" && subjectType === "Quote" ? "quote" : "none",
      },
    })),
  });
  if (!result.ok) return { ok: false, denied: "denied" in result ? result.denied : false, error: result.error };
  return ok(result);
}
