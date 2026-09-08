import type { StaffAiProposal } from "@prisma/client";
import { prisma } from "@/server/db";
import { can, canViewTasks } from "@/lib/admin/rbac";
import { executeAction } from "@/lib/automation/actions";
import { assertTechnicianAssignmentAllowed } from "@/lib/automation/assign";
import { sanitizeError } from "@/lib/automation/privacy";
import { loadSubjectFacts } from "@/lib/automation/subject";
import { narrowerRole } from "@/lib/cofounder/rbac";
import {
  executeDraftInvoice,
  executeDraftQuote,
  financeSideEffects,
  isFinanceAction,
  sanitizeProposalDraft,
  type ProposalDraft,
} from "@/lib/cofounder/finance";
import type { CofounderSession } from "@/lib/cofounder/types";

export const PROPOSAL_ACTIONS = ["CREATE_TASK", "CREATE_FOLLOW_UP", "CREATE_DRAFT_QUOTE", "CREATE_DRAFT_INVOICE"] as const;
export type ProposalActionType = (typeof PROPOSAL_ACTIONS)[number];
export const PROPOSAL_SUBJECTS = ["Lead", "Quote", "Booking", "WorkOrder", "Review", "Question", "AmcContract", "Customer"] as const;
export type ProposalSubjectType = (typeof PROPOSAL_SUBJECTS)[number];
const ALLOWED_KINDS = new Set(["follow_up", "customer_service", "work_order_prep", "generic", "draft_quote", "draft_invoice"]);
const DEFAULT_SIDE_EFFECTS =
  "Creates an OpsTask. Does not confirm bookings, change prices, create invoices, create work orders, mark invoices paid, or edit automation.";

export type ProposalItem = {
  actionType: ProposalActionType;
  subjectType: ProposalSubjectType;
  subjectId: string;
  subjectLabel: string;
  title: string;
  kind: string;
  dueInHours: number;
  dueAt: string | null;
  assigneeStaffId: string | null;
  reason: string;
  draft?: ProposalDraft;
};

export type ProposalCard = {
  id: string;
  status: string;
  actionType: string;
  title: string;
  reason: string;
  sopCode: string;
  sopTitle: string;
  sideEffects: string;
  items: ProposalItem[];
  creator: string;
  frozenRole: string;
  createdAt: string;
  approvedAt: string | null;
  approvedBy: string;
  cancelledAt: string | null;
  result: unknown;
  error: string;
};

export function proposalActionKey(proposalId: string, index: number) {
  return `cofounder:${proposalId}:${index}`;
}

function clip(value: string, max: number) {
  return value.trim().slice(0, max);
}

function isAction(value: string): value is ProposalActionType {
  return (PROPOSAL_ACTIONS as readonly string[]).includes(value);
}

function isSubject(value: string): value is ProposalSubjectType {
  return (PROPOSAL_SUBJECTS as readonly string[]).includes(value);
}

export function parseProposalItems(raw: string): ProposalItem[] {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((row): row is ProposalItem => {
      if (!row || typeof row !== "object") return false;
      const item = row as ProposalItem;
      return isAction(item.actionType) && isSubject(item.subjectType) && typeof item.subjectId === "string" && item.subjectId.length > 0;
    })
    .map((item) => ({
      ...item,
      draft: isFinanceAction(item.actionType) ? sanitizeProposalDraft(item.draft) : undefined,
    }));
  } catch {
    return [];
  }
}

export function effectiveProposalRole(session: { role: string; frozenRole?: string }) {
  return session.frozenRole ? narrowerRole(session.role, session.frozenRole) : session.role;
}

