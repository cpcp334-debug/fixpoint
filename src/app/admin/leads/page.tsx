import { prisma } from "@/server/db";
import { needPermission } from "@/lib/admin/guard";
import { AdminBulkTable, AdminFlash, AdminListSummary, Field, Forbidden, PageHeader, PrimaryButton } from "@/components/admin/Ui";
import { createLeadAction } from "@/app/admin/actions";
import { pickI18n } from "@/lib/utils";
import { createdAtRange, resolveWindow } from "@/lib/insights/dates";
import { CRM_QUALIFIED } from "@/lib/insights/query";
import type { LeadQualityClass, Prisma } from "@prisma/client";

const CLASSES: LeadQualityClass[] = ["HOT", "WARM", "NORMAL", "REVIEW", "SPAM"];

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<{
    quarantine?: string;
    class?: string;
    qualified?: string;
    source?: string;
    serviceId?: string;
    locationId?: string;
    from?: string;
    to?: string;
    q?: string;
    ok?: string;
    error?: string;
  }>;
}) {
  const auth = await needPermission("leads");
  if (!auth.ok) return <Forbidden />;
  const query = await searchParams;
  const showQuarantine = query.quarantine === "1";
  const where: Prisma.LeadWhereInput = {};
  if (query.from && query.to) {
    const window = resolveWindow({ preset: "custom", from: query.from, to: query.to });
    where.createdAt = createdAtRange(window.start, window.end);
  }
  if (query.source) where.source = query.source;
  if (query.serviceId) where.serviceId = query.serviceId;
  if (query.locationId) where.locationId = query.locationId;
  if (query.qualified === "1") where.status = { in: CRM_QUALIFIED };
  if (query.q?.trim()) {
    const q = query.q.trim();
    where.OR = [
      { name: { contains: q } },
      { phone: { contains: q } },
      { email: { contains: q } },
    ];
  }
  if (showQuarantine) {
    where.score = {
      is: {
        quarantined: true,
        ...(query.class && (CLASSES as string[]).includes(query.class) ? { effectiveClass: query.class as LeadQualityClass } : {}),
      },
    };
  } else if (query.class && (CLASSES as string[]).includes(query.class)) {
    where.score = {
      is: {
        effectiveClass: query.class as LeadQualityClass,
        ...(query.class === "SPAM" ? {} : { quarantined: false }),
      },
    };
  } else {
    where.AND = [{ OR: [{ score: { is: null } }, { score: { is: { quarantined: false } } }] }];
  }
  const [totalLeads, matchingCount, rows] = await Promise.all([
    prisma.lead.count(),
    prisma.lead.count({ where }),
    prisma.lead.findMany({
      where,
      include: { score: true, service: { include: { translations: true } }, location: { include: { translations: true } } },
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
  ]);
  const sp = new URLSearchParams();
  for (const key of ["quarantine", "class", "qualified", "source", "serviceId", "locationId", "from", "to", "q"] as const) {
    const value = query[key];
    if (value) sp.set(key, value);
  }
  const returnTo = `/admin/leads${sp.toString() ? `?${sp}` : ""}`;
  return (
    <div>
      <PageHeader
        title="Leads"
        note="Bulk: Publish = NEW, Hide = CANCELLED, Soft-remove = LOST. Quarantined SPAM stays filter-gated."
        actions={
          <a className="text-sm text-navy" href={showQuarantine ? "/admin/leads" : "/admin/leads?quarantine=1"}>
            {showQuarantine ? "Hide quarantined SPAM" : "Show quarantined SPAM"}
          </a>
        }
      />
      <AdminFlash ok={query.ok} error={query.error} />
      <form action={createLeadAction} className="mb-6 grid max-w-3xl gap-3 rounded-md border border-line bg-white p-4 sm:grid-cols-2">
        <Field label="Name" name="name" required />
        <Field label="Phone" name="phone" required />
        <Field label="Email" name="email" />
        <Field label="Requirement" name="requirement" required textarea rows={3} />
        <Field label="Notes" name="notes" textarea rows={2} />
        <div className="sm:col-span-2">
          <PrimaryButton>Create lead</PrimaryButton>
        </div>
      </form>
      <form className="mb-4 flex flex-wrap gap-2 text-sm" method="get">
        <input name="q" defaultValue={query.q || ""} placeholder="Search name, phone, email" className="min-w-48 rounded-md border border-line px-3 py-2" />
        {showQuarantine ? <input type="hidden" name="quarantine" value="1" /> : null}
        <button type="submit" className="rounded-md border border-line px-3 py-2">
          Search
        </button>
      </form>
      <AdminListSummary
        noun="leads"
        total={totalLeads}
        matching={matchingCount}
        showing={rows.length}
      />
      <AdminBulkTable
        entity="leads"
        returnTo={returnTo}
        headers={["Name", "Phone", "Source", "Service", "Score", "Class", "Status", "Created", ""]}
        actionLabels={{ publish: "Reopen (NEW)", hide: "Cancel", archive: "Mark LOST" }}
        rows={rows.map((row) => {
          const service = pickI18n(row.service?.translations || [], "en")?.name || "—";
          return {
            id: row.id,
            cells: [
              row.name,
              row.phone,
              row.source,
              service,
              row.score ? row.score.score : "—",
              row.score ? row.score.effectiveClass : "—",
              row.status,
              row.createdAt.toISOString().slice(0, 10),
              <a key="open" className="text-navy" href={`/admin/leads/${row.id}`}>
                Open
              </a>,
            ],
          };
        })}
      />
    </div>
  );
}
