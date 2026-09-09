import { prisma } from "@/server/db";
import { needPermission } from "@/lib/admin/guard";
import { AdminTable, Forbidden, PageHeader } from "@/components/admin/Ui";
import { evaluateRow, listServicePages, readinessLabels, servicePageDashboard, type ServicePageFilters } from "@/lib/admin/service-pages";
import Link from "next/link";

export default async function ServicePagesAdminPage({
  searchParams,
}: {
  searchParams: Promise<ServicePageFilters>;
}) {
  const auth = await needPermission("services");
  if (!auth.ok) return <Forbidden />;
  const filters = await searchParams;
  const [rows, dash, services, emirates, coveredLocations] = await Promise.all([
    listServicePages(filters),
    servicePageDashboard(),
    prisma.service.findMany({
      where: {
        OR: [{ status: "active" }, { serviceLocations: { some: {} } }],
      },
      include: { translations: true },
      orderBy: { slug: "asc" },
    }),
    prisma.location.findMany({
      where: { type: "emirate" },
      include: { translations: true },
      orderBy: { sortOrder: "asc" },
    }),
    prisma.location.findMany({
      where: { serviceLocations: { some: {} } },
      include: { translations: true },
      orderBy: [{ type: "asc" }, { sortOrder: "asc" }],
    }),
  ]);

  const cards = [
    ["Rows", dash.totalRows],
    ["Covered", dash.covered],
    ["Published", dash.published],
    ["Indexable", dash.indexable],
    ["Noindex", dash.noindex],
    ["Missing EN", dash.missingEn],
    ["Missing AR", dash.missingAr],
    ["Quality fail", dash.qualityFailures],
  ] as const;

  return (
    <div>
      <PageHeader
        title="Service pages"
        note="A4.1 read-only completeness/quality. No authoring, approve, publish, or bulk generation."
      />
      <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {cards.map(([label, value]) => (
          <div key={label} className="rounded-md border border-line bg-white px-3 py-2 text-sm">
            <p className="text-muted">{label}</p>
            <p className="font-semibold">{value}</p>
          </div>
        ))}
      </div>
      <form className="mb-4 grid gap-2 rounded-md border border-line bg-white p-3 sm:grid-cols-4" method="get">
        <label className="text-sm">
          Service
          <select name="service" defaultValue={filters.service || ""} className="mt-1 w-full rounded-md border border-line px-2 py-1">
            <option value="">All</option>
            {services.map((svc) => (
              <option key={svc.id} value={svc.slug}>
                {svc.translations.find((t) => t.locale === "en")?.name || svc.slug}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          Location
          <select name="location" defaultValue={filters.location || ""} className="mt-1 w-full rounded-md border border-line px-2 py-1">
            <option value="">All</option>
            {coveredLocations.map((loc) => (
              <option key={loc.id} value={loc.slug}>
                {loc.translations.find((t) => t.locale === "en")?.name || loc.slug} ({loc.type})
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          Emirate
          <select name="emirate" defaultValue={filters.emirate || ""} className="mt-1 w-full rounded-md border border-line px-2 py-1">
            <option value="">All</option>
            {emirates.map((loc) => (
              <option key={loc.id} value={loc.slug}>
                {loc.translations.find((t) => t.locale === "en")?.name || loc.slug}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          Lifecycle
          <select name="status" defaultValue={filters.status || ""} className="mt-1 w-full rounded-md border border-line px-2 py-1">
            <option value="">All</option>
            {["draft", "review", "approved", "published", "archived"].map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          Coverage
          <select name="coverage" defaultValue={filters.coverage || ""} className="mt-1 w-full rounded-md border border-line px-2 py-1">
            <option value="">All</option>
            <option value="covered">Covered</option>
            <option value="not_covered">Not covered</option>
          </select>
        </label>
        <div className="sm:col-span-4">
          <button type="submit" className="rounded-md bg-navy px-3 py-1.5 text-sm text-white">
            Filter
          </button>
        </div>
      </form>
      <AdminTable
        headers={["Service", "Location", "EN", "AR", "SEO", "GEO", "AEO", "DIY", "Img", "Quality", "Ready", ""]}
      >
        {rows.map((row) => {
          const evald = evaluateRow(row);
          const ready = readinessLabels(evald.quality, evald.gates);
          return (
            <tr key={row.id} className="border-t border-line text-xs">
              <td className="px-3 py-2">{evald.serviceEn?.name || row.service.slug}</td>
              <td className="px-3 py-2">{evald.locationEn?.name || row.location.slug}</td>
              <td className="px-3 py-2">{ready.en}</td>
              <td className="px-3 py-2">{ready.ar}</td>
              <td className="px-3 py-2">{ready.seo}</td>
              <td className="px-3 py-2">{ready.geo}</td>
              <td className="px-3 py-2">{ready.aeo}</td>
              <td className="px-3 py-2">{ready.diy}</td>
              <td className="px-3 py-2">{ready.image}</td>
              <td className="px-3 py-2">{ready.quality}</td>
              <td className="px-3 py-2">{ready.overall}</td>
              <td className="px-3 py-2">
                <Link className="text-navy" href={`/admin/service-pages/${row.id}`}>
                  Preview
                </Link>
              </td>
            </tr>
          );
        })}
      </AdminTable>
    </div>
  );
}
