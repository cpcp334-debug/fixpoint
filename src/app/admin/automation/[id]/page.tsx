import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/server/db";
import { needPermission } from "@/lib/admin/guard";
import { AdminTable, Field, Forbidden, PageHeader, PrimaryButton, SelectField } from "@/components/admin/Ui";
import { saveAutomationRuleAction } from "@/app/admin/actions";
import { TRIGGER_OPTIONS } from "@/lib/admin/automation";

export default async function AutomationRuleDetail({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const auth = await needPermission("automation");
  if (!auth.ok) return <Forbidden />;
  const { id } = await params;
  const { error } = await searchParams;
  const rule = await prisma.automationRule.findUnique({ where: { id } });
  if (!rule) notFound();
  const runs = await prisma.automationRun.findMany({
    where: { ruleId: rule.id },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  return (
    <div className="space-y-8">
      <PageHeader
        title={rule.name}
        note={`${rule.key} · ${rule.enabled ? "enabled" : "disabled"}`}
        actions={
          <Link className="text-sm text-navy" href="/admin/automation/runs">
            All runs
          </Link>
        }
      />
      {error ? <p className="text-sm text-danger">Check trigger, conditions, and allowed actions.</p> : null}
      <form action={saveAutomationRuleAction} className="max-w-3xl space-y-3 rounded-md border border-line bg-white p-4">
        <input type="hidden" name="id" value={rule.id} />
        <input type="hidden" name="key" value={rule.key} />
        <Field label="Name" name="name" defaultValue={rule.name} required />
        <Field label="Description" name="description" defaultValue={rule.description} textarea />
        <SelectField label="Trigger" name="trigger" defaultValue={rule.trigger} options={TRIGGER_OPTIONS} />
        <Field label="Priority (lower runs first)" name="priority" defaultValue={String(rule.priority)} />
        <Field label="Delay seconds" name="delaySeconds" defaultValue={String(rule.delaySeconds)} />
        <Field label="Conditions JSON" name="conditionsJson" defaultValue={rule.conditionsJson} textarea />
        <Field label="Actions JSON" name="actionsJson" defaultValue={rule.actionsJson} textarea />
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="enabled" defaultChecked={rule.enabled} />
          Enabled
        </label>
        <PrimaryButton>Save rule</PrimaryButton>
      </form>
      <section>
        <h2 className="mb-3 text-lg font-semibold">Execution history</h2>
        <AdminTable headers={["When", "Attempt", "Conditions", "Result", "Error"]}>
          {runs.map((run) => (
            <tr key={run.id} className="border-t border-line">
              <td className="px-3 py-2">{run.createdAt.toISOString().replace("T", " ").slice(0, 19)}</td>
              <td className="px-3 py-2">{run.attempt}</td>
              <td className="px-3 py-2">{run.conditionPassed ? "passed" : "failed closed"}</td>
              <td className="px-3 py-2">{run.ok ? "ok" : "failed"}</td>
              <td className="px-3 py-2">{run.error || "—"}</td>
            </tr>
          ))}
        </AdminTable>
      </section>
    </div>
  );
}
