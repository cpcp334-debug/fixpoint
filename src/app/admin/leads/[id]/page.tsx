import { notFound } from "next/navigation";
import { prisma } from "@/server/db";
import { needPermission } from "@/lib/admin/guard";
import { Field, Forbidden, PageHeader, PrimaryButton, SelectField } from "@/components/admin/Ui";
import { overrideLeadQualityAction, updateLeadAction } from "@/app/admin/actions";
import { canManageLeadSpam } from "@/lib/admin/rbac";
import { pickI18n, parseJson } from "@/lib/utils";
import { visitorJourneySummary } from "@/lib/quality/journey";
import { QUALITY_CLASSES, type Reason } from "@/lib/quality/signals";
import { JourneyTimeline } from "@/components/admin/JourneyTimeline";
import { buildJourney } from "@/lib/journey/aggregate";
import { canViewIdentifiableJourney } from "@/lib/journey/rbac";
import { journeyPageFromSearch } from "@/lib/journey/types";

const STATUSES = ["NEW", "QUALIFIED", "INSPECTION", "QUOTATION", "QUOTATION_SENT", "FOLLOW_UP", "APPROVED", "SCHEDULED", "COMPLETED", "LOST", "CANCELLED"];

export default async function LeadDetail({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ jt?: string; quality?: string }>;
}) {
  const auth = await needPermission("leads");
  if (!auth.ok) return <Forbidden />;
  const { id } = await params;
  const query = await searchParams;
  const row = await prisma.lead.findUnique({
    where: { id },
    include: {
      score: { include: { history: { orderBy: { createdAt: "desc" }, take: 20 } } },
      service: { include: { translations: true } },
      location: { include: { translations: true } },
      bookings: { select: { id: true, number: true, type: true, status: true } },
    },
  });
  if (!row) notFound();
  const quotes = await prisma.quote.findMany({
    where: { leadId: row.id },
    select: { id: true, quoteNumber: true, status: true },
    take: 10,
  });
  const journey = await visitorJourneySummary(row.visitorId);
  const timeline = canViewIdentifiableJourney(auth.session.role, "lead")
    ? await buildJourney(
        { type: "lead", id: row.id },
        { role: auth.session.role, staffId: auth.session.staffId, page: journeyPageFromSearch(query.jt) },
      )
    : null;
  const reasons = parseJson<Reason[]>(row.score?.reasonsJson, []);
  const serviceName = pickI18n(row.service?.translations || [], "en")?.name;
  const locationName = pickI18n(row.location?.translations || [], "en")?.name;
  const spamOk = canManageLeadSpam(auth.session.role);
  const classOptions = QUALITY_CLASSES.filter((cls) => spamOk || cls !== "SPAM").map((value) => ({
    value,
    label: value,
  }));

  return (
    <div>
      <PageHeader title={row.name} note={`${row.phone} · ${row.source}`} />
      <p className="mb-4 whitespace-pre-wrap rounded-md border border-line bg-white p-4 text-sm">{row.requirement}</p>

      <div className="mb-6 grid gap-4 lg:grid-cols-2">
        <section className="rounded-md border border-line bg-white p-4 text-sm">
          <h2 className="text-lg font-semibold">Quality</h2>
          {row.score ? (
            <dl className="mt-3 grid grid-cols-2 gap-2">
              <dt className="text-muted">Score</dt>
              <dd>{row.score.score} / 100 ({row.score.modelVersion})</dd>
              <dt className="text-muted">System class</dt>
              <dd>{row.score.systemClass}</dd>
              <dt className="text-muted">Human class</dt>
              <dd>{row.score.humanClass || "—"}</dd>
              <dt className="text-muted">Effective class</dt>
              <dd>{row.score.effectiveClass}{row.score.quarantined ? " · quarantined" : ""}</dd>
              <dt className="text-muted">Computed</dt>
              <dd>{row.score.computedAt.toISOString().slice(0, 19).replace("T", " ")}</dd>
            </dl>
          ) : (
            <p className="mt-2 text-muted">Not scored yet.</p>
          )}
          <ul className="mt-4 space-y-1">
            {reasons.map((reason) => (
              <li key={reason.code}>
                <span className="font-mono text-xs">{reason.code}</span>
                {" · "}
                {reason.label} ({reason.points > 0 ? "+" : ""}
                {reason.points})
              </li>
            ))}
          </ul>
          {row.score ? (
            <form action={overrideLeadQualityAction} className="mt-4 space-y-3 border-t border-line pt-4">
              <input type="hidden" name="id" value={row.id} />
              <SelectField
                label="Override class"
                name="class"
                defaultValue={row.score.effectiveClass}
                options={classOptions}
              />
              <Field label="Override note (required)" name="note" required textarea />
              {!spamOk ? (
                <p className="text-xs text-muted">SPAM set/restore requires manager or super_admin.</p>
              ) : null}
              <PrimaryButton>Save override</PrimaryButton>
            </form>
          ) : null}
        </section>

        <section className="rounded-md border border-line bg-white p-4 text-sm">
          <h2 className="text-lg font-semibold">Context</h2>
          <dl className="mt-3 grid grid-cols-2 gap-2">
            <dt className="text-muted">Service</dt>
            <dd>{serviceName || "—"}</dd>
            <dt className="text-muted">Location</dt>
            <dd>{locationName || "—"}</dd>
            <dt className="text-muted">City / area</dt>
            <dd>{[row.city, row.area].filter(Boolean).join(" · ") || "—"}</dd>
            <dt className="text-muted">First visit</dt>
            <dd>{journey.firstVisit ? journey.firstVisit.toISOString().slice(0, 19).replace("T", " ") : "—"}</dd>
            <dt className="text-muted">Last visit</dt>
            <dd>{journey.lastVisit ? journey.lastVisit.toISOString().slice(0, 19).replace("T", " ") : "—"}</dd>
            <dt className="text-muted">Journey</dt>
            <dd>
              {journey.optedOut
                ? "Visitor opted out of analytics"
                : journey.counts.length
                  ? journey.counts.map((c) => `${c.name} ×${c.count}`).join(", ")
                  : "No visitor events (not a penalty)"}
            </dd>
          </dl>
          <p className="mt-4 font-medium">Bookings</p>
          <ul className="mt-1">
            {row.bookings.length
              ? row.bookings.map((b) => (
                  <li key={b.id}>
                    <a className="text-navy" href={`/admin/bookings/${b.id}`}>
                      {b.number}
                    </a>{" "}
                    · {b.type} · {b.status}
                  </li>
                ))
              : <li className="text-muted">None</li>}
          </ul>
          <p className="mt-4 font-medium">Quotes</p>
          <ul className="mt-1">
            {quotes.length
              ? quotes.map((q) => (
                  <li key={q.id}>
                    <a className="text-navy" href={`/admin/quotes/${q.id}`}>
                      {q.quoteNumber}
                    </a>{" "}
                    · {q.status}
                  </li>
                ))
              : <li className="text-muted">None</li>}
          </ul>
        </section>
      </div>

      {row.score?.history?.length ? (
        <section className="mb-6 rounded-md border border-line bg-white p-4 text-sm">
          <h2 className="text-lg font-semibold">Score history</h2>
          <ul className="mt-2 space-y-1">
            {row.score.history.map((h) => (
              <li key={h.id}>
                {h.createdAt.toISOString().slice(0, 19).replace("T", " ")} · {h.cause} · {h.actor} · score {h.score} ·{" "}
                {h.systemClass} → {h.effectiveClass}
                {h.note ? ` · ${h.note}` : ""}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <form action={updateLeadAction} className="max-w-xl space-y-4 rounded-md border border-line bg-white p-4">
        <input type="hidden" name="id" value={row.id} />
        <SelectField label="Status" name="status" defaultValue={row.status} options={STATUSES.map((value) => ({ value, label: value }))} />
        <Field label="Notes" name="notes" defaultValue={row.notes} textarea />
        <PrimaryButton>Save</PrimaryButton>
      </form>
      {timeline ? <div className="mt-6"><JourneyTimeline journey={timeline} /></div> : null}
    </div>
  );
}
