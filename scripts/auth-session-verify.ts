/**
 * FIX 4 auth/session verification.
 * Uses isolated test users; cleans up afterward. Does not wipe business data.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { prisma } from "../src/server/db";
import { hashPassword, hashToken } from "../src/lib/admin/crypto";
import { can } from "../src/lib/admin/rbac";
import {
  authenticateStaff,
  clearLoginGuard,
  emailLockoutKey,
  revokeAllSessionsForUser,
  sessionFromToken,
  SESSION_TTL_MS,
  staffCookieSecurityFlags,
} from "../src/lib/admin/auth";
import {
  DEFAULT_AUTH_LOCKOUT_MINUTES,
  DEFAULT_AUTH_LOCKOUT_THRESHOLD,
  resolveAuthLockoutMinutes,
  resolveAuthLockoutThreshold,
} from "../src/lib/admin/auth-settings";

function assert(cond: unknown, message: string): asserts cond {
  if (!cond) throw new Error(message);
}

const PREFIX = "fix4-auth-";
const PASSWORD = "Fix4TestPass12!";
const UNIQUE_IP = `fix4-verify-${Date.now()}`;

async function cleanup() {
  const users = await prisma.user.findMany({ where: { email: { startsWith: PREFIX } }, select: { id: true, email: true } });
  const hashes = users.map((u) => emailLockoutKey(u.email));
  hashes.push(emailLockoutKey(`${PREFIX}unknown@verify.local`));
  if (hashes.length) await prisma.authLoginGuard.deleteMany({ where: { emailHash: { in: hashes } } });
  if (users.length) {
    await prisma.session.deleteMany({ where: { userId: { in: users.map((u) => u.id) } } });
    await prisma.user.deleteMany({ where: { id: { in: users.map((u) => u.id) } } });
  }
  await prisma.auditLog.deleteMany({
    where: {
      OR: [
        { actor: { startsWith: PREFIX } },
        { action: { in: ["auth.account_locked", "auth.login_failure"] }, entityId: { in: hashes.map((h) => h.slice(0, 12)) } },
      ],
    },
  });
}

async function main() {
  await cleanup();

  assert((await resolveAuthLockoutThreshold()) === DEFAULT_AUTH_LOCKOUT_THRESHOLD, "default threshold 5");
  assert((await resolveAuthLockoutMinutes()) === DEFAULT_AUTH_LOCKOUT_MINUTES, "default minutes 15");
  assert(SESSION_TTL_MS === 12 * 60 * 60 * 1000, "session TTL remains 12h");
  const cookieFlags = staffCookieSecurityFlags();
  assert(cookieFlags.httpOnly && cookieFlags.sameSite === "lax" && cookieFlags.path === "/", "cookie flags");
  assert(cookieFlags.secureInProduction, "Secure required in production");

  const loginSrc = readFileSync(join(process.cwd(), "src/app/login/page.tsx"), "utf8");
  assert(loginSrc.includes("Email or password is incorrect."), "generic invalid message");
  assert(!loginSrc.toLowerCase().includes("locked"), "login page must not mention locked");
  assert(!loginSrc.toLowerCase().includes("does not exist"), "login page must not enumerate accounts");

  const authSrc = readFileSync(join(process.cwd(), "src/lib/admin/auth.ts"), "utf8");
  assert(authSrc.includes("emailLockoutKey"), "hashed email lockout key");
  assert(!/authLoginGuard\.create\([^\)]*email:/i.test(authSrc), "must not store raw email on guard");

  const email = `${PREFIX}user@verify.local`;
  const unknown = `${PREFIX}unknown@verify.local`;
  const user = await prisma.user.create({
    data: {
      email,
      name: "FIX4 Auth User",
      passwordHash: hashPassword(PASSWORD),
      role: "customer_service",
      active: true,
    },
  });

  // 1. successful login
  const ok1 = await authenticateStaff(email, PASSWORD, `${UNIQUE_IP}-ok`);
  assert(ok1.ok, "successful login");
  assert(ok1.ok && ok1.token.length >= 32, "token issued");
  assert(ok1.ok && (await sessionFromToken(ok1.token))?.email === email, "session resolves");

  // Concurrent second session allowed
  const ok2 = await authenticateStaff(email, PASSWORD, `${UNIQUE_IP}-ok2`);
  assert(ok2.ok, "second concurrent session allowed");
  assert(ok2.ok && (await sessionFromToken(ok2.token))?.id === user.id, "second session resolves");
  assert((await prisma.session.count({ where: { userId: user.id } })) >= 2, "multiple sessions exist");

  // 2–4. failures + lock
  await clearLoginGuard(emailLockoutKey(email));
  await prisma.session.deleteMany({ where: { userId: user.id } });

  for (let i = 1; i <= 4; i++) {
    const fail = await authenticateStaff(email, "wrong-password!!", `${UNIQUE_IP}-fail-${i}`);
    assert(!fail.ok && fail.error === "invalid", `bad password ${i} generic invalid`);
  }
  const guard4 = await prisma.authLoginGuard.findUnique({ where: { emailHash: emailLockoutKey(email) } });
  assert(guard4?.failedCount === 4 && !guard4.lockedUntil, "4 failures not yet locked");

  const fail5 = await authenticateStaff(email, "wrong-password!!", `${UNIQUE_IP}-fail-5`);
  assert(!fail5.ok && fail5.error === "invalid", "5th failure generic invalid");
  const guard5 = await prisma.authLoginGuard.findUnique({ where: { emailHash: emailLockoutKey(email) } });
  assert(guard5?.lockedUntil && guard5.lockedUntil > new Date(), "5th failure locks");
  assert(guard5.failedCount >= 5, "failed count at threshold");

  const fail6 = await authenticateStaff(email, PASSWORD, `${UNIQUE_IP}-fail-6`);
  assert(!fail6.ok && fail6.error === "invalid", "6th attempt while locked still generic invalid (even with correct password)");

  // 5. lockout expiry (simulate by backdating lockedUntil)
  await prisma.authLoginGuard.update({
    where: { emailHash: emailLockoutKey(email) },
    data: { lockedUntil: new Date(Date.now() - 1000), failedCount: 5 },
  });
  const afterExpiry = await authenticateStaff(email, PASSWORD, `${UNIQUE_IP}-expiry`);
  assert(afterExpiry.ok, "login works after lockout expiry");
  assert(!(await prisma.authLoginGuard.findUnique({ where: { emailHash: emailLockoutKey(email) } })), "successful login clears guard");

  // 7. unknown-email lockout matches
  await clearLoginGuard(emailLockoutKey(unknown));
  for (let i = 1; i <= 5; i++) {
    const u = await authenticateStaff(unknown, "anything-long", `${UNIQUE_IP}-unk-${i}`);
    assert(!u.ok && u.error === "invalid", `unknown email failure ${i}`);
  }
  const unkGuard = await prisma.authLoginGuard.findUnique({ where: { emailHash: emailLockoutKey(unknown) } });
  assert(unkGuard?.lockedUntil && unkGuard.lockedUntil > new Date(), "unknown email locks after 5");
  assert(unkGuard.emailHash === emailLockoutKey(unknown), "guard key is hash not raw email");
  assert(unkGuard.emailHash !== unknown, "raw email is not the key");

  // 8. password change revokes all sessions
  await clearLoginGuard(emailLockoutKey(email));
  const s1 = await authenticateStaff(email, PASSWORD, `${UNIQUE_IP}-pc1`);
  const s2 = await authenticateStaff(email, PASSWORD, `${UNIQUE_IP}-pc2`);
  assert(s1.ok && s2.ok, "sessions before password change");
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash: hashPassword(`${PASSWORD}x`) } });
  await revokeAllSessionsForUser(user.id, { actor: email, reason: "password_change" });
  assert((await prisma.session.count({ where: { userId: user.id } })) === 0, "password change revokes all");
  assert(!(await sessionFromToken(s1.ok ? s1.token : "")), "old token1 dead");
  assert(!(await sessionFromToken(s2.ok ? s2.token : "")), "old token2 dead");

  // restore password for later
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash: hashPassword(PASSWORD) } });

  // 9. admin reset revokes all
  const a1 = await authenticateStaff(email, PASSWORD, `${UNIQUE_IP}-ar1`);
  assert(a1.ok, "session before admin reset");
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash: hashPassword(PASSWORD) } });
  await revokeAllSessionsForUser(user.id, { actor: "admin@verify.local", reason: "admin_password_reset" });
  assert((await prisma.session.count({ where: { userId: user.id } })) === 0, "admin reset revokes all");

  // 10. logout revokes current session only
  const l1 = await authenticateStaff(email, PASSWORD, `${UNIQUE_IP}-lo1`);
  const l2 = await authenticateStaff(email, PASSWORD, `${UNIQUE_IP}-lo2`);
  assert(l1.ok && l2.ok, "two sessions for logout test");
  await prisma.session.deleteMany({ where: { tokenHash: hashToken(l1.ok ? l1.token : "") } });
  assert(!(await sessionFromToken(l1.ok ? l1.token : "")), "logout current revoked");
  assert(await sessionFromToken(l2.ok ? l2.token : ""), "other session remains");

  // 11–13. deactivate / activate
  await revokeAllSessionsForUser(user.id);
  const beforeDeact = await authenticateStaff(email, PASSWORD, `${UNIQUE_IP}-deact-before`);
  assert(beforeDeact.ok, "login before deactivate");
  await prisma.user.update({ where: { id: user.id }, data: { active: false } });
  await revokeAllSessionsForUser(user.id, { actor: "admin@verify.local", reason: "account_deactivated" });
  assert(!(await sessionFromToken(beforeDeact.ok ? beforeDeact.token : "")), "deactivate kills session");
  const inactiveLogin = await authenticateStaff(email, PASSWORD, `${UNIQUE_IP}-inactive`);
  assert(!inactiveLogin.ok && inactiveLogin.error === "invalid", "inactive cannot authenticate");
  await prisma.user.update({ where: { id: user.id }, data: { active: true } });
  assert(!(await prisma.session.findFirst({ where: { userId: user.id } })), "activate does not create session");
  const reactivated = await authenticateStaff(email, PASSWORD, `${UNIQUE_IP}-react`);
  assert(reactivated.ok, "activate restores login ability");

  // 16. audit records contain no passwords/tokens
  const audits = await prisma.auditLog.findMany({
    where: {
      OR: [{ actor: email }, { action: { startsWith: "auth." } }, { action: { startsWith: "staff." } }],
    },
    take: 200,
    orderBy: { createdAt: "desc" },
  });
  for (const row of audits) {
    const blob = `${row.actor}|${row.action}|${row.meta}|${row.entityId}`;
    assert(!blob.includes(PASSWORD), "audit must not contain password");
    assert(!/token["']?\s*[:=]/i.test(row.meta), "audit must not contain token fields");
    if (reactivated.ok) assert(!blob.includes(reactivated.token), "audit must not contain raw session token");
  }

  // 17. RBAC regression (spot)
  assert(can("super_admin", "staff"), "super_admin staff permission");
  assert(can("customer_service", "leads"), "cs leads");
  assert(!can("technician", "staff"), "tech no staff admin");

  // schema / package
  const schema = readFileSync(join(process.cwd(), "prisma/schema.prisma"), "utf8");
  assert(schema.includes("model AuthLoginGuard"), "AuthLoginGuard in schema");
  const pkg = JSON.parse(readFileSync(join(process.cwd(), "package.json"), "utf8")) as { scripts: Record<string, string> };
  assert(pkg.scripts["verify:auth-session"]?.includes("auth-session-verify"), "verify:auth-session script");

  await cleanup();
  console.log("Auth/session verification passed.");
}

main()
  .catch(async (err) => {
    console.error(err instanceof Error ? err.message : err);
    await cleanup().catch(() => undefined);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
