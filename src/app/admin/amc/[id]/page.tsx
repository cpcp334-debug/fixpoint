import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/server/db";
import { needPermission } from "@/lib/admin/guard";
import { Forbidden, PageHeader } from "@/components/admin/Ui";
import { AmcForm } from "@/components/admin/AmcForm";
import { amcDateInput } from "@/lib/admin/amc";

export const metadata = {
  title: "Edit AMC | Admin",
  robots: { index: false, follow: false },
};

export default async function EditAmcPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const auth = await needPermission("amc");
  if (!auth.ok) return <Forbidden />;
  const { id } = await params;
  const query = await searchParams;
  const row = await prisma.amcContract.findUnique({ where: { id }, include: { customer: { select: { name: true } } } });
  if (!row) notFound();
  const customers = await prisma.customer.findMany({ orderBy: { name: "asc" }, take: 200, select: { id: true, name: true } });
  return (
    <div>
      <PageHeader
        title={row.customer.name}
        note="Editing does not auto-renew, create invoices, or confirm bookings."
        actions={
          <Link className="text-navy" href="/admin/amc">
            All AMC
          </Link>
        }
      />
      {query.error ? <p className="mb-4 text-sm text-danger">Could not save. Check the customer and dates.</p> : null}
      <AmcForm
        customers={customers}
        defaults={{
          id: row.id,
          customerId: row.customerId,
          reference: row.reference,
          startDate: amcDateInput(row.startDate),
          endDate: amcDateInput(row.endDate),
          frequency: row.frequency,
          coveredServices: row.coveredServices,
          locationLabel: row.locationLabel,
          propertyLabel: row.propertyLabel,
          notes: row.notes,
          status: row.status,
        }}
      />
    </div>
  );
}
