import Link from "next/link";
import { needPermission } from "@/lib/admin/guard";
import { AdminTable, Forbidden, PageHeader } from "@/components/admin/Ui";
import { parseAudiences } from "@/lib/knowledge/access";
import { listInternalSops } from "@/lib/knowledge/sops";
import { setKnowledgeStatusAction } from "@/app/admin/actions";

export const metadata = {
  title: "Knowledge | Admin",
  robots: { index: false, follow: false },
};

export default async function KnowledgePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; audience?: string }>;
}) {
  const auth = await needPermission("knowledge");
  if (!auth.ok) return <Forbidden />;
  const query = await searchParams;
  const rows = await listInternalSops({ q: query.q, status: query.status, audience: query.audience });
  return (
    <div>
      <PageHeader
        title="Knowledge / SOPs"
        note="Internal operating procedures for staff and the Co-Founder. These are not public pages. Only ACTIVE INTERNAL SOPs are retrievable by AI."
        actions={
          <Link className="text-navy" href="/admin/knowledge/new">
            New SOP
          </Link>
        }
      />
      <form className="mb-4 flex flex-wrap gap-2 text-sm" method="get">
        <input name="q" defaultValue={query.q || ""} placeholder="Search title, code, audience" className="min-w-48 rounded-md border border-line px-3 py-2" />
        <select name="status" defaultValue={query.status || ""} className="rounded-md border border-line px-3 py-2">
          <option value="">All statuses</option>
          <option value="DRAFT">DRAFT</option>
          <option value="ACTIVE">ACTIVE</option>
          <option value="ARCHIVED">ARCHIVED</option>
        </select>
        <select name="audience" defaultValue={query.audience || ""} className="rounded-md border border-line px-3 py-2">
          <option value="">All audiences</option>
          <option value="ops">ops</option>
          <option value="sales">sales</option>
          <option value="cs">cs</option>
          <option value="management">management</option>
        </select>
        <button type="submit" className="rounded-md border border-line px-3 py-2">
          Filter
        </button>
      </form>
      <AdminTable headers={["SOP", "Code", "Audience", "Status", "Version", "Updated", "Updated by", ""]}>
        {rows.map((row) => (
          <tr key={row.id} className="border-t border-line">
            <td className="px-3 py-2">
              <Link className="text-navy" href={`/admin/knowledge/${row.id}`}>
                {row.title}
              </Link>
            </td>
            <td className="px-3 py-2">{row.sopCode}</td>
            <td className="px-3 py-2">{parseAudiences(row.audienceJson).join(", ") || "—"}</td>
            <td className="px-3 py-2">{row.status}</td>
            <td className="px-3 py-2">{row.version}</td>
            <td className="px-3 py-2">{row.updatedAt.toISOString().slice(0, 10)}</td>
            <td className="px-3 py-2">{row.updatedBy || "—"}</td>
            <td className="px-3 py-2">
              <div className="flex flex-wrap gap-2">
                <Link className="text-navy" href={`/admin/knowledge/${row.id}`}>
                  Edit
                </Link>
                <Link className="text-navy" href={`/admin/knowledge/${row.id}/preview`}>
                  Preview
                </Link>
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
            </td>
          </tr>
        ))}
      </AdminTable>
      {!rows.length ? <p className="mt-4 text-sm text-muted">No internal SOPs match.</p> : null}
    </div>
  );
}
