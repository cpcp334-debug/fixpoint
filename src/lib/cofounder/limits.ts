import { prisma } from "@/server/db";
import { BUSINESS_TZ } from "@/lib/insights/dates";

export const DEFAULT_COFOUNDER_DAILY_CHAT_LIMIT = 100;

function dubaiDayKey(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: BUSINESS_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

/** Safe server setting: env COFOUNDER_DAILY_CHAT_LIMIT, else SiteSetting.json.cofounderDailyChatLimit, else 100. */
export async function resolveCofounderDailyChatLimit() {
  const fromEnv = Number(process.env.COFOUNDER_DAILY_CHAT_LIMIT);
  if (Number.isFinite(fromEnv) && fromEnv > 0) return Math.min(10_000, Math.trunc(fromEnv));
  try {
    const row = await prisma.siteSetting.findUnique({ where: { id: "site" } });
    if (row?.json) {
      const parsed = JSON.parse(row.json) as { cofounderDailyChatLimit?: unknown };
      const value = Number(parsed.cofounderDailyChatLimit);
      if (Number.isFinite(value) && value > 0) return Math.min(10_000, Math.trunc(value));
    }
  } catch {
    /* keep default */
  }
  return DEFAULT_COFOUNDER_DAILY_CHAT_LIMIT;
}

export async function getCofounderDailyUsage(userId: string, now = new Date()) {
  const dayKey = dubaiDayKey(now);
  const limit = await resolveCofounderDailyChatLimit();
  const row = await prisma.staffAiDailyUsage.findUnique({
    where: { userId_dayKey: { userId, dayKey } },
    select: { count: true },
  });
  const used = row?.count || 0;
  return {
    dayKey,
    timezone: BUSINESS_TZ,
    used,
    limit,
    remaining: Math.max(0, limit - used),
    ok: used < limit,
  };
}

/** Atomically consume one chat slot for the Asia/Dubai calendar day. */
export async function consumeCofounderDailyChat(userId: string, now = new Date()) {
  const dayKey = dubaiDayKey(now);
  const limit = await resolveCofounderDailyChatLimit();
  const existing = await prisma.staffAiDailyUsage.findUnique({
    where: { userId_dayKey: { userId, dayKey } },
    select: { id: true, count: true },
  });
  if (existing && existing.count >= limit) {
    return { ok: false as const, dayKey, timezone: BUSINESS_TZ, used: existing.count, limit, remaining: 0 };
  }
  if (!existing) {
    try {
      const created = await prisma.staffAiDailyUsage.create({
        data: { userId, dayKey, count: 1 },
        select: { count: true },
      });
      return {
        ok: true as const,
        dayKey,
        timezone: BUSINESS_TZ,
        used: created.count,
        limit,
        remaining: Math.max(0, limit - created.count),
      };
    } catch {
      const raced = await prisma.staffAiDailyUsage.findUnique({
        where: { userId_dayKey: { userId, dayKey } },
        select: { count: true },
      });
      if (raced && raced.count >= limit) {
        return { ok: false as const, dayKey, timezone: BUSINESS_TZ, used: raced.count, limit, remaining: 0 };
      }
    }
  }
  const updated = await prisma.staffAiDailyUsage.updateMany({
    where: { userId, dayKey, count: { lt: limit } },
    data: { count: { increment: 1 } },
  });
  if (updated.count !== 1) {
    const fresh = await getCofounderDailyUsage(userId, now);
    return {
      ok: false as const,
      dayKey: fresh.dayKey,
      timezone: fresh.timezone,
      used: fresh.used,
      limit: fresh.limit,
      remaining: fresh.remaining,
    };
  }
  const after = await getCofounderDailyUsage(userId, now);
  return {
    ok: true as const,
    dayKey: after.dayKey,
    timezone: after.timezone,
    used: after.used,
    limit: after.limit,
    remaining: after.remaining,
  };
}
