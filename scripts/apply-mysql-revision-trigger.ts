/**
 * Apply optional MySQL trigger for ServiceLocationRevision immutability.
 * Requires DATABASE_URL=mysql://...
 * Never logs the connection string.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import mysql from "mysql2/promise";

async function main() {
  const url = process.env.DATABASE_URL?.trim() || "";
  if (!url.startsWith("mysql://") && !url.startsWith("mysqls://")) {
    console.error("DATABASE_URL must be mysql://");
    process.exit(1);
  }

  const sqlPath = join(
    process.cwd(),
    "prisma",
    "migrations",
    "20260917220000_mysql_init",
    "revision_immutable_trigger.sql",
  );
  const sql = readFileSync(sqlPath, "utf8");
  // Split on DROP / CREATE — mysql2 multiStatements
  const conn = await mysql.createConnection({ uri: url, multipleStatements: true });
  try {
    await conn.query(sql);
    console.log("Applied service_location_revision_immutable_trg");
  } finally {
    await conn.end();
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