export function canProposeAction(role: string, item: { actionType: string; subjectType: string; kind?: string }) {
  if (role === "content_manager") return false;
  if (item.actionType === "CREATE_DRAFT_QUOTE") {
    if (!can(role, "quotes")) return false;
    return item.subjectType === "Lead" || item.subjectType === "Customer" || item.subjectType === "Quote";
  }
  if (item.actionType === "CREATE_DRAFT_INVOICE") {
    if (!can(role, "invoices")) return false;
    return item.subjectType === "Quote" || item.subjectType === "WorkOrder" || item.subjectType === "Booking" || item.subjectType === "Customer";
  }
  if (!canViewTasks(role)) return false;
  if (!isAction(item.actionType) || !isSubject(item.subjectType)) return false;
  const kind = item.kind || (item.actionType === "CREATE_FOLLOW_UP" ? "follow_up" : "generic");
  if (!ALLOWED_KINDS.has(kind) || kind === "draft_quote" || kind === "draft_invoice") return false;
  if (role === "super_admin" || role === "admin" || role === "manager") return true;
  if (role === "sales") {
    return (item.subjectType === "Lead" || item.subjectType === "Quote") && (item.actionType === "CREATE_FOLLOW_UP" || kind === "follow_up");
  }
  if (role === "customer_service") {
    return item.subjectType === "Lead" || item.subjectType === "Booking" || item.subjectType === "Review" || item.subjectType === "Question";
  }
  if (role === "supervisor") return item.subjectType === "Booking" || item.subjectType === "WorkOrder";
  if (role === "technician") return item.subjectType === "Booking" || item.subjectType === "WorkOrder";
  return false;
}

async function technicianOwnsSubject(staffId: string | null, subjectType: string, subjectId: string) {
  if (!staffId) return false;
  if (subjectType === "WorkOrder") {
    const row = await prisma.workOrder.findUnique({ where: { id: subjectId }, select: { technicianId: true } });
    return row?.technicianId === staffId;
  }
  if (subjectType === "Booking") {
    const row = await prisma.booking.findUnique({ where: { id: subjectId }, select: { technicianId: true } });
    return row?.technicianId === staffId;
  }
  return false;
}

export async function canAccessProposalSubject(session: { role: string; staffId: string | null; frozenRole?: string }, item: { actionType: string; subjectType: string; kind?: string; subjectId: string }) {
  const role = effectiveProposalRole(session);
  if (!canProposeAction(role, item)) return false;
  if (role === "technician") return technicianOwnsSubject(session.staffId, item.subjectType, item.subjectId);
  if (item.actionType === "CREATE_DRAFT_INVOICE" && item.subjectType === "Quote") {
    const quote = await prisma.quote.findUnique({ where: { id: item.subjectId }, select: { status: true } });
    return quote?.status === "ACCEPTED";
  }
  if (item.actionType === "CREATE_DRAFT_INVOICE" && item.subjectType === "WorkOrder") {
    const row = await prisma.workOrder.findUnique({ where: { id: item.subjectId }, select: { status: true } });
    return row?.status === "completed";
  }
  return true;
}

async function loadSubjectLabel(subjectType: string, subjectId: string) {
  if (subjectType === "Lead") {
    const row = await prisma.lead.findUnique({ where: { id: subjectId }, select: { id: true, name: true } });
    return row ? { ok: true as const, label: clip(row.name || row.id, 80) } : { ok: false as const };
  }
  if (subjectType === "Quote") {
    const row = await prisma.quote.findUnique({ where: { id: subjectId }, select: { id: true, quoteNumber: true } });
    return row ? { ok: true as const, label: row.quoteNumber || row.id } : { ok: false as const };
  }
  if (subjectType === "Booking") {
    const row = await prisma.booking.findUnique({ where: { id: subjectId }, select: { id: true, number: true } });
    return row ? { ok: true as const, label: row.number || row.id } : { ok: false as const };
  }
  if (subjectType === "WorkOrder") {
    const row = await prisma.workOrder.findUnique({ where: { id: subjectId }, select: { id: true, number: true } });
    return row ? { ok: true as const, label: row.number || row.id } : { ok: false as const };
  }
  if (subjectType === "Review") {
    const row = await prisma.review.findUnique({ where: { id: subjectId }, select: { id: true } });
    return row ? { ok: true as const, label: row.id } : { ok: false as const };
  }
  if (subjectType === "Question") {
    const row = await prisma.question.findUnique({ where: { id: subjectId }, select: { id: true } });
    return row ? { ok: true as const, label: row.id } : { ok: false as const };
  }
  if (subjectType === "AmcContract") {
    const row = await prisma.amcContract.findUnique({ where: { id: subjectId }, select: { id: true, reference: true } });
    return row ? { ok: true as const, label: row.reference || row.id } : { ok: false as const };
  }
  if (subjectType === "Customer") {
    const row = await prisma.customer.findUnique({ where: { id: subjectId }, select: { id: true, name: true } });
    return row ? { ok: true as const, label: clip(row.name || row.id, 80) } : { ok: false as const };
  }
  return { ok: false as const };
}

