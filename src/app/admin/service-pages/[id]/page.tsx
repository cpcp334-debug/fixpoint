import { notFound } from "next/navigation";
import Link from "next/link";
import { needPermission } from "@/lib/admin/guard";
import { Forbidden, PageHeader } from "@/components/admin/Ui";
import { evaluateRow, getServicePage, readinessLabels } from "@/lib/admin/service-pages";
import { loadEligibilityForId } from "@/lib/service-location/publication-ops";
import { prisma } from "@/server/db";
import {
  promoteLifecycleAction,
  publishServiceLocationAction,
  setCoverageDecisionAction,
} from "@/app/admin/service-pages/actions";

export default async function ServicePageDetail({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; ok?: string }>;
}) {
  const auth = await needPermission("services");
  if (!auth.ok) return <Forbidden />;
  const { id } = await params;
  const sp = await searchParams;
  const row = await getServicePage(id);
  if (!row) notFound();
  const evald = evaluateRow(row);
  const ready = readinessLabels(evald.quality, evald.gates);
  const { eligibility } = await loadEligibilityForId(prisma, id);
  const publicPath = `/${row.service.slug}/${row.location.slug}`;
  const published = row.coverageStatus === "published";

  return (
    <div>
      <PageHeader
        title={`${evald.serviceEn?.name || row.service.slug} × ${evald.locationEn?.name || row.location.slug}`}
        note="Controlled coverage + publication. Existing published rows are protected from rewrite."
        actions={
          <div className="flex gap-3 text-sm">
            <Link className="text-navy" href={`/admin/service-pages/${id}/preview?locale=en`}>
              Preview EN
            </Link>
            <Link className="text-navy" href={`/admin/service-pages/${id}/preview?locale=ar`}>
              Preview AR
            </Link>
            <Link className="text-navy" href="/admin/service-pages/queue">
              Queue
            </Link>
            <Link className="text-navy" href="/admin/service-pages">
              Back
            </Link>
          </div>
        }
      />
      {sp.error ? <p className="mb-3 text-sm text-red-700">Error: {sp.error}</p> : null}
      {sp.ok ? <p className="mb-3 text-sm text-green-800">OK: {sp.ok}</p> : null}

      <p className="mb-4 text-sm text-muted">
        Public path: <code>{publicPath}</code> · Bucket <code>{eligibility.primaryBucket}</code>
      </p>

      <section className="mb-4 rounded-md border border-line bg-white p-4 text-sm">
        <h2 className="font-semibold">Eligibility</h2>
        <ul className="mt-2 grid gap-1 sm:grid-cols-2">
          <li>Eligible EN: {eligibility.eligibleEn ? "yes" : "no"}</li>
          <li>Eligible AR: {eligibility.eligibleAr ? "yes" : "no"}</li>
          <li>Can promote: {eligibility.canPromoteLifecycle ? "yes" : "no"}</li>
          <li>Blocks: {eligibility.blockReasons.join(", ")}</li>
        </ul>
      </section>

      <section className="mb-4 rounded-md border border-line bg-white p-4 text-sm">
        <h2 className="font-semibold">Content readiness</h2>
        <ul className="mt-2 grid gap-1 sm:grid-cols-2">
          <li>Coverage: {ready.coverage}</li>
          <li>EN: {ready.en}</li>
          <li>AR: {ready.ar}</li>
          <li>SEO: {ready.seo}</li>
          <li>GEO: {ready.geo}</li>
          <li>AEO: {ready.aeo}</li>
          <li>DIY: {ready.diy}</li>
          <li>IMAGE: {ready.image}</li>
          <li>QUALITY: {ready.quality}</li>
          <li>INDEX EN: {ready.indexEn}</li>
          <li>INDEX AR: {ready.indexAr}</li>
        </ul>
      </section>

      {!published ? (
        <div className="mb-4 grid gap-4 lg:grid-cols-3">
          <form action={setCoverageDecisionAction} className="rounded-md border border-line bg-white p-4 text-sm">
            <h2 className="font-semibold">Set coverage</h2>
            <input type="hidden" name="id" value={id} />
            <label className="mt-2 block">
              Decision
              <select name="decision" className="mt-1 w-full rounded-md border border-line px-2 py-1">
                <option value="COVERED">COVERED</option>
                <option value="NOT_COVERED">NOT_COVERED</option>
                <option value="TEMPORARILY_CLOSED">TEMPORARILY_CLOSED</option>
              </select>
            </label>
            <label className="mt-2 block">
              Reason
              <input name="reason" required className="mt-1 w-full rounded-md border border-line px-2 py-1" />
            </label>
            <button type="submit" className="mt-3 rounded-md bg-navy px-3 py-1.5 text-white">
              Save coverage
            </button>
          </form>

          <form action={promoteLifecycleAction} className="rounded-md border border-line bg-white p-4 text-sm">
            <h2 className="font-semibold">Promote lifecycle</h2>
            <input type="hidden" name="id" value={id} />
            <p className="mt-1 text-muted">Current: {row.coverageStatus}</p>
            <label className="mt-2 block">
              Next
              <select name="to" className="mt-1 w-full rounded-md border border-line px-2 py-1">
                <option value="review">review</option>
                <option value="approved">approved</option>
              </select>
            </label>
            <label className="mt-2 block">
              Reason
              <input name="reason" required className="mt-1 w-full rounded-md border border-line px-2 py-1" />
            </label>
            <button type="submit" className="mt-3 rounded-md bg-navy px-3 py-1.5 text-white">
              Promote
            </button>
          </form>

          <form action={publishServiceLocationAction} className="rounded-md border border-amber-300 bg-amber-50 p-4 text-sm">
            <h2 className="font-semibold">Publish (single pair)</h2>
            <input type="hidden" name="id" value={id} />
            <p className="mt-1 text-muted">Requires approved + eligible. Does not bulk publish.</p>
            <label className="mt-2 flex items-center gap-2">
              <input type="checkbox" name="publishAr" value="true" />
              Also publish AR if eligible
            </label>
            <label className="mt-2 block">
              Reason
              <input name="reason" required className="mt-1 w-full rounded-md border border-line px-2 py-1" />
            </label>
            <label className="mt-2 block">
              Type CONFIRM_PUBLISH
              <input name="confirmToken" required className="mt-1 w-full rounded-md border border-line px-2 py-1" />
            </label>
            <button type="submit" className="mt-3 rounded-md bg-amber-700 px-3 py-1.5 text-white" disabled={!eligibility.eligibleEn}>
              Publish this page
            </button>
          </form>
        </div>
      ) : (
        <p className="mb-4 rounded-md border border-line bg-white p-3 text-sm text-muted">
          This pair is published and protected. Coverage/content rewrite actions are blocked.
        </p>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-md border border-line bg-white p-4 text-sm">
          <h2 className="font-semibold">Coverage / lifecycle</h2>
          <ul className="mt-2 space-y-1">
            <li>Covered: {row.covered ? "yes" : "no"}</li>
            <li>Lifecycle: {row.coverageStatus}</li>
            <li>Stored indexable: {row.indexable ? "yes" : "no"}</li>
            <li>Quality: {row.qualityStatus} ({row.qualityScore})</li>
            <li>Approved by: {row.approvedBy || "—"}</li>
          </ul>
        </section>
        <section className="rounded-md border border-line bg-white p-4 text-sm">
          <h2 className="font-semibold">Effective ops</h2>
          <ul className="mt-2 space-y-1">
            <li>Booking: {evald.ops.bookingEnabled ? "yes" : "no"}</li>
            <li>AMC: {evald.ops.amcAvailable ? "yes" : "no"}</li>
            <li>Emergency: {evald.ops.emergencyAvailable ? "yes" : "no"}</li>
            <li>DIY: {evald.diy.safetyClass}</li>
            <li>Image: {evald.image.source}</li>
          </ul>
        </section>
      </div>
    </div>
  );
}
