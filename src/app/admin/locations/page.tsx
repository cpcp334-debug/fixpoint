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
import type { LocationStatus, Prisma } from "@prisma/client";

const STATUSES: LocationStatus[] = ["draft", "active", "archived"];

export default async function LocationsAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; ok?: string; error?: string }>;
}) {
  const auth = await needPermission("locations");
  if (!auth.ok) return <Forbidden />;
  const query = await searchParams;
  const where: Prisma.LocationWhereInput = {};
  if (query.status && (STATUSES as string[]).includes(query.status)) {
    where.status = query.status as LocationStatus;
  }
  if (query.q?.trim()) {
    const q = query.q.trim();
    where.OR = [
      { slug: { contains: q } },
      { translations: { some: { name: { contains: q } } } },
    ];
  }
  const [totalLocations, matchingCount, indexableLocations, rows] = await Promise.all([
    prisma.location.count(),
    prisma.location.count({ where }),
    prisma.location.count({ where: { indexable: true, status: "active" } }),
    prisma.location.findMany({
      where,
      include: { translations: true },
      orderBy: [{ type: "asc" }, { sortOrder: "asc" }],
      take: 500,
    }),
  ]);
  const sp = new URLSearchParams();
  if (query.q) sp.set("q", query.q);
  if (query.status) sp.set("status", query.status);
  const returnTo = `/admin/locations${sp.toString() ? `?${sp}` : ""}`;
  return (
    <div>
      <PageHeader
        title="Locations"
        note="Bulk hide keeps serving masters active (indexable off). Soft-remove archives without hard-deleting master places."
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
        total={totalLocations}
        noun="locations"
        steps="Run npm run db:seed then LOCATION_MASTER_IMPORT=1 npx tsx scripts/location-a2-import.ts."
      />
      <AdminListSummary
        noun="locations"
        total={totalLocations}
        matching={matchingCount}
        showing={rows.length}
        stats={[{ label: "active + indexable", value: indexableLocations }]}
      />
      <AdminBulkTable
        entity="locations"
        returnTo={returnTo}
        headers={["Slug", "Name", "Type", "Status", "Serves", "Indexable", ""]}
        rows={rows.map((row) => ({
          id: row.id,
          cells: [
            row.slug,
            row.translations.find((t) => t.locale === "en")?.name,
            row.type,
            row.status,
            row.serves ? "yes" : "no",
            row.indexable ? "yes" : "no",
            <span key="actions" className="inline-flex flex-col gap-1">
              <a className="text-navy" href={`/admin/locations/${row.id}`}>
                Edit
              </a>
              <AdminPreviewLinks enPath={`/locations/${row.slug}`} />
            </span>,
          ],
        }))}
      />
    </div>
  );
}
