import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  ALLOW_PRODUCTION_LOCAL_DB_ENV,
  assertProductionDatabaseConfigured,
  checkProductionDatabaseUrl,
  hasPgliteQueryFingerprint,
  isNextProductionBuildPhase,
  parseDatabaseUrl,
  productionDatabaseUrlRefusalMessage,
} from "../src/server/db-env";
import { resolveSeedMode } from "../prisma/seed-safety";

function assert(cond: unknown, message: string): asserts cond {
  if (!cond) throw new Error(message);
}

function assertNeverLogsSecrets(source: string, label: string) {
  assert(!/console\.(log|info|debug|warn)\([^)]*DATABASE_URL/.test(source), `${label} must not log DATABASE_URL`);
}

async function main() {
  const root = process.cwd();
  const dbEnvSrc = readFileSync(join(root, "src/server/db-env.ts"), "utf8");
  const instrumentationSrc = readFileSync(join(root, "src/instrumentation.ts"), "utf8");
  const healthSrc = readFileSync(join(root, "src/app/api/internal/health/db/route.ts"), "utf8");
  const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8")) as {
    scripts: Record<string, string>;
  };
  const readme = readFileSync(join(root, "README.md"), "utf8");
  const schema = readFileSync(join(root, "prisma/schema.prisma"), "utf8");
  const envExample = readFileSync(join(root, ".env.example"), "utf8");
  const mysqlDoc = readFileSync(join(root, "deploy/MYSQL-HOSTINGER.md"), "utf8");

  assertNeverLogsSecrets(dbEnvSrc, "db-env.ts");
  assertNeverLogsSecrets(instrumentationSrc, "instrumentation.ts");
  assertNeverLogsSecrets(healthSrc, "health/db/route.ts");
  assert(healthSrc.includes("HEALTH_CHECK_SECRET"), "health uses HEALTH_CHECK_SECRET");
  assert(!healthSrc.includes("AUTOMATION_CRON_SECRET"), "health must not reuse AUTOMATION_CRON_SECRET");
  assert(healthSrc.includes("authorizeHealthCheck"), "health has authorizeHealthCheck");
  assert(instrumentationSrc.includes("assertProductionDatabaseConfigured"), "instrumentation asserts DB env");

  assert(schema.includes('provider = "mysql"'), "Prisma provider is mysql");
  assert(!schema.includes("directUrl"), "MySQL schema has no directUrl");
  assert(mysqlDoc.includes("mysql://"), "MYSQL-HOSTINGER.md documents mysql URL");

  assert(pkg.scripts["db:migrate"]?.includes("prisma-migrate-safe"), "db:migrate uses prisma-migrate-safe");
  assert(pkg.scripts["db:export-neon-to-mysql"]?.includes("export-neon-to-mysql"), "ETL script wired");
  assert(pkg.scripts["db:push:dev"] === "prisma db push", "db:push:dev is development push");
  assert(!pkg.scripts["db:push"], "db:push must be renamed away");
  assert(pkg.scripts["verify:db-env"]?.includes("db-env-verify"), "verify:db-env script exists");
  assert(!pkg.scripts.build.includes("db:seed"), "build must not seed");
  assert(pkg.scripts.build.includes("prisma-migrate-safe"), "build runs migrate-safe before next build");
  assert(pkg.scripts.build.includes("next build"), "build ends with next build");
  assert(!pkg.scripts.build.includes("pg-server"), "build must not start PGlite");
  assert(pkg.scripts.start === "next start", "start is next start only");
  assert(pkg.scripts.postdeploy?.includes("postdeploy-mysql-import"), "postdeploy can opt-in ETL");

  assert(readme.toLowerCase().includes("mysql") || readme.includes("MYSQL-HOSTINGER"), "README mentions MySQL path");
  assert(envExample.includes("REQUIRED PRODUCTION"), ".env.example has REQUIRED PRODUCTION section");
  assert(envExample.includes("mysql://"), ".env.example documents mysql://");
  assert(envExample.includes("HEALTH_CHECK_SECRET"), ".env.example documents HEALTH_CHECK_SECRET");
  assert(envExample.includes(ALLOW_PRODUCTION_LOCAL_DB_ENV), ".env.example documents local override");

  const missing = checkProductionDatabaseUrl({ NODE_ENV: "production" });
  assert(!missing.ok && missing.code === "missing_database_url", "production missing DATABASE_URL fails");

  const empty = checkProductionDatabaseUrl({ NODE_ENV: "production", DATABASE_URL: "   " });
  assert(!empty.ok && empty.code === "missing_database_url", "production blank DATABASE_URL fails");

  const postgresRejected = checkProductionDatabaseUrl({
    NODE_ENV: "production",
    DATABASE_URL: "postgresql://app:s3cret@db.example.com:5432/alnajah?sslmode=require",
  });
  assert(!postgresRejected.ok && postgresRejected.code === "unsupported_scheme", "production rejects postgresql://");

  const pglite = checkProductionDatabaseUrl({
    NODE_ENV: "production",
    DATABASE_URL:
      "postgresql://postgres:postgres@127.0.0.1:5433/postgres?sslmode=disable&pgbouncer=true&connection_limit=1",
  });
  assert(!pglite.ok && pglite.code === "unsupported_scheme", "production PGlite/postgres scheme fails");

  const localhost = checkProductionDatabaseUrl({
    NODE_ENV: "production",
    DATABASE_URL: "mysql://alnajah:secret@127.0.0.1:3306/alnajah",
  });
  assert(localhost.ok && localhost.host === "127.0.0.1", "production Hostinger localhost MySQL allowed");

  const localhostOverride = checkProductionDatabaseUrl({
    NODE_ENV: "production",
    [ALLOW_PRODUCTION_LOCAL_DB_ENV]: "1",
    DATABASE_URL: "mysql://alnajah:secret@127.0.0.1:3306/alnajah",
  });
  assert(localhostOverride.ok, "ALLOW_PRODUCTION_LOCAL_DB=1 still allows localhost MySQL");

  const remote = checkProductionDatabaseUrl({
    NODE_ENV: "production",
    DATABASE_URL: "mysql://app:s3cret@mysql.hostinger.example:3306/alnajah",
  });
  assert(remote.ok && remote.host === "mysql.hostinger.example", "remote MySQL URL accepted");

  const devMysql = checkProductionDatabaseUrl({
    NODE_ENV: "development",
    DATABASE_URL: "mysql://alnajah:secret@127.0.0.1:3306/alnajah",
  });
  assert(devMysql.ok, "development MySQL URL allowed");

  const parsed = parseDatabaseUrl("mysql://u:p@host/db");
  assert(parsed.ok, "parse accepts mysql URL");
  assert(parseDatabaseUrl("postgresql://u:p@host/db").ok, "parse still accepts postgresql for legacy local");
  assert(hasPgliteQueryFingerprint(new URL("http://x?pgbouncer=true&connection_limit=1").searchParams), "fingerprint helper");
  assert(productionDatabaseUrlRefusalMessage("missing_database_url").includes("REFUSED"), "refusal message clear");

  assert(isNextProductionBuildPhase({ NEXT_PHASE: "phase-production-build" }), "build phase detector works");
  assert(!isNextProductionBuildPhase({}), "non-build phase is false");

  let threw = false;
  const prevError = console.error;
  console.error = () => {};
  try {
    assertProductionDatabaseConfigured({ NODE_ENV: "production", DATABASE_URL: "" });
  } catch {
    threw = true;
  } finally {
    console.error = prevError;
  }
  assert(threw, "assert throws when production DATABASE_URL missing");

  let buildSkipped = true;
  try {
    assertProductionDatabaseConfigured({
      NODE_ENV: "production",
      NEXT_PHASE: "phase-production-build",
      DATABASE_URL: "",
    });
  } catch {
    buildSkipped = false;
  }
  assert(buildSkipped, "assert skips during next production build phase");

  const seedProd = resolveSeedMode({ NODE_ENV: "production" });
  assert(seedProd.mode === "safe-bootstrap" && seedProd.refusedDestructive, "destructive production seed remains blocked");

  console.log("Database environment verification passed.");
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
