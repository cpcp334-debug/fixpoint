/**
 * Production seed safety for Al Najah Al Daem · Fixpoint.
 * Destructive wipe (deleteMany of operational / catalog rows) is refused in
 * NODE_ENV=production unless an explicit emergency override is set.
 */

export const DESTRUCTIVE_PRODUCTION_OVERRIDE_ENV = "ALLOW_DESTRUCTIVE_PRODUCTION_SEED";
/** Exact value required — not a simple "1". Separately named from SEED_STAFF_ONLY. */
export const DESTRUCTIVE_PRODUCTION_OVERRIDE_VALUE = "I_UNDERSTAND_DELETE_ALL_OPERATIONAL_DATA";

export type SeedMode = "destructive" | "safe-bootstrap";

export type EnvLike = Record<string, string | undefined>;

export function isProductionEnv(env: EnvLike = process.env) {
  return env.NODE_ENV === "production";
}

/** True when the caller did not request staff/bootstrap-only seeding. */
export function wantsDestructiveCatalogSeed(env: EnvLike = process.env) {
  return env.SEED_STAFF_ONLY !== "1";
}

export function hasDestructiveProductionOverride(env: EnvLike = process.env) {
  return env[DESTRUCTIVE_PRODUCTION_OVERRIDE_ENV] === DESTRUCTIVE_PRODUCTION_OVERRIDE_VALUE;
}

export function destructiveSeedRefusalMessage() {
  return [
    "REFUSED: Destructive database seeding is blocked in production.",
    "NODE_ENV=production forbids mass-deletion of operational data (customers, leads,",
    "bookings, quotes, invoices, work orders, payments, reviews, questions, automation,",
    "AMC, audit-related operational rows, uploaded asset references, etc.).",
    "",
    "Normal production seeding runs the SAFE bootstrap only:",
    "  - optional staff super_admin upsert (ADMIN_EMAIL / ADMIN_PASSWORD)",
    "  - disabled example automation rules (upsert)",
    "  - template INTERNAL SOPs (upsert)",
    "",
    "SEED_STAFF_ONLY=1 alone is not a production wipe guard — production already",
    "defaults to safe bootstrap. Use SEED_STAFF_ONLY=1 in any environment to skip",
    "the development catalog wipe path.",
    "",
    "Emergency override (local disaster recovery only — never routine):",
    `  ${DESTRUCTIVE_PRODUCTION_OVERRIDE_ENV}=${DESTRUCTIVE_PRODUCTION_OVERRIDE_VALUE}`,
    "Do not set that override in normal production deploys or CI.",
  ].join("\n");
}

/**
 * Resolve seed mode.
 * - development/test: destructive catalog wipe unless SEED_STAFF_ONLY=1
 * - production: always safe-bootstrap unless the emergency override is set
 *   AND SEED_STAFF_ONLY is not forcing bootstrap-only
 */
export function resolveSeedMode(env: EnvLike = process.env): {
  mode: SeedMode;
  refusedDestructive: boolean;
  reason: string;
} {
  if (!wantsDestructiveCatalogSeed(env)) {
    return {
      mode: "safe-bootstrap",
      refusedDestructive: false,
      reason: "SEED_STAFF_ONLY=1 — bootstrap only (no catalog wipe).",
    };
  }
  if (isProductionEnv(env)) {
    if (hasDestructiveProductionOverride(env)) {
      return {
        mode: "destructive",
        refusedDestructive: false,
        reason: "Emergency production override accepted — destructive wipe allowed.",
      };
    }
    return {
      mode: "safe-bootstrap",
      refusedDestructive: true,
      reason: "Production default — destructive wipe refused; safe bootstrap only.",
    };
  }
  return {
    mode: "destructive",
    refusedDestructive: false,
    reason: "Non-production environment — destructive catalog seed allowed.",
  };
}

export function assertDestructiveSeedAllowed(env: EnvLike = process.env): { ok: true } | { ok: false; message: string } {
  const resolved = resolveSeedMode(env);
  if (resolved.mode === "destructive") return { ok: true };
  if (resolved.refusedDestructive) return { ok: false, message: destructiveSeedRefusalMessage() };
  return { ok: false, message: resolved.reason };
}
