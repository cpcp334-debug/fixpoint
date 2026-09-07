import { prisma } from "@/server/db";
import { needPermission } from "@/lib/admin/guard";
import { Field, Forbidden, LineItems, PageHeader, PrimaryButton, SelectField } from "@/components/admin/Ui";
import { saveQuoteAction } from "@/app/admin/actions";

export default async function NewQuotePage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const auth = await needPermission("quotes");
  if (!auth.ok) return <Forbidden />;
  const { error } = await searchParams;
  const [services, locations] = await Promise.all([
    prisma.service.findMany({ include: { translations: true }, orderBy: { slug: "asc" } }),
    prisma.location.findMany({ where: { type: "emirate" }, include: { translations: true }, orderBy: { sortOrder: "asc" } }),
  ]);
  return (
    <div>
      <PageHeader title="New quotation" note="Enter only approved customer and line-item facts. Totals are staff-typed labels, not calculated by AI." />
      {error ? <p className="mb-4 text-sm text-danger">Customer name and phone are required.</p> : null}
      <form action={saveQuoteAction} className="space-y-4 rounded-md border border-line bg-white p-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Customer name" name="customerName" required />
          <Field label="Customer phone" name="customerPhone" required />
          <Field label="Customer email" name="customerEmail" />
          <SelectField label="Status" name="status" defaultValue="DRAFT" options={["DRAFT", "SENT", "VIEWED", "ACCEPTED", "REJECTED", "EXPIRED", "CANCELLED"].map((value) => ({ value, label: value }))} />
          <SelectField
            label="Service"
            name="serviceId"
            options={[{ value: "", label: "None" }, ...services.map((s) => ({ value: s.id, label: s.translations.find((t) => t.locale === "en")?.name || s.slug }))]}
          />
          <SelectField
            label="Location"
            name="locationId"
            options={[{ value: "", label: "None" }, ...locations.map((l) => ({ value: l.id, label: l.translations.find((t) => t.locale === "en")?.name || l.slug }))]}
          />
          <Field label="Service label" name="serviceLabel" />
          <Field label="Location label" name="locationLabel" />
          <Field label="Validity" name="validity" />
          <Field label="Payment terms" name="paymentTerms" />
          <Field label="Subtotal" name="subtotalLabel" />
          <Field label="Discount" name="discountLabel" />
          <Field label="Tax / charges" name="taxLabel" />
          <Field label="Total" name="totalLabel" />
        </div>
        <Field label="Scope" name="scope" textarea />
        <Field label="Exclusions" name="exclusions" textarea />
        <Field label="Notes" name="notes" textarea />
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="humanApproved" /> Human-reviewed amounts
        </label>
        <LineItems />
        <PrimaryButton>Save quotation</PrimaryButton>
      </form>
    </div>
  );
}
