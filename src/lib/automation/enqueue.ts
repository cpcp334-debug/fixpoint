import { Prisma } from "@prisma/client";
import { prisma } from "@/server/db";
import { sanitizeAutomationPayload, sanitizeError } from "@/lib/automation/privacy";
import { defaultSubjectType, type DomainEventInput } from "@/lib/automation/types";

export function jobIdempotencyKey(input: DomainEventInput) {
  const occurrence = input.occurrenceKey || input.occurredAt?.toISOString() || "once";
  const rulePart = input.ruleId ? `:rule:${input.ruleId}` : "";
  return `${input.trigger}:${input.subjectType}:${input.subjectId}:${occurrence}${rulePart}`;
}

export async function enqueueDomainEvent(input: DomainEventInput) {
  try {
    const subjectType = input.subjectType || defaultSubjectType(input.trigger);
    const payload = sanitizeAutomationPayload(input.payload || {});
    const delaySeconds = Math.max(0, input.delaySeconds || 0);
    const runAt = new Date(Date.now() + delaySeconds * 1000);
    const idempotencyKey = jobIdempotencyKey({ ...input, subjectType });
    const existing = await prisma.automationJob.findUnique({ where: { idempotencyKey } });
    if (existing) return { ok: true as const, jobId: existing.id, duplicate: true };
    const job = await prisma.automationJob.create({
      data: {
        trigger: input.trigger,
        subjectType,
        subjectId: input.subjectId,
        payloadJson: JSON.stringify(payload),
        runAt,
        idempotencyKey,
        ruleId: input.ruleId || null,
        maxAttempts: input.maxAttempts || 3,
      },
    });
    return { ok: true as const, jobId: job.id, duplicate: false };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const subjectType = input.subjectType || defaultSubjectType(input.trigger);
      const idempotencyKey = jobIdempotencyKey({ ...input, subjectType });
      const existing = await prisma.automationJob.findUnique({ where: { idempotencyKey } });
      if (existing) return { ok: true as const, jobId: existing.id, duplicate: true };
    }
    return { ok: false as const, error: sanitizeError(error) };
  }
}

/** Never throws. Public writers in later slices must use this after a successful business commit. */
export async function enqueueDomainEventSafe(input: DomainEventInput) {
  try {
    return await enqueueDomainEvent(input);
  } catch (error) {
    return { ok: false as const, error: sanitizeError(error) };
  }
}

export async function actionIdempotencyKey(opts: {
  ruleKey: string;
  actionType: string;
  index: number;
  subjectType: string;
  subjectId: string;
  occurrence: string;
}) {
  return `${opts.ruleKey}:${opts.actionType}:${opts.index}:${opts.subjectType}:${opts.subjectId}:${opts.occurrence}`;
}
