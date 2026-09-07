export function cn(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

export function parseJson<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

export function pickI18n<T extends { locale: string }>(
  rows: T[],
  locale: string,
): T | undefined {
  return rows.find((row) => row.locale === locale) ?? rows.find((row) => row.locale === "en") ?? rows[0];
}

export function formatPhoneHref(phone: string) {
  return `tel:${phone.replace(/\s/g, "")}`;
}
