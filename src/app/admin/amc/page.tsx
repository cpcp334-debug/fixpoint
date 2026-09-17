import Link from "next/link";
import { prisma } from "@/server/db";
import { needPermission } from "@/lib/admin/guard";
import { AdminBulkTable, AdminFlash, Forbidden, PageHeader } from "@/components/admin/Ui";
import { amcDateInput } from "@/lib/admin/amc";
import type { Prisma } from "@prisma/client";

export const metadata = {
  title: "AMC | Admin",
  robots: { index: false, follow: false },
};

export default async function AmcListPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; ok?: string; error?: string }>;
}) {
  const auth = await needPermission("amc");
  if (!auth.ok) return <Forbidden />;
  const query = await searchParams;
  const where: Prisma.AmcContractWhereInput = {};
  if (query.status === "active" || query.status === "inactive") where.status = query.status;
  if (query.q?.trim()) {
    const q = query.q.trim();
    where.OR = [
      { reference: { contains: q } },
      { customer: { is: { name: { contains: q } } } },
    ];
  }
  const rows = await prisma.amcContract.findMany({
    where,
    include: { customer: { select: { name: true } } },
    orderBy: [{ status: "asc" }, { endDate: "asc" }],
    take: 100,
  });
  const sp = new URLSearchParams();
  if (query.q) sp.set("q", query.q);
  if (query.status) sp.set("status", query.status);
  const returnTo = `/admin/amc${sp.toString() ? `?${sp}` : ""}`;
  return (
    <div>
      <PageHeader
        title="AMC contracts"
        note="Bulk: Publish = active, Hide/Soft-remove = inactive."
        actions={
          <Link className="text-navy" href="/admin/amc/new">
            New AMC
          </Link>
        }
      />
      <AdminFlash ok={query.ok} error={query.error} />
      <form className="mb-4 flex flex-wrap gap-2 text-sm" method="get">
        <input name="q" defaultValue={query.q || ""} placeholder="Search customer or reference" className="min-w-48 rounded-md border border-line px-3 py-2" />
        <select name="status" defaultValue={query.status || ""} className="rounded-md border border-line px-3 py-2">
          <option value="">All statuses</option>
          <option value="active">active</option>
          <option value="inactive">inactive</option>
        </select>
        <button type="submit" className="rounded-md border border-line px-3 py-2">
          Filter
        </button>
      </form>
      <AdminBulkTable
        entity="amc"
        returnTo={returnTo}
        headers={["Customer", "Reference", "End date", "Frequency", "Status", ""]}
        actionLabels={{ publish: "Activate", hide: "Deactivate", archive: "Deactivate (archive)" }}
        rows={rows.map((row) => ({
          id: row.id,
          cells: [
            row.customer.name,
            row.reference || "—",
            amcDateInput(row.endDate) || "—",
            row.frequency || "—",
            row.status,
            <Link key="edit" className="text-navy" href={`/admin/amc/${row.id}`}>
              Edit
            </Link>,
          ],
        }))}
        emptyNote="No AMC contracts yet."
      />
    </div>
  );
}
