/**
 * Safe `prisma migrate deploy` for Hostinger MySQL (and legacy Neon notes).
 *
 * MySQL: uses DATABASE_URL directly (no DIRECT_URL / pooler advisory-lock dance).
 * Legacy Postgres pooler skip retained if someone still points at postgresql://.
 *
 * Never logs connection strings.
 */
import { spawnSync } from "node:child_process";

function looksLikePooler(url: string): boolean {
  return /-pooler\.|[?&]pgbouncer=true\b/i.test(url);
}

function main() {
  if (process.env.SKIP_PRISMA_MIGRATE === "1") {
    console.log("prisma-migrate-safe: skipped (SKIP_PRISMA_MIGRATE=1)");
    return;
  }

  const databaseUrl = process.env.DATABASE_URL?.trim() || "";
  const directUrl = process.env.DIRECT_URL?.trim() || "";

  if (!databaseUrl && !directUrl) {
    console.error("prisma-migrate-safe: DATABASE_URL is required");
    process.exit(1);
  }

  const isMysql = databaseUrl.startsWith("mysql://") || databaseUrl.startsWith("mysqls://");
  const migrateTarget = isMysql ? databaseUrl : directUrl || databaseUrl;

  if (!isMysql && looksLikePooler(migrateTarget)) {
    console.warn(
      "prisma-migrate-safe: skipping migrate deploy — connection looks like a Postgres pooler. For MySQL production use mysql:// DATABASE_URL.",
    );
    return;
  }

  const env = { ...process.env, DATABASE_URL: migrateTarget };
  if (directUrl) env.DIRECT_URL = directUrl;

  const result = spawnSync("npx", ["prisma", "migrate", "deploy"], {
    stdio: "inherit",
    env,
    shell: true,
  });
  process.exit(result.status ?? 1);
}

main();
