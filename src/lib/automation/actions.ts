import { Prisma } from "@prisma/client";
import { prisma } from "@/server/db";
import { assignStaffForAutomation } from "@/lib/automation/assign";
import { actionIdempotencyKey } from "@/lib/automation/enqueue";
import { sanitizeError, stripBlockedText } from "@/lib/automation/privacy";
import type { SubjectFacts } from "@/lib/automation/subject";
import {
  isAllowedAction,
  isForbiddenAction,
  type ActionResult,
  type AutomationAction,
} from "@/lib/automation/types";

const NOTE_SUBJECTS = new Set(["Lead", "Booking", "WorkOrder", "Quote", "Invoice"]);

export function notificationProviderConfigured(channel: string) {
  if (channel === "in_app") return true;
  if (channel === "email") return Boolean(process.env.AUTOMATION_EMAIL_PROVIDER);
  if (channel === "whatsapp") return Boolean(process.env.AUTOMATION_WHATSAPP_PROVIDER);
  return false;
}

export async function executeAction(opts: {
  action: AutomationAction;
  index: number;
  ruleKey: string;
  ruleId: string;
  subjectType: string;
  subjectId: string;
  occurrence: string;
  facts: SubjectFacts;
  idempotencyKey?: string;
  source?: string;
  assigneeStaffId?: string | null;
  dueAt?: Date | null;
  notes?: string;
}): Promise<ActionResult> {
  const type = opts.action.type;
  if (isForbiddenAction(type)) {
    return { type, status: "failed", error: "forbidden_action", retryable: false };
  }
  if (!isAllowedAction(type)) {
    return { type, status: "failed", error: "unknown_action", retryable: false };
  }
  try {
    if (
      type === "CREATE_TASK" ||
      type === "CREATE_FOLLOW_UP" ||
      (type.startsWith("CREATE_") && type.endsWith("_TASK"))
    ) {
      return await createTask(opts);
    }
    if (type === "ADD_NOTE") return await addNote(opts);
    if (type === "ASSIGN_STAFF") return await assignStaff(opts);
    if (type === "SEND_NOTIFICATION") return await sendNotification(opts);
    return { type, status: "failed", error: "unknown_action", retryable: false };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { type, status: "success", resultRef: "idempotent" };
    }
    return { type, status: "failed", error: sanitizeError(error), retryable: true };
  }
}

function taskKind(action: AutomationAction) {
  if (action.kind) return action.kind.slice(0, 40);
  if (action.type === "CREATE_FOLLOW_UP") return "follow_up";
  if (action.type === "CREATE_WORK_ORDER_TASK") return "work_order_prep";
  if (action.type === "CREATE_INVOICE_TASK") return "invoice";
  if (action.type === "CREATE_REVIEW_REQUEST_TASK") return "review_request";
  if (action.type === "CREATE_AMC_RENEWAL_TASK") return "amc_renewal";
  return "generic";
}

function taskTitle(action: AutomationAction) {
  return stripBlockedText(action.title || action.type.replaceAll("_", " ")).slice(0, 160);
}

async function createTask(opts: Parameters<typeof executeAction>[0]): Promise<ActionResult> {
  const key =
    opts.idempotencyKey ||
    (await actionIdempotencyKey({
      ruleKey: opts.ruleKey,
      actionType: opts.action.type,
      index: opts.index,
      subjectType: opts.subjectType,
      subjectId: opts.subjectId,
      occurrence: opts.occurrence,
    }));
  const dueInHours = Number(opts.action.dueInHours);
  let dueAt = Number.isFinite(dueInHours) && dueInHours > 0 ? new Date(Date.now() + dueInHours * 3600 * 1000) : null;
  if (opts.dueAt && Number.isFinite(opts.dueAt.getTime())) dueAt = opts.dueAt;
  if (opts.action.type === "CREATE_AMC_RENEWAL_TASK" && typeof opts.facts.endDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(opts.facts.endDate)) {
    const end = new Date(`${opts.facts.endDate}T00:00:00+04:00`);
    if (Number.isFinite(end.getTime())) dueAt = end;
  }
  const existing = await prisma.opsTask.findUnique({ where: { idempotencyKey: key } });
  if (existing) return { type: opts.action.type, status: "success", resultRef: existing.id };
  const row = await prisma.opsTask.create({
    data: {
      kind: taskKind(opts.action),
      title: taskTitle(opts.action),
      dueAt,
      assigneeStaffId: opts.assigneeStaffId || null,
      priority: (opts.action.priority || (opts.action.type === "CREATE_FOLLOW_UP" ? "normal" : "normal")).slice(0, 20),
      source: opts.source || "automation",
      subjectType: opts.subjectType,
      subjectId: opts.subjectId,
      ruleId: opts.ruleId || null,
      notes: (opts.notes || "").slice(0, 240),
      idempotencyKey: key,
    },
  });
  await prisma.auditLog.create({
    data: {
      actor: `automation:${opts.ruleKey}`,
      action: "task.create",
      entity: "OpsTask",
      entityId: row.id,
      meta: JSON.stringify({ kind: row.kind, subjectType: opts.subjectType, subjectId: opts.subjectId }),
    },
  });
  return { type: opts.action.type, status: "success", resultRef: row.id };
}

