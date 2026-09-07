import type { JourneyPage } from "@/lib/journey/types";

const ACTOR_LABEL: Record<string, string> = {
  system: "System",
  customer: "Customer action",
  staff: "Staff action",
  transaction: "Business transaction",
};

export function JourneyTimeline({
  journey,
  emptyNote,
}: {
  journey: JourneyPage;
  emptyNote?: string;
}) {
  return (
    <section className="rounded-md border border-line bg-white p-4 text-sm">
      <h2 className="text-lg font-semibold">Journey</h2>
      <p className="mt-1 text-xs text-muted">
        Current status is labeled separately from historical audit. Source attribution is landing path
        only — UTM and referrer are not stored. AI transcripts are never shown.
      </p>
      {journey.optedOut ? (
        <p className="mt-2 text-xs text-muted">Visitor opted out of analytics. Visit events are hidden.</p>
      ) : null}

      {journey.quality.length ? (
        <div className="mt-4 space-y-3">
          {journey.quality.map((row) => (
            <div key={row.leadId} className="rounded-md border border-line p-3">
              <p className="font-medium">Lead quality</p>
              <dl className="mt-2 grid grid-cols-2 gap-1 text-xs">
                <dt className="text-muted">Score</dt>
                <dd>{row.score} / 100</dd>
                <dt className="text-muted">System class</dt>
                <dd>{row.systemClass}</dd>
                <dt className="text-muted">Human class</dt>
                <dd>{row.humanClass || "—"}</dd>
                <dt className="text-muted">Effective class</dt>
                <dd>{row.effectiveClass}</dd>
                <dt className="text-muted">Last calculated</dt>
                <dd>{row.computedAt.toISOString().slice(0, 19).replace("T", " ")}</dd>
              </dl>
              <ul className="mt-2 space-y-1 text-xs">
                {row.reasons.map((reason) => (
                  <li key={reason.code}>
                    <span className="font-mono">{reason.code}</span> · {reason.label} ({reason.points > 0 ? "+" : ""}
                    {reason.points})
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      ) : null}

      {journey.items.length ? (
        <ol className="mt-4 space-y-3">
          {journey.items.map((row) => (
            <li key={row.id} className="border-t border-line pt-3">
              <div className="flex flex-wrap items-baseline gap-2">
                <span className="font-medium">{row.title}</span>
                <span className="text-xs uppercase tracking-wide text-muted">{ACTOR_LABEL[row.actorKind]}</span>
                <span className="text-xs text-muted">{row.certainty === "current" ? "Current status" : "Historical"}</span>
              </div>
              <p className="text-xs text-muted">
                {row.occurredAt.toISOString().slice(0, 19).replace("T", " ")}
                {row.actor ? ` · ${row.actor}` : ""}
              </p>
              {Object.keys(row.facts).length ? (
                <p className="mt-1 text-xs">
                  {Object.entries(row.facts)
                    .filter(([, value]) => value !== null && value !== "")
                    .map(([key, value]) => `${key}: ${String(value)}`)
                    .join(" · ")}
                </p>
              ) : null}
              {row.href ? (
                <a className="mt-1 inline-block text-xs text-navy" href={row.href}>
                  Open record
                </a>
              ) : null}
            </li>
          ))}
        </ol>
      ) : (
        <p className="mt-3 text-muted">{emptyNote || "No journey events for this record."}</p>
      )}

      {journey.total > journey.pageSize ? (
        <p className="mt-4 text-xs text-muted">
          Showing {(journey.page - 1) * journey.pageSize + 1}–{Math.min(journey.page * journey.pageSize, journey.total)} of{" "}
          {journey.total}
          {journey.page > 1 ? (
            <>
              {" · "}
              <a className="text-navy" href={`?jt=${journey.page - 1}`}>
                Previous
              </a>
            </>
          ) : null}
          {journey.page * journey.pageSize < journey.total ? (
            <>
              {" · "}
              <a className="text-navy" href={`?jt=${journey.page + 1}`}>
                Next
              </a>
            </>
          ) : null}
        </p>
      ) : null}
    </section>
  );
}
