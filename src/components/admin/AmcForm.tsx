import { Field, PrimaryButton, SelectField } from "@/components/admin/Ui";
import { saveAmcAction } from "@/app/admin/actions";

export function AmcForm({
  customers,
  defaults,
}: {
  customers: Array<{ id: string; name: string }>;
  defaults?: {
    id?: string;
    customerId?: string;
    reference?: string;
    startDate?: string;
    endDate?: string;
    frequency?: string;
    coveredServices?: string;
    locationLabel?: string;
    propertyLabel?: string;
    notes?: string;
    status?: string;
  };
}) {
  return (
    <form action={saveAmcAction} className="max-w-3xl space-y-3 rounded-md border border-line bg-white p-4">
      {defaults?.id ? <input type="hidden" name="id" value={defaults.id} /> : null}
      <SelectField
        label="Customer"
        name="customerId"
        defaultValue={defaults?.customerId}
        options={customers.map((row) => ({ value: row.id, label: row.name }))}
      />
      <Field label="Contract / reference number" name="reference" defaultValue={defaults?.reference} />
      <Field label="Start date" name="startDate" type="date" defaultValue={defaults?.startDate} />
      <Field label="End date" name="endDate" type="date" defaultValue={defaults?.endDate} />
      <Field label="Frequency" name="frequency" defaultValue={defaults?.frequency} />
      <Field label="Covered services" name="coveredServices" textarea defaultValue={defaults?.coveredServices} />
      <Field label="Location" name="locationLabel" defaultValue={defaults?.locationLabel} />
      <Field label="Property" name="propertyLabel" defaultValue={defaults?.propertyLabel} />
      <Field label="Notes" name="notes" textarea defaultValue={defaults?.notes} />
      <SelectField
        label="Status"
        name="status"
        defaultValue={defaults?.status || "active"}
        options={[
          { value: "active", label: "active" },
          { value: "inactive", label: "inactive" },
        ]}
      />
      <p className="text-xs text-muted">Saving does not renew the contract, create invoices, or confirm bookings. Renewal tasks come from the automation tick when a manager enables the example rule.</p>
      <PrimaryButton>{defaults?.id ? "Save AMC" : "Create AMC"}</PrimaryButton>
    </form>
  );
}
