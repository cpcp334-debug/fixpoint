import { notFound } from "next/navigation";
import { prisma } from "@/server/db";
import { needPermission } from "@/lib/admin/guard";
import { Field, Forbidden, PageHeader, PrimaryButton, SelectField } from "@/components/admin/Ui";
import { updateLocationAction } from "@/app/admin/actions";

export default async function LocationEditPage({ params }: { params: Promise<{ id: string }> }) {
  const auth = await needPermission("locations");
  if (!auth.ok) return <Forbidden />;
  const { id } = await params;
  const row = await prisma.location.findUnique({ where: { id }, include: { translations: true } });
  if (!row) notFound();
  const en = row.translations.find((t) => t.locale === "en");
  return (
    <div>
      <PageHeader title={en?.name || row.slug} />
      <form action={updateLocationAction} className="max-w-xl space-y-3 rounded-md border border-line bg-white p-4">
        <input type="hidden" name="id" value={row.id} />
        <SelectField label="Status" name="status" defaultValue={row.status} options={["draft", "active", "archived"].map((value) => ({ value, label: value }))} />
        <Field label="English name" name="nameEn" defaultValue={en?.name} />
        <Field label="English intro" name="introEn" defaultValue={en?.intro} textarea />
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="serves" defaultChecked={row.serves} /> Serves
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="indexable" defaultChecked={row.indexable} /> Indexable
        </label>
        <PrimaryButton>Save</PrimaryButton>
      </form>
    </div>
  );
}
