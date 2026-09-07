import { prisma } from "@/server/db";
import { needPermission } from "@/lib/admin/guard";
import { Field, Forbidden, PageHeader, PrimaryButton, SelectField } from "@/components/admin/Ui";
import { savePricingRuleAction } from "@/app/admin/actions";

export default async function PricingPage() {
  const auth = await needPermission("pricing");
  if (!auth.ok) return <Forbidden />;
  const [rules, services] = await Promise.all([
    prisma.pricingRule.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.service.findMany({ include: { translations: true }, orderBy: { slug: "asc" } }),
  ]);
  return (
    <div>
      <PageHeader title="Pricing-rule foundation" note="These are staff notes for how a quote may be built. They do not auto-price, call AI, or publish a rate card." />
      <form action={savePricingRuleAction} className="mb-8 grid max-w-3xl gap-3 rounded-md border border-line bg-white p-4 sm:grid-cols-2">
        <Field label="Name" name="name" required />
        <SelectField
          label="Service"
          name="serviceId"
          options={[{ value: "", label: "Any / unspecified" }, ...services.map((s) => ({ value: s.id, label: s.translations.find((t) => t.locale === "en")?.name || s.slug }))]}
        />
        <SelectField
          label="Method"
          name="method"
          defaultValue="inspection"
          options={["inspection", "fixed", "per_hour", "per_item", "per_unit", "per_sqft", "per_sqm", "per_room", "material_labor", "project", "amc"].map((value) => ({ value, label: value }))}
        />
        <Field label="Unit label" name="unitLabel" />
        <Field label="Notes" name="notes" textarea />
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="active" defaultChecked /> Active
        </label>
        <PrimaryButton>Add rule</PrimaryButton>
      </form>
      <ul className="space-y-3">
        {rules.map((rule) => (
          <li key={rule.id} className="rounded-md border border-line bg-white p-4">
            <p className="font-medium">{rule.name}</p>
            <p className="text-sm text-muted">
              {rule.method} {rule.unitLabel ? `· ${rule.unitLabel}` : ""} {rule.active ? "" : "· inactive"}
            </p>
            {rule.notes ? <p className="mt-2 text-sm">{rule.notes}</p> : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
