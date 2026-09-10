import type { EngineIssue } from "../config/types";

export type AuditEvent = {
  at: string;
  action: string;
  contentKey?: string;
  detail?: string;
  issues?: EngineIssue[];
};

const auditLog: AuditEvent[] = [];

export function audit(action: string, opts: Omit<AuditEvent, "at" | "action"> = {}) {
  const event: AuditEvent = { at: new Date().toISOString(), action, ...opts };
  auditLog.push(event);
  return event;
}

export function listAudit() {
  return [...auditLog];
}

export function clearAudit() {
  auditLog.length = 0;
}
