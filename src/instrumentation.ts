/**
 * Next.js instrumentation — production startup guards.
 * Must not run DATABASE_URL checks during `next build` (see db-env isNextProductionBuildPhase).
 */
export async function register() {
  if (process.env.NEXT_RUNTIME && process.env.NEXT_RUNTIME !== "nodejs") return;

  const { assertProductionDatabaseConfigured } = await import("./server/db-env");
  assertProductionDatabaseConfigured();
}
