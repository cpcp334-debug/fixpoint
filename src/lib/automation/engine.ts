import type { AutomationJob, AutomationRule } from "@prisma/client";
import { prisma } from "@/server/db";
import { executeAction } from "@/lib/automation/actions";
import { evaluateConditions, parseConditions } from "@/lib/automation/conditions";
import { enqueueDomainEvent } from "@/lib/automation/enqueue";
import { sanitizeError } from "@/lib/automation/privacy";
import { nextRunAt } from "@/lib/automation/retry";
import { loadSubjectFacts } from "@/lib/automation/subject";
import type { ActionResult, AutomationAction } from "@/lib/automation/types";

export function parseActions(raw: string): AutomationAction[] {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((row): row is AutomationAction => Boolean(row && typeof row === "object" && typeof (row as AutomationAction).type === "string"));
  } catch {
    return [];
  }
}

export async function processJob(job: AutomationJob) {
  const attempt = job.attempt + 1;
  try {
    if (job.ruleId) {
      const rule = await prisma.automationRule.findUnique({ where: { id: job.ruleId } });
      if (!rule || !rule.enabled) {
        await finishJob(job, attempt, "succeeded", "");
        return { ok: true as const, skipped: true as const };
      }
      const result = await executeRule(job, rule, attempt);
      await finishFromResults(job, attempt, [result]);
      return result;
    }

    const rules = await prisma.automationRule.findMany({
      where: { enabled: true, trigger: job.trigger },
      orderBy: [{ priority: "asc" }, { createdAt: "asc" }],
    });
    if (!rules.length) {
      await finishJob(job, attempt, "succeeded", "");
      return { ok: true as const, skipped: true as const };
    }

    const results = [];
    for (const rule of rules) {
      if (rule.delaySeconds > 0) {
        const delayMs = rule.delaySeconds * 1000;
        const readyAt = new Date(job.createdAt.getTime() + delayMs);
        if (readyAt > new Date()) {
          await enqueueDomainEvent({
            trigger: job.trigger,
            subjectType: job.subjectType,
            subjectId: job.subjectId,
            occurrenceKey: `${job.idempotencyKey}:delayed`,
            delaySeconds: Math.max(1, Math.ceil((readyAt.getTime() - Date.now()) / 1000)),
            ruleId: rule.id,
            payload: {},
          });
          continue;
        }
      }
      results.push(await executeRule(job, rule, attempt));
    }
    await finishFromResults(job, attempt, results);
    return { ok: !results.some((row) => row.retryable) };
  } catch (error) {
    await failJob(job, attempt, sanitizeError(error), true);
    return { ok: false as const, error: sanitizeError(error) };
  }
}