async function resolveAssignee(staffId: string | null | undefined, subjectType: string, subjectId: string) {
  if (!staffId) return { ok: true as const, staffId: null as string | null };
  const staff = await prisma.staff.findUnique({ where: { id: staffId }, include: { skills: true } });
  if (!staff || staff.status !== "active") return { ok: false as const, error: "assignee_inactive" as const };
  if (staff.role === "technician") {
    const facts = (await loadSubjectFacts(subjectType, subjectId)) || {};
    const allowed = await assertTechnicianAssignmentAllowed(staff.id, facts);
    if (!allowed.ok) return { ok: false as const, error: "skill" as const };
  }
  return { ok: true as const, staffId: staff.id };
}

async function openTaskExists(item: { subjectType: string; subjectId: string; kind: string }) {
  const count = await prisma.opsTask.count({
    where: { subjectType: item.subjectType, subjectId: item.subjectId, kind: item.kind, status: "open" },
  });
  return count > 0;
}

async function pendingProposalExists(item: { actionType: string; subjectType: string; subjectId: string }) {
  const pending = await prisma.staffAiProposal.findMany({
    where: { status: "pending" },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: { id: true, itemsJson: true },
  });
  for (const row of pending) {
    const items = parseProposalItems(row.itemsJson);
    if (items.some((entry) => entry.actionType === item.actionType && entry.subjectType === item.subjectType && entry.subjectId === item.subjectId)) {
      return row.id;
    }
  }
  return null;
}

export function toProposalCard(row: StaffAiProposal): ProposalCard {
  return {
    id: row.id,
    status: row.status.toUpperCase(),
    actionType: row.actionType,
    title: row.title,
    reason: row.reason,
    sopCode: row.sopCode,
    sopTitle: row.sopTitle,
    sideEffects: row.sideEffects,
    items: parseProposalItems(row.itemsJson),
    creator: row.actorEmail,
    frozenRole: row.frozenRole,
    createdAt: row.createdAt.toISOString(),
    approvedAt: row.approvedAt ? row.approvedAt.toISOString() : null,
    approvedBy: row.approvedBy,
    cancelledAt: row.cancelledAt ? row.cancelledAt.toISOString() : null,
    result: safeJson(row.resultJson),
    error: row.error,
  };
}

function safeJson(raw: string) {
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return {};
  }
}

export type ProposalInputItem = {
  actionType: string;
  subjectType: string;
  subjectId: string;
  title?: string;
  kind?: string;
  dueInHours?: number;
  dueAt?: string | null;
  assigneeStaffId?: string | null;
  reason?: string;
  draft?: unknown;
};

