import type { OpsTask } from "@prisma/client";
import { prisma } from "@/server/db";
import { canViewTasks } from "@/lib/admin/rbac";
import type { StaffSession } from "@/lib/admin/auth";

export { canViewTasks };

const OPERATIONAL_KINDS = new Set(["work_order_prep", "invoice", "review_request", "amc_renewal"]);

export function canManageTask(session: StaffSession, task: OpsTask) {
  if (!canViewTask(session, task)) return false;
  if (session.role === "technician") return task.assigneeStaffId === session.staffId || task.kind === "work_order_prep";
  return true;
}

export function canViewTask(session: StaffSession, task: OpsTask) {
  const role = session.role;
  if (role === "content_manager") return false;
  if (role === "super_admin" || role === "admin" || role === "manager") return true;

  if (role === "technician") {
    return (
      task.assigneeStaffId === session.staffId ||
      task.subjectType === "WorkOrder" ||
      task.subjectType === "Booking"
    );
  }
  if (role === "supervisor") {
    if (task.subjectType === "Booking" || task.subjectType === "WorkOrder") return true;
    return OPERATIONAL_KINDS.has(task.kind);
  }
  if (role === "sales") {
    return (
      task.subjectType === "Lead" ||
      task.subjectType === "Booking" ||
      task.subjectType === "Quote" ||
      task.subjectType === "AmcContract" ||
      task.kind === "amc_renewal"
    );
  }
  if (role === "customer_service") {
    return task.subjectType === "Lead" || task.subjectType === "Booking" || task.subjectType === "Review" || task.subjectType === "Question";
  }
  return false;
}

export async function tasksVisibleTo(session: StaffSession, extra?: { subjectType?: string; subjectId?: string }) {
  const where = extra?.subjectType && extra.subjectId ? { subjectType: extra.subjectType, subjectId: extra.subjectId } : {};
  if (session.role === "technician") {
    const assigned = await prisma.workOrder.findMany({
      where: { technicianId: session.staffId || "__none__" },
      select: { id: true, bookingId: true },
    });
    const woIds = assigned.map((row) => row.id);
    const bookingIds = assigned.map((row) => row.bookingId).filter((id): id is string => Boolean(id));
    const or = [
      { assigneeStaffId: session.staffId || "__none__" },
      ...(woIds.length ? [{ subjectType: "WorkOrder", subjectId: { in: woIds } }] : []),
      ...(bookingIds.length ? [{ subjectType: "Booking", subjectId: { in: bookingIds } }] : []),
    ];
    const rows = await prisma.opsTask.findMany({
      where: { AND: [where, { OR: or }] },
      include: { rule: { select: { key: true, name: true } } },
      orderBy: [{ status: "asc" }, { dueAt: "asc" }, { createdAt: "desc" }],
      take: 100,
    });
    return rows;
  }
  const rows = await prisma.opsTask.findMany({
    where,
    include: { rule: { select: { key: true, name: true } } },
    orderBy: [{ status: "asc" }, { dueAt: "asc" }, { createdAt: "desc" }],
    take: extra?.subjectId ? 50 : 200,
  });
  return rows.filter((row) => canViewTask(session, row));
}

export async function updateOpsTask(opts: {
  id: string;
  session: StaffSession;
  status?: "open" | "done" | "cancelled";
  assigneeStaffId?: string | null;
}) {
  const task = await prisma.opsTask.findUnique({ where: { id: opts.id } });
  if (!task) return { ok: false as const, error: "missing" as const };
  if (!canManageTask(opts.session, task)) return { ok: false as const, error: "forbidden" as const };
  const data: { status?: string; assigneeStaffId?: string | null } = {};
  let action = "task.update";
  if (opts.status && opts.status !== task.status) {
    data.status = opts.status;
    action = opts.status === "done" ? "task.complete" : opts.status === "cancelled" ? "task.cancel" : "task.update";
  }
  if (opts.assigneeStaffId !== undefined && opts.assigneeStaffId !== task.assigneeStaffId) {
    data.assigneeStaffId = opts.assigneeStaffId;
    action = "task.reassign";
  }
  if (!Object.keys(data).length) return { ok: true as const, id: task.id };
  await prisma.opsTask.update({ where: { id: task.id }, data });
  await prisma.auditLog.create({
    data: {
      actor: opts.session.email,
      action,
      entity: "OpsTask",
      entityId: task.id,
      meta: JSON.stringify({
        status: data.status || task.status,
        assigneeStaffId: data.assigneeStaffId === undefined ? task.assigneeStaffId : data.assigneeStaffId,
      }),
    },
  });
  return { ok: true as const, id: task.id };
}

export function entityHref(subjectType: string, subjectId: string) {
  if (subjectType === "Lead") return `/admin/leads/${subjectId}`;
  if (subjectType === "Booking") return `/admin/bookings/${subjectId}`;
  if (subjectType === "WorkOrder") return `/admin/work-orders/${subjectId}`;
  if (subjectType === "Quote") return `/admin/quotes/${subjectId}`;
  if (subjectType === "Invoice") return `/admin/invoices/${subjectId}`;
  if (subjectType === "AmcContract") return `/admin/amc/${subjectId}`;
  if (subjectType === "Review") return `/admin/reviews`;
  return "/admin/tasks";
}

export function safeAdminPath(raw: string | undefined, fallback = "/admin/tasks") {
  if (!raw || !raw.startsWith("/admin") || raw.startsWith("//") || raw.includes("://")) return fallback;
  return raw.split("?")[0];
}
