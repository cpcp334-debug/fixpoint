import { prisma } from "../src/server/db";
import { clearLoginGuard, emailLockoutKey } from "../src/lib/admin/auth";
import { hashPassword, verifyPassword } from "../src/lib/admin/crypto";

async function main() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password) {
    console.error("Set ADMIN_EMAIL and ADMIN_PASSWORD in .env");
    process.exit(1);
  }
  const user = await prisma.user.upsert({
    where: { email },
    create: {
      email,
      name: "Administrator",
      passwordHash: hashPassword(password),
      role: "super_admin",
      active: true,
    },
    update: {
      passwordHash: hashPassword(password),
      role: "super_admin",
      active: true,
    },
  });
  await clearLoginGuard(emailLockoutKey(email));
  const passwordOk = verifyPassword(password, user.passwordHash);
  console.log(JSON.stringify({ ok: true, email: user.email, role: user.role, active: user.active, passwordOk }, null, 2));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
