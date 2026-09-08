import type { LeadQualityClass, LeadScoreCause } from "@prisma/client";
import { prisma } from "@/server/db";
import { parseJson } from "@/lib/utils";
import { MODEL_VERSION } from "@/lib/quality/signals";
import { buildReasons, classify, scoreFromReasons } from "@/lib/quality/score";
import { emitDomainEventSafe } from "@/lib/automation/emit";

export async function scoreLeadSafe(leadId: string, cause: LeadScoreCause = "SYSTEM") {
  try {
    await scoreLead(leadId, { actor: "system", cause });
  } catch {
    // Quality must never fail a public write.
  }
}

export async function scoreLead(
  leadId: string,
  opts: { actor: string; cause: LeadScoreCause; note?: string } = { actor: "system", cause: "SYSTEM" },
) {
  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    include: { score: true, bookings: { select: { id: true } } },
  });
  if (!lead) return null;

  const sinceBurst = new Date(Date.now() - 10 * 60 * 1000);
  const sinceDay = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const visitor = lead.visitorId
    ? await prisma.visitor.findUnique({
        where: { id: lead.visitorId },
        select: { optedOut: true },
      })
    : null;

  const [duplicateRequirementCount, burstCount, events] = await Promise.all([
    prisma.lead.count({
      where: {
        id: { not: lead.id },
        requirement: lead.requirement,
        createdAt: { gt: sinceDay },
      },
    }),
    prisma.lead.count({
      where: {
        createdAt: { gt: sinceBurst },
        OR: [{ phone: lead.phone }, ...(lead.visitorId ? [{ visitorId: lead.visitorId }] : [])],
      },
    }),
    lead.visitorId && visitor && !visitor.optedOut
      ? prisma.analyticsEvent.findMany({
          where: { visitorId: lead.visitorId },
          orderBy: { createdAt: "desc" },
          take: 200,
          select: { name: true },
        })
      : Promise.resolve([]),
  ]);

  const reasons = buildReasons({
    phone: lead.phone,
    email: lead.email,
    requirement: lead.requirement,
    serviceId: lead.serviceId,
    locationId: lead.locationId,
    city: lead.city,
    area: lead.area,
    propertyType: lead.propertyType,
    source: lead.source,
    photos: lead.photos,
    hasBooking: lead.bookings.length > 0,
    eventNames: events.map((event) => event.name),
    duplicateRequirementCount,
    burstCount,
  });
  const score = scoreFromReasons(reasons);
  const systemClass = classify(score, reasons) as LeadQualityClass;
  const previousClass = lead.score?.effectiveClass ?? null;
  const humanClass = lead.score?.humanClass ?? null;
  const effectiveClass = (humanClass || systemClass) as LeadQualityClass;
  const quarantined = effectiveClass === "SPAM";
  const reasonsJson = JSON.stringify(reasons);
  const cause: LeadScoreCause = lead.score ? "RECOMPUTE" : opts.cause;

  const row = await prisma.leadScore.upsert({
    where: { leadId: lead.id },
    create: {
      leadId: lead.id,
      score,
      systemClass,
      humanClass,
      effectiveClass,
      reasonsJson,
      modelVersion: MODEL_VERSION,
      computedAt: new Date(),
      overrideAt: lead.score?.overrideAt,
      overrideBy: lead.score?.overrideBy,
      overrideNote: lead.score?.overrideNote || "",
      quarantined,
    },
    update: {
      score,
      systemClass,
      effectiveClass,
      reasonsJson,
      modelVersion: MODEL_VERSION,
      computedAt: new Date(),
      quarantined,
    },
  });

  const history = await prisma.leadScoreHistory.create({
    data: {
      leadScoreId: row.id,
      leadId: lead.id,
      score,
      systemClass,
      effectiveClass,
      reasonsJson,
      actor: opts.actor,
      cause: lead.score && opts.cause === "SYSTEM" ? "RECOMPUTE" : cause,
      note: opts.note || "",
    },
  });

  await prisma.auditLog.create({
    data: {
      actor: opts.actor,
      action: lead.score ? "lead.quality.recompute" : "lead.quality.score",
      entity: "Lead",
      entityId: lead.id,
      meta: JSON.stringify({ score, systemClass, effectiveClass, modelVersion: MODEL_VERSION }),
    },
  });

  if (previousClass !== "HOT" && effectiveClass === "HOT") {
    await emitDomainEventSafe({
      trigger: "HOT_LEAD",
      subjectId: lead.id,
      occurrenceKey: history.id,
    });
  }

  return { score, systemClass, effectiveClass, reasons: parseJson(reasonsJson, reasons), quarantined };
}
