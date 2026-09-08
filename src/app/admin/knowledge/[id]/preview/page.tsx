import Link from "next/link";
import { notFound } from "next/navigation";
import { needPermission } from "@/lib/admin/guard";
import { Forbidden, PageHeader } from "@/components/admin/Ui";
import { parseAudiences } from "@/lib/knowledge/access";
import { getInternalSopAdmin } from "@/lib/knowledge/sops";

export const metadata = {
  title: "SOP preview | Admin",
  robots: { index: false, follow: false },
};

export default async function KnowledgePreviewPage({ params }: { params: Promise<{ id: string }> }) {
  const auth = await needPermission("knowledge");
  if (!auth.ok) return <Forbidden />;
  const { id } = await params;
  const row = await getInternalSopAdmin(id);
  if (!row) notFound();
  return (
    <div>
      <PageHeader
        title={row.title}
        note="Internal preview only. This route is not public and is not in the sitemap."
        actions={
          <Link className="text-navy" href={`/admin/knowledge/${row.id}`}>
            Edit
          </Link>
        }
      />
      <dl className="mb-4 grid gap-2 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-muted">SOP code</dt>
          <dd>{row.sopCode}</dd>
        </div>
        <div>
          <dt className="text-muted">Status</dt>
          <dd>{row.status}</dd>
        </div>
        <div>
          <dt className="text-muted">Audience</dt>
          <dd>{parseAudiences(row.audienceJson).join(", ") || "—"}</dd>
        </div>
        <div>
          <dt className="text-muted">Version</dt>
          <dd>{row.version}</dd>
        </div>
        <div>
          <dt className="text-muted">Updated</dt>
          <dd>
            {row.updatedAt.toISOString().slice(0, 10)} · {row.updatedBy || "—"}
          </dd>
        </div>
      </dl>
      <article className="whitespace-pre-wrap rounded-md border border-line bg-white p-4 text-sm">{row.body}</article>
    </div>
  );
}
