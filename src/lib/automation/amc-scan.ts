import { prisma } from "@/server/db";
import { adminAudit } from "@/lib/admin/numbers";
import { emitDomainEventSafe } from "@/lib/automation/emit";

export const DEFAULT_AMC_WINDOW_DAYS = 30;
const SCAN_LIMIT = 50;

/** Dubai has no DST (UTC+4). Instant comparisons stay correct for stored DateTimes. */
export function businessNow() {
  return new Date();
}

export function amcRenewalWindowDays() {
  const raw = Number(process.env.AMC_RENEWAL_WINDOW_DAYS);
  if (!Number.isFinite(raw)) return DEFAULT_AMC_WINDOW_DAYS;
  return Math.min(90, Math.max(1, Math.trunc(raw)));
}

export function amcOccurrenceKey(endDate: Date, windowDays: number) {
  return `renewal:${windowDays}:${endDate.toISOString().slice(0, 10)}`;
}

export async function scanAmcRenewals(opts?: { now?: Date; windowDays?: number; take?: number }) {
  const now = opts?.now || businessNow();
  const windowDays = opts?.windowDays || amcRenewalWindowDays();
  const take = Math.min(SCAN_LIMIT, Math.max(1, opts?.take || SCAN_LIMIT));
  const until = new Date(now.getTime() + windowDays * 24 * 60 * 60 * 1000);
  const rows = await prisma.amcContract.findMany({
    where: {
      status: "active",
      endDate: { gte: now, lte: until },
    },
    orderBy: { endDate: "asc" },
    take,
    select: { id: true, endDate: true, status: true },
  });

  let emitted = 0;
  let duplicates = 0;
  for (const row of rows) {
    if (!row.endDate) continue;
    const result = await emitDomainEventSafe({
      trigger: "AMC_RENEWAL_APPROACHING",
      subjectType: "AmcContract",
      subjectId: row.id,
      occurrenceKey: amcOccurrenceKey(row.endDate, windowDays),
      payload: {
        windowDays,
        endDate: row.endDate.toISOString().slice(0, 10),
        status: row.status,
      },
    });
    if (result.ok && "duplicate" in result && result.duplicate) duplicates += 1;
    else if (result.ok) emitted += 1;
  }

  await adminAudit({
    actor: "system",
    action: "amc.renewal_scan",
    entity: "AmcContract",
    meta: { scanned: rows.length, emitted, duplicates, windowDays },
  }).catch(() => undefined);

  return { scanned: rows.length, emitted, duplicates, windowDays };
}
