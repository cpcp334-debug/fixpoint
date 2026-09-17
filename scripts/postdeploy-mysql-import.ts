/**
 * Optional Neon → MySQL import during Hostinger postdeploy.
 *
 * Opt-in only (avoids multi-hour deploy by default):
 *   RUN_MYSQL_IMPORT=1
 *   NEON_DATABASE_URL=postgresql://...
 *   DATABASE_URL=mysql://...   (localhost on Hostinger is fine)
 *
 * Optional first-pass (skip huge SL corpus):
 *   MYSQL_IMPORT_SKIP=ServiceLocation,ServiceLocationI18n,ServiceLocationRevision
 *
 * Never logs connection strings. Never truncates Neon.
 */
import { spawnSync } from "node:child_process";

function main() {
  if (process.env.RUN_MYSQL_IMPORT !== "1") {
    console.log("postdeploy-mysql-import: skipped (set RUN_MYSQL_IMPORT=1 to enable)");
    return;
  }

  const neon = process.env.NEON_DATABASE_URL?.trim() || "";
  const mysql = process.env.DATABASE_URL?.trim() || "";
  if (!neon) {
    console.error("postdeploy-mysql-import: NEON_DATABASE_URL required when RUN_MYSQL_IMPORT=1");
    process.exit(1);
  }
  if (!mysql.startsWith("mysql://") && !mysql.startsWith("mysqls://")) {
    console.error("postdeploy-mysql-import: DATABASE_URL must be mysql://");
    process.exit(1);
  }

  console.log("postdeploy-mysql-import: starting Neon → MySQL ETL…");
  const result = spawnSync("npx", ["tsx", "scripts/export-neon-to-mysql.ts"], {
    stdio: "inherit",
    env: process.env,
    shell: true,
  });
  process.exit(result.status ?? 1);
}

main();
