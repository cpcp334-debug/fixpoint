import { cookies } from "next/headers";
import { prisma } from "@/server/db";
import { hashToken, newToken, verifyPassword } from "@/lib/admin/crypto";
import { can, type AdminPermission, isStaffRole } from "@/lib/admin/rbac";
import { rateLimit } from "@/server/rate-limit";

export const COOKIE = "alnajah_staff";
const TTL_MS = 12 * 60 * 60 * 1000;

export type StaffSession = {
  id: string;
  email: string;
  name: string;
  role: string;
  staffId: string | null;
};

export async function loginStaff(email: string, password: string, ip: string) {
  const limited = rateLimit(`staff-login:${ip}`, 8, 15 * 60 * 1000);
  if (!limited.ok) return { ok: false as const, error: "rateLimit" as const };
  const user = await prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } });
  if (!user || !user.active || !verifyPassword(password, user.passwordHash)) {
    return { ok: false as const, error: "invalid" as const };
  }
  const token = newToken();
  await prisma.session.create({
    data: {
      userId: user.id,
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + TTL_MS),
    },
  });
  await prisma.auditLog.create({
    data: { actor: user.email, action: "auth.login", entity: "User", entityId: user.id },
  });
  const jar = await cookies();
  jar.set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: TTL_MS / 1000,
  });
  return { ok: true as const, user: { id: user.id, email: user.email, name: user.name, role: user.role } };
}

export async function logoutStaff() {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (token) {
    await prisma.session.deleteMany({ where: { tokenHash: hashToken(token) } });
  }
  jar.delete(COOKIE);
}

export async function getStaffSession(): Promise<StaffSession | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return null;
  const row = await prisma.session.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { user: true },
  });
  if (!row || row.expiresAt < new Date() || !row.user.active) {
    if (row) await prisma.session.delete({ where: { id: row.id } }).catch(() => undefined);
    return null;
  }
  if (!isStaffRole(row.user.role) && row.user.role !== "admin") return null;
  return { id: row.user.id, email: row.user.email, name: row.user.name, role: row.user.role, staffId: row.user.staffId };
}

export async function requireStaff(permission?: AdminPermission) {
  const session = await getStaffSession();
  if (!session) return { ok: false as const, session: null };
  if (permission && !can(session.role, permission)) return { ok: false as const, session };
  return { ok: true as const, session };
}
