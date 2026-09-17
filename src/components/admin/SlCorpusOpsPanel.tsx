import type { SlCorpusDashboardStatus } from "@/lib/admin/sl-corpus-status";
import Link from "next/link";

function healthClass(health: SlCorpusDashboardStatus["jobHealth"]) {
  if (health === "running") return "border-emerald-700/30 bg-emerald-50 text-emerald-900";
  if (health === "stalled") return "border-red-700/30 bg-red-50 text-red-900";
  if (health === "idle") return "border-amber-700/30 bg-amber-50 text-amber-950";
  return "border-line bg-sand/50 text-navy";
}

function formatWhen(iso: string | null) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

export function SlCorpusOpsPanel({ status }: { status: SlCorpusDashboardStatus }) {
  const rows: Array<{ label: string; value: string }> = [
    { label: "Matrix", value: status.total.toLocaleString() },
    {
      label: "Published",
      value: `${status.published.toLocaleString()} (${status.pctPublished}%)`,
    },
    { label: "Still draft", value: status.draft.toLocaleString() },
    { label: "Draft with EN content", value: status.draftWithEnContent.toLocaleString() },
  ];

  return (
    <section className="mb-6 overflow-hidden rounded-md border border-line bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted">Ops · corpus</p>
          <h2 className="mt-1 text-lg font-semibold text-navy">Service × Location</h2>
          <p className="mt-1 max-w-2xl text-sm text-muted">
            Live publish progress for public service × location pages. Super admin / manager only.
          </p>
        </div>
        <Link
          href={status.servicePagesHref}
          className="rounded-md border border-line bg-sand px-3 py-2 text-sm font-medium text-navy hover:bg-sand-2"
        >
          Open service pages
        </Link>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {rows.map((row) => (
          <div key={row.label} className="rounded-md border border-line bg-sand/40 p-3">
            <p className="text-xs text-muted">{row.label}</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums text-navy">{row.value}</p>
          </div>
        ))}
      </div>

      <div className={`mt-4 rounded-md border px-3 py-2 text-sm ${healthClass(status.jobHealth)}`}>
        <p className="font-medium">{status.jobLabel}</p>
        <p className="mt-1 text-xs opacity-90">
          Overnight log last write: {formatWhen(status.logLastWriteAt)}
          {status.logLastPublishedTotal != null
            ? ` · last log publishedTotal: ${status.logLastPublishedTotal.toLocaleString()}`
            : ""}
        </p>
      </div>
    </section>
  );
}
