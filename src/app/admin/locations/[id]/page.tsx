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
  const ar = row.translations.find((t) => t.locale === "ar");
  return (
    <div>
      <PageHeader title={en?.name || row.slug} note="Arabic name is editable even when currently REVIEW_REQUIRED — enter the real Arabic place name." />
      <form action={updateLocationAction} className="max-w-xl space-y-3 rounded-md border border-line bg-white p-4">
        <input type="hidden" name="id" value={row.id} />
        <SelectField label="Status" name="status" defaultValue={row.status} options={["draft", "active", "archived"].map((value) => ({ value, label: value }))} />
        <Field label="English name" name="nameEn" defaultValue={en?.name} />
        <Field label="English intro" name="introEn" defaultValue={en?.intro} textarea />
        <p className="pt-2 text-sm font-medium">Arabic</p>
        <Field label="Arabic name" name="nameAr" defaultValue={ar?.name || ""} />
        <Field label="Arabic intro" name="introAr" defaultValue={ar?.intro || ""} textarea />
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
