import Link from "next/link";
import { needPermission } from "@/lib/admin/guard";
import { AdminBulkTable, AdminFlash, Forbidden, PageHeader } from "@/components/admin/Ui";
import { parseAudiences } from "@/lib/knowledge/access";
import { listInternalSops } from "@/lib/knowledge/sops";

export const metadata = {
  title: "Knowledge | Admin",
  robots: { index: false, follow: false },
};

export default async function KnowledgePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; audience?: string; ok?: string; error?: string }>;
}) {
  const auth = await needPermission("knowledge");
  if (!auth.ok) return <Forbidden />;
  const query = await searchParams;
  const rows = await listInternalSops({ q: query.q, status: query.status, audience: query.audience });
  const sp = new URLSearchParams();
  if (query.q) sp.set("q", query.q);
  if (query.status) sp.set("status", query.status);
  if (query.audience) sp.set("audience", query.audience);
  const returnTo = `/admin/knowledge${sp.toString() ? `?${sp}` : ""}`;
  return (
    <div>
      <PageHeader
        title="Knowledge / SOPs"
        note="Bulk: Publish = ACTIVE, Hide = DRAFT, Soft-remove = ARCHIVED. Internal only — not public pages."
        actions={
          <Link className="text-navy" href="/admin/knowledge/new">
            New SOP
          </Link>
        }
      />
      <AdminFlash ok={query.ok} error={query.error} />
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
      <AdminBulkTable
        entity="knowledge"
        returnTo={returnTo}
        headers={["SOP", "Code", "Audience", "Status", "Version", "Updated", "Updated by", ""]}
        actionLabels={{ publish: "Activate", hide: "Deactivate", archive: "Archive" }}
        rows={rows.map((row) => ({
          id: row.id,
          cells: [
            <Link key="title" className="text-navy" href={`/admin/knowledge/${row.id}`}>
              {row.title}
            </Link>,
            row.sopCode,
            parseAudiences(row.audienceJson).join(", ") || "—",
            row.status,
            row.version,
            row.updatedAt.toISOString().slice(0, 10),
            row.updatedBy || "—",
            <div key="links" className="flex flex-wrap gap-2">
              <Link className="text-navy" href={`/admin/knowledge/${row.id}`}>
                Edit
              </Link>
              <Link className="text-navy" href={`/admin/knowledge/${row.id}/preview`}>
                Preview
              </Link>
            </div>,
          ],
        }))}
        emptyNote="No internal SOPs match."
      />
    </div>
  );
}
