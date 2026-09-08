import Link from "next/link";
import { notFound } from "next/navigation";
import { needPermission } from "@/lib/admin/guard";
import { Forbidden, PageHeader } from "@/components/admin/Ui";
import { SopForm } from "@/components/admin/SopForm";
import { getInternalSopAdmin } from "@/lib/knowledge/sops";
import { saveKnowledgeAction, setKnowledgeStatusAction } from "@/app/admin/actions";

export const metadata = {
  title: "Edit SOP | Admin",
  robots: { index: false, follow: false },
};

export default async function EditKnowledgePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; ok?: string }>;
}) {
  const auth = await needPermission("knowledge");
  if (!auth.ok) return <Forbidden />;
  const { id } = await params;
  const query = await searchParams;
  const row = await getInternalSopAdmin(id);
  if (!row) notFound();
  return (
    <div>
      <PageHeader
        title={row.title}
        note={`INTERNAL · ${row.status} · v${row.version}. Saving creates a revision and increments version.`}
        actions={
          <div className="flex gap-3 text-sm">
            <Link className="text-navy" href={`/admin/knowledge/${row.id}/preview`}>
              Preview
            </Link>
            <Link className="text-navy" href="/admin/knowledge">
              All SOPs
            </Link>
          </div>
        }
      />
      {query.error ? <p className="mb-4 text-sm text-danger">Could not save. Check the SOP code is unique.</p> : null}
      {query.ok ? <p className="mb-4 text-sm text-muted">Saved.</p> : null}
      <div className="mb-4 flex flex-wrap gap-2 text-sm">
        {row.status !== "ACTIVE" ? (
          <form action={setKnowledgeStatusAction}>
            <input type="hidden" name="id" value={row.id} />
            <input type="hidden" name="status" value="ACTIVE" />
            <button type="submit" className="text-navy">
              Activate
            </button>
          </form>
        ) : (
          <form action={setKnowledgeStatusAction}>
            <input type="hidden" name="id" value={row.id} />
            <input type="hidden" name="status" value="DRAFT" />
            <button type="submit" className="text-navy">
              Deactivate
            </button>
          </form>
        )}
        {row.status !== "ARCHIVED" ? (
          <form action={setKnowledgeStatusAction}>
            <input type="hidden" name="id" value={row.id} />
            <input type="hidden" name="status" value="ARCHIVED" />
            <button type="submit" className="text-navy">
              Archive
            </button>
          </form>
        ) : null}
      </div>
      <SopForm action={saveKnowledgeAction} defaults={row} />
    </div>
  );
}
