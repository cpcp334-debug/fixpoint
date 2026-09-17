import { prisma } from "@/server/db";
import { needPermission } from "@/lib/admin/guard";
import { AdminBulkTable, AdminFlash, Field, Forbidden, PageHeader, PrimaryButton, SelectField } from "@/components/admin/Ui";
import { savePricingRuleAction } from "@/app/admin/actions";
import type { Prisma } from "@prisma/client";

export default async function PricingPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; ok?: string; error?: string }>;
}) {
  const auth = await needPermission("pricing");
  if (!auth.ok) return <Forbidden />;
  const query = await searchParams;
  const where: Prisma.PricingRuleWhereInput = {};
  if (query.q?.trim()) {
    const q = query.q.trim();
    where.OR = [{ name: { contains: q } }, { notes: { contains: q } }];
  }
  const [rules, services] = await Promise.all([
    prisma.pricingRule.findMany({ where, orderBy: { createdAt: "desc" } }),
    prisma.service.findMany({ include: { translations: true }, orderBy: { slug: "asc" } }),
  ]);
  const sp = new URLSearchParams();
  if (query.q) sp.set("q", query.q);
  const returnTo = `/admin/pricing${sp.toString() ? `?${sp}` : ""}`;
  return (
    <div>
      <PageHeader title="Pricing-rule foundation" note="Bulk: Publish = active, Hide/Soft-remove = inactive. Rules do not auto-price." />
      <AdminFlash ok={query.ok} error={query.error} />
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
      <form className="mb-4 flex flex-wrap gap-2 text-sm" method="get">
        <input name="q" defaultValue={query.q || ""} placeholder="Search name or notes" className="min-w-48 rounded-md border border-line px-3 py-2" />
        <button type="submit" className="rounded-md border border-line px-3 py-2">
          Search
        </button>
      </form>
      <AdminBulkTable
        entity="pricing"
        returnTo={returnTo}
        headers={["Name", "Method", "Unit", "Active", "Notes"]}
        actionLabels={{ publish: "Activate", hide: "Deactivate", archive: "Deactivate (archive)" }}
        rows={rules.map((rule) => ({
          id: rule.id,
          cells: [rule.name, rule.method, rule.unitLabel || "—", rule.active ? "yes" : "no", rule.notes || "—"],
        }))}
        emptyNote="No pricing rules yet."
      />
    </div>
  );
}
