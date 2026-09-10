import Link from "next/link";
import { prisma } from "@/server/db";
import { needPermission } from "@/lib/admin/guard";
import { Forbidden, PageHeader } from "@/components/admin/Ui";
import { servicePageDashboard } from "@/lib/admin/service-pages";
import {
  applyBulkCoverageAction,
  previewBulkCoverageAction,
} from "@/app/admin/service-pages/actions";

export default async function ServicePagesCoveragePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const auth = await needPermission("services");
  if (!auth.ok) return <Forbidden />;
  const sp = await searchParams;
  const dash = await servicePageDashboard();
  const [services, locations] = await Promise.all([
    prisma.service.findMany({
      where: { status: "active" },
      include: { translations: true, category: true },
      orderBy: { slug: "asc" },
      take: 400,
    }),
    prisma.location.findMany({
      where: { status: "active", serves: true },
      include: { translations: true },
      orderBy: [{ type: "asc" }, { sortOrder: "asc" }],
      take: 250,
    }),
  ]);

  const preview = sp.preview === "1";

  return (
    <div>
      <PageHeader
        title="Coverage management"
        note="Catalog ≠ coverage. Defaults uncovered/noindex. Bulk tool never publishes. Published 49 are protected."
        actions={
          <div className="flex gap-3 text-sm">
            <Link className="text-navy" href="/admin/service-pages">
              Overview
            </Link>
            <Link className="text-navy" href="/admin/service-pages/queue">
              Publication queue
            </Link>
          </div>
        }
      />

      <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[
          ["Covered", dash.covered],
          ["Uncovered", dash.notCovered],
          ["Published", dash.published],
          ["Ready publish", dash.readyForPublish],
        ].map(([label, value]) => (
          <div key={label} className="rounded-md border border-line bg-white px-3 py-2 text-sm">
            <p className="text-muted">{label}</p>
            <p className="font-semibold">{value}</p>
          </div>
        ))}
      </div>

      {sp.error ? <p className="mb-3 text-sm text-red-700">Error: {sp.error}</p> : null}
      {sp.ok ? <p className="mb-3 text-sm text-green-800">Coverage update applied.</p> : null}

      <section className="mb-6 rounded-md border border-line bg-white p-4">
        <h2 className="font-semibold">Bulk coverage (preview → confirm)</h2>
        <p className="mt-1 text-sm text-muted">
          Writes only covered=true/false. Skips published rows. Does not change lifecycle or content.
        </p>
        <form action={previewBulkCoverageAction} className="mt-3 grid gap-3 lg:grid-cols-2">
          <label className="text-sm">
            Services (multi-select)
            <select
              name="serviceIds"
              multiple
              className="mt-1 h-48 w-full rounded-md border border-line px-2 py-1"
              required
            >
              {services.map((svc) => (
                <option key={svc.id} value={svc.id}>
                  {svc.translations.find((t) => t.locale === "en")?.name || svc.slug} ({svc.category.slug})
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            Locations (multi-select)
            <select
              name="locationIds"
              multiple
              className="mt-1 h-48 w-full rounded-md border border-line px-2 py-1"
              required
            >
              {locations.map((loc) => (
                <option key={loc.id} value={loc.id}>
                  {loc.translations.find((t) => t.locale === "en")?.name || loc.slug} ({loc.type})
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            Decision
            <select name="setCovered" className="mt-1 w-full rounded-md border border-line px-2 py-1" defaultValue="true">
              <option value="true">Set COVERED</option>
              <option value="false">Set NOT_COVERED</option>
            </select>
          </label>
          <div className="flex items-end">
            <button type="submit" className="rounded-md bg-navy px-3 py-2 text-sm text-white">
              Preview affected rows
            </button>
          </div>
        </form>
      </section>

      {preview ? (
        <section className="rounded-md border border-amber-300 bg-amber-50 p-4 text-sm">
          <h2 className="font-semibold">Preview confirmation</h2>
          <ul className="mt-2 space-y-1">
            <li>
              Selected: {sp.services} services · {sp.locations} locations · {sp.rows} ServiceLocation rows
            </li>
            <li>
              Before: covered={sp.beforeCovered} · uncovered={sp.beforeUncovered}
            </li>
            <li>
              After: covered={sp.afterCovered} · uncovered={sp.afterUncovered}
            </li>
            <li>Protected published skipped: {sp.protected}</li>
          </ul>
          <form action={applyBulkCoverageAction} className="mt-4 space-y-2">
            <input type="hidden" name="serviceIds" value={sp.serviceIds || ""} />
            <input type="hidden" name="locationIds" value={sp.locationIds || ""} />
            <input type="hidden" name="setCovered" value={sp.setCovered || "false"} />
            <input type="hidden" name="expectedRowCount" value={sp.rows || "0"} />
            <label className="block">
              Reason
              <input name="reason" required className="mt-1 w-full rounded-md border border-line px-2 py-1" />
            </label>
            <label className="block">
              Type CONFIRM_COVERAGE_CHANGE to apply
              <input name="confirmToken" required className="mt-1 w-full rounded-md border border-line px-2 py-1" />
            </label>
            <button type="submit" className="rounded-md bg-amber-700 px-3 py-2 text-white">
              Apply coverage change
            </button>
          </form>
        </section>
      ) : null}

      <p className="mt-6 text-xs text-muted">
        Production blockers: Postgres / object storage / backups / monitoring / cron / DNS / HTTPS / secrets remain
        EXTERNAL_REQUIRED unless configured. Object storage:{" "}
        {process.env.STORAGE_PROVIDER === "s3" && process.env.OBJECT_STORAGE_BUCKET
          ? "check credentials"
          : "NOT_CONFIGURED"}
        .
      </p>
    </div>
  );
}
