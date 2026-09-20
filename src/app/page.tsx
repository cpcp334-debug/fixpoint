/**
 * Apex `/` is handled by middleware rewrite → `/en` (no HTTP redirect).
 * This file exists only as a filesystem fallback; it must never 3xx.
 */
export default function RootPage() {
  return null;
}
