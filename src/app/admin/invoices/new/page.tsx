import { needPermission } from "@/lib/admin/guard";
import { Field, Forbidden, LineItems, PageHeader, PrimaryButton, SelectField } from "@/components/admin/Ui";
import { saveInvoiceAction } from "@/app/admin/actions";

export default async function NewInvoicePage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const auth = await needPermission("invoices");
  if (!auth.ok) return <Forbidden />;
  const { error } = await searchParams;
  return (
    <div>
      <PageHeader title="New invoice" note="Staff-entered amounts only. This does not collect or process a payment." />
      {error ? <p className="mb-4 text-sm text-danger">Customer name and phone are required.</p> : null}
      <form action={saveInvoiceAction} className="space-y-4 rounded-md border border-line bg-white p-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Customer name" name="customerName" required />
          <Field label="Customer phone" name="customerPhone" required />
          <Field label="Customer email" name="customerEmail" />
          <SelectField label="Status" name="status" defaultValue="DRAFT" options={["DRAFT", "ISSUED", "PARTIALLY_PAID", "PAID", "OVERDUE", "CANCELLED"].map((value) => ({ value, label: value }))} />
          <Field label="Service label" name="serviceLabel" />
          <Field label="Location label" name="locationLabel" />
          <Field label="Issue date" name="issueDate" />
          <Field label="Due date" name="dueDate" />
          <Field label="Subtotal" name="subtotalLabel" />
          <Field label="Discount" name="discountLabel" />
          <Field label="Tax / charges" name="taxLabel" />
          <Field label="Total" name="totalLabel" />
          <Field label="Manual payment reference" name="paymentRef" />
        </div>
        <Field label="Notes" name="notes" textarea />
        <LineItems />
        <PrimaryButton>Save invoice</PrimaryButton>
      </form>
    </div>
  );
}
