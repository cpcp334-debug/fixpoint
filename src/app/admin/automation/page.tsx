import Link from "next/link";
import { prisma } from "@/server/db";
import { needPermission } from "@/lib/admin/guard";
import { AdminTable, Forbidden, PageHeader } from "@/components/admin/Ui";
import { toggleAutomationRuleAction } from "@/app/admin/actions";

export default async function AutomationPage() {
  const auth = await needPermission("automation");
  if (!auth.ok) return <Forbidden />;
  const rules = await prisma.automationRule.findMany({ orderBy: [{ priority: "asc" }, { name: "asc" }] });
  return (
    <div>
      <PageHeader
        title="Automation"
        note="Rules stay disabled until a manager enables them. The engine never confirms bookings, changes prices, approves reviews, or creates invoices/work orders."
        actions={
          <div className="flex gap-3 text-sm">
            <Link className="text-navy" href="/admin/automation/runs">
              Run history
            </Link>
            <Link className="text-navy" href="/admin/automation/new">
              New rule
            </Link>
          </div>
        }
      />
      <AdminTable headers={["Rule", "Trigger", "Priority", "Delay", "Enabled", "Owner"]}>
        {rules.map((rule) => (
          <tr key={rule.id} className="border-t border-line">
            <td className="px-3 py-2">
              <Link className="text-navy" href={`/admin/automation/${rule.id}`}>
                {rule.name}
              </Link>
              <p className="text-xs text-muted">{rule.key}</p>
            </td>
            <td className="px-3 py-2">{rule.trigger}</td>
            <td className="px-3 py-2">{rule.priority}</td>
            <td className="px-3 py-2">{rule.delaySeconds ? `${rule.delaySeconds}s` : "immediate"}</td>
            <td className="px-3 py-2">
              <form action={toggleAutomationRuleAction} className="flex items-center gap-2">
                <input type="hidden" name="id" value={rule.id} />
                <span>{rule.enabled ? "on" : "off"}</span>
                <button type="submit" className="text-sm text-navy">
                  {rule.enabled ? "Disable" : "Enable"}
                </button>
              </form>
            </td>
            <td className="px-3 py-2">{rule.updatedBy || "system"}</td>
          </tr>
        ))}
      </AdminTable>
      {!rules.length ? <p className="mt-4 text-sm text-muted">No rules yet.</p> : null}
    </div>
  );
}
