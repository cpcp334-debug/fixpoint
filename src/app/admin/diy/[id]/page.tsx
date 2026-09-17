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
  const ar = row.translations.find((t) => t.locale === "ar");
  let profilePreview = "";
  try {
    const parsed = JSON.parse(row.profileJson || "{}") as { metadata?: { authored?: boolean; status?: string; batch?: string } };
    profilePreview = `authored=${String(parsed.metadata?.authored ?? false)} status=${parsed.metadata?.status ?? "—"} batch=${parsed.metadata?.batch ?? "—"}`;
  } catch {
    profilePreview = "invalid profileJson";
  }
  return (
    <div>
      <PageHeader title={en?.title || row.slug} note={`Profile: ${row.profileStatus} v${row.profileVersion} · AR ${row.arabicReviewStatus} · ${profilePreview}`} />
      <form action={updateDiyAction} className="max-w-xl space-y-3 rounded-md border border-line bg-white p-4">
        <input type="hidden" name="id" value={row.id} />
        <SelectField label="Status" name="status" defaultValue={row.status} options={["draft", "review", "published", "archived"].map((value) => ({ value, label: value }))} />
        <Field label="English title" name="titleEn" defaultValue={en?.title} />
        <Field label="English quick answer" name="quickAnswerEn" defaultValue={en?.quickAnswer} textarea />
        <Field label="English professional fallback" name="fallbackEn" defaultValue={en?.professionalFallback} textarea />
        <p className="pt-2 text-sm font-medium">Arabic</p>
        <Field label="Arabic title" name="titleAr" defaultValue={ar?.title || ""} />
        <Field label="Arabic quick answer" name="quickAnswerAr" defaultValue={ar?.quickAnswer || ""} textarea />
        <Field label="Arabic professional fallback" name="fallbackAr" defaultValue={ar?.professionalFallback || ""} textarea />
        <p className="text-sm text-ink/70">
          profileJson is managed by A4.2 authoring scripts (read-only here). Primary services: check Service.primaryDiyGuideId.
          No bulk publish from this screen.
        </p>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="indexable" defaultChecked={row.indexable} /> Indexable
        </label>
        <PrimaryButton>Save</PrimaryButton>
      </form>
    </div>
  );
}