export async function createTaskProposal(
  session: CofounderSession,
  input: {
    items: ProposalInputItem[];
    title?: string;
    reason?: string;
    sopCode?: string;
    sopTitle?: string;
    conversationId?: string;
  },
) {
  if (session.role === "content_manager" || session.frozenRole === "content_manager") {
    return { ok: false as const, denied: true as const, error: "forbidden" as const };
  }
  const rawItems = input.items.slice(0, 10);
  const prepared: ProposalItem[] = [];
  const skipped: string[] = [];
  for (const raw of rawItems) {
    const actionType = isAction(raw.actionType) ? raw.actionType : null;
    const subjectType = isSubject(raw.subjectType) ? raw.subjectType : null;
    if (!actionType || !subjectType || !raw.subjectId) {
      skipped.push("invalid");
      continue;
    }
    const kind = clip(
      raw.kind ||
        (actionType === "CREATE_FOLLOW_UP"
          ? "follow_up"
          : actionType === "CREATE_DRAFT_QUOTE"
            ? "draft_quote"
            : actionType === "CREATE_DRAFT_INVOICE"
              ? "draft_invoice"
              : "generic"),
      40,
    );
    const candidate = { actionType, subjectType, kind, subjectId: clip(raw.subjectId, 80) };
    if (!(await canAccessProposalSubject(session, candidate))) {
      return { ok: false as const, denied: true as const, error: "forbidden" as const };
    }
    const subject = await loadSubjectLabel(subjectType, candidate.subjectId);
    if (!subject.ok) return { ok: false as const, error: "subject_missing" as const };
    if (!isFinanceAction(actionType) && (await openTaskExists({ subjectType, subjectId: candidate.subjectId, kind }))) {
      skipped.push(candidate.subjectId);
      continue;
    }
    const pendingId = await pendingProposalExists({ actionType, subjectType, subjectId: candidate.subjectId });
    if (pendingId) {
      const existing = await prisma.staffAiProposal.findUnique({ where: { id: pendingId } });
      if (existing) return { ok: true as const, duplicate: true as const, proposal: toProposalCard(existing) };
    }
    let assigneeStaffId: string | null = raw.assigneeStaffId || null;
    if (assigneeStaffId) {
      const assignee = await resolveAssignee(assigneeStaffId, subjectType, candidate.subjectId);
      if (!assignee.ok) assigneeStaffId = null;
      else assigneeStaffId = assignee.staffId;
    }
    const dueInHours = Number(raw.dueInHours);
    prepared.push({
      actionType,
      subjectType,
      subjectId: candidate.subjectId,
      subjectLabel: subject.label,
      title:
        clip(
          raw.title ||
            (actionType === "CREATE_FOLLOW_UP"
              ? "Follow-up"
              : actionType === "CREATE_DRAFT_QUOTE"
                ? "Draft quotation"
                : actionType === "CREATE_DRAFT_INVOICE"
                  ? "Draft invoice"
                  : "Task"),
          160,
        ) || "Task",
      kind,
      dueInHours: Number.isFinite(dueInHours) && dueInHours > 0 ? Math.min(720, Math.trunc(dueInHours)) : 2,
      dueAt: typeof raw.dueAt === "string" && raw.dueAt ? clip(raw.dueAt, 40) : null,
      assigneeStaffId,
      reason: clip(raw.reason || input.reason || "", 240),
      draft: isFinanceAction(actionType) ? sanitizeProposalDraft(raw.draft) : undefined,
    });
  }
  if (!prepared.length) {
    return { ok: true as const, skipped: true as const, error: "duplicate_open_task", skippedIds: skipped };
  }
  const actionType = prepared[0].actionType;
  const title =
    clip(input.title || "", 160) ||
    (prepared.length === 1 ? prepared[0].title : `Create ${prepared.length} follow-up tasks`);
  const reason = clip(input.reason || prepared[0].reason || "", 240);
  const conversationId = input.conversationId || session.conversationId || null;
  const conversation = conversationId
    ? await prisma.staffAiConversation.findFirst({ where: { id: conversationId, userId: session.id }, select: { id: true } })
    : null;
  const row = await prisma.staffAiProposal.create({
    data: {
      userId: session.id,
      conversationId: conversation?.id || null,
      actorEmail: session.email,
      frozenRole: session.frozenRole || session.role,
      status: "pending",
      actionType,
      title,
      reason,
      sopCode: clip(input.sopCode || "", 80),
      sopTitle: clip(input.sopTitle || "", 160),
      sideEffects: financeSideEffects(actionType) || DEFAULT_SIDE_EFFECTS,
      itemsJson: JSON.stringify(prepared),
    },
  });
  await prisma.auditLog.create({
    data: {
      actor: session.email,
      action: "cofounder.proposal.create",
      entity: "StaffAiProposal",
      entityId: row.id,
      meta: JSON.stringify({
        action: actionType,
        subjectType: prepared[0].subjectType,
        count: prepared.length,
        status: "pending",
      }),
    },
  });
  return { ok: true as const, proposal: toProposalCard(row) };
}

