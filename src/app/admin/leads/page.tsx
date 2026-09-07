import { prisma } from "@/server/db";
import { needPermission } from "@/lib/admin/guard";
import { AdminTable, Forbidden, PageHeader } from "@/components/admin/Ui";
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
  const rows = await prisma.lead.findMany({
    where,
    include: { score: true, service: { include: { translations: true } }, location: { include: { translations: true } } },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  return (
    <div>
      <PageHeader
        title="Leads"
        note="Quality class is separate from CRM status. Quarantined SPAM is hidden unless you open that filter. Leads are never deleted by scoring."
        actions={
          <a className="text-sm text-navy" href={showQuarantine ? "/admin/leads" : "/admin/leads?quarantine=1"}>
            {showQuarantine ? "Hide quarantined SPAM" : "Show quarantined SPAM"}
          </a>
        }
      />
      <AdminTable headers={["Name", "Phone", "Source", "Service", "Score", "Class", "Status", "Created", ""]}>
        {rows.map((row) => {
          const service = pickI18n(row.service?.translations || [], "en")?.name || "—";
          return (
            <tr key={row.id} className="border-t border-line">
              <td className="px-3 py-2">{row.name}</td>
              <td className="px-3 py-2">{row.phone}</td>
              <td className="px-3 py-2">{row.source}</td>
              <td className="px-3 py-2">{service}</td>
              <td className="px-3 py-2">{row.score ? row.score.score : "—"}</td>
              <td className="px-3 py-2">{row.score ? row.score.effectiveClass : "—"}</td>
              <td className="px-3 py-2">{row.status}</td>
              <td className="px-3 py-2">{row.createdAt.toISOString().slice(0, 10)}</td>
              <td className="px-3 py-2">
                <a className="text-navy" href={`/admin/leads/${row.id}`}>
                  Open
                </a>
              </td>
            </tr>
          );
        })}
      </AdminTable>
    </div>
  );
}
