import { needPermission } from "@/lib/admin/guard";
import { Field, Forbidden, PageHeader, PrimaryButton } from "@/components/admin/Ui";
import { createArticleAction } from "@/app/admin/actions";

export default async function NewFaqPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const auth = await needPermission("diy");
  if (!auth.ok) return <Forbidden />;
  const { error } = await searchParams;
  return (
    <div>
      <PageHeader
        title="Create FAQ"
        note="One slug field — faq- is auto-prefixed when missing. service-faq is added to categories. Starts draft + not indexable. Creates EN + AR rows (AR may start empty)."
      />
      {error ? <p className="mb-4 text-sm text-danger">Could not create ({error}).</p> : null}
      <form action={createArticleAction} className="max-w-xl space-y-3 rounded-md border border-line bg-white p-4">
        <input type="hidden" name="kind" value="faq" />
        <Field label="Slug (faq- added if missing)" name="slug" required />
        <Field label="English title" name="titleEn" required />
        <Field label="English excerpt" name="excerptEn" textarea rows={3} />
        <Field label="Arabic title (optional)" name="titleAr" />
        <Field label="Arabic excerpt (optional)" name="excerptAr" textarea rows={3} />
        <Field label="Extra category slugs (comma-separated)" name="categorySlugs" />
        <Field label="Related service slugs (comma-separated)" name="relatedServiceSlugs" />
        <Field label="Hero image path" name="heroImage" />
        <PrimaryButton>Create draft</PrimaryButton>
      </form>
    </div>
  );
}
