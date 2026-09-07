import { prisma } from "@/server/db";
import { needPermission } from "@/lib/admin/guard";
import { AdminTable, Forbidden, PageHeader } from "@/components/admin/Ui";

export default async function AuditPage() {
  const auth = await needPermission("audit");
  if (!auth.ok) return <Forbidden />;
  const rows = await prisma.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 300 });
  const exports = await prisma.exportLog.findMany({ orderBy: { createdAt: "desc" }, take: 50 });
  return (
    <div className="space-y-8">
      <PageHeader title="Audit log" note="Staff actions, document downloads, and login events." />
      <AdminTable headers={["When", "Actor", "Action", "Entity"]}>
        {rows.map((row) => (
          <tr key={row.id} className="border-t border-line">
            <td className="px-3 py-2">{row.createdAt.toISOString().replace("T", " ").slice(0, 19)}</td>
            <td className="px-3 py-2">{row.actor}</td>
            <td className="px-3 py-2">{row.action}</td>
            <td className="px-3 py-2">
              {row.entity} {row.entityId}
            </td>
          </tr>
        ))}
      </AdminTable>
      <h2 className="text-lg font-semibold">Export downloads</h2>
      <AdminTable headers={["When", "User", "Role", "Dataset", "Format", "Rows"]}>
        {exports.map((row) => (
          <tr key={row.id} className="border-t border-line">
            <td className="px-3 py-2">{row.createdAt.toISOString().replace("T", " ").slice(0, 19)}</td>
            <td className="px-3 py-2">{row.userId}</td>
            <td className="px-3 py-2">{row.role}</td>
            <td className="px-3 py-2">{row.dataset}</td>
            <td className="px-3 py-2">{row.format}</td>
            <td className="px-3 py-2">{row.resultCount}</td>
          </tr>
        ))}
      </AdminTable>
    </div>
  );
}
