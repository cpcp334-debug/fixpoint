import Link from "next/link";
import { prisma } from "@/server/db";
import { needPermission } from "@/lib/admin/guard";
import { AdminTable, Forbidden, PageHeader } from "@/components/admin/Ui";
import { amcDateInput } from "@/lib/admin/amc";

export const metadata = {
  title: "AMC | Admin",
  robots: { index: false, follow: false },
};

export default async function AmcListPage() {
  const auth = await needPermission("amc");
  if (!auth.ok) return <Forbidden />;
  const rows = await prisma.amcContract.findMany({
    include: { customer: { select: { name: true } } },
    orderBy: [{ status: "asc" }, { endDate: "asc" }],
    take: 100,
  });
  return (
    <div>
      <PageHeader
        title="AMC contracts"
        note="Minimal contract register. Renewal jobs are created by the automation tick, not by opening this page. The example automation rule stays disabled until a manager enables it."
        actions={
          <Link className="text-navy" href="/admin/amc/new">
            New AMC
          </Link>
        }
      />
      <AdminTable headers={["Customer", "Reference", "End date", "Frequency", "Status", ""]}>
        {rows.map((row) => (
          <tr key={row.id} className="border-t border-line">
            <td className="px-3 py-2">{row.customer.name}</td>
            <td className="px-3 py-2">{row.reference || "—"}</td>
            <td className="px-3 py-2">{amcDateInput(row.endDate) || "—"}</td>
            <td className="px-3 py-2">{row.frequency || "—"}</td>
            <td className="px-3 py-2">{row.status}</td>
            <td className="px-3 py-2">
              <Link className="text-navy" href={`/admin/amc/${row.id}`}>
                Edit
              </Link>
            </td>
          </tr>
        ))}
      </AdminTable>
      {!rows.length ? <p className="mt-4 text-sm text-muted">No AMC contracts yet.</p> : null}
    </div>
  );
}
