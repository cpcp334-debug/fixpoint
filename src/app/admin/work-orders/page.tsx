import { prisma } from "@/server/db";
import { needPermission } from "@/lib/admin/guard";
import { AdminBulkTable, AdminFlash, Field, Forbidden, PageHeader, PrimaryButton } from "@/components/admin/Ui";
import { createWorkOrderAction } from "@/app/admin/actions";
import { createdAtRange, resolveWindow } from "@/lib/insights/dates";
import type { Prisma } from "@prisma/client";

const STATUSES = ["created", "assigned", "in_progress", "completed", "cancelled", "qc_failed"];

export default async function WorkOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string; status?: string; q?: string; ok?: string; error?: string }>;
}) {
  const auth = await needPermission("work_orders");
  if (!auth.ok) return <Forbidden />;
  const query = await searchParams;
  const where: Prisma.WorkOrderWhereInput =
    auth.session.role === "technician" ? { technicianId: auth.session.staffId || "__none__" } : {};
  if (query.status) where.status = query.status;
  if (query.q?.trim()) {
    const q = query.q.trim();
    where.OR = [
      { number: { contains: q } },
      { serviceLabel: { contains: q } },
      { locationLabel: { contains: q } },
    ];
  }
  if (query.from && query.to) {
    const window = resolveWindow({ preset: "custom", from: query.from, to: query.to });
    if (query.status === "completed") where.updatedAt = createdAtRange(window.start, window.end);
    else where.createdAt = createdAtRange(window.start, window.end);
  }
  const rows = await prisma.workOrder.findMany({ where, orderBy: { createdAt: "desc" }, take: 200 });
  const sp = new URLSearchParams();
  for (const key of ["from", "to", "status", "q"] as const) {
    const value = query[key];
    if (value) sp.set(key, value);
  }
  const returnTo = `/admin/work-orders${sp.toString() ? `?${sp}` : ""}`;
  return (
    <div>
      <PageHeader
        title="Work orders"
        note={
          auth.session.role === "technician"
            ? "Showing work orders assigned to you. Bulk: Publish = in_progress, Hide/Soft-remove = cancelled."
            : "Bulk: Publish = in_progress, Hide/Soft-remove = cancelled."
        }
      />
      <AdminFlash ok={query.ok} error={query.error} />
      {auth.session.role !== "technician" ? (
        <form action={createWorkOrderAction} className="mb-6 grid max-w-3xl gap-3 rounded-md border border-line bg-white p-4 sm:grid-cols-2">
          <Field label="Service label" name="serviceLabel" />
          <Field label="Location label" name="locationLabel" />
          <Field label="Property" name="propertyLabel" />
          <Field label="Scope" name="scope" />
          <PrimaryButton>Create work order</PrimaryButton>
        </form>
      ) : null}
      <form className="mb-4 flex flex-wrap gap-2 text-sm" method="get">
        <input name="q" defaultValue={query.q || ""} placeholder="Search number or labels" className="min-w-48 rounded-md border border-line px-3 py-2" />
        <select name="status" defaultValue={query.status || ""} className="rounded-md border border-line px-3 py-2">
          <option value="">All statuses</option>
          {STATUSES.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>
        <button type="submit" className="rounded-md border border-line px-3 py-2">
          Filter
        </button>
      </form>
      <AdminBulkTable
        entity="work_orders"
        returnTo={returnTo}
        headers={["Number", "Status", "Service", "Location", "Scheduled", ""]}
        actionLabels={{ publish: "Set in progress", hide: "Cancel", archive: "Cancel (archive)" }}
        rows={rows.map((row) => ({
          id: row.id,
          cells: [
            row.number,
            row.status,
            row.serviceLabel,
            row.locationLabel,
            [row.scheduledDate, row.scheduledTime].filter(Boolean).join(" ") || "—",
            <a key="open" className="text-navy" href={`/admin/work-orders/${row.id}`}>
              Open
            </a>,
          ],
        }))}
      />
    </div>
  );
}
