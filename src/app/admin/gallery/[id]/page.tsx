import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/server/db";
import { needPermission } from "@/lib/admin/guard";
import { Field, Forbidden, PageHeader, PrimaryButton, SelectField } from "@/components/admin/Ui";
import { updateGalleryMediaAction } from "@/app/admin/actions";
import { galleryVisibilityLabel, galleryWhere } from "@/lib/admin/gallery";

export default async function GalleryEditPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const auth = await needPermission("diy");
  if (!auth.ok) return <Forbidden />;
  const { id } = await params;
  const query = await searchParams;
  const row = await prisma.mediaAsset.findFirst({ where: galleryWhere({ id }) });
  if (!row) notFound();
  const state = galleryVisibilityLabel(row.visibility, row.status);
  return (
    <div>
      <PageHeader
        title={row.originalName || row.storageKey}
        note={`Path ${row.storageKey} · ${state}`}
        actions={
          <Link className="text-sm text-navy" href="/admin/gallery">
            All gallery
          </Link>
        }
      />
      {query.ok ? <p className="mb-4 text-sm text-muted">Saved.</p> : null}
      {query.error ? <p className="mb-4 text-sm text-danger">Could not save ({query.error}).</p> : null}
      {row.storageKey.startsWith("/media/") ? (
        // eslint-disable-next-line @next/next/no-img-element -- admin preview
        <img src={row.storageKey} alt={row.alt || ""} className="mb-4 max-h-48 rounded-md border border-line object-contain" />
      ) : null}
      <form action={updateGalleryMediaAction} className="max-w-xl space-y-3 rounded-md border border-line bg-white p-4">
        <input type="hidden" name="id" value={row.id} />
        <SelectField
          label="Status"
          name="state"
          defaultValue={state === "archived" ? "archived" : state === "published" ? "published" : "hidden"}
          options={[
            { value: "published", label: "published" },
            { value: "hidden", label: "hidden" },
            { value: "archived", label: "archived (soft-remove)" },
          ]}
        />
        <Field label="Title" name="title" defaultValue={row.originalName} />
        <Field label="Alt text" name="alt" defaultValue={row.alt} />
        <Field label="Caption" name="caption" defaultValue={row.caption} textarea rows={3} />
        <p className="text-sm text-muted">Storage path is fixed after create. Use this path when attaching images to services/blogs.</p>
        <PrimaryButton>Save</PrimaryButton>
      </form>
    </div>
  );
}
