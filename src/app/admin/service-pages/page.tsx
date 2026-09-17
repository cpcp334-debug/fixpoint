import { prisma } from "@/server/db";
import { needPermission } from "@/lib/admin/guard";
import { AdminBulkTable, AdminFlash, Forbidden, PageHeader } from "@/components/admin/Ui";
import { evaluateRow, listServicePages, readinessLabels, servicePageDashboard, type ServicePageFilters } from "@/lib/admin/service-pages";
import Link from "next/link";

export default async function ServicePagesAdminPage({
  searchParams,
}: {
  searchParams: Promise<ServicePageFilters & { ok?: string; error?: string; q?: string }>;
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
      include: { translations: true, category: true },
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
    ["Matrix", dash.approvedMatrixCandidates],
    ["Legacy", dash.legacyExtraRows],
    ["Covered", dash.covered],
    ["Uncovered", dash.notCovered],
    ["Draft", dash.draft],
    ["Review LC", dash.review],
    ["Approved LC", dash.approved],
    ["Published", dash.published],
    ["Indexable", dash.indexable],
    ["Ready publish", dash.readyForPublish],
    ["Q review", dash.qualityReadyReview],
    ["Q fail", dash.qualityFailures],
    ["EN ready", dash.enReady],
    ["AR ready", dash.arReady],
    ["SEO", dash.seoReady],
    ["GEO", dash.geoReady],
    ["AEO", dash.aeoReady],
    ["Image alt", dash.imageReady],
  ] as const;

  const sp = new URLSearchParams();
  for (const key of ["service", "location", "emirate", "status", "coverage", "quality", "parent", "q"] as const) {
    const value = filters[key];
    if (value) sp.set(key, value);
  }
  const returnTo = `/admin/service-pages${sp.toString() ? `?${sp}` : ""}`;

  return (
    <div>
      <PageHeader
        title="Service pages"
        note="Bulk Publish only for covered rows (lifecycle published + indexable). Hide = noindex. Soft-remove = archived. Does not create coverage matrix rows."
        actions={
          <div className="flex gap-3 text-sm">
            <Link className="text-navy" href="/admin/service-pages/coverage">
              Coverage
            </Link>
            <Link className="text-navy" href="/admin/service-pages/queue">
              Queue
            </Link>
          </div>
        }
      />
      <AdminFlash ok={filters.ok} error={filters.error} />
      <p className="mb-3 text-xs text-muted">Table capped at 100 rows — use filters or Coverage/Queue tools for scale.</p>
      <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-5">
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
        <label className="text-sm">
          Quality
          <select name="quality" defaultValue={filters.quality || ""} className="mt-1 w-full rounded-md border border-line px-2 py-1">
            <option value="">All</option>
            {["publishable", "ready_for_review", "failed_quality", "incomplete", "indexable", "approved"].map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          Category
          <select name="parent" defaultValue={filters.parent || ""} className="mt-1 w-full rounded-md border border-line px-2 py-1">
            <option value="">All</option>
            {[...new Set(services.map((s) => s.category?.slug).filter(Boolean))].sort().map((slug) => (
              <option key={slug as string} value={slug as string}>
                {slug as string}
              </option>
            ))}
          </select>
        </label>
        <div className="sm:col-span-4">
          <button type="submit" className="rounded-md bg-navy px-3 py-1.5 text-sm text-white">
            Filter
          </button>
        </div>
      </form>
      <AdminBulkTable
        entity="service_pages"
        returnTo={returnTo}
        headers={["Service", "Location", "EN", "AR", "SEO", "GEO", "AEO", "DIY", "Img", "Quality", "Ready", ""]}
        rows={rows.map((row) => {
          const evald = evaluateRow(row);
          const ready = readinessLabels(evald.quality, evald.gates);
          return {
            id: row.id,
            cells: [
              evald.serviceEn?.name || row.service.slug,
              evald.locationEn?.name || row.location.slug,
              ready.en,
              ready.ar,
              ready.seo,
              ready.geo,
              ready.aeo,
              ready.diy,
              ready.image,
              ready.quality,
              ready.overall,
              <Link key="preview" className="text-navy" href={`/admin/service-pages/${row.id}`}>
                Preview
              </Link>,
            ],
          };
        })}
      />
    </div>
  );
}
