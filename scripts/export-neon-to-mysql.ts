/**
 * Neon (Postgres) → Hostinger MySQL ETL.
 *
 * Requires:
 *   NEON_DATABASE_URL  postgresql://...  (source — never wiped)
 *   DATABASE_URL       mysql://...       (Hostinger target — schema already migrated)
 *
 * Safety:
 *   - Refuses if DATABASE_URL is not mysql://
 *   - Refuses if MySQL already has Service rows unless FORCE_MYSQL_IMPORT=1
 *   - Never runs seed / never truncates Neon
 *   - Does not log connection strings
 *
 *   - Skips tables listed in MYSQL_IMPORT_SKIP (comma-separated)
 *   - MYSQL_IMPORT_PRIORITY=1 skips ServiceLocation* (huge corpus) for a fast site bootstrap
 *
 * Usage:
 *   npm run db:export-neon-to-mysql
 */
import pg from "pg";
import mysql from "mysql2/promise";

const BATCH = Number(process.env.MYSQL_IMPORT_BATCH || 200);

/** Parent → child insert order (FK-safe). Tables not listed are skipped with a warning. */
const TABLE_ORDER = [
  "ServiceCategory",
  "ServiceCategoryI18n",
  "Service",
  "ServiceI18n",
  "Location",
  "LocationI18n",
  "ServiceLocation",
  "ServiceLocationI18n",
  "ServiceLocationRevision",
  "DiyCategory",
  "DiyCategoryI18n",
  "DiyGuide",
  "DiyGuideI18n",
  "DiyVote",
  "Article",
  "ArticleI18n",
  "Project",
  "ProjectI18n",
  "Faq",
  "FaqI18n",
  "MediaAsset",
  "User",
  "Session",
  "AuthLoginGuard",
  "RateLimitBucket",
  "Staff",
  "StaffSkill",
  "Subcontractor",
  "Customer",
  "Property",
  "Visitor",
  "VisitSession",
  "Lead",
  "LeadScore",
  "LeadScoreHistory",
  "Quote",
  "QuoteItem",
  "Booking",
  "Inspection",
  "WorkOrder",
  "Invoice",
  "InvoiceItem",
  "Payment",
  "PricingRule",
  "AmcContract",
  "Review",
  "ReviewVote",
  "ReviewInsight",
  "Question",
  "ContentReport",
  "AiConversation",
  "StaffAiConversation",
  "StaffAiDailyUsage",
  "StaffAiProposal",
  "ExportLog",
  "NumberSequence",
  "AnalyticsEvent",
  "KnowledgeDocument",
  "KnowledgeDocumentRevision",
  "AuditLog",
  "SiteSetting",
  "AutomationRule",
  "AutomationJob",
  "AutomationRun",
  "OpsTask",
  "AdminNotification",
  "ContentGenerationJob",
  "ContentEngineManifest",
  "ContentEngineValidation",
  "ContentEngineBatch",
  "ContentEngineRunItem",
  "SiteShellDocument",
] as const;

const PRIORITY_SKIP = new Set([
  "ServiceLocation",
  "ServiceLocationI18n",
  "ServiceLocationRevision",
]);

function skipTables(): Set<string> {
  const set = new Set<string>();
  if (process.env.MYSQL_IMPORT_PRIORITY === "1") {
    for (const t of PRIORITY_SKIP) set.add(t);
  }
  const raw = process.env.MYSQL_IMPORT_SKIP?.trim();
  if (raw) {
    for (const part of raw.split(",")) {
      const name = part.trim();
      if (name) set.add(name);
    }
  }
  return set;
}

function requireEnv(name: string): string {
  const v = process.env[name]?.trim();
  if (!v) {
    console.error(`${name} is required`);
    process.exit(1);
  }
  return v;
}

function assertMysqlUrl(url: string) {
  if (!url.startsWith("mysql://") && !url.startsWith("mysqls://")) {
    console.error("DATABASE_URL must be mysql:// (Hostinger). Refusing.");
    process.exit(1);
  }
}

function assertPostgresUrl(url: string) {
  if (!url.startsWith("postgresql://") && !url.startsWith("postgres://")) {
    console.error("NEON_DATABASE_URL must be postgresql://. Refusing.");
    process.exit(1);
  }
}

