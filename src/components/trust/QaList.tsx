"use client";

import { useState } from "react";

export function QaList({
  items,
  labels,
}: {
  items: Array<{ id: string; body: string; answer: string }>;
  labels: { empty: string; report: string; thanks: string };
}) {
  if (!items.length) return <p className="mt-3 text-sm text-muted">{labels.empty}</p>;
  return (
    <dl className="mt-4 grid gap-3">
      {items.map((item) => (
        <div key={item.id} className="rounded-xl border border-line bg-white p-5">
          <dt className="font-medium text-navy">{item.body}</dt>
          <dd className="mt-2 text-sm text-muted">{item.answer}</dd>
          <ReportQuestion id={item.id} labels={labels} />
        </div>
      ))}
    </dl>
  );
}

function ReportQuestion({ id, labels }: { id: string; labels: { report: string; thanks: string } }) {
  const [done, setDone] = useState(false);
  if (done) return <p className="mt-2 text-xs text-muted">{labels.thanks}</p>;
  return (
    <button
      type="button"
      className="mt-2 text-xs text-muted underline"
      onClick={() => {
        void fetch("/api/trust/report", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ entity: "question", id, reason: "reader-report" }),
        }).then(() => setDone(true));
      }}
    >
      {labels.report}
    </button>
  );
}