function canMutateProposal(session: { id: string; role: string }, row: StaffAiProposal) {
  if (can(session.role, "automation") || session.role === "super_admin" || session.role === "admin" || session.role === "manager") return true;
  return row.userId === session.id;
}

export async function editTaskProposal(
  session: { id: string; email: string; role: string; staffId: string | null },
  id: string,
  patch: {
    title?: string;
    dueInHours?: number;
    dueAt?: string | null;
    assigneeStaffId?: string | null;
    itemIndex?: number;
    scope?: string;
    notes?: string;
    exclusions?: string;
    lines?: unknown;
  },
) {
  const row = await prisma.staffAiProposal.findUnique({ where: { id } });
  if (!row) return { ok: false as const, error: "missing" as const };
  if (row.status !== "pending") return { ok: false as const, error: "not_pending" as const };
  if (!canMutateProposal(session, row)) return { ok: false as const, denied: true as const, error: "forbidden" as const };
  const items = parseProposalItems(row.itemsJson);
  const index = Number.isFinite(Number(patch.itemIndex)) ? Number(patch.itemIndex) : 0;
  const item = items[index];
  if (!item) return { ok: false as const, error: "missing_item" as const };
  if (!(await canAccessProposalSubject(session, item))) return { ok: false as const, denied: true as const, error: "forbidden" as const };
  if (patch.title !== undefined) item.title = clip(patch.title, 160) || item.title;
  if (patch.dueInHours !== undefined) {
    const hours = Number(patch.dueInHours);
    if (Number.isFinite(hours) && hours > 0) item.dueInHours = Math.min(720, Math.trunc(hours));
  }
  if (patch.dueAt !== undefined) item.dueAt = patch.dueAt ? clip(patch.dueAt, 40) : null;
  if (patch.assigneeStaffId !== undefined) {
    if (!patch.assigneeStaffId) item.assigneeStaffId = null;
    else {
      const assignee = await resolveAssignee(patch.assigneeStaffId, item.subjectType, item.subjectId);
      if (!assignee.ok) return { ok: false as const, error: assignee.error };
      item.assigneeStaffId = assignee.staffId;
    }
  }
  if (isFinanceAction(item.actionType)) {
    item.draft = sanitizeProposalDraft({
      ...(item.draft || {}),
      scope: patch.scope !== undefined ? patch.scope : item.draft?.scope,
      notes: patch.notes !== undefined ? patch.notes : item.draft?.notes,
      exclusions: patch.exclusions !== undefined ? patch.exclusions : item.draft?.exclusions,
      lines: patch.lines !== undefined ? patch.lines : item.draft?.lines,
      amountsSource: item.draft?.amountsSource === "quote" ? "quote" : "none",
    });
  }
  items[index] = item;
  const updated = await prisma.staffAiProposal.update({
    where: { id: row.id },
    data: {
      title: patch.title !== undefined && index === 0 ? clip(patch.title, 160) || row.title : row.title,
      itemsJson: JSON.stringify(items),
      status: "pending",
    },
  });
  await prisma.auditLog.create({
    data: {
      actor: session.email,
      action: "cofounder.proposal.edit",
      entity: "StaffAiProposal",
      entityId: row.id,
      meta: JSON.stringify({ action: row.actionType, status: "pending" }),
    },
  });
  return { ok: true as const, proposal: toProposalCard(updated) };
}

