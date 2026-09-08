import { notFound } from "next/navigation";
import { prisma } from "@/server/db";
import { needPermission } from "@/lib/admin/guard";
import { Field, Forbidden, PageHeader, PrimaryButton, SelectField } from "@/components/admin/Ui";
import { updateWorkOrderAction } from "@/app/admin/actions";
import { JourneyTimeline } from "@/components/admin/JourneyTimeline";
import { TaskList } from "@/components/admin/TaskList";
import { tasksVisibleTo } from "@/lib/automation/tasks";
import { buildJourney } from "@/lib/journey/aggregate";
import { canViewIdentifiableJourney } from "@/lib/journey/rbac";
import { journeyPageFromSearch } from "@/lib/journey/types";

const STATUSES = ["created", "assigned", "in_progress", "completed", "cancelled", "qc_failed"];

export default async function WorkOrderDetail({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ jt?: string; error?: string }>;
}) {
  const auth = await needPermission("work_orders");
  if (!auth.ok) return <Forbidden />;
  const { id } = await params;
  const query = await searchParams;
  const [row, staff] = await Promise.all([
    prisma.workOrder.findUnique({ where: { id } }),
    prisma.staff.findMany({ orderBy: { staffCode: "asc" } }),
  ]);
  if (!row) notFound();
  if (auth.session.role === "technician" && row.technicianId !== auth.session.staffId) return <Forbidden />;
  const [woTasks, bookingTasks] = await Promise.all([
    tasksVisibleTo(auth.session, { subjectType: "WorkOrder", subjectId: row.id }),
    row.bookingId ? tasksVisibleTo(auth.session, { subjectType: "Booking", subjectId: row.bookingId }) : Promise.resolve([]),
  ]);
  const seen = new Set<string>();
  const tasks = [...woTasks, ...bookingTasks].filter((task) => {
    if (seen.has(task.id)) return false;
    seen.add(task.id);
    return true;
  });
  const timeline = canViewIdentifiableJourney(auth.session.role, "workOrder")
    ? await buildJourney(
        { type: "workOrder", id: row.id },
        { role: auth.session.role, staffId: auth.session.staffId, page: journeyPageFromSearch(query.jt) },
      )
    : null;
  const staffOpts = [{ value: "", label: "Unassigned" }, ...staff.map((s) => ({ value: s.id, label: `${s.staffCode} (${s.role})` }))];
  return (
    <div>
      <PageHeader title={row.number} note={`${row.serviceLabel} · ${row.locationLabel}`} />
      <form action={updateWorkOrderAction} className="max-w-xl space-y-3 rounded-md border border-line bg-white p-4">
        <input type="hidden" name="id" value={row.id} />
        <SelectField label="Status" name="status" defaultValue={row.status} options={STATUSES.map((value) => ({ value, label: value }))} />
        <Field label="Scope" name="scope" defaultValue={row.scope} textarea />
        <Field label="Scheduled date" name="scheduledDate" defaultValue={row.scheduledDate} />
        <Field label="Scheduled time" name="scheduledTime" defaultValue={row.scheduledTime} />
        {auth.session.role !== "technician" ? (
          <>
            <SelectField label="Technician" name="technicianId" defaultValue={row.technicianId} options={staffOpts} />
            <SelectField label="Supervisor" name="supervisorId" defaultValue={row.supervisorId} options={staffOpts} />
            {query.error === "skill" ? <p className="text-sm text-danger">Technician has no matching StaffSkill.</p> : null}
          </>
        ) : null}
        <Field label="QC result" name="qcResult" defaultValue={row.qcResult} textarea />
        <Field label="Notes" name="notes" defaultValue={row.notes} textarea />
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="customerSignOff" defaultChecked={row.customerSignOff} />
          Customer sign-off recorded
        </label>
        <PrimaryButton>Save</PrimaryButton>
      </form>
      {timeline ? <div className="mt-6"><JourneyTimeline journey={timeline} /></div> : null}
      <div className="mt-6">
        <TaskList tasks={tasks} staff={staff} showEntity returnTo={`/admin/work-orders/${row.id}`} />
      </div>
    </div>
  );
}
