import { prisma } from "@/server/db";
import { needPermission } from "@/lib/admin/guard";
import { AdminTable, Field, Forbidden, PageHeader, PrimaryButton } from "@/components/admin/Ui";
import { createWorkOrderAction } from "@/app/admin/actions";
import { createdAtRange, resolveWindow } from "@/lib/insights/dates";
import type { Prisma } from "@prisma/client";

export default async function WorkOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string; status?: string }>;
}) {
  const auth = await needPermission("work_orders");
  if (!auth.ok) return <Forbidden />;
  const query = await searchParams;
  const where: Prisma.WorkOrderWhereInput =
    auth.session.role === "technician" ? { technicianId: auth.session.staffId || "__none__" } : {};
  if (query.status) where.status = query.status;
  if (query.from && query.to) {
    const window = resolveWindow({ preset: "custom", from: query.from, to: query.to });
    if (query.status === "completed") where.updatedAt = createdAtRange(window.start, window.end);
    else where.createdAt = createdAtRange(window.start, window.end);
  }
  const rows = await prisma.workOrder.findMany({ where, orderBy: { createdAt: "desc" }, take: 200 });
  return (
    <div>
      <PageHeader
        title="Work orders"
        note={auth.session.role === "technician" ? "Showing work orders assigned to your staff record only." : "Create from a booking or enter a manual job card."}
      />
      {auth.session.role !== "technician" ? (
        <form action={createWorkOrderAction} className="mb-6 grid max-w-3xl gap-3 rounded-md border border-line bg-white p-4 sm:grid-cols-2">
          <Field label="Service label" name="serviceLabel" />
          <Field label="Location label" name="locationLabel" />
          <Field label="Property" name="propertyLabel" />
          <Field label="Scope" name="scope" />
          <PrimaryButton>Create work order</PrimaryButton>
        </form>
      ) : null}
      <AdminTable headers={["Number", "Status", "Service", "Location", "Scheduled", ""]}>
        {rows.map((row) => (
          <tr key={row.id} className="border-t border-line">
            <td className="px-3 py-2">{row.number}</td>
            <td className="px-3 py-2">{row.status}</td>
            <td className="px-3 py-2">{row.serviceLabel}</td>
            <td className="px-3 py-2">{row.locationLabel}</td>
            <td className="px-3 py-2">{[row.scheduledDate, row.scheduledTime].filter(Boolean).join(" ") || "—"}</td>
            <td className="px-3 py-2">
              <a className="text-navy" href={`/admin/work-orders/${row.id}`}>
                Open
              </a>
            </td>
          </tr>
        ))}
      </AdminTable>
    </div>
  );
}
