import type { AutomationTrigger } from "@prisma/client";
import { prisma } from "@/server/db";
import { adminAudit } from "@/lib/admin/numbers";
import { parseJson } from "@/lib/utils";
import {
  ALLOWED_ACTIONS,
  AUTOMATION_TRIGGERS,
  CONDITION_FIELDS,
  CONDITION_OPS,
  FORBIDDEN_ACTIONS,
  isTrigger,
  type AutomationAction,
  type AutomationCondition,
} from "@/lib/automation/types";

export type RuleInput = {
  key: string;
  name: string;
  description: string;
  enabled: boolean;
  priority: number;
  trigger: AutomationTrigger;
  delaySeconds: number;
  conditionsJson: string;
  actionsJson: string;
};

export function parseRuleForm(form: {
  key: string;
  name: string;
  description: string;
  enabled: boolean;
  priority: string;
  trigger: string;
  delaySeconds: string;
  conditionsJson: string;
  actionsJson: string;
}): { ok: true; data: RuleInput } | { ok: false; error: string } {
  const key = form.key.trim().toLowerCase().replace(/[^a-z0-9-]/g, "-").slice(0, 80);
  const name = form.name.trim().slice(0, 120);
  if (!key || !name) return { ok: false, error: "required" };
  if (!isTrigger(form.trigger)) return { ok: false, error: "trigger" };
  const conditions = parseJson<AutomationCondition[]>(form.conditionsJson || "[]", []);
  const actions = parseJson<AutomationAction[]>(form.actionsJson || "[]", []);
  if (!Array.isArray(conditions) || !Array.isArray(actions)) return { ok: false, error: "json" };
  for (const condition of conditions) {
    if (!CONDITION_FIELDS.includes(condition.field as (typeof CONDITION_FIELDS)[number])) return { ok: false, error: "condition" };
    if (!CONDITION_OPS.includes(condition.op)) return { ok: false, error: "condition" };
  }
  if (!actions.length) return { ok: false, error: "actions" };
  for (const action of actions) {
    if (FORBIDDEN_ACTIONS.includes(action.type as (typeof FORBIDDEN_ACTIONS)[number])) return { ok: false, error: "forbidden" };
    if (!ALLOWED_ACTIONS.includes(action.type as (typeof ALLOWED_ACTIONS)[number])) return { ok: false, error: "action" };
  }
  const priority = Number(form.priority);
  const delaySeconds = Number(form.delaySeconds);
  return {
    ok: true,
    data: {
      key,
      name,
      description: form.description.trim().slice(0, 400),
      enabled: form.enabled,
      priority: Number.isFinite(priority) ? Math.trunc(priority) : 100,
      trigger: form.trigger,
      delaySeconds: Number.isFinite(delaySeconds) ? Math.max(0, Math.trunc(delaySeconds)) : 0,
      conditionsJson: JSON.stringify(conditions),
      actionsJson: JSON.stringify(actions),
    },
  };
}

export async function saveAutomationRule(opts: {
  id?: string;
  input: RuleInput;
  actorEmail: string;
  actorId: string;
}) {
  if (opts.id) {
    const existing = await prisma.automationRule.findUnique({ where: { id: opts.id } });
    if (!existing) return null;
    const row = await prisma.automationRule.update({
      where: { id: opts.id },
      data: {
        name: opts.input.name,
        description: opts.input.description,
        enabled: opts.input.enabled,
        priority: opts.input.priority,
        trigger: opts.input.trigger,
        delaySeconds: opts.input.delaySeconds,
        conditionsJson: opts.input.conditionsJson,
        actionsJson: opts.input.actionsJson,
        updatedBy: opts.actorEmail,
      },
    });
    await adminAudit({
      actor: opts.actorEmail,
      action: existing.enabled !== row.enabled ? (row.enabled ? "automation.rule.enable" : "automation.rule.disable") : "automation.rule.update",
      entity: "AutomationRule",
      entityId: row.id,
      meta: { key: row.key, enabled: row.enabled },
    });
    return row;
  }
  const row = await prisma.automationRule.create({
    data: {
      key: opts.input.key,
      name: opts.input.name,
      description: opts.input.description,
      enabled: false,
      priority: opts.input.priority,
      trigger: opts.input.trigger,
      delaySeconds: opts.input.delaySeconds,
      conditionsJson: opts.input.conditionsJson,
      actionsJson: opts.input.actionsJson,
      ownerUserId: opts.actorId,
      updatedBy: opts.actorEmail,
    },
  });
  await adminAudit({
    actor: opts.actorEmail,
    action: "automation.rule.create",
    entity: "AutomationRule",
    entityId: row.id,
    meta: { key: row.key, enabled: false },
  });
  return row;
}

export const TRIGGER_OPTIONS = AUTOMATION_TRIGGERS.map((value) => ({
  value,
  label: value === "QNA_RECEIVED" ? "Q&A_RECEIVED" : value,
}));
