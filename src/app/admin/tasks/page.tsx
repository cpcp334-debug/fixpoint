import Link from "next/link";
import { prisma } from "@/server/db";
import { needSession } from "@/lib/admin/guard";
import { canViewTasks } from "@/lib/admin/rbac";
import { Forbidden, PageHeader } from "@/components/admin/Ui";
import { TaskList } from "@/components/admin/TaskList";
import { tasksVisibleTo } from "@/lib/automation/tasks";

export default async function TasksPage({ searchParams }: { searchParams: Promise<{ status?: string; error?: string }> }) {
  const session = await needSession();
  if (!canViewTasks(session.role)) return <Forbidden />;
  const query = await searchParams;
  const [rows, staff] = await Promise.all([
    tasksVisibleTo(session),
    prisma.staff.findMany({ where: { status: "active" }, orderBy: { staffCode: "asc" } }),
  ]);
  const tasks = query.status ? rows.filter((row) => row.status === query.status) : rows;
  return (
    <div>
      <PageHeader
        title="Tasks"
        note="Operational follow-ups from automation and staff. Completing a task does not confirm bookings or issue invoices."
      />
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
      <TaskList tasks={tasks} staff={staff} showEntity error={query.error} />
    </div>
  );
}
