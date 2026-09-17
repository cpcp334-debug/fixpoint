/**
 * Production DATABASE_URL safety.
 * Never log DATABASE_URL or credentials — only stable rejection codes / safe messages.
 *
 * Production target: Hostinger MySQL (`mysql://`). Local PGlite / Postgres URLs
 * remain allowed only in non-production for legacy `npm run pg`.
 */

export const ALLOW_PRODUCTION_LOCAL_DB_ENV = "ALLOW_PRODUCTION_LOCAL_DB";

export type EnvLike = Record<string, string | undefined>;

export type DbEnvRejectionCode =
  | "missing_database_url"
  | "invalid_database_url"
  | "unsupported_scheme"
  | "localhost_rejected"
  | "pglite_port"
  | "pglite_query_fingerprint";

export type DbEnvCheckResult =
  | { ok: true; host: string; port: string }
  | { ok: false; code: DbEnvRejectionCode; message: string };

function isProduction(env: EnvLike) {
  return env.NODE_ENV === "production";
}

/** Next.js sets this during `next build` — must not require a live prod DB. */
export function isNextProductionBuildPhase(env: EnvLike = process.env) {
  return env.NEXT_PHASE === "phase-production-build";
}

export function allowsProductionLocalDb(env: EnvLike = process.env) {
  return env[ALLOW_PRODUCTION_LOCAL_DB_ENV] === "1";
}

function isLoopbackHost(host: string) {
  const h = host.trim().toLowerCase().replace(/^\[|\]$/g, "");
  return h === "localhost" || h === "127.0.0.1" || h === "::1" || h === "0:0:0:0:0:0:0:1";
}

/**
 * Local PGlite (npm run pg) uses port 5433 and the query pair
 * pgbouncer=true + connection_limit=1. Real remote PgBouncer may use
 * pgbouncer=true alone — that is allowed. The PGlite pair is never allowed in production.
 */
export function hasPgliteQueryFingerprint(searchParams: URLSearchParams) {
  const pgbouncer = (searchParams.get("pgbouncer") || "").toLowerCase() === "true";
  const connectionLimit = searchParams.get("connection_limit");
  return pgbouncer && connectionLimit === "1";
}

export function parseDatabaseUrl(raw: string): { ok: true; url: URL } | { ok: false; code: DbEnvRejectionCode; message: string } {
  const trimmed = raw.trim();
  if (!trimmed) {
    return { ok: false, code: "missing_database_url", message: "DATABASE_URL is missing or empty." };
  }
  let normalized = trimmed;
  if (normalized.startsWith("mysql://")) {
    normalized = `http://${normalized.slice("mysql://".length)}`;
  } else if (normalized.startsWith("mysqls://")) {
    normalized = `http://${normalized.slice("mysqls://".length)}`;
  } else if (normalized.startsWith("postgresql://")) {
    normalized = `http://${normalized.slice("postgresql://".length)}`;
  } else if (normalized.startsWith("postgres://")) {
    normalized = `http://${normalized.slice("postgres://".length)}`;
  } else {
    return {
      ok: false,
      code: "unsupported_scheme",
      message: "DATABASE_URL must use mysql:// (production) or postgresql:// / postgres:// (legacy local).",
    };
  }
  try {
    const url = new URL(normalized);
    if (!url.hostname) {
      return { ok: false, code: "invalid_database_url", message: "DATABASE_URL host is missing." };
    }
    return { ok: true, url };
  } catch {
    return {
      ok: false,
      code: "invalid_database_url",
      message: "DATABASE_URL could not be parsed.",
    };
  }
}

export function productionDatabaseUrlRefusalMessage(code: DbEnvRejectionCode) {
  const lines = [
    "REFUSED: Production database configuration is invalid.",
    `Reason code: ${code}`,
    "",
    "Production requires NODE_ENV=production and a real MySQL DATABASE_URL (Hostinger).",
    "PGlite and local development databases must not be used accidentally.",
    "",
    "Rejected patterns include:",
    "  - missing DATABASE_URL",
    "  - unsupported scheme (use mysql:// for production)",
    "  - localhost / 127.0.0.1 / ::1 (unless ALLOW_PRODUCTION_LOCAL_DB=1)",
    "  - PGlite default port 5433 (never allowed in production)",
    "  - PGlite query fingerprint pgbouncer=true&connection_limit=1 (never allowed in production)",
    "",
    "ALLOW_PRODUCTION_LOCAL_DB=1 only relaxes the localhost host check.",
    "It never permits PGlite fingerprints.",
    "Do not log or print DATABASE_URL when debugging — check reason codes only.",
  ];
  return lines.join("\n");
}

/**
 * Validate DATABASE_URL for production use.
 * Non-production environments always pass (local MySQL / legacy PGlite allowed).
 */
export function checkProductionDatabaseUrl(env: EnvLike = process.env): DbEnvCheckResult {
  if (!isProduction(env)) {
    const raw = env.DATABASE_URL || "";
    if (!raw.trim()) {
      return { ok: true, host: "", port: "" };
    }
    const parsed = parseDatabaseUrl(raw);
    if (!parsed.ok) return { ok: true, host: "", port: "" };
    const defaultPort = raw.trim().startsWith("mysql") ? "3306" : "5432";
    return {
      ok: true,
      host: parsed.url.hostname,
      port: parsed.url.port || defaultPort,
    };
  }

  const raw = env.DATABASE_URL;
  if (!raw || !raw.trim()) {
    return {
      ok: false,
      code: "missing_database_url",
      message: productionDatabaseUrlRefusalMessage("missing_database_url"),
    };
  }

  const trimmed = raw.trim();
  if (!trimmed.startsWith("mysql://") && !trimmed.startsWith("mysqls://")) {
    return {
      ok: false,
      code: "unsupported_scheme",
      message: productionDatabaseUrlRefusalMessage("unsupported_scheme"),
    };
  }

  const parsed = parseDatabaseUrl(raw);
  if (!parsed.ok) {
    return {
      ok: false,
      code: parsed.code,
      message: productionDatabaseUrlRefusalMessage(parsed.code),
    };
  }

  const { url } = parsed;
  const port = url.port || "3306";

  if (port === "5433") {
    return {
      ok: false,
      code: "pglite_port",
      message: productionDatabaseUrlRefusalMessage("pglite_port"),
    };
  }

  if (hasPgliteQueryFingerprint(url.searchParams)) {
    return {
      ok: false,
      code: "pglite_query_fingerprint",
      message: productionDatabaseUrlRefusalMessage("pglite_query_fingerprint"),
    };
  }

  if (isLoopbackHost(url.hostname) && !allowsProductionLocalDb(env)) {
    return {
      ok: false,
      code: "localhost_rejected",
      message: productionDatabaseUrlRefusalMessage("localhost_rejected"),
    };
  }

  return { ok: true, host: url.hostname, port };
}

/**
 * Throw if production DATABASE_URL is unsafe.
 * Skips during `next build` (NEXT_PHASE=phase-production-build).
 */
export function assertProductionDatabaseConfigured(env: EnvLike = process.env): void {
  if (!isProduction(env)) return;
  if (isNextProductionBuildPhase(env)) return;

  const result = checkProductionDatabaseUrl(env);
  if (result.ok) return;

  console.error(result.message);
  console.error(`db-env rejection code: ${result.code}`);
  throw new Error(`Production database configuration refused (${result.code}).`);
}
