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
  const docs = readFileSync(join(root, "docs/production-database.md"), "utf8");
  const compose = readFileSync(join(root, "docker-compose.yml"), "utf8");
  const envExample = readFileSync(join(root, ".env.example"), "utf8");

  assertNeverLogsSecrets(dbEnvSrc, "db-env.ts");
  assertNeverLogsSecrets(instrumentationSrc, "instrumentation.ts");
  assertNeverLogsSecrets(healthSrc, "health/db/route.ts");
  assert(healthSrc.includes("HEALTH_CHECK_SECRET"), "health uses HEALTH_CHECK_SECRET");
  assert(!healthSrc.includes("AUTOMATION_CRON_SECRET"), "health must not reuse AUTOMATION_CRON_SECRET");
  assert(healthSrc.includes("authorizeHealthCheck"), "health has authorizeHealthCheck");
  assert(instrumentationSrc.includes("assertProductionDatabaseConfigured"), "instrumentation asserts DB env");

  assert(pkg.scripts["db:migrate"] === "prisma migrate deploy", "db:migrate remains migrate deploy");
  assert(pkg.scripts["db:push:dev"] === "prisma db push", "db:push:dev is development push");
  assert(!pkg.scripts["db:push"], "db:push must be renamed away");
  assert(pkg.scripts["verify:db-env"]?.includes("db-env-verify"), "verify:db-env script exists");
  assert(!pkg.scripts.build.includes("db:seed"), "build must not seed");
  assert(!pkg.scripts.build.includes("pg-server"), "build must not start PGlite");
  assert(pkg.scripts.start === "next start", "start is next start only");

  assert(readme.includes("docs/production-database.md"), "README links production DB docs");
  assert(docs.includes("prisma migrate deploy"), "docs mention migrate deploy");
  assert(docs.includes("RPO"), "docs mention RPO");
  assert(docs.includes("TBD"), "docs mark unset DR targets as TBD");
  assert(docs.toLowerCase().includes("not configured") || docs.includes("NOT configured"), "docs do not claim backups exist");
  assert(/development[- ]only|NOT FOR PRODUCTION/i.test(compose), "compose labeled development-only");

  assert(envExample.includes("REQUIRED PRODUCTION"), ".env.example has REQUIRED PRODUCTION section");
  assert(envExample.includes("HEALTH_CHECK_SECRET"), ".env.example documents HEALTH_CHECK_SECRET");
  assert(envExample.includes(ALLOW_PRODUCTION_LOCAL_DB_ENV), ".env.example documents local override");

  const missing = checkProductionDatabaseUrl({ NODE_ENV: "production" });
  assert(!missing.ok && missing.code === "missing_database_url", "production missing DATABASE_URL fails");

  const empty = checkProductionDatabaseUrl({ NODE_ENV: "production", DATABASE_URL: "   " });
  assert(!empty.ok && empty.code === "missing_database_url", "production blank DATABASE_URL fails");

  const pglite = checkProductionDatabaseUrl({
    NODE_ENV: "production",
    DATABASE_URL:
      "postgresql://postgres:postgres@127.0.0.1:5433/postgres?sslmode=disable&pgbouncer=true&connection_limit=1",
  });
  assert(!pglite.ok && pglite.code === "pglite_port", "production PGlite port fails");

  const pgliteQuery = checkProductionDatabaseUrl({
    NODE_ENV: "production",
    DATABASE_URL: "postgresql://u:p@db.example.com:5432/app?pgbouncer=true&connection_limit=1",
  });
  assert(!pgliteQuery.ok && pgliteQuery.code === "pglite_query_fingerprint", "PGlite query fingerprint fails on remote host");

  const localhost = checkProductionDatabaseUrl({
    NODE_ENV: "production",
    DATABASE_URL: "postgresql://alnajah:secret@127.0.0.1:5432/alnajah?sslmode=disable",
  });
  assert(!localhost.ok && localhost.code === "localhost_rejected", "production localhost fails by default");

  const localhostOverride = checkProductionDatabaseUrl({
    NODE_ENV: "production",
    [ALLOW_PRODUCTION_LOCAL_DB_ENV]: "1",
    DATABASE_URL: "postgresql://alnajah:secret@127.0.0.1:5432/alnajah?sslmode=disable",
  });
  assert(localhostOverride.ok, "ALLOW_PRODUCTION_LOCAL_DB=1 allows localhost real Postgres");

  const overrideStillBlocksPglite = checkProductionDatabaseUrl({
    NODE_ENV: "production",
    [ALLOW_PRODUCTION_LOCAL_DB_ENV]: "1",
    DATABASE_URL:
      "postgresql://postgres:postgres@127.0.0.1:5433/postgres?sslmode=disable&pgbouncer=true&connection_limit=1",
  });
  assert(
    !overrideStillBlocksPglite.ok && overrideStillBlocksPglite.code === "pglite_port",
    "override never permits PGlite port",
  );

  const overrideStillBlocksFingerprint = checkProductionDatabaseUrl({
    NODE_ENV: "production",
    [ALLOW_PRODUCTION_LOCAL_DB_ENV]: "1",
    DATABASE_URL: "postgresql://u:p@localhost:5432/app?pgbouncer=true&connection_limit=1",
  });
  assert(
    !overrideStillBlocksFingerprint.ok && overrideStillBlocksFingerprint.code === "pglite_query_fingerprint",
    "override never permits PGlite query fingerprint",
  );

  const remote = checkProductionDatabaseUrl({
    NODE_ENV: "production",
    DATABASE_URL: "postgresql://app:s3cret@db.example.com:5432/alnajah?sslmode=require",
  });
  assert(remote.ok && remote.host === "db.example.com", "remote PostgreSQL URL accepted");

  const remotePgbouncer = checkProductionDatabaseUrl({
    NODE_ENV: "production",
    DATABASE_URL: "postgresql://app:s3cret@pool.example.com:6432/alnajah?pgbouncer=true&sslmode=require",
  });
  assert(remotePgbouncer.ok, "legitimate remote PgBouncer URL (without connection_limit=1) accepted");

  const devPglite = checkProductionDatabaseUrl({
    NODE_ENV: "development",
    DATABASE_URL:
      "postgresql://postgres:postgres@127.0.0.1:5433/postgres?sslmode=disable&pgbouncer=true&connection_limit=1",
  });
  assert(devPglite.ok, "development PGlite URL remains allowed");

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

  const parsed = parseDatabaseUrl("postgresql://u:p@host/db");
  assert(parsed.ok, "parse accepts postgresql URL");
  assert(hasPgliteQueryFingerprint(new URL("http://x?pgbouncer=true&connection_limit=1").searchParams), "fingerprint helper");
  assert(productionDatabaseUrlRefusalMessage("missing_database_url").includes("REFUSED"), "refusal message clear");

  const seedProd = resolveSeedMode({ NODE_ENV: "production" });
  assert(seedProd.mode === "safe-bootstrap" && seedProd.refusedDestructive, "destructive production seed remains blocked");

  console.log("Database environment verification passed.");
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
