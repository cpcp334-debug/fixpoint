import { prisma } from "@/server/db";
import { needPermission } from "@/lib/admin/guard";
import {
  AdminBulkTable,
  AdminCatalogEmptyHint,
  AdminFlash,
  AdminListSummary,
  AdminPreviewLinks,
  Forbidden,
  PageHeader,
} from "@/components/admin/Ui";
import Link from "next/link";
import type { Prisma, ServiceStatus } from "@prisma/client";

const STATUSES: ServiceStatus[] = ["draft", "active", "requires_approval", "subcontracted", "unavailable", "archived"];

export default async function ServicesAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; ok?: string; error?: string }>;
}) {
  const auth = await needPermission("services");
  if (!auth.ok) return <Forbidden />;
  const query = await searchParams;
  const where: Prisma.ServiceWhereInput = {};
  if (query.status && (STATUSES as string[]).includes(query.status)) {
    where.status = query.status as ServiceStatus;
  }
  if (query.q?.trim()) {
    const q = query.q.trim();
    where.OR = [
      { slug: { contains: q } },
      { translations: { some: { name: { contains: q } } } },
    ];
  }
  const [totalServices, matchingCount, publicServices, draftServices, rows] = await Promise.all([
    prisma.service.count(),
    prisma.service.count({ where }),
    prisma.service.count({ where: { status: "active", indexable: true } }),
    prisma.service.count({ where: { status: "draft" } }),
    prisma.service.findMany({
      where,
      include: { translations: true, category: { include: { translations: true } } },
      orderBy: [{ category: { sortOrder: "asc" } }, { slug: "asc" }],
      take: 500,
    }),
  ]);
  const sp = new URLSearchParams();
  if (query.q) sp.set("q", query.q);
  if (query.status) sp.set("status", query.status);
  const returnTo = `/admin/services${sp.toString() ? `?${sp}` : ""}`;
  return (
    <div>
      <PageHeader
        title="Services"
        note="Bulk: Publish = active+indexable, Hide = draft+noindex, Soft-remove = archived. Edit page has Preview EN/AR and permanent delete (super admin)."
        actions={
          <Link
            href="/admin/services/new"
            className="inline-flex min-h-10 items-center rounded-md bg-navy px-4 text-sm font-medium text-white"
          >
            Create service
          </Link>
        }
      />
      <AdminFlash ok={query.ok} error={query.error} />
      <form className="mb-4 flex flex-wrap gap-2 text-sm" method="get">
        <input
          name="q"
          defaultValue={query.q || ""}
          placeholder="Search slug or name"
          className="min-w-48 rounded-md border border-line px-3 py-2"
        />
        <select name="status" defaultValue={query.status || ""} className="rounded-md border border-line px-3 py-2">
          <option value="">All statuses</option>
          {STATUSES.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>
        <button type="submit" className="rounded-md border border-line px-3 py-2">
          Filter
        </button>
      </form>
      <AdminCatalogEmptyHint
        total={totalServices}
        noun="services"
        steps="Run npm run pg, then npm run db:seed (dev catalog load), then npx tsx scripts/publish-approved-services.ts."
      />
      <AdminListSummary
        noun="services"
        total={totalServices}
        matching={matchingCount}
        showing={rows.length}
        stats={[
          { label: "active + indexable", value: publicServices },
          { label: "draft", value: draftServices },
        ]}
      />
      <AdminBulkTable
        entity="services"
        returnTo={returnTo}
        headers={["Category", "Slug", "Name", "Status", "Indexable", ""]}
        rows={rows.map((row) => ({
          id: row.id,
          cells: [
            row.category.translations.find((t) => t.locale === "en")?.name || row.category.slug,
            row.slug,
            row.translations.find((t) => t.locale === "en")?.name,
            row.status,
            row.indexable ? "yes" : "no",
            <span key="actions" className="inline-flex flex-col gap-1">
              <a className="text-navy" href={`/admin/services/${row.id}`}>
                Edit
              </a>
              <AdminPreviewLinks enPath={`/${row.slug}`} />
            </span>,
          ],
        }))}
        emptyNote={totalServices === 0 ? "No services in database." : "No services match these filters."}
      />
      {matchingCount > rows.length ? (
        <p className="mt-3 text-sm text-muted">Table shows the first {rows.length} matches. Narrow with search or status.</p>
      ) : null}
    </div>
  );
}
