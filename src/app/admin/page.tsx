import { prisma } from "@/server/db";
import { needSession } from "@/lib/admin/guard";
import { can } from "@/lib/admin/rbac";
import { canViewSlCorpusOps, getSlCorpusDashboardStatus } from "@/lib/admin/sl-corpus-status";
import { canUseCoFounder } from "@/lib/cofounder/rbac";
import { getPriorityActions } from "@/lib/cofounder/priority";
import { dashboardPromptsForRole } from "@/lib/cofounder/prompts";
import { SlCorpusOpsPanel } from "@/components/admin/SlCorpusOpsPanel";
import { PageHeader } from "@/components/admin/Ui";
import Link from "next/link";

export default async function AdminHome() {
  const session = await needSession();
  const showSlCorpus = canViewSlCorpusOps(session.role);
  const [leads, bookings, reviews, quotes, invoices, questions, slCorpus] = await Promise.all([
    can(session.role, "leads") ? prisma.lead.count({ where: { status: "NEW" } }) : 0,
    can(session.role, "bookings") ? prisma.booking.count({ where: { status: "requested" } }) : 0,
    can(session.role, "reviews") ? prisma.review.count({ where: { status: "PENDING" } }) : 0,
    can(session.role, "quotes") ? prisma.quote.count({ where: { status: "DRAFT" } }) : 0,
    can(session.role, "invoices") ? prisma.invoice.count({ where: { status: "DRAFT" } }) : 0,
    can(session.role, "questions") ? prisma.question.count({ where: { moderationStatus: "PENDING" } }) : 0,
    showSlCorpus ? getSlCorpusDashboardStatus() : Promise.resolve(null),
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
    can(session.role, "work_orders")
      ? { label: session.role === "technician" ? "Assigned work orders" : "Open work orders", value: assigned, href: "/admin/work-orders" }
      : null,
    can(session.role, "reviews") ? { label: "Reviews pending", value: reviews, href: "/admin/reviews" } : null,
    can(session.role, "questions") ? { label: "Q&A pending", value: questions, href: "/admin/questions" } : null,
    can(session.role, "quotes") ? { label: "Draft quotations", value: quotes, href: "/admin/quotes" } : null,
    can(session.role, "invoices") ? { label: "Draft invoices", value: invoices, href: "/admin/invoices" } : null,
  ].filter(Boolean) as Array<{ label: string; value: number; href: string }>;

  const showCofounder = canUseCoFounder(session.role);
  const prioritySnippet = showCofounder ? await getPriorityActions(session, 3) : [];
  const prompts = showCofounder ? dashboardPromptsForRole(session.role) : [];

  return (
    <div>
      <PageHeader title="Dashboard" note="Operations inbox. Payments, customer portal, and WhatsApp Business API are out of this phase." />
      {slCorpus ? <SlCorpusOpsPanel status={slCorpus} /> : null}
      {showCofounder ? (
        <section className="mb-6 overflow-hidden rounded-md border border-line bg-gradient-to-br from-white via-sand/40 to-sand-2/60 p-4 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted">ALNAJAH AI</p>
              <h2 className="mt-1 text-lg font-semibold text-navy">Co-Founder</h2>
              <p className="mt-1 max-w-xl text-sm text-muted">
                Role-aware assistant. It recommends actions as proposals — never invents KPIs, prices, or confirmations.
              </p>
            </div>
            <Link href="/admin/ai" className="rounded-md bg-navy px-3 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90">
              Open assistant
            </Link>
          </div>
          {prioritySnippet.length ? (
            <div className="mt-4 grid gap-2 sm:grid-cols-3">
              {prioritySnippet.map((action) => (
                <Link
                  key={action.id}
                  href={action.href}
                  className="rounded-md border border-line bg-white/90 p-3 transition-shadow hover:shadow-sm"
                >
                  <p className="text-xs text-muted">{action.title}</p>
                  <p className="mt-1 text-2xl font-semibold tabular-nums text-navy">{action.count}</p>
                  <p className="mt-1 line-clamp-2 text-xs text-muted">{action.explanation}</p>
                </Link>
              ))}
            </div>
          ) : (
            <p className="mt-4 text-sm text-muted">No priority gaps for your role right now.</p>
          )}
          <div className="mt-4 flex flex-wrap gap-2">
            {prompts.map((prompt) => (
              <Link
                key={prompt.q}
                href={"/admin/ai?q=" + encodeURIComponent(prompt.q)}
                className="rounded-md border border-line bg-white px-2.5 py-1.5 text-xs text-navy transition-colors hover:bg-sand"
              >
                {prompt.label}
              </Link>
            ))}
            {can(session.role, "knowledge") ? (
              <Link href="/admin/knowledge" className="rounded-md border border-line bg-white px-2.5 py-1.5 text-xs text-muted hover:bg-sand">
                Knowledge / SOPs
              </Link>
            ) : null}
          </div>
        </section>
      ) : null}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => (
          <Link key={card.href} href={card.href} className="rounded-md border border-line bg-white p-4 transition-shadow hover:shadow-sm">
            <p className="text-sm text-muted">{card.label}</p>
            <p className="mt-2 text-3xl font-semibold tabular-nums">{card.value}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
