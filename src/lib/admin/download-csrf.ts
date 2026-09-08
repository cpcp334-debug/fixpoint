import { createHmac, timingSafeEqual } from "node:crypto";
import type { StaffSession } from "@/lib/admin/auth";

export const DOWNLOAD_CSRF_TTL_MS = 15 * 60 * 1000;
const MIN_SECRET_LEN = 32;

export type CsrfFailure =
  | "missing_secret"
  | "missing_token"
  | "invalid_token"
  | "expired"
  | "user_mismatch"
  | "cross_site";

export type CsrfEnv = Record<string, string | undefined>;

function readSecret(env: CsrfEnv = process.env) {
  return (env.DOWNLOAD_CSRF_SECRET || "").trim();
}

export function downloadCsrfSecretConfigured(env: CsrfEnv = process.env) {
  return readSecret(env).length >= MIN_SECRET_LEN;
}

/** Fail closed in production when secret missing/too short. Never logs the secret. */
export function assertDownloadCsrfSecret(env: CsrfEnv = process.env): { ok: true } | { ok: false; reason: "missing_secret" } {
  if (downloadCsrfSecretConfigured(env)) return { ok: true };
  if (env.NODE_ENV === "production") return { ok: false, reason: "missing_secret" };
  return { ok: false, reason: "missing_secret" };
}

function b64url(input: string | Buffer) {
  return Buffer.from(input).toString("base64url");
}

function hmac(payload: string, secret: string) {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

function safeEqual(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  try {
    return timingSafeEqual(left, right);
  } catch {
    return false;
  }
}

/**
 * Mint short-lived CSRF token bound to authenticated user id.
 * Format: base64url(userId.exp).signature
 */
export function mintDownloadCsrf(userId: string, opts?: { now?: number; ttlMs?: number; env?: CsrfEnv }) {
  const env = opts?.env || process.env;
  const gate = assertDownloadCsrfSecret(env);
  if (!gate.ok) return { ok: false as const, reason: gate.reason };
  const secret = readSecret(env);
  const now = opts?.now ?? Date.now();
  const exp = now + (opts?.ttlMs ?? DOWNLOAD_CSRF_TTL_MS);
  const payload = `${userId}.${exp}`;
  const token = `${b64url(payload)}.${hmac(payload, secret)}`;
  return { ok: true as const, token, expiresAt: exp };
}

export function verifyDownloadCsrf(
  token: string | null | undefined,
  userId: string,
  opts?: { now?: number; env?: CsrfEnv },
): { ok: true } | { ok: false; reason: CsrfFailure } {
  const env = opts?.env || process.env;
  const gate = assertDownloadCsrfSecret(env);
  if (!gate.ok) return { ok: false, reason: "missing_secret" };
  if (!token || !token.trim()) return { ok: false, reason: "missing_token" };

  const parts = token.trim().split(".");
  if (parts.length !== 2) return { ok: false, reason: "invalid_token" };
  const [payloadB64, sig] = parts;
  if (!payloadB64 || !sig) return { ok: false, reason: "invalid_token" };

  let payload: string;
  try {
    payload = Buffer.from(payloadB64, "base64url").toString("utf8");
  } catch {
    return { ok: false, reason: "invalid_token" };
  }

  const secret = readSecret(env);
  const expected = hmac(payload, secret);
  if (!safeEqual(sig, expected)) return { ok: false, reason: "invalid_token" };

  const [uid, expRaw] = payload.split(".");
  if (!uid || !expRaw) return { ok: false, reason: "invalid_token" };
  if (uid !== userId) return { ok: false, reason: "user_mismatch" };
  const exp = Number(expRaw);
  if (!Number.isFinite(exp)) return { ok: false, reason: "invalid_token" };
  const now = opts?.now ?? Date.now();
  if (exp < now) return { ok: false, reason: "expired" };
  return { ok: true };
}

/**
 * Additive cross-site rejection. Does not replace CSRF HMAC.
 * Rejects Sec-Fetch-Site: cross-site and mismatched Origin host.
 */
export function isCrossSiteDownloadRequest(request: Request) {
  const site = (request.headers.get("sec-fetch-site") || "").toLowerCase();
  if (site === "cross-site") return true;

  const origin = request.headers.get("origin");
  if (origin) {
    try {
      const originHost = new URL(origin).host;
      const requestHost = new URL(request.url).host;
      if (originHost && requestHost && originHost !== requestHost) return true;
    } catch {
      return true;
    }
  }
  return false;
}

export function mintDownloadCsrfForSession(session: StaffSession) {
  return mintDownloadCsrf(session.id);
}
