import { notFound } from "next/navigation";
import { prisma } from "@/server/db";
import { needPermission } from "@/lib/admin/guard";
import { Field, Forbidden, LineItems, PageHeader, PrimaryButton, SelectField } from "@/components/admin/Ui";
import { saveInvoiceAction } from "@/app/admin/actions";

export default async function InvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const auth = await needPermission("invoices");
  if (!auth.ok) return <Forbidden />;
  const { id } = await params;
  const row = await prisma.invoice.findUnique({ where: { id }, include: { items: { orderBy: { sortOrder: "asc" } } } });
  if (!row) notFound();
  return (
    <div>
      <PageHeader
        title={row.number}
        note="PDF download is authenticated. No gateway payment is processed from this screen."
        actions={
          <a href={`/api/admin/invoices/${row.id}/pdf`} className="rounded-md bg-navy px-4 py-2 text-sm text-white">
            Download PDF
          </a>
        }
      />
      <form action={saveInvoiceAction} className="space-y-4 rounded-md border border-line bg-white p-4">
        <input type="hidden" name="id" value={row.id} />
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Customer name" name="customerName" defaultValue={row.customerName} required />
          <Field label="Customer phone" name="customerPhone" defaultValue={row.customerPhone} required />
          <Field label="Customer email" name="customerEmail" defaultValue={row.customerEmail} />
          <SelectField label="Status" name="status" defaultValue={row.status} options={["DRAFT", "ISSUED", "PARTIALLY_PAID", "PAID", "OVERDUE", "CANCELLED"].map((value) => ({ value, label: value }))} />
          <Field label="Service label" name="serviceLabel" defaultValue={row.serviceLabel} />
          <Field label="Location label" name="locationLabel" defaultValue={row.locationLabel} />
          <Field label="Issue date" name="issueDate" defaultValue={row.issueDate} />
          <Field label="Due date" name="dueDate" defaultValue={row.dueDate} />
          <Field label="Subtotal" name="subtotalLabel" defaultValue={row.subtotalLabel} />
          <Field label="Discount" name="discountLabel" defaultValue={row.discountLabel} />
          <Field label="Tax / charges" name="taxLabel" defaultValue={row.taxLabel} />
          <Field label="Total" name="totalLabel" defaultValue={row.totalLabel} />
          <Field label="Manual payment reference" name="paymentRef" defaultValue={row.paymentRef} />
        </div>
        <Field label="Notes" name="notes" defaultValue={row.notes} textarea />
        <LineItems rows={row.items} />
        <PrimaryButton>Save invoice</PrimaryButton>
      </form>
    </div>
  );
}
