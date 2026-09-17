import { prisma } from "@/server/db";
import { needPermission } from "@/lib/admin/guard";
import { AdminBulkTable, AdminFlash, Forbidden, PageHeader } from "@/components/admin/Ui";
import Link from "next/link";
import { createdAtRange, resolveWindow } from "@/lib/insights/dates";
import type { Prisma, QuoteStatus } from "@prisma/client";

const STATUSES: QuoteStatus[] = ["DRAFT", "SENT", "VIEWED", "ACCEPTED", "REJECTED", "EXPIRED", "CANCELLED"];

export default async function QuotesPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string; serviceId?: string; locationId?: string; q?: string; status?: string; ok?: string; error?: string }>;
}) {
  const auth = await needPermission("quotes");
  if (!auth.ok) return <Forbidden />;
  const query = await searchParams;
  const where: Prisma.QuoteWhereInput = {};
  if (query.serviceId) where.serviceId = query.serviceId;
  if (query.locationId) where.locationId = query.locationId;
  if (query.status && (STATUSES as string[]).includes(query.status)) where.status = query.status as QuoteStatus;
  if (query.q?.trim()) {
    const q = query.q.trim();
    where.OR = [
      { quoteNumber: { contains: q } },
      { customerName: { contains: q } },
    ];
  }
  if (query.from && query.to) {
    const window = resolveWindow({ preset: "custom", from: query.from, to: query.to });
    where.createdAt = createdAtRange(window.start, window.end);
  }
  const rows = await prisma.quote.findMany({ where, orderBy: { createdAt: "desc" }, take: 200 });
  const sp = new URLSearchParams();
  for (const key of ["from", "to", "serviceId", "locationId", "q", "status"] as const) {
    const value = query[key];
    if (value) sp.set(key, value);
  }
  const returnTo = `/admin/quotes${sp.toString() ? `?${sp}` : ""}`;
  return (
    <div>
      <PageHeader
        title="Quotations"
        note="Bulk: Publish = SENT, Hide = CANCELLED, Soft-remove = EXPIRED."
        actions={
          <Link href="/admin/quotes/new" className="rounded-md bg-navy px-4 py-2 text-sm text-white">
            New quotation
          </Link>
        }
      />
      <AdminFlash ok={query.ok} error={query.error} />
      <form className="mb-4 flex flex-wrap gap-2 text-sm" method="get">
        <input name="q" defaultValue={query.q || ""} placeholder="Search number or customer" className="min-w-48 rounded-md border border-line px-3 py-2" />
        <select name="status" defaultValue={query.status || ""} className="rounded-md border border-line px-3 py-2">
          <option value="">All statuses</option>
          {STATUSES.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>
        <button type="submit" className="rounded-md border border-line px-3 py-2">
          Filter
        </button>
      </form>
      <AdminBulkTable
        entity="quotes"
        returnTo={returnTo}
        headers={["Number", "Customer", "Status", "Total", ""]}
        actionLabels={{ publish: "Mark SENT", hide: "Cancel", archive: "Expire" }}
        rows={rows.map((row) => ({
          id: row.id,
          cells: [
            row.quoteNumber,
            row.customerName,
            row.status,
            row.totalLabel || "—",
            <Link key="open" className="text-navy" href={`/admin/quotes/${row.id}`}>
              Open
            </Link>,
          ],
        }))}
      />
    </div>
  );
}