async function executeRule(job: AutomationJob, rule: AutomationRule, attempt: number) {
  const facts = await loadSubjectFacts(job.subjectType, job.subjectId);
  if (job.trigger === "QUOTE_SENT" && facts?.status === "ACCEPTED") {
    await recordRun(job, rule, attempt, {
      conditionPassed: false,
      conditionDetailJson: JSON.stringify([{ field: "status", op: "neq", passed: false, reason: "quote_accepted" }]),
      actionsJson: "[]",
      ok: true,
      error: "quote_accepted",
    });
    return { ok: true as const, conditionPassed: false };
  }
  if (job.trigger === "LOW_RATING_REVIEW") {
    const stars = Number(facts?.stars);
    if (!Number.isFinite(stars) || stars > 2) {
      await recordRun(job, rule, attempt, {
        conditionPassed: false,
        conditionDetailJson: JSON.stringify([{ field: "stars", op: "lte", passed: false, reason: "not_low_rating" }]),
        actionsJson: "[]",
        ok: true,
        error: "not_low_rating",
      });
      return { ok: true as const, conditionPassed: false };
    }
  }
  if (job.trigger === "INVOICE_ISSUED" && facts?.status !== "ISSUED") {
    await recordRun(job, rule, attempt, {
      conditionPassed: false,
      conditionDetailJson: JSON.stringify([{ field: "status", op: "eq", passed: false, reason: "invoice_not_issued" }]),
      actionsJson: "[]",
      ok: true,
      error: "invoice_not_issued",
    });
    return { ok: true as const, conditionPassed: false };
  }
  if (job.trigger === "INVOICE_PAID" && facts?.status !== "PAID") {
    await recordRun(job, rule, attempt, {
      conditionPassed: false,
      conditionDetailJson: JSON.stringify([{ field: "status", op: "eq", passed: false, reason: "invoice_not_paid" }]),
      actionsJson: "[]",
      ok: true,
      error: "invoice_not_paid",
    });
    return { ok: true as const, conditionPassed: false };
  }
  if (job.trigger === "AMC_RENEWAL_APPROACHING" && facts?.status && facts.status !== "active") {
    await recordRun(job, rule, attempt, {
      conditionPassed: false,
      conditionDetailJson: JSON.stringify([{ field: "status", op: "eq", passed: false, reason: "amc_inactive" }]),
      actionsJson: "[]",
      ok: true,
      error: "amc_inactive",
    });
    return { ok: true as const, conditionPassed: false };
  }
  const conditions = parseConditions(rule.conditionsJson);
  const evaluated = evaluateConditions(conditions, facts);
  if (!evaluated.passed) {
    await recordRun(job, rule, attempt, {
      conditionPassed: false,
      conditionDetailJson: JSON.stringify(evaluated.details),
      actionsJson: "[]",
      ok: true,
      error: evaluated.details.find((row) => row.reason)?.reason || "",
    });
    return { ok: true as const, conditionPassed: false };
  }

  const actions = parseActions(rule.actionsJson);
  const results: ActionResult[] = [];
  for (const [index, action] of actions.entries()) {
    results.push(
      await executeAction({
        action,
        index,
        ruleKey: rule.key,
        ruleId: rule.id,
        subjectType: job.subjectType,
        subjectId: job.subjectId,
        occurrence: job.idempotencyKey,
        facts: facts || {},
      }),
    );
  }

  const retryable = results.some((row) => row.status === "failed" && row.retryable);
  const permanentFail = results.some((row) => row.status === "failed" && !row.retryable);
  await recordRun(job, rule, attempt, {
    conditionPassed: true,
    conditionDetailJson: JSON.stringify(evaluated.details),
    actionsJson: JSON.stringify(results),
    ok: !retryable && !permanentFail,
    error: results.find((row) => row.status === "failed")?.error || "",
  });

  const assigned = results.find((row) => row.type === "ASSIGN_STAFF" && row.status === "success" && row.resultRef);
  if (assigned?.resultRef) {
    await prisma.auditLog.create({
      data: {
        actor: `automation:${rule.key}`,
        action: "automation.assign",
        entity: job.subjectType,
        entityId: job.subjectId,
        meta: JSON.stringify({ staffId: assigned.resultRef, ruleKey: rule.key }),
      },
    });
  }

  return { ok: !retryable, retryable, permanentFail };
}

async function recordRun(
  job: AutomationJob,
  rule: AutomationRule,
  attempt: number,
  data: { conditionPassed: boolean; conditionDetailJson: string; actionsJson: string; ok: boolean; error: string },
) {
  await prisma.automationRun.create({
    data: {
      jobId: job.id,
      ruleId: rule.id,
      trigger: job.trigger,
      subjectType: job.subjectType,
      subjectId: job.subjectId,
      attempt,
      ...data,
      error: data.error.slice(0, 300),
    },
  });
}

async function finishFromResults(job: AutomationJob, attempt: number, results: Array<{ ok?: boolean; retryable?: boolean }>) {
  const retryable = results.some((row) => row.retryable);
  if (retryable) {
    await failJob(job, attempt, "retryable_action", true);
    return;
  }
  await finishJob(job, attempt, "succeeded", "");
}

async function finishJob(job: AutomationJob, attempt: number, status: "succeeded" | "dead", lastError: string) {
  await prisma.automationJob.update({
    where: { id: job.id },
    data: { status, attempt, lastError, runAt: job.runAt, startedAt: null },
  });
}

async function failJob(job: AutomationJob, attempt: number, lastError: string, retryable: boolean) {
  if (!retryable || attempt >= job.maxAttempts) {
    await prisma.automationJob.update({
      where: { id: job.id },
      data: { status: "dead", attempt, lastError, startedAt: null },
    });
    return;
  }
  await prisma.automationJob.update({
    where: { id: job.id },
    data: {
      status: "failed",
      attempt,
      lastError,
      runAt: nextRunAt(attempt),
      startedAt: null,
    },
  });
}

export async function retryJob(jobId: string) {
  const job = await prisma.automationJob.findUnique({ where: { id: jobId } });
  if (!job) return { ok: false as const, error: "missing" as const };
  if (job.status !== "failed" && job.status !== "dead") return { ok: false as const, error: "not_retryable" as const };
  await prisma.automationJob.update({
    where: { id: jobId },
    data: { status: "pending", runAt: new Date(), lastError: "", attempt: 0 },
  });
  return { ok: true as const };
}
