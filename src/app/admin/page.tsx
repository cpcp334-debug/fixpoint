import { prisma } from "@/server/db";
import { needSession } from "@/lib/admin/guard";
import { can } from "@/lib/admin/rbac";
import { PageHeader } from "@/components/admin/Ui";
import Link from "next/link";

export default async function AdminHome() {
  const session = await needSession();
  const [leads, bookings, reviews, quotes, invoices, questions] = await Promise.all([
    can(session.role, "leads") ? prisma.lead.count({ where: { status: "NEW" } }) : 0,
    can(session.role, "bookings") ? prisma.booking.count({ where: { status: "requested" } }) : 0,
    can(session.role, "reviews") ? prisma.review.count({ where: { status: "PENDING" } }) : 0,
    can(session.role, "quotes") ? prisma.quote.count({ where: { status: "DRAFT" } }) : 0,
    can(session.role, "invoices") ? prisma.invoice.count({ where: { status: "DRAFT" } }) : 0,
    can(session.role, "questions") ? prisma.question.count({ where: { moderationStatus: "PENDING" } }) : 0,
  ]);
  const assigned =
    session.role === "technician"
      ? await prisma.workOrder.count({ where: { technicianId: session.staffId || "__none__" } })
      : can(session.role, "work_orders")
        ? await prisma.workOrder.count({ where: { status: { not: "completed" } } })
        : 0;

  const cards = [
    can(session.role, "leads") ? { label: "New leads", value: leads, href: "/admin/leads" } : null,
    can(session.role, "bookings") ? { label: "Requested bookings", value: bookings, href: "/admin/bookings" } : null,
    can(session.role, "work_orders") ? { label: session.role === "technician" ? "Assigned work orders" : "Open work orders", value: assigned, href: "/admin/work-orders" } : null,
    can(session.role, "reviews") ? { label: "Reviews pending", value: reviews, href: "/admin/reviews" } : null,
    can(session.role, "questions") ? { label: "Q&A pending", value: questions, href: "/admin/questions" } : null,
    can(session.role, "quotes") ? { label: "Draft quotations", value: quotes, href: "/admin/quotes" } : null,
    can(session.role, "invoices") ? { label: "Draft invoices", value: invoices, href: "/admin/invoices" } : null,
  ].filter(Boolean) as Array<{ label: string; value: number; href: string }>;

  return (
    <div>
      <PageHeader title="Dashboard" note="Internal operations only. Payments, customer portal, and WhatsApp Business API are out of this phase." />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => (
          <Link key={card.href} href={card.href} className="rounded-md border border-line bg-white p-4">
            <p className="text-sm text-muted">{card.label}</p>
            <p className="mt-2 text-3xl font-semibold">{card.value}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
