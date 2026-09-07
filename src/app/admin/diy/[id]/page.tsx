import { notFound } from "next/navigation";
import { prisma } from "@/server/db";
import { needPermission } from "@/lib/admin/guard";
import { Field, Forbidden, PageHeader, PrimaryButton, SelectField } from "@/components/admin/Ui";
import { updateDiyAction } from "@/app/admin/actions";

export default async function DiyEditPage({ params }: { params: Promise<{ id: string }> }) {
  const auth = await needPermission("diy");
  if (!auth.ok) return <Forbidden />;
  const { id } = await params;
  const row = await prisma.diyGuide.findUnique({ where: { id }, include: { translations: true } });
  if (!row) notFound();
  const en = row.translations.find((t) => t.locale === "en");
  return (
    <div>
      <PageHeader title={en?.title || row.slug} />
      <form action={updateDiyAction} className="max-w-xl space-y-3 rounded-md border border-line bg-white p-4">
        <input type="hidden" name="id" value={row.id} />
        <SelectField label="Status" name="status" defaultValue={row.status} options={["draft", "review", "published", "archived"].map((value) => ({ value, label: value }))} />
        <Field label="English title" name="titleEn" defaultValue={en?.title} />
        <Field label="Quick answer" name="quickAnswerEn" defaultValue={en?.quickAnswer} textarea />
        <Field label="Professional fallback" name="fallbackEn" defaultValue={en?.professionalFallback} textarea />
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="indexable" defaultChecked={row.indexable} /> Indexable
        </label>
        <PrimaryButton>Save</PrimaryButton>
      </form>
    </div>
  );
}
