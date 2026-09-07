import { prisma } from "@/server/db";
import { needPermission } from "@/lib/admin/guard";
import { AdminTable, Forbidden, PageHeader } from "@/components/admin/Ui";
import { createdAtRange, resolveWindow } from "@/lib/insights/dates";
import type { BookingStatus, Prisma } from "@prisma/client";

const STATUSES: BookingStatus[] = [
  "requested",
  "pending_confirmation",
  "confirmed",
  "assigned",
  "in_progress",
  "completed",
  "cancelled",
  "rescheduled",
];

export default async function BookingsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; from?: string; to?: string; serviceId?: string; locationId?: string }>;
}) {
  const auth = await needPermission("bookings");
  if (!auth.ok) return <Forbidden />;
  const query = await searchParams;
  const where: Prisma.BookingWhereInput = {};
  if (query.status && (STATUSES as string[]).includes(query.status)) {
    where.status = query.status as BookingStatus;
  }
  if (query.serviceId) where.serviceId = query.serviceId;
  if (query.locationId) where.locationId = query.locationId;
  if (query.from && query.to) {
    const window = resolveWindow({ preset: "custom", from: query.from, to: query.to });
    if (query.status === "completed") where.updatedAt = createdAtRange(window.start, window.end);
    else if (query.status === "confirmed") where.confirmedAt = createdAtRange(window.start, window.end);
    else where.createdAt = createdAtRange(window.start, window.end);
  }
  const rows = await prisma.booking.findMany({ where, orderBy: { createdAt: "desc" }, take: 200 });
  return (
    <div>
      <PageHeader title="Bookings" note="Public forms always create requested bookings. Preferred time is not a confirmed appointment." />
      <AdminTable headers={["Number", "Type", "Status", "Name", "Preferred", "Confirmed", ""]}>
        {rows.map((row) => (
          <tr key={row.id} className="border-t border-line">
            <td className="px-3 py-2">{row.number}</td>
            <td className="px-3 py-2">{row.type}</td>
            <td className="px-3 py-2">{row.status}</td>
            <td className="px-3 py-2">{row.name}</td>
            <td className="px-3 py-2">{[row.preferredDate, row.preferredTime].filter(Boolean).join(" ") || "—"}</td>
            <td className="px-3 py-2">{[row.confirmedDate, row.confirmedTime].filter(Boolean).join(" ") || "—"}</td>
            <td className="px-3 py-2">
              <a className="text-navy" href={`/admin/bookings/${row.id}`}>
                Open
              </a>
            </td>
          </tr>
        ))}
      </AdminTable>
    </div>
  );
}
