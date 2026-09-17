import { needPermission } from "@/lib/admin/guard";
import { Field, Forbidden, PageHeader, PrimaryButton } from "@/components/admin/Ui";
import { registerGalleryMediaAction, uploadGalleryMediaAction } from "@/app/admin/actions";

export default async function NewGalleryPage({
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
        title="Add gallery media"
        note="Prefer registering files already under public/media. Optional upload writes to public/media/gallery/. Starts hidden (private) until published."
      />
      {error ? <p className="mb-4 text-sm text-danger">Could not add ({error}).</p> : null}

      <form action={registerGalleryMediaAction} className="mb-8 max-w-xl space-y-3 rounded-md border border-line bg-white p-4">
        <h2 className="text-sm font-semibold">Register existing path</h2>
        <Field label="Public path (/media/...)" name="path" required />
        <Field label="Title" name="title" />
        <Field label="Alt text" name="alt" />
        <Field label="Caption" name="caption" textarea rows={2} />
        <PrimaryButton>Register</PrimaryButton>
      </form>

      <form
        action={uploadGalleryMediaAction}
        encType="multipart/form-data"
        className="max-w-xl space-y-3 rounded-md border border-line bg-white p-4"
      >
        <h2 className="text-sm font-semibold">Upload new file</h2>
        <label className="block text-sm">
          <span className="font-medium">Image file (jpeg/png/webp)</span>
          <input name="file" type="file" accept="image/jpeg,image/png,image/webp" required className="mt-1 block w-full text-sm" />
        </label>
        <Field label="Title" name="title" />
        <Field label="Alt text" name="alt" />
        <Field label="Caption" name="caption" textarea rows={2} />
        <PrimaryButton>Upload</PrimaryButton>
      </form>
    </div>
  );
}
