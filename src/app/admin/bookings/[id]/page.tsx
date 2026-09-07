import { notFound } from "next/navigation";
import { prisma } from "@/server/db";
import { needPermission } from "@/lib/admin/guard";
import { can } from "@/lib/admin/rbac";
import { Field, Forbidden, PageHeader, PrimaryButton, SelectField } from "@/components/admin/Ui";
import { createWorkOrderAction, updateBookingAction } from "@/app/admin/actions";
import { JourneyTimeline } from "@/components/admin/JourneyTimeline";
import { buildJourney } from "@/lib/journey/aggregate";
import { canViewIdentifiableJourney } from "@/lib/journey/rbac";
import { journeyPageFromSearch } from "@/lib/journey/types";

const STATUSES = ["requested", "pending_confirmation", "confirmed", "assigned", "in_progress", "completed", "cancelled", "rescheduled"];

export default async function BookingDetail({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ jt?: string }>;
}) {
  const auth = await needPermission("bookings");
  if (!auth.ok) return <Forbidden />;
  const { id } = await params;
  const query = await searchParams;
  const [row, staff] = await Promise.all([
    prisma.booking.findUnique({ where: { id }, include: { workOrders: true, inspections: true } }),
    prisma.staff.findMany({ orderBy: { staffCode: "asc" } }),
  ]);
  if (!row) notFound();
  const timeline = canViewIdentifiableJourney(auth.session.role, "booking")
    ? await buildJourney(
        { type: "booking", id: row.id },
        { role: auth.session.role, staffId: auth.session.staffId, page: journeyPageFromSearch(query.jt) },
      )
    : null;
  const staffOpts = [{ value: "", label: "Unassigned" }, ...staff.map((s) => ({ value: s.id, label: `${s.staffCode} (${s.role})` }))];
  return (
    <div className="space-y-6">
      <PageHeader title={row.number} note={`${row.type} · ${row.name} · ${row.phone}`} />
      <p className="whitespace-pre-wrap rounded-md border border-line bg-white p-4 text-sm">{row.requirement}</p>
      <p className="text-sm text-muted">
        Preferred: {[row.preferredDate, row.preferredTime].filter(Boolean).join(" ") || "—"} · Confirmed:{" "}
        {[row.confirmedDate, row.confirmedTime].filter(Boolean).join(" ") || "not confirmed"}
      </p>
      <form action={updateBookingAction} className="flex max-w-xl flex-wrap items-end gap-3 rounded-md border border-line bg-white p-4">
        <input type="hidden" name="id" value={row.id} />
        <input type="hidden" name="intent" value="status" />
        <SelectField label="Status" name="status" defaultValue={row.status} options={STATUSES.map((value) => ({ value, label: value }))} />
        <PrimaryButton>Update status</PrimaryButton>
      </form>
      <form action={updateBookingAction} className="grid max-w-xl gap-3 rounded-md border border-line bg-white p-4 sm:grid-cols-2">
        <input type="hidden" name="id" value={row.id} />
        <input type="hidden" name="intent" value="confirm" />
        <Field label="Confirmed date" name="confirmedDate" defaultValue={row.confirmedDate} />
        <Field label="Confirmed time" name="confirmedTime" defaultValue={row.confirmedTime} />
        <PrimaryButton>Confirm appointment</PrimaryButton>
      </form>
      <form action={updateBookingAction} className="grid max-w-xl gap-3 rounded-md border border-line bg-white p-4 sm:grid-cols-2">
        <input type="hidden" name="id" value={row.id} />
        <input type="hidden" name="intent" value="assign" />
        <SelectField label="Technician" name="technicianId" defaultValue={row.technicianId} options={staffOpts} />
        <SelectField label="Supervisor" name="supervisorId" defaultValue={row.supervisorId} options={staffOpts} />
        <PrimaryButton>Assign staff</PrimaryButton>
      </form>
      <form action={updateBookingAction} className="max-w-xl space-y-3 rounded-md border border-line bg-white p-4">
        <input type="hidden" name="id" value={row.id} />
        <input type="hidden" name="intent" value="notes" />
        <Field label="Internal notes" name="notes" defaultValue={row.notes} textarea />
        <PrimaryButton>Save notes</PrimaryButton>
      </form>
      {can(auth.session.role, "work_orders") ? (
        <form action={createWorkOrderAction}>
          <input type="hidden" name="bookingId" value={row.id} />
          <PrimaryButton>Create work order from booking</PrimaryButton>
        </form>
      ) : null}
      {row.workOrders.length ? (
        <p className="text-sm">
          Work orders:{" "}
          {row.workOrders.map((wo) => (
            <a key={wo.id} className="mr-3 text-navy" href={`/admin/work-orders/${wo.id}`}>
              {wo.number}
            </a>
          ))}
        </p>
      ) : null}
      {timeline ? <JourneyTimeline journey={timeline} /> : null}
    </div>
  );
}
