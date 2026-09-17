export type AdminListStat = {
  label: string;
  value: number;
};

/** Consistent totals line above admin bulk tables (catalog + content lists). */
export function AdminListSummary({
  noun,
  total,
  matching,
  showing,
  stats = [],
}: {
  noun: string;
  total: number;
  matching: number;
  showing: number;
  stats?: AdminListStat[];
}) {
  return (
    <p className="mb-3 text-sm text-muted">
      <span className="font-semibold text-navy">{total.toLocaleString()}</span> {noun} total
      {matching !== total ? (
        <>
          {" "}
          · <span className="font-semibold text-navy">{matching.toLocaleString()}</span> match filters
        </>
      ) : null}
      {stats.map((stat) => (
        <span key={stat.label}>
          {" "}
          · <span className="font-semibold text-navy">{stat.value.toLocaleString()}</span> {stat.label}
        </span>
      ))}
      {matching > showing ? (
        <>
          {" "}
          · showing first <span className="font-semibold text-navy">{showing.toLocaleString()}</span>
        </>
      ) : matching > 0 ? (
        <>
          {" "}
          · showing <span className="font-semibold text-navy">{showing.toLocaleString()}</span>
        </>
      ) : null}
    </p>
  );
}

export function AdminCatalogEmptyHint({
  total,
  noun,
  steps,
}: {
  total: number;
  noun: string;
  steps: string;
}) {
  if (total > 0) return null;
  return (
    <p className="mb-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-navy">
      No {noun} in this database ({`127.0.0.1:5433`} PGlite). {steps}
    </p>
  );
}
