/** Server-safe GTM id reader — no invented defaults. */

export function readGtmId(env: NodeJS.ProcessEnv = process.env): string | null {
  const raw = (env.NEXT_PUBLIC_GTM_ID || "").trim();
  if (!raw || !/^GTM-[A-Z0-9]+$/i.test(raw)) return null;
  return raw;
}
