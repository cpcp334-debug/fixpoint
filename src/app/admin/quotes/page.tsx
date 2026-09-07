import { prisma } from "@/server/db";
import { needPermission } from "@/lib/admin/guard";
import { AdminTable, Forbidden, PageHeader } from "@/components/admin/Ui";
import Link from "next/link";
import { createdAtRange, resolveWindow } from "@/lib/insights/dates";
import type { Prisma } from "@prisma/client";

export default async function QuotesPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string; serviceId?: string; locationId?: string }>;
}) {
  const auth = await needPermission("quotes");
  if (!auth.ok) return <Forbidden />;
  const query = await searchParams;
  const where: Prisma.QuoteWhereInput = {};
  if (query.serviceId) where.serviceId = query.serviceId;
  if (query.locationId) where.locationId = query.locationId;
  if (query.from && query.to) {
    const window = resolveWindow({ preset: "custom", from: query.from, to: query.to });
    where.createdAt = createdAtRange(window.start, window.end);
  }
  const rows = await prisma.quote.findMany({ where, orderBy: { createdAt: "desc" }, take: 200 });
  return (
    <div>
      <PageHeader
        title="Quotations"
        note="Manual staff quotations only. A quotation is not a confirmed booking and is not an AI-authored price."
        actions={
          <Link href="/admin/quotes/new" className="rounded-md bg-navy px-4 py-2 text-sm text-white">
            New quotation
          </Link>
        }
      />
      <AdminTable headers={["Number", "Customer", "Status", "Total", ""]}>
        {rows.map((row) => (
          <tr key={row.id} className="border-t border-line">
            <td className="px-3 py-2">{row.quoteNumber}</td>
            <td className="px-3 py-2">{row.customerName}</td>
            <td className="px-3 py-2">{row.status}</td>
            <td className="px-3 py-2">{row.totalLabel || "—"}</td>
            <td className="px-3 py-2">
              <Link className="text-navy" href={`/admin/quotes/${row.id}`}>
                Open
              </Link>
            </td>
          </tr>
        ))}
      </AdminTable>
    </div>
  );
}
