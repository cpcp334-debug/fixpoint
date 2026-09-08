import type { BookingStatus, StaffRole } from "@prisma/client";
import { can } from "@/lib/admin/rbac";
import { prisma } from "@/server/db";
import { emitWorkOrderEvents } from "@/lib/admin/work-orders";
import type { AssignTarget } from "@/lib/automation/types";
import { loadSubjectFacts, technicianMatchesSkill, type SubjectFacts } from "@/lib/automation/subject";

const OPEN_BOOKING: BookingStatus[] = ["requested", "pending_confirmation", "confirmed", "assigned", "in_progress", "rescheduled"];
const OPEN_WO = ["created", "assigned", "in_progress"];

export async function assertTechnicianAssignmentAllowed(
  staffId: string | null | undefined,
  facts: { categorySlug?: string | null; locationSlug?: string | null },
) {
  if (!staffId) return { ok: true as const };
  const staff = await prisma.staff.findUnique({ where: { id: staffId }, include: { skills: true } });
  if (!staff) return { ok: false as const, error: "missing_staff" as const };
  if (staff.role !== "technician") return { ok: true as const };
  if (!technicianMatchesSkill(staff.skills, facts)) return { ok: false as const, error: "skill" as const };
  return { ok: true as const };
}

export async function assignLeadStaff(opts: {
  leadId: string;
  assignedStaffId: string | null;
  actorEmail: string;
  actorRole: string;
}) {
  if (!can(opts.actorRole, "leads")) return { ok: false as const, error: "forbidden" as const };
  const lead = await prisma.lead.findUnique({ where: { id: opts.leadId } });
  if (!lead) return { ok: false as const, error: "missing" as const };
  const facts = (await loadSubjectFacts("Lead", opts.leadId)) || {};
  const allowed = await assertTechnicianAssignmentAllowed(opts.assignedStaffId, facts);
  if (!allowed.ok) return allowed;
  await prisma.lead.update({ where: { id: lead.id }, data: { assignedStaffId: opts.assignedStaffId } });
  await prisma.auditLog.create({
    data: {
      actor: opts.actorEmail,
      action: "lead.assign",
      entity: "Lead",
      entityId: lead.id,
      meta: JSON.stringify({ assignedStaffId: opts.assignedStaffId }),
    },
  });
  return { ok: true as const };
}

export async function assignStaffForAutomation(opts: {
  target: AssignTarget;
  role: string;
  subjectType: string;
  subjectId: string;
  facts: SubjectFacts;
}) {
  const role = opts.role as StaffRole;
  const candidates = await prisma.staff.findMany({
    where: { status: "active", role },
    include: { skills: true },
  });
  const technicianTarget = opts.target === "booking_technician" || opts.target === "work_order_technician";
  const eligible = candidates.filter((staff) => {
    if (!technicianTarget) return true;
    return technicianMatchesSkill(staff.skills, opts.facts);
  });
  if (!eligible.length) {
    return { ok: false as const, skipped: true as const, error: technicianTarget ? "no_matching_skill" : "no_staff" };
  }

  const withLoad = await Promise.all(
    eligible.map(async (staff) => {
      const [bookings, workOrders] = await Promise.all([
        prisma.booking.count({ where: { technicianId: staff.id, status: { in: OPEN_BOOKING } } }),
        prisma.workOrder.count({ where: { technicianId: staff.id, status: { in: OPEN_WO } } }),
      ]);
      return { staff, load: bookings + workOrders };
    }),
  );
  withLoad.sort((a, b) => a.load - b.load || a.staff.staffCode.localeCompare(b.staff.staffCode));
  const chosen = withLoad[0].staff;

  if (opts.target === "lead") {
    const lead = await prisma.lead.findUnique({ where: { id: opts.subjectId } });
    if (!lead) return { ok: false as const, skipped: true as const, error: "subject_missing" };
    if (lead.assignedStaffId && lead.assignedStaffId !== chosen.id) {
      return { ok: false as const, skipped: true as const, error: "human_override" };
    }
    if (lead.assignedStaffId === chosen.id) return { ok: true as const, staffId: chosen.id };
    await prisma.lead.update({ where: { id: lead.id }, data: { assignedStaffId: chosen.id } });
    return { ok: true as const, staffId: chosen.id };
  }

  if (opts.target === "booking_technician" || opts.target === "booking_supervisor") {
    const booking = await prisma.booking.findUnique({ where: { id: opts.subjectId } });
    if (!booking) return { ok: false as const, skipped: true as const, error: "subject_missing" };
    const field = opts.target === "booking_technician" ? "technicianId" : "supervisorId";
    const current = booking[field];
    if (current && current !== chosen.id) return { ok: false as const, skipped: true as const, error: "human_override" };
    if (current === chosen.id) return { ok: true as const, staffId: chosen.id };
    await prisma.booking.update({ where: { id: booking.id }, data: { [field]: chosen.id } });
    return { ok: true as const, staffId: chosen.id };
  }

  if (opts.target === "amc" || opts.subjectType === "AmcContract") {
    const contract = await prisma.amcContract.findUnique({ where: { id: opts.subjectId } });
    if (!contract) return { ok: false as const, skipped: true as const, error: "subject_missing" };
    if (contract.assignedStaffId && contract.assignedStaffId !== chosen.id) {
      return { ok: false as const, skipped: true as const, error: "human_override" };
    }
    if (contract.assignedStaffId !== chosen.id) {
      await prisma.amcContract.update({ where: { id: contract.id }, data: { assignedStaffId: chosen.id } });
      await prisma.auditLog.create({
        data: {
          actor: "system",
          action: "amc.assign",
          entity: "AmcContract",
          entityId: contract.id,
          meta: JSON.stringify({ staffId: chosen.id }),
        },
      });
    }
    await prisma.opsTask.updateMany({
      where: {
        subjectType: "AmcContract",
        subjectId: contract.id,
        kind: "amc_renewal",
        status: "open",
        assigneeStaffId: null,
      },
      data: { assigneeStaffId: chosen.id },
    });
    return { ok: true as const, staffId: chosen.id };
  }

  const workOrder = await prisma.workOrder.findUnique({ where: { id: opts.subjectId } });
  if (!workOrder) return { ok: false as const, skipped: true as const, error: "subject_missing" };
  const field = opts.target === "work_order_technician" ? "technicianId" : "supervisorId";
  const current = workOrder[field];
  if (current && current !== chosen.id) return { ok: false as const, skipped: true as const, error: "human_override" };
  if (current === chosen.id) return { ok: true as const, staffId: chosen.id };
  await prisma.workOrder.update({ where: { id: workOrder.id }, data: { [field]: chosen.id } });
  await emitWorkOrderEvents(
    workOrder.id,
    {
      status: workOrder.status,
      technicianId: field === "technicianId" ? chosen.id : workOrder.technicianId,
    },
    { status: workOrder.status, technicianId: workOrder.technicianId },
  );
  return { ok: true as const, staffId: chosen.id };
}
