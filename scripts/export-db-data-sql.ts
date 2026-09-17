/**
 * Fallback full-data export when pg_dump version mismatches PGlite.
 * Writes SQL: TRUNCATE + COPY via batched INSERTs for public tables.
 * Prefer pg_dump when available (faster).
 *
 * Output: deploy/out/alnajah-data.sql (can be huge)
 * Env: EXPORT_MAX_TABLES (optional smoke), DATABASE_URL
 */
import { createWriteStream } from "node:fs";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import pg from "pg";

const outPath = join(process.cwd(), "deploy", "out", "alnajah-data.sql");

async function main() {
  await mkdir(join(process.cwd(), "deploy", "out"), { recursive: true });
  const client = new pg.Client({
    connectionString:
      process.env.DATABASE_URL ||
      "postgresql://postgres:postgres@127.0.0.1:5433/postgres?sslmode=disable",
  });
  await client.connect();

  const tables = await client.query<{ tablename: string }>(`
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
      AND tablename NOT LIKE '_prisma%'
    ORDER BY tablename
  `);

  const max = process.env.EXPORT_MAX_TABLES ? Number(process.env.EXPORT_MAX_TABLES) : tables.rows.length;
  const list = tables.rows.slice(0, max);
  const stream = createWriteStream(outPath, { encoding: "utf8" });
  stream.write("-- Al Najah full data export (Hostinger restore after prisma migrate deploy)\n");
  stream.write("SET session_replication_role = replica;\nBEGIN;\n");

  for (const { tablename } of list) {
    const qname = `"${tablename.replace(/"/g, '""')}"`;
    stream.write(`\n-- TABLE ${tablename}\n`);
    stream.write(`TRUNCATE TABLE ${qname} CASCADE;\n`);
    const colsRes = await client.query<{ column_name: string; data_type: string }>(
      `SELECT column_name, data_type FROM information_schema.columns
       WHERE table_schema='public' AND table_name=$1 ORDER BY ordinal_position`,
      [tablename],
    );
    const cols = colsRes.rows.map((c) => c.column_name);
    const colList = cols.map((c) => `"${c.replace(/"/g, '""')}"`).join(", ");
    let offset = 0;
    const batch = 200;
    let total = 0;
    for (;;) {
      const rows = await client.query(`SELECT * FROM ${qname} ORDER BY 1 OFFSET $1 LIMIT $2`, [offset, batch]);
      if (!rows.rows.length) break;
      for (const row of rows.rows) {
        const values = cols.map((c) => sqlLiteral((row as Record<string, unknown>)[c]));
        stream.write(`INSERT INTO ${qname} (${colList}) VALUES (${values.join(",")});\n`);
        total += 1;
      }
      offset += rows.rows.length;
      if (rows.rows.length < batch) break;
      if (total % 2000 === 0) console.log(JSON.stringify({ table: tablename, rows: total }));
    }
    console.log(JSON.stringify({ table: tablename, rows: total, done: true }));
  }

  stream.write("COMMIT;\nSET session_replication_role = DEFAULT;\n");
  await new Promise<void>((resolve, reject) => {
    stream.end(() => resolve());
    stream.on("error", reject);
  });
  await client.end();
  console.log(JSON.stringify({ outPath, tables: list.length }, null, 2));
}

function sqlLiteral(v: unknown): string {
  if (v === null || v === undefined) return "NULL";
  if (typeof v === "number" && Number.isFinite(v)) return String(v);
  if (typeof v === "boolean") return v ? "TRUE" : "FALSE";
  if (v instanceof Date) return `'${v.toISOString().replace(/'/g, "''")}'`;
  if (typeof v === "object") return `'${JSON.stringify(v).replace(/'/g, "''").replace(/\\/g, "\\\\")}'`;
  const s = String(v);
  return `'${s.replace(/'/g, "''")}'`;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