export async function cancelTaskProposal(session: { id: string; email: string; role: string }, id: string) {
  const row = await prisma.staffAiProposal.findUnique({ where: { id } });
  if (!row) return { ok: false as const, error: "missing" as const };
  if (row.status !== "pending") return { ok: false as const, error: "not_pending" as const };
  if (!canMutateProposal(session, row)) return { ok: false as const, denied: true as const, error: "forbidden" as const };
  const tasksBefore = await prisma.opsTask.count();
  const updated = await prisma.staffAiProposal.update({
    where: { id: row.id },
    data: { status: "cancelled", cancelledAt: new Date(), cancelledBy: session.email },
  });
  await prisma.auditLog.create({
    data: {
      actor: session.email,
      action: "cofounder.proposal.cancel",
      entity: "StaffAiProposal",
      entityId: row.id,
      meta: JSON.stringify({ action: row.actionType, status: "cancelled" }),
    },
  });
  return { ok: true as const, proposal: toProposalCard(updated), tasksUnchanged: (await prisma.opsTask.count()) === tasksBefore };
}

function parseDueAt(item: ProposalItem) {
  if (item.dueAt) {
    const date = new Date(item.dueAt);
    if (Number.isFinite(date.getTime())) return date;
  }
  return null;
}

export async function approveTaskProposal(session: { id: string; email: string; role: string; staffId: string | null }, id: string) {
  const existing = await prisma.staffAiProposal.findUnique({ where: { id } });
  if (!existing) return { ok: false as const, error: "missing" as const };
  if (existing.status === "cancelled") return { ok: false as const, error: "cancelled" as const };
  if (existing.status === "approved") return { ok: true as const, duplicate: true as const, proposal: toProposalCard(existing) };
  if (existing.status !== "pending" && existing.status !== "failed") return { ok: false as const, error: "not_pending" as const };

  const items = parseProposalItems(existing.itemsJson);
  if (!items.length) return { ok: false as const, error: "empty" as const };
  for (const item of items) {
    if (!(await canAccessProposalSubject(session, item))) {
      return { ok: false as const, denied: true as const, error: "forbidden" as const };
    }
  }

  const claimed = await prisma.staffAiProposal.updateMany({
    where: { id, status: { in: ["pending", "failed"] } },
    data: { status: "approved", approvedAt: new Date(), approvedBy: session.email, error: "" },
  });
  if (claimed.count !== 1) {
    const fresh = await prisma.staffAiProposal.findUnique({ where: { id } });
    if (fresh?.status === "approved") return { ok: true as const, duplicate: true as const, proposal: toProposalCard(fresh) };
    return { ok: false as const, error: "not_pending" as const };
  }

  await prisma.auditLog.create({
    data: {
      actor: session.email,
      action: "cofounder.proposal.approve",
      entity: "StaffAiProposal",
      entityId: id,
      meta: JSON.stringify({ action: existing.actionType, count: items.length }),
    },
  });

  const results: Array<{ type: string; status: string; error?: string; resultRef?: string; subjectId: string }> = [];
  for (const [index, item] of items.entries()) {
    const subject = await loadSubjectLabel(item.subjectType, item.subjectId);
    if (!subject.ok) {
      results.push({ type: item.actionType, status: "failed", error: "subject_missing", subjectId: item.subjectId });
      continue;
    }
    if (isFinanceAction(item.actionType)) {
      const exec =
        item.actionType === "CREATE_DRAFT_QUOTE"
          ? await executeDraftQuote({ item, proposalId: id, index, actor: { id: session.id, email: session.email } })
          : await executeDraftInvoice({ item, proposalId: id, index, actor: { id: session.id, email: session.email } });
      results.push({ type: item.actionType, status: exec.status, error: exec.error, resultRef: exec.resultRef, subjectId: item.subjectId });
      continue;
    }
    const facts = (await loadSubjectFacts(item.subjectType, item.subjectId)) || {};
    let assigneeStaffId = item.assigneeStaffId;
    if (assigneeStaffId) {
      const assignee = await resolveAssignee(assigneeStaffId, item.subjectType, item.subjectId);
      assigneeStaffId = assignee.ok ? assignee.staffId : null;
    }
    const result = await executeAction({
      action: {
        type: item.actionType,
        title: item.title,
        kind: item.kind,
        dueInHours: item.dueInHours,
      },
      index,
      ruleKey: "cofounder",
      ruleId: "",
      subjectType: item.subjectType,
      subjectId: item.subjectId,
      occurrence: id,
      facts,
      idempotencyKey: proposalActionKey(id, index),
      source: "cofounder",
      assigneeStaffId,
      dueAt: parseDueAt(item),
      notes: `proposal:${id}`,
    });
    results.push({ type: result.type, status: result.status, error: result.error, resultRef: result.resultRef, subjectId: item.subjectId });
    if (result.status === "success" && result.resultRef && result.resultRef !== "idempotent") {
      await prisma.auditLog.create({
        data: {
          actor: session.email,
          action: "cofounder.task.create",
          entity: "OpsTask",
          entityId: result.resultRef,
          meta: JSON.stringify({ proposalId: id, action: item.actionType, subjectType: item.subjectType, subjectId: item.subjectId }),
        },
      });
    }
  }

  const failed = results.some((row) => row.status === "failed");
  const updated = await prisma.staffAiProposal.update({
    where: { id },
    data: {
      status: failed ? "failed" : "approved",
      executedAt: new Date(),
      resultJson: JSON.stringify({ results }),
      error: failed ? sanitizeError(results.find((row) => row.error)?.error || "execute_failed") : "",
    },
  });
  await prisma.auditLog.create({
    data: {
      actor: session.email,
      action: "cofounder.proposal.execute",
      entity: "StaffAiProposal",
      entityId: id,
      meta: JSON.stringify({ ok: !failed, action: existing.actionType, count: results.length }),
    },
  });
  if (failed) return { ok: false as const, error: "execute_failed" as const, proposal: toProposalCard(updated) };
  return { ok: true as const, proposal: toProposalCard(updated) };
}

