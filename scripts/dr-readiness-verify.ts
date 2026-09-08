/**
 * Disaster-recovery readiness verification (documentation honesty).
 * Does NOT perform restores, connect to cloud backup providers, or reset databases.
 * Does NOT claim backups exist.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { resolveSeedMode } from "../prisma/seed-safety";

function assert(cond: unknown, message: string): asserts cond {
  if (!cond) throw new Error(message);
}

function assertNoSecrets(source: string, label: string, opts?: { allowEnvExamplePlaceholders?: boolean }) {
  if (!opts?.allowEnvExamplePlaceholders) {
    assert(
      !/DATABASE_URL\s*=\s*["']postgresql:\/\/[^"'\s]+:[^"'\s]+@/i.test(source),
      `${label}: must not embed credentialed DATABASE_URL`,
    );
  }
  assert(!/sk-[a-zA-Z0-9]{10,}/.test(source), `${label}: must not embed OpenAI-like secrets`);
  assert(!/console\.(log|info|debug|warn)\([^)]*DATABASE_URL/.test(source), `${label}: must not log DATABASE_URL`);
}

function main() {
  const root = process.cwd();
  const dr = readFileSync(join(root, "docs/disaster-recovery.md"), "utf8");
  const prodDb = readFileSync(join(root, "docs/production-database.md"), "utf8");
  const readme = readFileSync(join(root, "README.md"), "utf8");
  const envExample = readFileSync(join(root, ".env.example"), "utf8");
  const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8")) as {
    scripts: Record<string, string>;
  };
  const thisScript = readFileSync(join(root, "scripts/dr-readiness-verify.ts"), "utf8");

  assertNoSecrets(dr, "disaster-recovery.md");
  assertNoSecrets(prodDb, "production-database.md");
  assertNoSecrets(envExample, ".env.example", { allowEnvExamplePlaceholders: true });
  assertNoSecrets(thisScript, "dr-readiness-verify.ts");

  assert(readme.includes("docs/disaster-recovery.md"), "README links disaster-recovery.md");
  assert(readme.includes("docs/production-database.md"), "README links production-database.md");
  assert(prodDb.includes("disaster-recovery.md"), "production-database links DR doc");

  assert(/RPO[^\n]*≤\s*1\s*hour|RPO\*\*\s*\|\s*\*\*≤ 1 hour/i.test(dr) || dr.includes("RPO** | **≤ 1 hour**") || dr.includes("**RPO** | **≤ 1 hour**"), "DR docs lock RPO ≤ 1 hour");
  assert(dr.includes("≤ 1 hour"), "DR docs contain RPO ≤ 1 hour");
  assert(dr.includes("≤ 4 hours"), "DR docs contain RTO ≤ 4 hours");
  assert(prodDb.includes("≤ 1 hour") && prodDb.includes("≤ 4 hours"), "production-database.md states RPO/RTO");

  assert(dr.includes("NOT CONFIGURED"), "DR marks NOT CONFIGURED");
  assert(dr.includes("REQUIRES EXTERNAL PROVIDER"), "DR marks REQUIRES EXTERNAL PROVIDER");
  assert(dr.includes("Provider TBD") || dr.includes("provider TBD") || dr.includes("Provider TBD"), "Postgres provider remains TBD");

  assert(!/\brestore drill passed\b/i.test(dr), "must not falsely mark restore drill passed");
  assert(!/\bStatus of last drill:\*\*\s*\*\*PASSED\b/i.test(dr), "must not mark last drill PASSED");
  assert(dr.includes("not passed"), "restore drill marked not passed");
  assert(/restore drill/i.test(dr), "restore drill documented");

  assert(!/same-server.*backup.*(CONFIGURED|enabled|ready)/i.test(dr), "must not claim same-server backup is configured");
  assert(/Forbidden|same-server/i.test(dr), "same-server backup forbidden is documented");

  assert(!/\bbackups are configured\b/i.test(dr), "must not claim backups are configured");
  assert(!/\bBACKUP_STATUS\s*=\s*["']?(ok|ready|configured)/i.test(dr + envExample), "no fake backup status env");

  assert(dr.includes("Database corruption"), "scenario: database corruption");
  assert(dr.includes("Accidental data deletion"), "scenario: accidental deletion");
  assert(dr.includes("Failed migration"), "scenario: failed migration");
  assert(dr.includes("Application server failure"), "scenario: server failure");
  assert(dr.includes("Upload storage failure"), "scenario: upload storage");
  assert(dr.includes("Credential compromise"), "scenario: credential compromise");
  assert(dr.includes("Complete environment"), "scenario: complete loss");
  assert(dr.includes("Automation queue loss"), "scenario: automation queue");
  assert(dr.includes("AI provider outage"), "scenario: AI outage");

  assert(dr.includes("private object storage") || dr.includes("Private object"), "upload architecture: object storage");
  assert(dr.includes("Retention") || dr.includes("retention"), "retention documented");
  assert(dr.includes("TBD"), "retention/provider TBD markers present");
  assert(dr.includes("PITR"), "PITR documented");
  assert(dr.includes("migrate deploy"), "migration recovery uses migrate deploy");
  assert(dr.includes("HEALTH_CHECK_SECRET") || prodDb.includes("HEALTH_CHECK_SECRET"), "health secret recovery referenced");
  assert(dr.includes("DNS") && dr.includes("TLS"), "DNS/TLS recovery documented");
  assert(dr.includes("cron") || dr.includes("Cron"), "cron recovery documented");
  assert(dr.includes("Isolated restore drill") || dr.includes("restore drill"), "restore drill documented");

  assert(pkg.scripts["db:migrate"] === "prisma migrate deploy", "db:migrate remains migrate deploy");
  assert(pkg.scripts["db:push:dev"] === "prisma db push", "db:push:dev remains development-only");
  assert(!pkg.scripts["db:push"], "legacy db:push must stay removed");
  assert(pkg.scripts["verify:dr-readiness"]?.includes("dr-readiness-verify"), "verify:dr-readiness script exists");
  assert(!pkg.scripts.build.includes("backup"), "build does not run backups");
  assert(!pkg.scripts.start?.includes("pg-server"), "start does not start PGlite");

  const seedProd = resolveSeedMode({ NODE_ENV: "production" });
  assert(seedProd.mode === "safe-bootstrap" && seedProd.refusedDestructive, "destructive production seed remains blocked");

  assert(envExample.includes("BACKUP") || envExample.includes("Disaster recovery") || envExample.includes("disaster-recovery"), ".env.example has backup/DR comment placeholders");
  assert(!envExample.includes("BACKUP_ENABLED=true"), ".env.example must not fake BACKUP_ENABLED=true");

  console.log("Disaster-recovery readiness verification passed (docs honesty only; backups remain NOT CONFIGURED).");
}

try {
  main();
} catch (err) {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
}
