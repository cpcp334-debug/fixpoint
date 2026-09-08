const BACKOFF_MS = [60_000, 5 * 60_000, 25 * 60_000];

export function retryDelayMs(attempt: number) {
  const index = Math.max(0, Math.min(BACKOFF_MS.length - 1, attempt - 1));
  return BACKOFF_MS[index];
}

export function nextRunAt(attempt: number, from = new Date()) {
  return new Date(from.getTime() + retryDelayMs(attempt));
}
