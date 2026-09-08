import { prisma } from "@/server/db";
import { can, canViewTasks } from "@/lib/admin/rbac";
import { hasSection } from "@/lib/insights/rbac";
import { narrowerRole } from "@/lib/cofounder/rbac";

export type PriorityAction = {
  id: string;
  count: number;
  title: string;
  explanation: string;
  href: string;
  context: string;
};

export type PrioritySession = {
  role: string;
  staffId: string | null;
  frozenRole?: string;
};

async function hotFollowupGaps() {
  const hot = await prisma.lead.findMany({
    where: { score: { is: { effectiveClass: "HOT", quarantined: false } } },
    orderBy: { createdAt: "desc" },
    take: 40,
    select: { id: true },
  });
  if (!hot.length) return 0;
  const ids = hot.map((row) => row.id);
  const open = await prisma.opsTask.findMany({
    where: { subjectType: "Lead", subjectId: { in: ids }, kind: "follow_up", status: "open" },
    select: { subjectId: true },
  });
  const has = new Set(open.map((row) => row.subjectId));
  return ids.filter((id) => !has.has(id)).length;
}

/** Bounded, role-aware actionable gaps from existing records only. */
export async function getPriorityActions(session: PrioritySession, take = 8): Promise<PriorityAction[]> {
  const role = session.frozenRole ? narrowerRole(session.role, session.frozenRole) : session.role;
  const actions: PriorityAction[] = [];
  const cutoff48 = new Date(Date.now() - 48 * 60 * 60 * 1000);
  const now = new Date();

  if (can(role, "leads")) {
    const count = await hotFollowupGaps();
    if (count > 0) {
      actions.push({
        id: "hot-followup-gaps",
        count,
        title: "HOT leads need follow-up",
        explanation: `${count} HOT lead${count === 1 ? "" : "s"} ${count === 1 ? "has" : "have"} no open follow-up task.`,
        href: "/admin/leads?class=HOT",
        context: "LeadScore HOT · OpsTask follow_up open gaps",
      });
    }
  }

  if (can(role, "quotes")) {
    const count = await prisma.quote.count({
      where: {
        status: "SENT",
        OR: [{ sentAt: { lt: cutoff48 } }, { AND: [{ sentAt: null }, { updatedAt: { lt: cutoff48 } }] }],
      },
    });
    if (count > 0) {
      actions.push({
        id: "stale-sent-quotes",
        count,
        title: "Quotes waiting for follow-up",
        explanation: `${count} quote${count === 1 ? "" : "s"} SENT for more than 48 hours and not ACCEPTED.`,
        href: "/admin/quotes?status=SENT",
        context: "Quote status SENT · age > 48h",
      });
    }
  }

  if (can(role, "bookings")) {
    const count = await prisma.booking.count({ where: { status: { in: ["requested", "pending_confirmation"] } } });
    if (count > 0) {
      actions.push({
        id: "pending-bookings",
        count,
        title: "Bookings need attention",
        explanation: `${count} booking${count === 1 ? "" : "s"} still requested or pending confirmation.`,
        href: "/admin/bookings?status=requested",
        context: "Booking status requested / pending_confirmation",
      });
    }
  }

  if (can(role, "work_orders")) {
    const where =
      role === "technician"
        ? { technicianId: session.staffId || "__none__", status: { not: "completed" } }
        : { status: { not: "completed" } };
    const count = await prisma.workOrder.count({ where });
    if (count > 0) {
      actions.push({
        id: "open-work-orders",
        count,
        title: role === "technician" ? "Assigned jobs open" : "Jobs need attention",
        explanation:
          role === "technician"
            ? `${count} assigned work order${count === 1 ? "" : "s"} still open.`
            : `${count} open work order${count === 1 ? "" : "s"} need attention.`,
        href: "/admin/work-orders",
        context: role === "technician" ? "Assigned to you · not completed" : "Work orders not completed",
      });
    }
  }

  if (can(role, "invoices") && can(role, "work_orders")) {
    const count = await prisma.workOrder.count({
      where: { status: "completed", invoices: { none: {} } },
    });
    if (count > 0) {
      actions.push({
        id: "completed-wo-no-invoice",
        count,
        title: "Completed jobs without invoice",
        explanation: `${count} completed work order${count === 1 ? "" : "s"} ${count === 1 ? "has" : "have"} no invoice yet.`,
        href: "/admin/work-orders?status=completed",
        context: "WorkOrder completed · no Invoice linked",
      });
    }
  }

  if (can(role, "invoices")) {
    const overdue = await prisma.invoice.count({ where: { status: "OVERDUE" } });
    if (overdue > 0) {
      actions.push({
        id: "overdue-invoices",
        count: overdue,
        title: "Overdue invoices",
        explanation: `${overdue} invoice${overdue === 1 ? "" : "s"} marked OVERDUE.`,
        href: "/admin/invoices?status=OVERDUE",
        context: "Invoice status OVERDUE",
      });
    }
  }

  if (canViewTasks(role)) {
    const count = await prisma.opsTask.count({
      where: { status: "open", dueAt: { lt: now } },
    });
    if (count > 0) {
      actions.push({
        id: "overdue-tasks",
        count,
        title: "Overdue tasks",
        explanation: `${count} open OpsTask${count === 1 ? "" : "s"} past due.`,
        href: "/admin/tasks",
        context: "OpsTask open · dueAt in the past",
      });
    }
  }

  if (can(role, "reviews")) {
    const low = await prisma.review.count({
      where: { status: "PENDING", stars: { lte: 2 } },
    });
    if (low > 0) {
      actions.push({
        id: "low-rating-reviews",
        count: low,
        title: "Low ratings pending review",
        explanation: `${low} pending review${low === 1 ? "" : "s"} with 1–2 stars.`,
        href: "/admin/reviews?status=PENDING",
        context: "Review PENDING · stars ≤ 2",
      });
    }
  }

  if (can(role, "questions")) {
    const count = await prisma.question.count({ where: { moderationStatus: "PENDING" } });
    if (count > 0) {
      actions.push({
        id: "unanswered-qna",
        count,
        title: "Unanswered Q&A",
        explanation: `${count} question${count === 1 ? "" : "s"} awaiting moderation.`,
        href: "/admin/questions",
        context: "Question moderationStatus PENDING",
      });
    }
  }

  if (hasSection(role, "amc")) {
    const soon = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    const count = await prisma.amcContract.count({
      where: { endDate: { gte: now, lte: soon } },
    });
    if (count > 0) {
      actions.push({
        id: "amc-renewals",
        count,
        title: "AMC renewals approaching",
        explanation: `${count} AMC contract${count === 1 ? "" : "s"} ending within 30 days.`,
        href: "/admin/amc",
        context: "AMC endDate within 30 days",
      });
    }
  }

  return actions.sort((a, b) => b.count - a.count).slice(0, Math.max(1, Math.min(12, take)));
}
