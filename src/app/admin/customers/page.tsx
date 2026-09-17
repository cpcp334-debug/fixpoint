import { prisma } from "@/server/db";
import { needPermission } from "@/lib/admin/guard";
import { AdminBulkTable, AdminFlash, Forbidden, PageHeader, PrimaryButton } from "@/components/admin/Ui";
import { saveCustomerAction } from "@/app/admin/actions";
import type { Prisma } from "@prisma/client";

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; ok?: string; error?: string }>;
}) {
  const auth = await needPermission("customers");
  if (!auth.ok) return <Forbidden />;
  const query = await searchParams;
  const where: Prisma.CustomerWhereInput = {};
  if (query.q?.trim()) {
    const q = query.q.trim();
    where.OR = [
      { name: { contains: q } },
      { phone: { contains: q } },
      { email: { contains: q } },
    ];
  }
  const rows = await prisma.customer.findMany({ where, orderBy: { createdAt: "desc" }, take: 200 });
  const sp = new URLSearchParams();
  if (query.q) sp.set("q", query.q);
  const returnTo = `/admin/customers${sp.toString() ? `?${sp}` : ""}`;
  return (
    <div>
      <PageHeader
        title="Customers"
        note="No status enum — Soft-remove / Hide mark notes with [ARCHIVED] / [HIDDEN]; Publish clears markers. Records are never hard-deleted."
      />
      <AdminFlash ok={query.ok} error={query.error} />
      <form action={saveCustomerAction} className="mb-6 grid max-w-3xl gap-3 rounded-md border border-line bg-white p-4 sm:grid-cols-2">
        <input name="name" required placeholder="Name" className="rounded-md border border-line px-3 py-2 text-sm" />
        <input name="phone" placeholder="Phone" className="rounded-md border border-line px-3 py-2 text-sm" />
        <input name="email" placeholder="Email" className="rounded-md border border-line px-3 py-2 text-sm" />
        <input name="whatsapp" placeholder="WhatsApp" className="rounded-md border border-line px-3 py-2 text-sm" />
        <PrimaryButton>Add customer</PrimaryButton>
      </form>
      <form className="mb-4 flex flex-wrap gap-2 text-sm" method="get">
        <input name="q" defaultValue={query.q || ""} placeholder="Search name, phone, email" className="min-w-48 rounded-md border border-line px-3 py-2" />
        <button type="submit" className="rounded-md border border-line px-3 py-2">
          Search
        </button>
      </form>
      <AdminBulkTable
        entity="customers"
        returnTo={returnTo}
        headers={["Name", "Phone", "Email", "Notes", ""]}
        actionLabels={{ publish: "Clear markers", hide: "Mark hidden", archive: "Mark archived" }}
        rows={rows.map((row) => ({
          id: row.id,
          cells: [
            row.name,
            row.phone,
            row.email,
            row.notes?.slice(0, 80) || "—",
            <a key="open" className="text-navy" href={`/admin/customers/${row.id}`}>
              Open
            </a>,
          ],
        }))}
      />
    </div>
  );
}
