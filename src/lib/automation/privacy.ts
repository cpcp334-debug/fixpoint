const BLOCKED_KEYS = new Set([
  "ip",
  "useragent",
  "user-agent",
  "ua",
  "fingerprint",
  "transcript",
  "messages",
  "phone",
  "email",
  "whatsapp",
  "requirement",
  "photos",
  "photokey",
  "body",
  "notes",
  "customerphone",
  "customeremail",
  "customerwhatsapp",
]);

export function isBlockedKey(key: string) {
  return BLOCKED_KEYS.has(key.replace(/[_-]/g, "").toLowerCase()) || BLOCKED_KEYS.has(key.toLowerCase());
}

export function sanitizeAutomationPayload(raw: unknown, maxBytes = 2048): Record<string, unknown> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (isBlockedKey(key)) continue;
    if (value === null || typeof value === "boolean" || typeof value === "number") {
      out[key] = value;
      continue;
    }
    if (typeof value === "string") {
      out[key] = value.slice(0, 80);
      continue;
    }
  }
  const encoded = JSON.stringify(out);
  if (encoded.length > maxBytes) return {};
  return out;
}

export function sanitizeError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error || "error");
  return stripBlockedText(message).slice(0, 300);
}

export function stripBlockedText(value: string) {
  return value.replace(/\b(?:\+?\d[\d\s-]{7,}\d)\b/g, "[redacted]").replace(/\b\S+@\S+\.\S+\b/g, "[redacted]");
}

export function containsBlockedPrivacy(value: unknown) {
  const raw = JSON.stringify(value).toLowerCase();
  return [
    '"ip"',
    "user-agent",
    "useragent",
    "fingerprint",
    "transcript",
    '"messages"',
    '"phone"',
    '"email"',
    "whatsapp",
    "requirement",
    "photokey",
  ].some((token) => raw.includes(token));
}
