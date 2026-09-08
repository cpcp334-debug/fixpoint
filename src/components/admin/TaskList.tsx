import type { OpsTask } from "@prisma/client";
import Link from "next/link";
import { updateOpsTaskAction } from "@/app/admin/actions";
import { entityHref } from "@/lib/automation/tasks";

type TaskRow = OpsTask & { rule?: { key: string; name: string } | null };

export function TaskList({
  tasks,
  staff,
  showEntity,
  error,
  returnTo = "/admin/tasks",
}: {
  tasks: TaskRow[];
  staff: Array<{ id: string; staffCode: string; role: string }>;
  showEntity?: boolean;
  error?: string;
  returnTo?: string;
}) {
  const opts = [{ value: "", label: "Unassigned" }, ...staff.map((row) => ({ value: row.id, label: `${row.staffCode} (${row.role})` }))];
  return (
    <section className="rounded-md border border-line bg-white p-4">
      <h2 className="mb-3 text-lg font-semibold">Tasks</h2>
      {error ? <p className="mb-3 text-sm text-danger">{error}</p> : null}
      {!tasks.length ? <p className="text-sm text-muted">No tasks.</p> : null}
      <ul className="space-y-3">
        {tasks.map((task) => (
          <li key={task.id} className="border-t border-line pt-3 text-sm first:border-t-0 first:pt-0">
            <p className="font-medium">{task.title}</p>
            <p className="text-muted">
              {task.status} · {task.kind} · {task.priority}
              {task.dueAt ? ` · due ${task.dueAt.toISOString().slice(0, 16).replace("T", " ")}` : ""}
              {task.rule ? ` · ${task.rule.key}` : ` · ${task.source}`}
              {showEntity ? (
                <>
                  {" · "}
                  <Link className="text-navy" href={entityHref(task.subjectType, task.subjectId)}>
                    {task.subjectType}
                  </Link>
                </>
              ) : null}
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {task.status === "open" ? (
                <>
                  <form action={updateOpsTaskAction}>
                    <input type="hidden" name="id" value={task.id} />
                    <input type="hidden" name="next" value={returnTo} />
                    <input type="hidden" name="status" value="done" />
                    <button type="submit" className="text-navy">
                      Complete
                    </button>
                  </form>
                  <form action={updateOpsTaskAction}>
                    <input type="hidden" name="id" value={task.id} />
                    <input type="hidden" name="next" value={returnTo} />
                    <input type="hidden" name="status" value="cancelled" />
                    <button type="submit" className="text-navy">
                      Cancel
                    </button>
                  </form>
                </>
              ) : null}
              <form action={updateOpsTaskAction} className="flex gap-2">
                <input type="hidden" name="id" value={task.id} />
                <input type="hidden" name="next" value={returnTo} />
                <select name="assigneeStaffId" defaultValue={task.assigneeStaffId || ""} className="rounded-md border border-line px-2 py-1">
                  {opts.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <button type="submit" className="text-navy">
                  Reassign
                </button>
              </form>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
