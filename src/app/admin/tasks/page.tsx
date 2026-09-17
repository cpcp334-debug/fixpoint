import Link from "next/link";
import { prisma } from "@/server/db";
import { needSession } from "@/lib/admin/guard";
import { canViewTasks } from "@/lib/admin/rbac";
import { AdminBulkTable, AdminFlash, Forbidden, PageHeader } from "@/components/admin/Ui";
import { entityHref, tasksVisibleTo } from "@/lib/automation/tasks";

export default async function TasksPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; error?: string; ok?: string; q?: string }>;
}) {
  const session = await needSession();
  if (!canViewTasks(session.role)) return <Forbidden />;
  const query = await searchParams;
  const [rows, staff] = await Promise.all([
    tasksVisibleTo(session),
    prisma.staff.findMany({ where: { status: "active" }, orderBy: { staffCode: "asc" } }),
  ]);
  let tasks = query.status ? rows.filter((row) => row.status === query.status) : rows;
  if (query.q?.trim()) {
    const q = query.q.trim().toLowerCase();
    tasks = tasks.filter((row) => row.title.toLowerCase().includes(q) || row.kind.toLowerCase().includes(q));
  }
  const sp = new URLSearchParams();
  if (query.status) sp.set("status", query.status);
  if (query.q) sp.set("q", query.q);
  const returnTo = `/admin/tasks${sp.toString() ? `?${sp}` : ""}`;
  return (
    <div>
      <PageHeader
        title="Tasks"
        note="Bulk: Publish = reopen (open), Hide/Soft-remove = cancelled. Completing a task does not confirm bookings."
      />
      <AdminFlash ok={query.ok} error={query.error} />
      <p className="mb-4 text-sm">
        <Link className="mr-3 text-navy" href="/admin/tasks">
          All
        </Link>
        <Link className="mr-3 text-navy" href="/admin/tasks?status=open">
          Open
        </Link>
        <Link className="mr-3 text-navy" href="/admin/tasks?status=done">
          Done
        </Link>
        <Link className="text-navy" href="/admin/tasks?status=cancelled">
          Cancelled
        </Link>
      </p>
      <form className="mb-4 flex flex-wrap gap-2 text-sm" method="get">
        {query.status ? <input type="hidden" name="status" value={query.status} /> : null}
        <input name="q" defaultValue={query.q || ""} placeholder="Search title or kind" className="min-w-48 rounded-md border border-line px-3 py-2" />
        <button type="submit" className="rounded-md border border-line px-3 py-2">
          Search
        </button>
      </form>
      <AdminBulkTable
        entity="tasks"
        returnTo={returnTo}
        headers={["Title", "Status", "Kind", "Priority", "Due", "Entity"]}
        actionLabels={{ publish: "Reopen", hide: "Cancel", archive: "Cancel (archive)" }}
        rows={tasks.map((task) => ({
          id: task.id,
          cells: [
            task.title,
            task.status,
            task.kind,
            task.priority,
            task.dueAt ? task.dueAt.toISOString().slice(0, 16).replace("T", " ") : "—",
            <Link key="entity" className="text-navy" href={entityHref(task.subjectType, task.subjectId)}>
              {task.subjectType}
            </Link>,
          ],
        }))}
        emptyNote="No tasks."
      />
      <p className="mt-3 text-xs text-muted">{staff.length} active staff records available for assignment on detail flows.</p>
    </div>
  );
}