export async function listTaskProposals(session: { id: string; role: string }, take = 30) {
  const manager = session.role === "super_admin" || session.role === "admin" || session.role === "manager";
  const rows = await prisma.staffAiProposal.findMany({
    where: manager ? {} : { userId: session.id },
    orderBy: { createdAt: "desc" },
    take: Math.min(50, Math.max(1, take)),
  });
  return rows.map(toProposalCard);
}

export async function getFollowupGaps() {
  const hot = await prisma.lead.findMany({
    where: { score: { is: { effectiveClass: "HOT", quarantined: false } } },
    orderBy: { createdAt: "desc" },
    take: 20,
    select: { id: true, name: true, status: true, assignedStaffId: true, createdAt: true, score: { select: { effectiveClass: true } } },
  });
  const ids = hot.map((row) => row.id);
  const open = ids.length
    ? await prisma.opsTask.findMany({
        where: { subjectType: "Lead", subjectId: { in: ids }, kind: "follow_up", status: "open" },
        select: { subjectId: true },
      })
    : [];
  const has = new Set(open.map((row) => row.subjectId));
  const leads = hot.filter((row) => !has.has(row.id)).slice(0, 10);
  return { count: leads.length, leads, note: "HOT leads with no open follow-up task. Counts come from stored LeadScore and OpsTask." };
}
