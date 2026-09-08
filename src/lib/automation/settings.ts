export const DEFAULT_AUTOMATION_STALE_RUNNING_MINUTES = 15;
export const MIN_AUTOMATION_STALE_RUNNING_MINUTES = 5;

/** Env AUTOMATION_STALE_RUNNING_MINUTES → default 15, floor 5. */
export function resolveStaleRunningMinutes(env: Record<string, string | undefined> = process.env) {
  const raw = Number(env.AUTOMATION_STALE_RUNNING_MINUTES);
  if (!Number.isFinite(raw) || raw <= 0) return DEFAULT_AUTOMATION_STALE_RUNNING_MINUTES;
  return Math.max(MIN_AUTOMATION_STALE_RUNNING_MINUTES, Math.min(24 * 60, Math.trunc(raw)));
}

export function staleRunningCutoff(now = new Date(), env: Record<string, string | undefined> = process.env) {
  const minutes = resolveStaleRunningMinutes(env);
  return new Date(now.getTime() - minutes * 60_000);
}