async function addNote(opts: Parameters<typeof executeAction>[0]): Promise<ActionResult> {
  if (!NOTE_SUBJECTS.has(opts.subjectType)) {
    return { type: "ADD_NOTE", status: "skipped", error: "notes_unsupported" };
  }
  const line = stripBlockedText(`[automation:${opts.ruleKey}] ${(opts.action.note || opts.action.title || "note").slice(0, 160)}`);
  const key = await actionIdempotencyKey({
    ruleKey: opts.ruleKey,
    actionType: "ADD_NOTE",
    index: opts.index,
    subjectType: opts.subjectType,
    subjectId: opts.subjectId,
    occurrence: opts.occurrence,
  });
  const marker = `idem:${key}`;
  if (opts.subjectType === "Lead") {
    const row = await prisma.lead.findUnique({ where: { id: opts.subjectId } });
    if (!row) return { type: "ADD_NOTE", status: "skipped", error: "subject_missing" };
    if (row.notes.includes(marker)) return { type: "ADD_NOTE", status: "success", resultRef: row.id };
    await prisma.lead.update({
      where: { id: row.id },
      data: { notes: `${row.notes}\n${line} (${marker})`.trim().slice(0, 4000) },
    });
  } else if (opts.subjectType === "Booking") {
    const row = await prisma.booking.findUnique({ where: { id: opts.subjectId } });
    if (!row) return { type: "ADD_NOTE", status: "skipped", error: "subject_missing" };
    if (row.notes.includes(marker)) return { type: "ADD_NOTE", status: "success", resultRef: row.id };
    await prisma.booking.update({
      where: { id: row.id },
      data: { notes: `${row.notes}\n${line} (${marker})`.trim().slice(0, 4000) },
    });
  } else if (opts.subjectType === "WorkOrder") {
    const row = await prisma.workOrder.findUnique({ where: { id: opts.subjectId } });
    if (!row) return { type: "ADD_NOTE", status: "skipped", error: "subject_missing" };
    if (row.notes.includes(marker)) return { type: "ADD_NOTE", status: "success", resultRef: row.id };
    await prisma.workOrder.update({
      where: { id: row.id },
      data: { notes: `${row.notes}\n${line} (${marker})`.trim().slice(0, 4000) },
    });
  } else if (opts.subjectType === "Quote") {
    const row = await prisma.quote.findUnique({ where: { id: opts.subjectId } });
    if (!row) return { type: "ADD_NOTE", status: "skipped", error: "subject_missing" };
    if (row.notes.includes(marker)) return { type: "ADD_NOTE", status: "success", resultRef: row.id };
    await prisma.quote.update({
      where: { id: row.id },
      data: { notes: `${row.notes}\n${line} (${marker})`.trim().slice(0, 4000) },
    });
  } else {
    const row = await prisma.invoice.findUnique({ where: { id: opts.subjectId } });
    if (!row) return { type: "ADD_NOTE", status: "skipped", error: "subject_missing" };
    if (row.notes.includes(marker)) return { type: "ADD_NOTE", status: "success", resultRef: row.id };
    await prisma.invoice.update({
      where: { id: row.id },
      data: { notes: `${row.notes}\n${line} (${marker})`.trim().slice(0, 4000) },
    });
  }
  return { type: "ADD_NOTE", status: "success" };
}

async function assignStaff(opts: Parameters<typeof executeAction>[0]): Promise<ActionResult> {
  const role = opts.action.role || "sales";
  const target = opts.action.target || (opts.subjectType === "WorkOrder" ? "work_order_technician" : opts.subjectType === "Booking" ? "booking_technician" : opts.subjectType === "AmcContract" ? "amc" : "lead");
  const result = await assignStaffForAutomation({
    target,
    role,
    subjectType: opts.subjectType,
    subjectId: opts.subjectId,
    facts: opts.facts,
  });
  if (!result.ok) return { type: "ASSIGN_STAFF", status: "skipped", error: result.error };
  return { type: "ASSIGN_STAFF", status: "success", resultRef: result.staffId };
}

async function sendNotification(opts: Parameters<typeof executeAction>[0]): Promise<ActionResult> {
  const channel = opts.action.channel || "in_app";
  if (opts.action.audience === "customer" && channel === "in_app") {
    return { type: "SEND_NOTIFICATION", status: "skipped", error: "no_customer_inbox" };
  }
  if (!notificationProviderConfigured(channel)) {
    return { type: "SEND_NOTIFICATION", status: "skipped", error: "provider_unconfigured" };
  }
  if (channel !== "in_app") {
    return { type: "SEND_NOTIFICATION", status: "skipped", error: "provider_unconfigured" };
  }
  const key = await actionIdempotencyKey({
    ruleKey: opts.ruleKey,
    actionType: "SEND_NOTIFICATION",
    index: opts.index,
    subjectType: opts.subjectType,
    subjectId: opts.subjectId,
    occurrence: opts.occurrence,
  });
  const row = await prisma.adminNotification.upsert({
    where: { idempotencyKey: key },
    create: {
      userId: opts.action.userId || null,
      staffId: opts.action.staffId || null,
      channel: "in_app",
      title: taskTitle(opts.action),
      body: stripBlockedText(opts.action.note || "").slice(0, 240),
      idempotencyKey: key,
    },
    update: {},
  });
  return { type: "SEND_NOTIFICATION", status: "success", resultRef: row.id };
}
