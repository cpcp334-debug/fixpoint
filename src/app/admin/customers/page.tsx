import { prisma } from "@/server/db";
import { needPermission } from "@/lib/admin/guard";
import { AdminTable, Forbidden, PageHeader, PrimaryButton } from "@/components/admin/Ui";
import { saveCustomerAction } from "@/app/admin/actions";

export default async function CustomersPage() {
  const auth = await needPermission("customers");
  if (!auth.ok) return <Forbidden />;
  const rows = await prisma.customer.findMany({ orderBy: { createdAt: "desc" }, take: 200 });
  return (
    <div>
      <PageHeader title="Customers" note="Created from public bookings/quotes or entered by staff. No customer portal in this phase." />
      <form action={saveCustomerAction} className="mb-6 grid max-w-3xl gap-3 rounded-md border border-line bg-white p-4 sm:grid-cols-2">
        <input name="name" required placeholder="Name" className="rounded-md border border-line px-3 py-2 text-sm" />
        <input name="phone" placeholder="Phone" className="rounded-md border border-line px-3 py-2 text-sm" />
        <input name="email" placeholder="Email" className="rounded-md border border-line px-3 py-2 text-sm" />
        <input name="whatsapp" placeholder="WhatsApp" className="rounded-md border border-line px-3 py-2 text-sm" />
        <PrimaryButton>Add customer</PrimaryButton>
      </form>
      <AdminTable headers={["Name", "Phone", "Email", ""]}>
        {rows.map((row) => (
          <tr key={row.id} className="border-t border-line">
            <td className="px-3 py-2">{row.name}</td>
            <td className="px-3 py-2">{row.phone}</td>
            <td className="px-3 py-2">{row.email}</td>
            <td className="px-3 py-2">
              <a className="text-navy" href={`/admin/customers/${row.id}`}>
                Open
              </a>
            </td>
          </tr>
        ))}
      </AdminTable>
    </div>
  );
}
