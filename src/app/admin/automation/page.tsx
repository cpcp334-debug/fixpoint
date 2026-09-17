import Link from "next/link";
import { prisma } from "@/server/db";
import { needPermission } from "@/lib/admin/guard";
import { AdminBulkTable, AdminFlash, Forbidden, PageHeader } from "@/components/admin/Ui";
import type { Prisma } from "@prisma/client";

export default async function AutomationPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; ok?: string; error?: string }>;
}) {
  const auth = await needPermission("automation");
  if (!auth.ok) return <Forbidden />;
  const query = await searchParams;
  const where: Prisma.AutomationRuleWhereInput = {};
  if (query.q?.trim()) {
    const q = query.q.trim();
    where.OR = [
      { name: { contains: q } },
      { key: { contains: q } },
    ];
  }
  const rules = await prisma.automationRule.findMany({
    where,
    orderBy: [{ priority: "asc" }, { name: "asc" }],
  });
  const sp = new URLSearchParams();
  if (query.q) sp.set("q", query.q);
  const returnTo = `/admin/automation${sp.toString() ? `?${sp}` : ""}`;
  return (
    <div>
      <PageHeader
        title="Automation"
        note="Bulk: Publish = enable rule, Hide/Soft-remove = disable. Engine never confirms bookings or issues invoices."
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
      <AdminFlash ok={query.ok} error={query.error} />
      <form className="mb-4 flex flex-wrap gap-2 text-sm" method="get">
        <input name="q" defaultValue={query.q || ""} placeholder="Search name, key, trigger" className="min-w-48 rounded-md border border-line px-3 py-2" />
        <button type="submit" className="rounded-md border border-line px-3 py-2">
          Search
        </button>
      </form>
      <AdminBulkTable
        entity="automation"
        returnTo={returnTo}
        headers={["Rule", "Trigger", "Priority", "Delay", "Enabled", "Owner"]}
        actionLabels={{ publish: "Enable", hide: "Disable", archive: "Disable (archive)" }}
        rows={rules.map((rule) => ({
          id: rule.id,
          cells: [
            <div key="name">
              <Link className="text-navy" href={`/admin/automation/${rule.id}`}>
                {rule.name}
              </Link>
              <p className="text-xs text-muted">{rule.key}</p>
            </div>,
            rule.trigger,
            rule.priority,
            rule.delaySeconds ? `${rule.delaySeconds}s` : "immediate",
            rule.enabled ? "on" : "off",
            rule.updatedBy || "system",
          ],
        }))}
        emptyNote="No rules yet."
      />
    </div>
  );
}
