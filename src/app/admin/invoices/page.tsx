import { prisma } from "@/server/db";
import { needPermission } from "@/lib/admin/guard";
import { AdminTable, Forbidden, PageHeader } from "@/components/admin/Ui";
import Link from "next/link";
import { createdAtRange, resolveWindow } from "@/lib/insights/dates";
import { INVOICED_STATUSES } from "@/lib/insights/query";
import type { InvoiceStatus, Prisma } from "@prisma/client";

const STATUSES: InvoiceStatus[] = ["DRAFT", "ISSUED", "PARTIALLY_PAID", "PAID", "OVERDUE", "CANCELLED"];

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string; status?: string; invoiced?: string }>;
}) {
  const auth = await needPermission("invoices");
  if (!auth.ok) return <Forbidden />;
  const query = await searchParams;
  const where: Prisma.InvoiceWhereInput = {};
  if (query.invoiced === "1") where.status = { in: [...INVOICED_STATUSES] };
  if (query.status && (STATUSES as string[]).includes(query.status)) where.status = query.status as InvoiceStatus;
  if (query.from && query.to) {
    const window = resolveWindow({ preset: "custom", from: query.from, to: query.to });
    if (query.status === "PAID") where.updatedAt = createdAtRange(window.start, window.end);
    else where.createdAt = createdAtRange(window.start, window.end);
  }
  const rows = await prisma.invoice.findMany({ where, orderBy: { createdAt: "desc" }, take: 200 });
  return (
    <div>
      <PageHeader
        title="Invoices"
        note="Manual invoices only. No payment gateway in this phase. A payment reference is staff-entered text."
        actions={
          <Link href="/admin/invoices/new" className="rounded-md bg-navy px-4 py-2 text-sm text-white">
            New invoice
          </Link>
        }
      />
      <AdminTable headers={["Number", "Customer", "Status", "Total", ""]}>
        {rows.map((row) => (
          <tr key={row.id} className="border-t border-line">
            <td className="px-3 py-2">{row.number}</td>
            <td className="px-3 py-2">{row.customerName}</td>
            <td className="px-3 py-2">{row.status}</td>
            <td className="px-3 py-2">{row.totalLabel || "—"}</td>
            <td className="px-3 py-2">
              <Link className="text-navy" href={`/admin/invoices/${row.id}`}>
                Open
              </Link>
            </td>
          </tr>
        ))}
      </AdminTable>
    </div>
  );
}
