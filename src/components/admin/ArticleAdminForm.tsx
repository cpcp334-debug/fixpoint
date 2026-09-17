import Link from "next/link";
import { Field, PrimaryButton, SelectField } from "@/components/admin/Ui";
import { updateArticleAction } from "@/app/admin/actions";
import { parseJson } from "@/lib/utils";

type Translation = {
  locale: string;
  title: string;
  excerpt: string;
  body: string;
  diySection: string;
  faq: string;
  seoTitle: string;
  metaDescription: string;
  imageAlt: string;
};

export function ArticleAdminForm({
  kind,
  listHref,
  row,
  en,
  ar,
  ok,
  error,
}: {
  kind: "blog" | "faq";
  listHref: string;
  row: {
    id: string;
    slug: string;
    status: string;
    indexable: boolean;
    heroImage: string | null;
    categorySlugs: string;
    relatedServiceSlugs: string;
    relatedDiySlugs: string;
  };
  en?: Translation;
  ar?: Translation;
  ok?: string;
  error?: string;
}) {
  const isFaq = kind === "faq";
  const categories = parseJson<string[]>(row.categorySlugs, []).join(", ");
  const relatedServices = parseJson<string[]>(row.relatedServiceSlugs, []).join(", ");
  const relatedDiy = parseJson<string[]>(row.relatedDiySlugs, []).join(", ");
  const publicPath = isFaq ? `/faq/${row.slug}` : `/blog/${row.slug}`;

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-3 text-sm">
        <Link className="text-navy" href={listHref}>
          ← All {isFaq ? "FAQs" : "blogs"}
        </Link>
        <span className="text-muted">Public path (when published + indexable): {publicPath}</span>
      </div>
      {ok ? <p className="mb-4 text-sm text-muted">Saved.</p> : null}
      {error ? <p className="mb-4 text-sm text-danger">Could not save ({error}).</p> : null}
      <form action={updateArticleAction} className="max-w-3xl space-y-3 rounded-md border border-line bg-white p-4">
        <input type="hidden" name="id" value={row.id} />
        <SelectField
          label="Status"
          name="status"
          defaultValue={row.status}
          options={["draft", "review", "published", "archived"].map((value) => ({ value, label: value }))}
        />
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="indexable" defaultChecked={row.indexable} /> Indexable (required for public listing)
        </label>
        <p className="text-xs text-muted">
          Publish = published + indexable. Hide = draft + uncheck indexable. Soft-remove = archived (no hard delete).
        </p>
        <Field
          label={isFaq ? "Category slugs (service-faq is always kept)" : "Category slugs (comma-separated)"}
          name="categorySlugs"
          defaultValue={categories}
        />
        <Field label="Related service slugs (comma-separated)" name="relatedServiceSlugs" defaultValue={relatedServices} />
        <Field label="Related DIY slugs (comma-separated)" name="relatedDiySlugs" defaultValue={relatedDiy} />
        <Field label="Hero image path" name="heroImage" defaultValue={row.heroImage} />
        <Field label="English title" name="titleEn" defaultValue={en?.title} required />
        <Field label="English excerpt" name="excerptEn" defaultValue={en?.excerpt} textarea rows={3} />
        <Field label="English body (markdown)" name="bodyEn" defaultValue={en?.body} textarea rows={12} />
        {!isFaq ? (
          <Field label="English DIY section" name="diySectionEn" defaultValue={en?.diySection} textarea rows={4} />
        ) : (
          <input type="hidden" name="diySectionEn" value={en?.diySection || ""} />
        )}
        <Field label="English FAQ JSON" name="faqEn" defaultValue={en?.faq || "[]"} textarea rows={8} />
        <Field label="English SEO title" name="seoTitleEn" defaultValue={en?.seoTitle} />
        <Field label="English meta description" name="metaDescriptionEn" defaultValue={en?.metaDescription} textarea rows={2} />
        <Field label="English image alt" name="imageAltEn" defaultValue={en?.imageAlt} />
        <p className="pt-2 text-sm font-medium">Arabic</p>
        <p className="text-xs text-muted">
          Edit Arabic the same as English. Empty is fine; replace REVIEW_REQUIRED with real Arabic when ready.
        </p>
        <Field label="Arabic title" name="titleAr" defaultValue={ar?.title || ""} />
        <Field label="Arabic excerpt" name="excerptAr" defaultValue={ar?.excerpt || ""} textarea rows={3} />
        <Field label="Arabic body (markdown)" name="bodyAr" defaultValue={ar?.body || ""} textarea rows={10} />
        {!isFaq ? (
          <Field label="Arabic DIY section" name="diySectionAr" defaultValue={ar?.diySection || ""} textarea rows={3} />
        ) : (
          <input type="hidden" name="diySectionAr" value={ar?.diySection || ""} />
        )}
        <Field label="Arabic FAQ JSON" name="faqAr" defaultValue={ar?.faq || "[]"} textarea rows={6} />
        <Field label="Arabic SEO title" name="seoTitleAr" defaultValue={ar?.seoTitle || ""} />
        <Field label="Arabic meta description" name="metaDescriptionAr" defaultValue={ar?.metaDescription || ""} textarea rows={2} />
        <Field label="Arabic image alt" name="imageAltAr" defaultValue={ar?.imageAlt || ""} />
        <PrimaryButton>Save</PrimaryButton>
      </form>
    </div>
  );
}
