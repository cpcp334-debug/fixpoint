import { prisma } from "@/server/db";

export const DEFAULT_AUTH_LOCKOUT_THRESHOLD = 5;
export const DEFAULT_AUTH_LOCKOUT_MINUTES = 15;
/** Staff session lifetime — locked FIX 4 decision. */
export const STAFF_SESSION_TTL_MS = 12 * 60 * 60 * 1000;

function clampPositiveInt(value: number, fallback: number, max: number) {
  if (!Number.isFinite(value) || value <= 0) return fallback;
  return Math.min(max, Math.trunc(value));
}

type AuthSettingsJson = {
  authLockoutThreshold?: unknown;
  authLockoutMinutes?: unknown;
};

async function readSiteAuthSettings(): Promise<AuthSettingsJson> {
  try {
    const row = await prisma.siteSetting.findUnique({ where: { id: "site" } });
    if (!row?.json) return {};
    return JSON.parse(row.json) as AuthSettingsJson;
  } catch {
    return {};
  }
}

/** Env AUTH_LOCKOUT_THRESHOLD → SiteSetting.json.authLockoutThreshold → 5 */
export async function resolveAuthLockoutThreshold() {
  const fromEnv = Number(process.env.AUTH_LOCKOUT_THRESHOLD);
  if (Number.isFinite(fromEnv) && fromEnv > 0) return clampPositiveInt(fromEnv, DEFAULT_AUTH_LOCKOUT_THRESHOLD, 50);
  const site = await readSiteAuthSettings();
  const fromSite = Number(site.authLockoutThreshold);
  if (Number.isFinite(fromSite) && fromSite > 0) return clampPositiveInt(fromSite, DEFAULT_AUTH_LOCKOUT_THRESHOLD, 50);
  return DEFAULT_AUTH_LOCKOUT_THRESHOLD;
}

/** Env AUTH_LOCKOUT_MINUTES → SiteSetting.json.authLockoutMinutes → 15 */
export async function resolveAuthLockoutMinutes() {
  const fromEnv = Number(process.env.AUTH_LOCKOUT_MINUTES);
  if (Number.isFinite(fromEnv) && fromEnv > 0) return clampPositiveInt(fromEnv, DEFAULT_AUTH_LOCKOUT_MINUTES, 24 * 60);
  const site = await readSiteAuthSettings();
  const fromSite = Number(site.authLockoutMinutes);
  if (Number.isFinite(fromSite) && fromSite > 0) return clampPositiveInt(fromSite, DEFAULT_AUTH_LOCKOUT_MINUTES, 24 * 60);
  return DEFAULT_AUTH_LOCKOUT_MINUTES;
}
