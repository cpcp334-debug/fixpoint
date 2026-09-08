import { parseAudiences } from "@/lib/knowledge/access";
import { SOP_AUDIENCES, type SopAudience } from "@/lib/knowledge/types";
import { Field, PrimaryButton } from "@/components/admin/Ui";

export function SopForm({
  action,
  defaults,
}: {
  action: (formData: FormData) => void | Promise<void>;
  defaults?: {
    id?: string;
    title?: string;
    sopCode?: string | null;
    description?: string;
    body?: string;
    audienceJson?: string;
    categorySlug?: string;
    serviceSlug?: string;
    effectiveDate?: string;
    reviewDate?: string;
  };
}) {
  const selected = new Set(parseAudiences(defaults?.audienceJson || "[]"));
  if (!selected.size) selected.add("ops");
  return (
    <form action={action} className="max-w-3xl space-y-3 rounded-md border border-line bg-white p-4">
      {defaults?.id ? <input type="hidden" name="id" value={defaults.id} /> : null}
      <Field label="Title" name="title" required defaultValue={defaults?.title} />
      <Field label="SOP code" name="sopCode" required defaultValue={defaults?.sopCode} />
      <Field label="Description" name="description" textarea defaultValue={defaults?.description} />
      <Field label="Body" name="body" textarea rows={16} defaultValue={defaults?.body} />
      <fieldset className="text-sm">
        <legend className="font-medium">Audience</legend>
        <div className="mt-2 flex flex-wrap gap-4">
          {SOP_AUDIENCES.map((audience) => (
            <label key={audience} className="inline-flex items-center gap-2">
              <input type="checkbox" name="audience" value={audience} defaultChecked={selected.has(audience as SopAudience)} />
              {audience}
            </label>
          ))}
        </div>
      </fieldset>
      <Field label="Category slug (optional)" name="categorySlug" defaultValue={defaults?.categorySlug} />
      <Field label="Service slug (optional)" name="serviceSlug" defaultValue={defaults?.serviceSlug} />
      <Field label="Effective date" name="effectiveDate" type="date" defaultValue={defaults?.effectiveDate} />
      <Field label="Review date" name="reviewDate" type="date" defaultValue={defaults?.reviewDate} />
      <p className="text-xs text-muted">Internal only. This is not a public SEO page. Scope is always INTERNAL.</p>
      <PrimaryButton>{defaults?.id ? "Save SOP" : "Create draft SOP"}</PrimaryButton>
    </form>
  );
}
