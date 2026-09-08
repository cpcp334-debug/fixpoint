import type { AutomationTrigger } from "@prisma/client";
import { enqueueDomainEventSafe } from "@/lib/automation/enqueue";
import { defaultSubjectType } from "@/lib/automation/types";
import { prisma } from "@/server/db";

/** After a successful business commit. Never throws. */
export async function emitDomainEventSafe(opts: {
  trigger: AutomationTrigger;
  subjectId: string;
  subjectType?: string;
  occurrenceKey: string;
  payload?: Record<string, unknown>;
}) {
  try {
    const subjectType = opts.subjectType || defaultSubjectType(opts.trigger);
    const result = await enqueueDomainEventSafe({
      trigger: opts.trigger,
      subjectType,
      subjectId: opts.subjectId,
      occurrenceKey: opts.occurrenceKey,
      payload: opts.payload,
    });
    if (result.ok && !("duplicate" in result && result.duplicate)) {
      await prisma.auditLog.create({
        data: {
          actor: "system",
          action: "automation.emit",
          entity: subjectType,
          entityId: opts.subjectId,
          meta: JSON.stringify({ trigger: opts.trigger }),
        },
      }).catch(() => undefined);
    }
    return result;
  } catch {
    return { ok: false as const, error: "emit_failed" };
  }
}
