import { notFound } from "next/navigation";
import Link from "next/link";
import { needPermission } from "@/lib/admin/guard";
import { Forbidden, PageHeader } from "@/components/admin/Ui";
import { evaluateRow, getServicePage } from "@/lib/admin/service-pages";

export default async function ServicePagePreview({ params }: { params: Promise<{ id: string }> }) {
  const auth = await needPermission("services");
  if (!auth.ok) return <Forbidden />;
  const { id } = await params;
  const row = await getServicePage(id);
  if (!row) notFound();
  const evald = evaluateRow(row);
  const publicPath = `/${row.service.slug}/${row.location.slug}`;
  return (
    <div>
      <PageHeader
        title={`${evald.serviceEn?.name || row.service.slug} × ${evald.locationEn?.name || row.location.slug}`}
        note="Read-only preview. No publish/approve actions in A3.1. Public URL is unchanged."
        actions={
          <div className="flex gap-3 text-sm">
            <Link className="text-navy" href={`/admin/service-pages/${id}/preview?locale=en`}>
              Preview EN
            </Link>
            <Link className="text-navy" href={`/admin/service-pages/${id}/preview?locale=ar`}>
              Preview AR
            </Link>
            <Link className="text-navy" href="/admin/service-pages">
              Back
            </Link>
          </div>
        }
      />
      <p className="mb-4 text-sm text-muted">
        Public path: <code>{publicPath}</code> · ID <code>{row.id}</code>
      </p>
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-md border border-line bg-white p-4 text-sm">
          <h2 className="font-semibold">Coverage / lifecycle</h2>
          <ul className="mt-2 space-y-1">
            <li>Covered: {row.covered ? "yes" : "no"}</li>
            <li>Lifecycle: {row.coverageStatus}</li>
            <li>Stored indexable: {row.indexable ? "yes" : "no"}</li>
            <li>Quality: {evald.gates.qualityStatus} ({row.qualityScore})</li>
            <li>EN index gate: {evald.gates.indexableEn ? "yes" : "no"}</li>
            <li>AR index gate: {evald.gates.indexableAr ? "yes" : "no"}</li>
            <li>Approved by: {row.approvedBy || "—"}</li>
          </ul>
        </section>
        <section className="rounded-md border border-line bg-white p-4 text-sm">
          <h2 className="font-semibold">Effective ops</h2>
          <ul className="mt-2 space-y-1">
            <li>Booking: {evald.ops.bookingEnabled ? "yes" : "no"}</li>
            <li>AMC: {evald.ops.amcAvailable ? "yes" : "no"}</li>
            <li>Emergency: {evald.ops.emergencyAvailable ? "yes" : "no"}</li>
            <li>DIY visible: {evald.diy.visible ? "yes" : "no"}</li>
            <li>DIY safety: {evald.diy.safetyClass}</li>
            <li>DIY guide: {evald.diy.guideSlug || "none (inherit service only)"}</li>
            <li>Safety weakened: {evald.diy.safetyWeakened ? "yes" : "no"}</li>
            <li>Image: {evald.image.source}</li>
          </ul>
        </section>
        <section className="rounded-md border border-line bg-white p-4 text-sm">
          <h2 className="font-semibold">English working copy</h2>
          <p className="mt-2 font-medium">{evald.en?.seoTitle}</p>
          <p className="mt-1 text-muted">{evald.en?.intro}</p>
          <p className="mt-3 text-xs text-muted">Suggested title: {evald.titleEn.title}</p>
        </section>
        <section className="rounded-md border border-line bg-white p-4 text-sm">
          <h2 className="font-semibold">Arabic working copy</h2>
          <p className="mt-2 font-medium">{evald.ar?.seoTitle}</p>
          <p className="mt-1 text-muted">{evald.ar?.intro}</p>
          <p className="mt-3 text-xs text-muted">Suggested title: {evald.titleAr.title}</p>
        </section>
        <section className="rounded-md border border-line bg-white p-4 text-sm lg:col-span-2">
          <h2 className="font-semibold">Revisions</h2>
          <ul className="mt-2 space-y-1">
            {row.revisions.map((rev) => (
              <li key={rev.id}>
                {rev.locale} r{rev.revisionNumber} · {rev.status} · {rev.changeReason || "no reason"}
              </li>
            ))}
          </ul>
          {evald.gates.failures.length ? (
            <div className="mt-3">
              <p className="font-medium">Gate notes</p>
              <ul className="mt-1 list-disc ps-5">
                {evald.gates.failures.map((f) => (
                  <li key={f.code}>
                    {f.code}: {f.message}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>
      </div>
    </div>
  );
}
