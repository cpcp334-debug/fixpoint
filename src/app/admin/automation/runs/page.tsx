import Link from "next/link";
import { prisma } from "@/server/db";
import { needPermission } from "@/lib/admin/guard";
import { AdminTable, Forbidden, PageHeader } from "@/components/admin/Ui";
import { retryAutomationJobAction } from "@/app/admin/actions";
import type { Prisma } from "@prisma/client";

export default async function AutomationRunsPage({
  searchParams,
}: {
  searchParams: Promise<{ failed?: string; retried?: string }>;
}) {
  const auth = await needPermission("automation");
  if (!auth.ok) return <Forbidden />;
  const query = await searchParams;
  const where: Prisma.AutomationRunWhereInput = query.failed === "1" ? { ok: false } : {};
  const [runs, deadJobs] = await Promise.all([
    prisma.automationRun.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 200,
      include: { rule: { select: { key: true, name: true } } },
    }),
    prisma.automationJob.findMany({
      where: { status: { in: ["failed", "dead"] } },
      orderBy: { updatedAt: "desc" },
      take: 50,
    }),
  ]);
  return (
    <div className="space-y-8">
      <PageHeader
        title="Automation runs"
        note="Condition results and action outcomes only. No IP, phones, transcripts, or photos."
        actions={
          <div className="flex gap-3 text-sm">
            <Link className="text-navy" href="/admin/automation">
              Rules
            </Link>
            <Link className="text-navy" href="/admin/automation/runs?failed=1">
              Failures
            </Link>
          </div>
        }
      />
      {query.retried ? <p className="text-sm text-accent">Retry queued.</p> : null}
      <AdminTable headers={["When", "Rule", "Trigger", "Conditions", "Result", "Attempt", "Error"]}>
        {runs.map((run) => (
          <tr key={run.id} className="border-t border-line">
            <td className="px-3 py-2">{run.createdAt.toISOString().replace("T", " ").slice(0, 19)}</td>
            <td className="px-3 py-2">
              {run.rule ? (
                <Link className="text-navy" href={`/admin/automation/${run.ruleId}`}>
                  {run.rule.key}
                </Link>
              ) : (
                "—"
              )}
            </td>
            <td className="px-3 py-2">{run.trigger}</td>
            <td className="px-3 py-2">{run.conditionPassed ? "passed" : "failed closed"}</td>
            <td className="px-3 py-2">{run.ok ? "ok" : "failed"}</td>
            <td className="px-3 py-2">{run.attempt}</td>
            <td className="px-3 py-2">{run.error || "—"}</td>
          </tr>
        ))}
      </AdminTable>
      <section>
        <h2 className="mb-3 text-lg font-semibold">Failed jobs</h2>
        <AdminTable headers={["Trigger", "Subject", "Status", "Attempt", "Error", "Retry"]}>
          {deadJobs.map((job) => (
            <tr key={job.id} className="border-t border-line">
              <td className="px-3 py-2">{job.trigger}</td>
              <td className="px-3 py-2">
                {job.subjectType} {job.subjectId.slice(0, 8)}
              </td>
              <td className="px-3 py-2">{job.status}</td>
              <td className="px-3 py-2">{job.attempt}</td>
              <td className="px-3 py-2">{job.lastError || "—"}</td>
              <td className="px-3 py-2">
                <form action={retryAutomationJobAction}>
                  <input type="hidden" name="id" value={job.id} />
                  <button type="submit" className="text-sm text-navy">
                    Retry
                  </button>
                </form>
              </td>
            </tr>
          ))}
        </AdminTable>
      </section>
    </div>
  );
}
