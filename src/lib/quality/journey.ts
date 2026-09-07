import { prisma } from "@/server/db";

export type JourneySummary = {
  visitorId: string | null;
  optedOut: boolean;
  firstVisit: Date | null;
  lastVisit: Date | null;
  counts: Array<{ name: string; count: number }>;
};

export async function visitorJourneySummary(visitorId: string | null): Promise<JourneySummary> {
  if (!visitorId) {
    return { visitorId: null, optedOut: false, firstVisit: null, lastVisit: null, counts: [] };
  }
  const visitor = await prisma.visitor.findUnique({
    where: { id: visitorId },
    select: { id: true, optedOut: true, createdAt: true, lastSeenAt: true },
  });
  if (!visitor) {
    return { visitorId, optedOut: false, firstVisit: null, lastVisit: null, counts: [] };
  }
  if (visitor.optedOut) {
    return {
      visitorId,
      optedOut: true,
      firstVisit: visitor.createdAt,
      lastVisit: visitor.lastSeenAt,
      counts: [],
    };
  }
  const events = await prisma.analyticsEvent.groupBy({
    by: ["name"],
    where: { visitorId },
    _count: { name: true },
  });
  return {
    visitorId,
    optedOut: false,
    firstVisit: visitor.createdAt,
    lastVisit: visitor.lastSeenAt,
    counts: events
      .map((row) => ({ name: row.name, count: row._count.name }))
      .sort((a, b) => b.count - a.count),
  };
}
