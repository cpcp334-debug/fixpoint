import { cookies } from "next/headers";
import { createHash } from "node:crypto";
import { prisma } from "@/server/db";
import { hashToken, newToken, verifyPassword } from "@/lib/admin/crypto";
import { can, type AdminPermission, isStaffRole } from "@/lib/admin/rbac";
import { adminAudit } from "@/lib/admin/numbers";
import {
  resolveAuthLockoutMinutes,
  resolveAuthLockoutThreshold,
  STAFF_SESSION_TTL_MS,
} from "@/lib/admin/auth-settings";
import { rateLimit } from "@/server/rate-limit";

export const COOKIE = "alnajah_staff";
export const SESSION_TTL_MS = STAFF_SESSION_TTL_MS;

/** Dummy scrypt hash so missing-user paths still call verifyPassword (timing). */
const DUMMY_PASSWORD_HASH =
  "00000000000000000000000000000000:00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000";

export type StaffSession = {
  id: string;
  email: string;
  name: string;
  role: string;
  staffId: string | null;
};

export function normalizeStaffEmail(email: string) {
  return email.trim().toLowerCase();
}

/** SHA-256 of normalized email — never store raw email as lockout key. */
export function emailLockoutKey(email: string) {
  return createHash("sha256").update(normalizeStaffEmail(email)).digest("hex");
}

function cookieOptions(maxAgeSeconds: number) {
  return {
    httpOnly: true as const,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: maxAgeSeconds,
  };
}

export async function revokeAllSessionsForUser(userId: string, opts?: { actor: string; reason: string }) {
  const result = await prisma.session.deleteMany({ where: { userId } });
  if (opts) {
    await adminAudit({
      actor: opts.actor,
      action: "auth.sessions_revoked",
      entity: "User",
      entityId: userId,
      meta: { reason: opts.reason, count: result.count },
    });
  }
  return result.count;
}

export async function clearStaffSessionCookie() {
  const jar = await cookies();
  jar.delete(COOKIE);
}

export async function clearLoginGuard(emailHash: string) {
  await prisma.authLoginGuard.deleteMany({ where: { emailHash } });
}

export async function recordFailedLogin(emailHash: string): Promise<{ locked: boolean; lockedNow: boolean }> {
  const threshold = await resolveAuthLockoutThreshold();
  const minutes = await resolveAuthLockoutMinutes();
  const now = new Date();
  const existing = await prisma.authLoginGuard.findUnique({ where: { emailHash } });

  if (existing?.lockedUntil && existing.lockedUntil > now) {
    return { locked: true, lockedNow: false };
  }

  const previousFailed =
    existing?.lockedUntil && existing.lockedUntil <= now ? 0 : existing?.failedCount || 0;
  const failedCount = previousFailed + 1;
  const lockedNow = failedCount >= threshold;
  const lockedUntil = lockedNow ? new Date(now.getTime() + minutes * 60_000) : null;

  await prisma.authLoginGuard.upsert({
    where: { emailHash },
    create: { emailHash, failedCount, lockedUntil },
    update: { failedCount, lockedUntil },
  });

  if (lockedNow) {
    await adminAudit({
      actor: "system",
      action: "auth.account_locked",
      entity: "AuthLoginGuard",
      entityId: emailHash.slice(0, 12),
      meta: { threshold, minutes },
    });
  }

  return { locked: Boolean(lockedUntil && lockedUntil > now), lockedNow };
}

export async function isGuardLocked(emailHash: string) {
  const row = await prisma.authLoginGuard.findUnique({ where: { emailHash } });
  if (!row?.lockedUntil) return false;
  return row.lockedUntil > new Date();
}

/**
 * Core credential check + session create (no cookies).
 * Used by loginStaff and verification scripts.
 */
export async function authenticateStaff(email: string, password: string, ip: string) {
  const limited = await rateLimit(`staff-login:${ip}`, 8, 15 * 60 * 1000);
  if (!limited.ok) return { ok: false as const, error: "rateLimit" as const };

  const normalized = normalizeStaffEmail(email);
  const emailHash = emailLockoutKey(normalized);

  if (await isGuardLocked(emailHash)) {
    await adminAudit({
      actor: "system",
      action: "auth.login_failure",
      entity: "AuthLoginGuard",
      entityId: emailHash.slice(0, 12),
      meta: { reason: "locked" },
    });
    return { ok: false as const, error: "invalid" as const };
  }

  const user = await prisma.user.findUnique({ where: { email: normalized } });
  const passwordOk = verifyPassword(password, user?.passwordHash || DUMMY_PASSWORD_HASH);
  const eligible = Boolean(user && user.active && passwordOk && (isStaffRole(user.role) || user.role === "admin"));

  if (!eligible) {
    await recordFailedLogin(emailHash);
    await adminAudit({
      actor: "system",
      action: "auth.login_failure",
      entity: "AuthLoginGuard",
      entityId: emailHash.slice(0, 12),
      meta: { reason: "invalid" },
    });
    return { ok: false as const, error: "invalid" as const };
  }

  await clearLoginGuard(emailHash);

  const token = newToken();
  const session = await prisma.session.create({
    data: {
      userId: user!.id,
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + SESSION_TTL_MS),
    },
  });
  await adminAudit({
    actor: user!.email,
    action: "auth.login",
    entity: "User",
    entityId: user!.id,
  });

  return {
    ok: true as const,
    token,
    sessionId: session.id,
    user: { id: user!.id, email: user!.email, name: user!.name, role: user!.role },
  };
}

export async function loginStaff(email: string, password: string, ip: string) {
  const result = await authenticateStaff(email, password, ip);
  if (!result.ok) return result;
  const jar = await cookies();
  jar.set(COOKIE, result.token, cookieOptions(SESSION_TTL_MS / 1000));
  return { ok: true as const, user: result.user };
}

export async function logoutStaff() {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (token) {
    const tokenHash = hashToken(token);
    const row = await prisma.session.findUnique({
      where: { tokenHash },
      include: { user: { select: { email: true } } },
    });
    if (row) {
      await prisma.session.delete({ where: { id: row.id } }).catch(() => undefined);
      await adminAudit({
        actor: row.user.email,
        action: "auth.logout",
        entity: "User",
        entityId: row.userId,
      });
    }
  }
  jar.delete(COOKIE);
}

/** Revoke a session by raw token (tests / password-change paths). */
export async function revokeSessionByToken(token: string) {
  await prisma.session.deleteMany({ where: { tokenHash: hashToken(token) } });
}

export async function getStaffSession(): Promise<StaffSession | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return null;
  return sessionFromToken(token);
}

export async function sessionFromToken(token: string): Promise<StaffSession | null> {
  const row = await prisma.session.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { user: true },
  });
  if (!row || row.expiresAt < new Date() || !row.user.active) {
    if (row) await prisma.session.delete({ where: { id: row.id } }).catch(() => undefined);
    return null;
  }
  if (!isStaffRole(row.user.role) && row.user.role !== "admin") return null;
  return {
    id: row.user.id,
    email: row.user.email,
    name: row.user.name,
    role: row.user.role,
    staffId: row.user.staffId,
  };
}

export async function requireStaff(permission?: AdminPermission) {
  const session = await getStaffSession();
  if (!session) return { ok: false as const, session: null };
  if (permission && !can(session.role, permission)) return { ok: false as const, session };
  return { ok: true as const, session };
}

export function staffCookieSecurityFlags() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secureInProduction: true,
    path: "/",
    ttlMs: SESSION_TTL_MS,
  };
}
