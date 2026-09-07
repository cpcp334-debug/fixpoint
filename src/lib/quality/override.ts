import type { LeadQualityClass } from "@prisma/client";
import { prisma } from "@/server/db";
import { canManageLeadSpam, canOverrideLeadQuality } from "@/lib/admin/rbac";
import { isQualityClass } from "@/lib/quality/signals";

export async function overrideLeadQuality(opts: {
  leadId: string;
  class: string;
  note: string;
  actorEmail: string;
  actorRole: string;
}) {
  const note = opts.note.trim();
  if (note.length < 3) return { ok: false as const, error: "note" as const };
  if (!isQualityClass(opts.class)) return { ok: false as const, error: "class" as const };
  if (!canOverrideLeadQuality(opts.actorRole)) return { ok: false as const, error: "forbidden" as const };

  const lead = await prisma.lead.findUnique({ where: { id: opts.leadId }, include: { score: true } });
  if (!lead || !lead.score) return { ok: false as const, error: "missing" as const };

  const next = opts.class as LeadQualityClass;
  const fromSpam = lead.score.effectiveClass === "SPAM" || lead.score.quarantined;
  const toSpam = next === "SPAM";
  if ((fromSpam || toSpam) && !canManageLeadSpam(opts.actorRole)) {
    return { ok: false as const, error: "spam" as const };
  }

  const now = new Date();
  await prisma.leadScore.update({
    where: { id: lead.score.id },
    data: {
      humanClass: next,
      effectiveClass: next,
      quarantined: next === "SPAM",
      overrideAt: now,
      overrideBy: opts.actorEmail,
      overrideNote: note,
    },
  });
  await prisma.leadScoreHistory.create({
    data: {
      leadScoreId: lead.score.id,
      leadId: lead.id,
      score: lead.score.score,
      systemClass: lead.score.systemClass,
      effectiveClass: next,
      reasonsJson: lead.score.reasonsJson,
      actor: opts.actorEmail,
      cause: "OVERRIDE",
      note,
    },
  });
  await prisma.auditLog.create({
    data: {
      actor: opts.actorEmail,
      action: "lead.quality.override",
      entity: "Lead",
      entityId: lead.id,
      meta: JSON.stringify({
        from: lead.score.effectiveClass,
        to: next,
        systemClass: lead.score.systemClass,
      }),
    },
  });
  return { ok: true as const };
}
