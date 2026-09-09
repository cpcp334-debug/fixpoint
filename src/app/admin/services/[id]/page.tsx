import { notFound } from "next/navigation";
import { prisma } from "@/server/db";
import { needPermission } from "@/lib/admin/guard";
import { Field, Forbidden, PageHeader, PrimaryButton, SelectField } from "@/components/admin/Ui";
import { updateServiceAction } from "@/app/admin/actions";

export default async function ServiceEditPage({ params }: { params: Promise<{ id: string }> }) {
  const auth = await needPermission("services");
  if (!auth.ok) return <Forbidden />;
  const { id } = await params;
  const row = await prisma.service.findUnique({
    where: { id },
    include: { translations: true, category: { include: { translations: true } } },
  });
  if (!row) notFound();
  const en = row.translations.find((t) => t.locale === "en");
  const categoryEn = row.category.translations.find((t) => t.locale === "en")?.name || row.category.slug;
  return (
    <div>
      <PageHeader title={en?.name || row.slug} note={`Slug ${row.slug} · Category ${categoryEn} — public pages require active + indexable.`} />
      <form action={updateServiceAction} className="max-w-xl space-y-3 rounded-md border border-line bg-white p-4">
        <input type="hidden" name="id" value={row.id} />
        <SelectField
          label="Status"
          name="status"
          defaultValue={row.status}
          options={["draft", "active", "requires_approval", "subcontracted", "unavailable", "archived"].map((value) => ({ value, label: value }))}
        />
        <Field label="English name" name="nameEn" defaultValue={en?.name} />
        <Field label="English short description" name="shortEn" defaultValue={en?.shortDescription} textarea />
        <Field label="English long description" name="longEn" defaultValue={en?.longDescription} textarea />
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="indexable" defaultChecked={row.indexable} /> Indexable
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="bookingEnabled" defaultChecked={row.bookingEnabled} /> Booking enabled
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="diyAvailable" defaultChecked={row.diyAvailable} /> DIY available
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="emergencyAvailable" defaultChecked={row.emergencyAvailable} /> Emergency available
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="amcAvailable" defaultChecked={row.amcAvailable} /> AMC available
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="inspectionRequired" defaultChecked={row.inspectionRequired} /> Inspection required
        </label>
        <PrimaryButton>Save</PrimaryButton>
      </form>
    </div>
  );
}
