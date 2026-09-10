import Link from "next/link";
import { prisma } from "@/server/db";
import { needPermission } from "@/lib/admin/guard";
import { AdminTable, Forbidden, PageHeader } from "@/components/admin/Ui";
import { listPublicationQueue, publicationQueueCounts } from "@/lib/admin/publication-queue";
import { refreshPilotQueueAction } from "@/app/admin/service-pages/actions";

export default async function ServicePagesQueuePage({
  searchParams,
}: {
  searchParams: Promise<{ bucket?: string; service?: string }>;
}) {
  const auth = await needPermission("services");
  if (!auth.ok) return <Forbidden />;
  const filters = await searchParams;
  const bucket = filters.bucket || "READY_FOR_PUBLISH";
  const [counts, rows, site] = await Promise.all([
    publicationQueueCounts(),
    listPublicationQueue({ bucket, service: filters.service, take: 50 }),
    prisma.siteSetting.findUnique({ where: { id: "site" } }),
  ]);

  let pilot: Array<Record<string, unknown>> = [];
  try {
    const json = JSON.parse(site?.json || "{}") as { publicationPilotQueue?: Array<Record<string, unknown>> };
    pilot = json.publicationPilotQueue || [];
  } catch {
    pilot = [];
  }

  return (
    <div>
      <PageHeader
        title="Publication queue"
        note="No automatic publish. READY_FOR_PUBLISH requires covered + quality. Pilot list is candidates only."
        actions={
          <div className="flex gap-3 text-sm">
            <Link className="text-navy" href="/admin/service-pages">
              Overview
            </Link>
            <Link className="text-navy" href="/admin/service-pages/coverage">
              Coverage
            </Link>
          </div>
        }
      />

      <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
        {Object.entries(counts).map(([label, value]) => (
          <Link
            key={label}
            href={`/admin/service-pages/queue?bucket=${label}`}
            className={`rounded-md border px-3 py-2 text-sm ${bucket === label ? "border-navy bg-navy/5" : "border-line bg-white"}`}
          >
            <p className="text-muted">{label}</p>
            <p className="font-semibold">{value}</p>
          </Link>
        ))}
      </div>

      <form className="mb-4 flex flex-wrap gap-2" method="get">
        <input type="hidden" name="bucket" value={bucket} />
        <input
          name="service"
          placeholder="service slug"
          defaultValue={filters.service || ""}
          className="rounded-md border border-line px-2 py-1 text-sm"
        />
        <button type="submit" className="rounded-md bg-navy px-3 py-1.5 text-sm text-white">
          Filter
        </button>
      </form>

      <AdminTable headers={["Service", "Category", "Location", "Covered", "Lifecycle", "Quality", "Bucket", "EN/AR", ""]}>
        {rows.map((row) => (
          <tr key={row.id} className="border-t border-line text-xs">
            <td className="px-3 py-2">{row.serviceSlug}</td>
            <td className="px-3 py-2">{row.categorySlug}</td>
            <td className="px-3 py-2">{row.locationSlug}</td>
            <td className="px-3 py-2">{row.covered ? "yes" : "no"}</td>
            <td className="px-3 py-2">{row.lifecycle}</td>
            <td className="px-3 py-2">{row.qualityStatus}</td>
            <td className="px-3 py-2">{row.bucket}</td>
            <td className="px-3 py-2">
              {row.eligibleEn ? "EN" : "-"}/{row.eligibleAr ? "AR" : "-"}
            </td>
            <td className="px-3 py-2">
              <Link className="text-navy" href={`/admin/service-pages/${row.id}`}>
                Manage
              </Link>
            </td>
          </tr>
        ))}
      </AdminTable>

      <section className="mt-8 rounded-md border border-line bg-white p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold">Pilot publish-ready set (max 50)</h2>
            <p className="text-sm text-muted">Covered + publishable only. Refresh does not publish.</p>
          </div>
          <form action={refreshPilotQueueAction}>
            <button type="submit" className="rounded-md bg-navy px-3 py-1.5 text-sm text-white">
              Refresh pilot candidates
            </button>
          </form>
        </div>
        <ul className="mt-3 space-y-1 text-xs">
          {pilot.length === 0 ? <li className="text-muted">No pilot candidates stored yet.</li> : null}
          {pilot.map((p) => (
            <li key={String(p.id)}>
              {String(p.serviceSlug)} × {String(p.locationSlug)} · {String(p.qualityStatus)} ·{" "}
              <Link className="text-navy" href={`/admin/service-pages/${String(p.id)}`}>
                open
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
