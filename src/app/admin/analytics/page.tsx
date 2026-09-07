import { prisma } from "@/server/db";
import { needSession } from "@/lib/admin/guard";
import { Forbidden, PageHeader } from "@/components/admin/Ui";
import { loadInsights } from "@/lib/insights/query";
import { canViewAnalytics } from "@/lib/insights/rbac";
import { RANGE_LABELS, RANGE_PRESETS } from "@/lib/insights/dates";
import { pickI18n } from "@/lib/utils";

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{
    range?: string;
    from?: string;
    to?: string;
    serviceId?: string;
    locationId?: string;
    source?: string;
  }>;
}) {
  const session = await needSession();
  if (!canViewAnalytics(session.role)) return <Forbidden />;
  const query = await searchParams;
  const [data, services, emirates] = await Promise.all([
    loadInsights(session.role, query),
    prisma.service.findMany({ where: { status: "active" }, include: { translations: true }, orderBy: { slug: "asc" } }),
    prisma.location.findMany({
      where: { type: "emirate", status: "active" },
      include: { translations: true },
      orderBy: { sortOrder: "asc" },
    }),
  ]);
  const empty = data.kpis.every((row) => row.count === 0) && data.funnel.every((row) => row.count === 0);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Analytics"
        note={`Business windows use Asia/Dubai (${data.window.label}). Amounts are not summed from quote/invoice labels. Payment.unconfigured is not paid. Traffic UTM/referrer is not captured.`}
      />

      <form className="grid gap-3 rounded-md border border-line bg-white p-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7" method="get">
        <label className="text-sm">
          <span className="font-medium">Range</span>
          <select name="range" defaultValue={data.window.preset} className="mt-1 w-full rounded-md border border-line px-3 py-2">
            {RANGE_PRESETS.map((value) => (
              <option key={value} value={value}>
                {RANGE_LABELS[value]}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="font-medium">From</span>
          <input type="date" name="from" defaultValue={data.window.fromDate} className="mt-1 w-full rounded-md border border-line px-3 py-2" />
        </label>
        <label className="text-sm">
          <span className="font-medium">To</span>
          <input type="date" name="to" defaultValue={data.window.toDate} className="mt-1 w-full rounded-md border border-line px-3 py-2" />
        </label>
        <label className="text-sm">
          <span className="font-medium">Service</span>
          <select name="serviceId" defaultValue={query.serviceId || ""} className="mt-1 w-full rounded-md border border-line px-3 py-2">
            <option value="">All</option>
            {services.map((row) => (
              <option key={row.id} value={row.id}>
                {pickI18n(row.translations, "en")?.name || row.slug}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="font-medium">Emirate</span>
          <select name="locationId" defaultValue={query.locationId || ""} className="mt-1 w-full rounded-md border border-line px-3 py-2">
            <option value="">All</option>
            {emirates.map((row) => (
              <option key={row.id} value={row.id}>
                {pickI18n(row.translations, "en")?.name || row.slug}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="font-medium">Form source</span>
          <select name="source" defaultValue={query.source || ""} className="mt-1 w-full rounded-md border border-line px-3 py-2">
            <option value="">All</option>
            {["quote", "booking", "contact", "ai"].map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>
        <div className="flex items-end">
          <button type="submit" className="inline-flex min-h-10 items-center rounded-md bg-navy px-4 text-sm font-medium text-white">
            Apply
          </button>
        </div>
      </form>

      {empty ? <p className="text-sm text-muted">No data yet.</p> : null}

      <section>
        <h2 className="mb-3 text-lg font-semibold">Overview</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {data.kpis.map((card) => {
            const inner = (
              <>
                <p className="text-sm text-muted">{card.label}</p>
                <p className="mt-2 text-3xl font-semibold">{card.count}</p>
              </>
            );
            const cls = "rounded-md border border-line bg-white p-4";
            return card.href ? (
              <a key={card.id} href={card.href} className={cls}>
                {inner}
              </a>
            ) : (
              <div key={card.id} className={cls}>
                {inner}
              </div>
            );
          })}
        </div>
      </section>

      {data.sections.includes("funnel") || data.sections.includes("visitors") ? (
        <section>
          <h2 className="mb-3 text-lg font-semibold">Funnel</h2>
          <p className="mb-3 text-xs text-muted">
            Conversion is this stage ÷ previous stage. Zero denominator shows —. Previous-period change is hidden when the previous window had no data.
          </p>
          {data.funnel.every((row) => row.count === 0) ? (
            <p className="text-sm text-muted">No data yet.</p>
          ) : (
            <div className="overflow-x-auto rounded-md border border-line bg-white">
              <table className="w-full text-left text-sm">
                <thead className="bg-sand-2 text-muted">
                  <tr>
                    <th className="px-3 py-2">Stage</th>
                    <th className="px-3 py-2">Count</th>
                    <th className="px-3 py-2">Conversion</th>
                    <th className="px-3 py-2">Vs previous</th>
                  </tr>
                </thead>
                <tbody>
                  {data.funnel.map((row) => (
                    <tr key={row.id} className="border-t border-line">
                      <td className="px-3 py-2">
                        {row.href ? (
                          <a className="text-navy" href={row.href}>
                            {row.label}
                          </a>
                        ) : (
                          row.label
                        )}
                      </td>
                      <td className="px-3 py-2">{row.count}</td>
                      <td className="px-3 py-2">{row.rate === null ? "—" : `${row.rate}%`}</td>
                      <td className="px-3 py-2">{row.delta === null ? "—" : row.delta > 0 ? `+${row.delta}` : String(row.delta)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      ) : null}

      {data.sections.includes("quality") ? (
        <section>
          <h2 className="mb-3 text-lg font-semibold">Lead quality</h2>
          <p className="mb-3 text-xs text-muted">
            HOT/WARM come from LeadScore.effectiveClass. CRM qualified is a separate pipeline metric. Average score{" "}
            {data.quality.avgScore === null ? "No data yet." : data.quality.avgScore}
          </p>
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-md border border-line bg-white p-4">
              <p className="font-medium">Class counts</p>
              <ul className="mt-2 space-y-1 text-sm">
                {data.quality.classes.map((row) => (
                  <li key={row.id}>
                    {row.href ? (
                      <a className="text-navy" href={row.href}>
                        {row.id}
                      </a>
                    ) : (
                      row.id
                    )}{" "}
                    · {row.count}
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-md border border-line bg-white p-4">
              <p className="font-medium">Score distribution</p>
              <ul className="mt-2 space-y-1 text-sm">
                {data.quality.buckets.map((row) => (
                  <li key={row.id}>
                    {row.id}: {row.count}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      ) : null}

      {data.sections.includes("services") ? (
        <section>
          <h2 className="mb-3 text-lg font-semibold">Service performance</h2>
          {!data.services.length ? (
            <p className="text-sm text-muted">No data yet.</p>
          ) : (
            <div className="overflow-x-auto rounded-md border border-line bg-white">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead className="bg-sand-2 text-muted">
                  <tr>
                    <th className="px-3 py-2">Service</th>
                    <th className="px-3 py-2">Views</th>
                    <th className="px-3 py-2">Leads</th>
                    <th className="px-3 py-2">CRM qualified</th>
                    <th className="px-3 py-2">HOT</th>
                    <th className="px-3 py-2">Bookings</th>
                  </tr>
                </thead>
                <tbody>
                  {data.services.map((row) => (
                    <tr key={String(row.id)} className="border-t border-line">
                      <td className="px-3 py-2">
                        <a className="text-navy" href={String(row.href)}>
                          {String(row.label)}
                        </a>
                      </td>
                      <td className="px-3 py-2">{row.views}</td>
                      <td className="px-3 py-2">{row.leads}</td>
                      <td className="px-3 py-2">{row.qualified}</td>
                      <td className="px-3 py-2">{row.hot}</td>
                      <td className="px-3 py-2">{row.bookings}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      ) : null}

      {data.sections.includes("locations") ? (
        <section>
          <h2 className="mb-3 text-lg font-semibold">Location performance</h2>
          <p className="mb-3 text-xs text-muted">Emirate uses locationId. City/area are not inferred when not stored.</p>
          {!data.locations.length ? (
            <p className="text-sm text-muted">No data yet.</p>
          ) : (
            <div className="overflow-x-auto rounded-md border border-line bg-white">
              <table className="w-full text-left text-sm">
                <thead className="bg-sand-2 text-muted">
                  <tr>
                    <th className="px-3 py-2">Emirate</th>
                    <th className="px-3 py-2">Leads</th>
                    <th className="px-3 py-2">Bookings</th>
                    <th className="px-3 py-2">Completed</th>
                  </tr>
                </thead>
                <tbody>
                  {data.locations.map((row) => (
                    <tr key={String(row.id)} className="border-t border-line">
                      <td className="px-3 py-2">
                        {row.href ? (
                          <a className="text-navy" href={String(row.href)}>
                            {String(row.label)}
                          </a>
                        ) : (
                          String(row.label)
                        )}
                      </td>
                      <td className="px-3 py-2">{row.leads}</td>
                      <td className="px-3 py-2">{row.bookings}</td>
                      <td className="px-3 py-2">{row.completed}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      ) : null}

      {data.sections.includes("sources") ? (
        <section>
          <h2 className="mb-3 text-lg font-semibold">Source performance</h2>
          <p className="mb-3 text-xs text-muted">Lead.source is the form channel. Campaign / UTM / referrer: Unknown / not captured.</p>
          <ul className="rounded-md border border-line bg-white p-4 text-sm">
            {data.sources.map((row) => (
              <li key={row.id}>
                {row.href ? (
                  <a className="text-navy" href={row.href}>
                    {row.label}
                  </a>
                ) : (
                  row.label
                )}{" "}
                · {row.count}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {data.sections.includes("operations") ? (
        <section>
          <h2 className="mb-3 text-lg font-semibold">Operations</h2>
          <ul className="rounded-md border border-line bg-white p-4 text-sm">
            {data.operations.map((row) => (
              <li key={row.id}>
                {row.href ? (
                  <a className="text-navy" href={row.href}>
                    {row.label}
                  </a>
                ) : (
                  row.label
                )}{" "}
                · {row.count}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {data.sections.includes("reviews") ? (
        <section>
          <h2 className="mb-3 text-lg font-semibold">Reviews</h2>
          <p className="mb-2 text-sm">
            Approved service reviews: {data.reviews.total}. Conversion from completed jobs:{" "}
            {data.reviews.conversion === null ? "—" : `${data.reviews.conversion}%`}
          </p>
          {!data.reviews.stars.length ? (
            <p className="text-sm text-muted">No data yet.</p>
          ) : (
            <ul className="text-sm">
              {data.reviews.stars.map((row) => (
                <li key={row.stars}>
                  {row.stars} stars · {row.count}
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}

      {data.sections.includes("amc") ? (
        <section>
          <h2 className="mb-3 text-lg font-semibold">AMC</h2>
          <p className="text-sm">
            Active {data.amc.active} · Expiring (30 days) {data.amc.expiring} · Expired {data.amc.expired} · Visits in
            range {data.amc.visits} · Renewals: No data yet.
          </p>
        </section>
      ) : null}

      {data.sections.includes("invoices") ? (
        <p className="text-xs text-muted">
          Quoted / Invoiced / Paid are status counts only. Invoice totals are labels, not summed revenue. Payment.unconfigured is never paid.
        </p>
      ) : null}
    </div>
  );
}
