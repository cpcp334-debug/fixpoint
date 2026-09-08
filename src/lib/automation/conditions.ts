import { CONDITION_FIELDS, CONDITION_OPS, type AutomationCondition, type ConditionDetail } from "@/lib/automation/types";
import type { SubjectFacts } from "@/lib/automation/subject";

export function parseConditions(raw: string): AutomationCondition[] {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((row): row is AutomationCondition => {
      if (!row || typeof row !== "object") return false;
      const item = row as AutomationCondition;
      return typeof item.field === "string" && typeof item.op === "string";
    });
  } catch {
    return [];
  }
}

export function evaluateConditions(conditions: AutomationCondition[], facts: SubjectFacts | null): {
  passed: boolean;
  details: ConditionDetail[];
} {
  if (!conditions.length) return { passed: true, details: [] };
  if (!facts) {
    return {
      passed: false,
      details: [{ field: "*", op: "exists", passed: false, reason: "subject_missing" }],
    };
  }

  const details: ConditionDetail[] = [];
  let passed = true;
  for (const condition of conditions) {
    const detail = evaluateOne(condition, facts);
    details.push(detail);
    if (!detail.passed) passed = false;
  }
  return { passed, details };
}

function evaluateOne(condition: AutomationCondition, facts: SubjectFacts): ConditionDetail {
  if (!(CONDITION_OPS as readonly string[]).includes(condition.op)) {
    return { field: condition.field, op: condition.op, passed: false, reason: "unknown_op" };
  }
  if (!(CONDITION_FIELDS as readonly string[]).includes(condition.field)) {
    return { field: condition.field, op: condition.op, passed: false, reason: "unknown_field" };
  }
  const actual = facts[condition.field];
  if (condition.op === "exists") {
    const exists = actual !== null && actual !== undefined && actual !== "";
    return { field: condition.field, op: condition.op, passed: exists };
  }
  if (condition.op === "eq") {
    return { field: condition.field, op: condition.op, passed: stringify(actual) === stringify(condition.value) };
  }
  if (condition.op === "neq") {
    return { field: condition.field, op: condition.op, passed: stringify(actual) !== stringify(condition.value) };
  }
  if (condition.op === "in") {
    const list = Array.isArray(condition.value) ? condition.value.map(stringify) : [];
    return { field: condition.field, op: condition.op, passed: list.includes(stringify(actual)) };
  }
  const left = Number(actual);
  const right = Number(condition.value);
  if (!Number.isFinite(left) || !Number.isFinite(right)) {
    return { field: condition.field, op: condition.op, passed: false, reason: "not_numeric" };
  }
  if (condition.op === "lte") return { field: condition.field, op: condition.op, passed: left <= right };
  return { field: condition.field, op: condition.op, passed: left >= right };
}

function stringify(value: unknown) {
  if (value === null || value === undefined) return "";
  if (typeof value === "boolean") return value ? "true" : "false";
  return String(value);
}
