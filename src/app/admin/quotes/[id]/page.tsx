import { notFound } from "next/navigation";
import { prisma } from "@/server/db";
import { needPermission } from "@/lib/admin/guard";
import { can } from "@/lib/admin/rbac";
import { Field, Forbidden, LineItems, PageHeader, PrimaryButton, SelectField } from "@/components/admin/Ui";
import { invoiceFromQuoteAction, saveQuoteAction } from "@/app/admin/actions";

export default async function QuoteDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const auth = await needPermission("quotes");
  if (!auth.ok) return <Forbidden />;
  const { id } = await params;
  const [row, services, locations] = await Promise.all([
    prisma.quote.findUnique({ where: { id }, include: { items: { orderBy: { sortOrder: "asc" } } } }),
    prisma.service.findMany({ include: { translations: true }, orderBy: { slug: "asc" } }),
    prisma.location.findMany({ where: { type: "emirate" }, include: { translations: true }, orderBy: { sortOrder: "asc" } }),
  ]);
  if (!row) notFound();
  return (
    <div>
      <PageHeader
        title={row.quoteNumber}
        note="PDF uses the ALNAJAH ALDAEM template and only the fields saved here plus approved public business details."
        actions={
          <a href={`/api/admin/quotes/${row.id}/pdf`} className="rounded-md bg-navy px-4 py-2 text-sm text-white">
            Download PDF
          </a>
        }
      />
      <form action={saveQuoteAction} className="space-y-4 rounded-md border border-line bg-white p-4">
        <input type="hidden" name="id" value={row.id} />
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Customer name" name="customerName" defaultValue={row.customerName} required />
          <Field label="Customer phone" name="customerPhone" defaultValue={row.customerPhone} required />
          <Field label="Customer email" name="customerEmail" defaultValue={row.customerEmail} />
          <SelectField label="Status" name="status" defaultValue={row.status} options={["DRAFT", "SENT", "VIEWED", "ACCEPTED", "REJECTED", "EXPIRED", "CANCELLED"].map((value) => ({ value, label: value }))} />
          <SelectField
            label="Service"
            name="serviceId"
            defaultValue={row.serviceId}
            options={[{ value: "", label: "None" }, ...services.map((s) => ({ value: s.id, label: s.translations.find((t) => t.locale === "en")?.name || s.slug }))]}
          />
          <SelectField
            label="Location"
            name="locationId"
            defaultValue={row.locationId}
            options={[{ value: "", label: "None" }, ...locations.map((l) => ({ value: l.id, label: l.translations.find((t) => t.locale === "en")?.name || l.slug }))]}
          />
          <Field label="Service label" name="serviceLabel" defaultValue={row.serviceLabel} />
          <Field label="Location label" name="locationLabel" defaultValue={row.locationLabel} />
          <Field label="Validity" name="validity" defaultValue={row.validity} />
          <Field label="Payment terms" name="paymentTerms" defaultValue={row.paymentTerms} />
          <Field label="Subtotal" name="subtotalLabel" defaultValue={row.subtotalLabel} />
          <Field label="Discount" name="discountLabel" defaultValue={row.discountLabel} />
          <Field label="Tax / charges" name="taxLabel" defaultValue={row.taxLabel} />
          <Field label="Total" name="totalLabel" defaultValue={row.totalLabel} />
        </div>
        <Field label="Scope" name="scope" defaultValue={row.scope} textarea />
        <Field label="Exclusions" name="exclusions" defaultValue={row.exclusions} textarea />
        <Field label="Notes" name="notes" defaultValue={row.notes} textarea />
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="humanApproved" defaultChecked={row.humanApproved} /> Human-reviewed amounts
        </label>
        <LineItems rows={row.items} />
        <PrimaryButton>Save quotation</PrimaryButton>
      </form>
      {can(auth.session.role, "invoices") ? (
        <form action={invoiceFromQuoteAction} className="mt-4">
          <input type="hidden" name="quoteId" value={row.id} />
          <PrimaryButton>Create invoice from quotation</PrimaryButton>
        </form>
      ) : null}
    </div>
  );
}
