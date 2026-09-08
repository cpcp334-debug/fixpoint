/**
 * Trusted-proxy client IP resolution.
 * Never trust leftmost X-Forwarded-For blindly.
 *
 * Production default (TRUST_PROXY unset/disabled): ignore X-Forwarded-For and X-Real-IP → "unknown".
 * Only when TRUST_PROXY=1 and TRUSTED_PROXY_HOPS >= 1: take the N-th address from the right of XFF.
 */

export type EnvLike = Record<string, string | undefined>;

export function trustedProxyEnabled(env: EnvLike = process.env) {
  if (env.TRUST_PROXY !== "1") return false;
  const hops = Number(env.TRUSTED_PROXY_HOPS);
  return Number.isFinite(hops) && hops >= 1;
}

export function trustedProxyHops(env: EnvLike = process.env) {
  const hops = Number(env.TRUSTED_PROXY_HOPS);
  if (!Number.isFinite(hops) || hops < 1) return 0;
  return Math.min(10, Math.trunc(hops));
}

function sanitizeIp(raw: string) {
  const value = raw.trim().replace(/^\[|\]$/g, "");
  if (!value || value.length > 64) return "unknown";
  // Basic shape check — reject header injection / garbage
  if (!/^[0-9a-fA-F.:]+$/.test(value)) return "unknown";
  return value;
}

/**
 * Resolve client IP for rate limiting.
 * Does not log or return forwarded header chains.
 */
export function resolveClientIp(headers: Headers, env: EnvLike = process.env): string {
  if (!trustedProxyEnabled(env)) {
    return "unknown";
  }

  const hops = trustedProxyHops(env);
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    const parts = forwarded
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean);
    const index = parts.length - hops;
    if (index >= 0 && index < parts.length) {
      return sanitizeIp(parts[index]!);
    }
    return "unknown";
  }

  const realIp = headers.get("x-real-ip");
  if (realIp) return sanitizeIp(realIp);
  return "unknown";
}
