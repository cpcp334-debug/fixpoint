import { prisma } from "@/server/db";
import { needPermission } from "@/lib/admin/guard";
import { AdminBulkTable, AdminFlash, Forbidden, PageHeader } from "@/components/admin/Ui";
import Link from "next/link";
import { createdAtRange, resolveWindow } from "@/lib/insights/dates";
import { INVOICED_STATUSES } from "@/lib/insights/query";
import type { InvoiceStatus, Prisma } from "@prisma/client";

const STATUSES: InvoiceStatus[] = ["DRAFT", "ISSUED", "PARTIALLY_PAID", "PAID", "OVERDUE", "CANCELLED"];

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string; status?: string; invoiced?: string; q?: string; ok?: string; error?: string }>;
}) {
  const auth = await needPermission("invoices");
  if (!auth.ok) return <Forbidden />;
  const query = await searchParams;
  const where: Prisma.InvoiceWhereInput = {};
  if (query.invoiced === "1") where.status = { in: [...INVOICED_STATUSES] };
  if (query.status && (STATUSES as string[]).includes(query.status)) where.status = query.status as InvoiceStatus;
  if (query.q?.trim()) {
    const q = query.q.trim();
    where.OR = [
      { number: { contains: q } },
      { customerName: { contains: q } },
    ];
  }
  if (query.from && query.to) {
    const window = resolveWindow({ preset: "custom", from: query.from, to: query.to });
    if (query.status === "PAID") where.updatedAt = createdAtRange(window.start, window.end);
    else where.createdAt = createdAtRange(window.start, window.end);
  }
  const rows = await prisma.invoice.findMany({ where, orderBy: { createdAt: "desc" }, take: 200 });
  const sp = new URLSearchParams();
  for (const key of ["from", "to", "status", "invoiced", "q"] as const) {
    const value = query[key];
    if (value) sp.set(key, value);
  }
  const returnTo = `/admin/invoices${sp.toString() ? `?${sp}` : ""}`;
  return (
    <div>
      <PageHeader
        title="Invoices"
        note="Bulk: Publish = ISSUED, Hide/Soft-remove = CANCELLED."
        actions={
          <Link href="/admin/invoices/new" className="rounded-md bg-navy px-4 py-2 text-sm text-white">
            New invoice
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
        entity="invoices"
        returnTo={returnTo}
        headers={["Number", "Customer", "Status", "Total", ""]}
        actionLabels={{ publish: "Issue", hide: "Cancel", archive: "Cancel (archive)" }}
        rows={rows.map((row) => ({
          id: row.id,
          cells: [
            row.number,
            row.customerName,
            row.status,
            row.totalLabel || "—",
            <Link key="open" className="text-navy" href={`/admin/invoices/${row.id}`}>
              Open
            </Link>,
          ],
        }))}
      />
    </div>
  );
}