function sqlIdentMysql(name: string) {
  return `\`${name.replace(/`/g, "")}\``;
}

function sqlIdentPg(name: string) {
  return `"${name.replace(/"/g, "")}"`;
}

function toMysqlValue(v: unknown): unknown {
  if (v === null || v === undefined) return null;
  if (v instanceof Date) return v;
  if (typeof v === "boolean") return v ? 1 : 0;
  if (typeof v === "object") {
    // pg may return JSON / arrays — store as string for String columns
    return JSON.stringify(v);
  }
  return v;
}

async function main() {
  const neonUrl = requireEnv("NEON_DATABASE_URL");
  const mysqlUrl = requireEnv("DATABASE_URL");
  assertPostgresUrl(neonUrl);
  assertMysqlUrl(mysqlUrl);

  const pgClient = new pg.Client({ connectionString: neonUrl, ssl: { rejectUnauthorized: false } });
  await pgClient.connect();

  const mysqlConn = await mysql.createConnection(mysqlUrl);

  try {
    const [svcRows] = await mysqlConn.query("SELECT COUNT(*) AS c FROM Service");
    const existing = Number((svcRows as Array<{ c: number }>)[0]?.c ?? 0);
    if (existing > 0 && process.env.FORCE_MYSQL_IMPORT !== "1") {
      console.error(
        `MySQL already has ${existing} Service rows. Set FORCE_MYSQL_IMPORT=1 to continue (will INSERT IGNORE / upsert by PK).`,
      );
      process.exit(1);
    }

    await mysqlConn.query("SET FOREIGN_KEY_CHECKS=0");

    const skipped = skipTables();
    if (skipped.size) {
      console.log(`Skipping tables: ${[...skipped].join(", ")}`);
    }

    const summary: Record<string, number> = {};

    for (const table of TABLE_ORDER) {
      if (skipped.has(table)) {
        summary[table] = -1;
        console.log(`${table}: skipped`);
        continue;
      }
      const countRes = await pgClient.query(`SELECT COUNT(*)::int AS c FROM ${sqlIdentPg(table)}`);
      const total = Number(countRes.rows[0]?.c ?? 0);
      if (total === 0) {
        summary[table] = 0;
        console.log(`${table}: 0`);
        continue;
      }

      const colsRes = await pgClient.query(
        `SELECT column_name FROM information_schema.columns
         WHERE table_schema = 'public' AND table_name = $1
         ORDER BY ordinal_position`,
        [table],
      );
      const columns: string[] = colsRes.rows.map((r: { column_name: string }) => r.column_name);
      if (columns.length === 0) {
        console.warn(`${table}: no columns found in Neon — skip`);
        continue;
      }

      const colList = columns.map(sqlIdentMysql).join(", ");
      const placeholders = columns.map(() => "?").join(", ");
      const insertSql = `INSERT IGNORE INTO ${sqlIdentMysql(table)} (${colList}) VALUES (${placeholders})`;

      let copied = 0;
      let offset = 0;
      while (offset < total) {
        const { rows } = await pgClient.query(
          `SELECT * FROM ${sqlIdentPg(table)} ORDER BY 1 LIMIT $1 OFFSET $2`,
          [BATCH, offset],
        );
        if (rows.length === 0) break;

        const values = rows.map((row: Record<string, unknown>) =>
          columns.map((c) => toMysqlValue(row[c])),
        );

        // mysql2 bulk: execute many
        for (const rowVals of values) {
          await mysqlConn.execute(insertSql, rowVals);
          copied += 1;
        }

        offset += rows.length;
        if (copied % 1000 === 0 || offset >= total) {
          process.stdout.write(`\r${table}: ${copied}/${total}`);
        }
      }
      process.stdout.write("\n");
      summary[table] = copied;
    }

    await mysqlConn.query("SET FOREIGN_KEY_CHECKS=1");
    console.log(JSON.stringify({ ok: true, tables: Object.keys(summary).length, summary }, null, 2));
    console.log("Done. Neon was not modified. Do NOT run db:seed on production.");
  } finally {
    await pgClient.end().catch(() => undefined);
    await mysqlConn.end().catch(() => undefined);
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
