export const VID_COOKIE = "alnajah_vid";
export const SID_COOKIE = "alnajah_sid";
export const OPTOUT_COOKIE = "alnajah_optout";

/** 13 months, as approved for Phase 2F.1. */
export const VISITOR_MAX_AGE = 397 * 24 * 60 * 60;
export const SESSION_MAX_AGE = 7 * 24 * 60 * 60;
export const VISITOR_TTL_MS = VISITOR_MAX_AGE * 1000;
export const SESSION_TTL_MS = SESSION_MAX_AGE * 1000;

export function cookieBase() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
  };
}

export function readCookie(header: string | null, name: string) {
  if (!header) return null;
  for (const part of header.split(";")) {
    const trimmed = part.trim();
    const eq = trimmed.indexOf("=");
    if (eq < 1) continue;
    if (trimmed.slice(0, eq) !== name) continue;
    try {
      return decodeURIComponent(trimmed.slice(eq + 1));
    } catch {
      return trimmed.slice(eq + 1);
    }
  }
  return null;
}

export function isOpaqueId(value: string | null | undefined): value is string {
  return Boolean(value && /^[a-zA-Z0-9_-]{8,40}$/.test(value));
}
