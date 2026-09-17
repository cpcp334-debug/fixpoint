import { prisma } from "@/server/db";
import { needPermission } from "@/lib/admin/guard";
import { AdminBulkTable, AdminFlash, Field, Forbidden, PageHeader, PrimaryButton, SelectField } from "@/components/admin/Ui";
import { createBookingAction } from "@/app/admin/actions";
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
  searchParams: Promise<{ status?: string; from?: string; to?: string; serviceId?: string; locationId?: string; q?: string; ok?: string; error?: string }>;
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
  if (query.q?.trim()) {
    const q = query.q.trim();
    where.OR = [
      { name: { contains: q } },
      { phone: { contains: q } },
      { number: { contains: q } },
    ];
  }
  if (query.from && query.to) {
    const window = resolveWindow({ preset: "custom", from: query.from, to: query.to });
    if (query.status === "completed") where.updatedAt = createdAtRange(window.start, window.end);
    else if (query.status === "confirmed") where.confirmedAt = createdAtRange(window.start, window.end);
    else where.createdAt = createdAtRange(window.start, window.end);
  }
  const rows = await prisma.booking.findMany({ where, orderBy: { createdAt: "desc" }, take: 200 });
  const sp = new URLSearchParams();
  for (const key of ["status", "from", "to", "serviceId", "locationId", "q"] as const) {
    const value = query[key];
    if (value) sp.set(key, value);
  }
  const returnTo = `/admin/bookings${sp.toString() ? `?${sp}` : ""}`;
  return (
    <div>
      <PageHeader title="Bookings" note="Bulk: Publish = confirmed, Hide/Soft-remove = cancelled. Preferred time is not a confirmed appointment." />
      <AdminFlash ok={query.ok} error={query.error} />
      <form action={createBookingAction} className="mb-6 grid max-w-3xl gap-3 rounded-md border border-line bg-white p-4 sm:grid-cols-2">
        <Field label="Name" name="name" required />
        <Field label="Phone" name="phone" required />
        <Field label="Email" name="email" />
        <SelectField
          label="Type"
          name="type"
          defaultValue="standard"
          options={["standard", "site_inspection", "emergency", "recurring_cleaning", "amc_visit"].map((value) => ({
            value,
            label: value,
          }))}
        />
        <Field label="Preferred date" name="preferredDate" type="date" />
        <Field label="Preferred time" name="preferredTime" />
        <Field label="Requirement" name="requirement" required textarea rows={3} />
        <Field label="Notes" name="notes" textarea rows={2} />
        <div className="sm:col-span-2">
          <PrimaryButton>Create booking</PrimaryButton>
        </div>
      </form>
      <form className="mb-4 flex flex-wrap gap-2 text-sm" method="get">
        <input name="q" defaultValue={query.q || ""} placeholder="Search number, name, phone" className="min-w-48 rounded-md border border-line px-3 py-2" />
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
        entity="bookings"
        returnTo={returnTo}
        headers={["Number", "Type", "Status", "Name", "Preferred", "Confirmed", ""]}
        actionLabels={{ publish: "Confirm", hide: "Cancel", archive: "Cancel (archive)" }}
        rows={rows.map((row) => ({
          id: row.id,
          cells: [
            row.number,
            row.type,
            row.status,
            row.name,
            [row.preferredDate, row.preferredTime].filter(Boolean).join(" ") || "—",
            [row.confirmedDate, row.confirmedTime].filter(Boolean).join(" ") || "—",
            <a key="open" className="text-navy" href={`/admin/bookings/${row.id}`}>
              Open
            </a>,
          ],
        }))}
      />
    </div>
  );
}
