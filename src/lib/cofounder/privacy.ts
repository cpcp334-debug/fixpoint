const BLOCKED_KEYS = new Set([
  "ip",
  "useragent",
  "user-agent",
  "ua",
  "fingerprint",
  "transcript",
  "messages",
  "password",
  "passwordhash",
  "token",
  "tokenhash",
  "apikey",
  "secret",
  "photokey",
  "photos",
  "base64",
  "uploadtoken",
  "passport",
  "emiratesid",
  "identitydocument",
]);

export function isBlockedCofounderKey(key: string) {
  const normalized = key.replace(/[_-]/g, "").toLowerCase();
  return BLOCKED_KEYS.has(normalized) || BLOCKED_KEYS.has(key.toLowerCase());
}

export function sanitizeCofounderData(value: unknown, depth = 0, key = ""): unknown {
  if (depth > 10) return null;
  if (value === null || typeof value === "boolean" || typeof value === "number") return value;
  if (typeof value === "string") {
    const max = key === "body" || key === "excerpt" ? 4000 : 400;
    return value.slice(0, max);
  }
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.slice(0, 30).map((item) => sanitizeCofounderData(item, depth + 1));
  if (!value || typeof value !== "object") return null;
  const out: Record<string, unknown> = {};
  for (const [nestedKey, nested] of Object.entries(value as Record<string, unknown>)) {
    if (isBlockedCofounderKey(nestedKey)) continue;
    out[nestedKey] = sanitizeCofounderData(nested, depth + 1, nestedKey);
  }
  return out;
}

export function auditMetaForTool(tool: string, result: { ok: boolean; denied?: boolean; error?: string }) {
  return JSON.stringify({
    tool,
    ok: result.ok,
    denied: Boolean(result.denied),
    error: (result.error || "").slice(0, 80),
  });
}

export function containsBlockedPrivacy(value: unknown) {
  const raw = JSON.stringify(value).toLowerCase();
  return ['"ip"', "user-agent", "useragent", "fingerprint", "transcript", "passwordhash", "photokey"].some((token) =>
    raw.includes(token),
  );
}
