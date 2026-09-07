export const MODEL_VERSION = "2f2.1";

export const QUALITY_CLASSES = ["HOT", "WARM", "NORMAL", "REVIEW", "SPAM"] as const;
export type QualityClass = (typeof QUALITY_CLASSES)[number];

export type Reason = {
  code: string;
  points: number;
  label: string;
  spam?: boolean;
};

export function isQualityClass(value: string): value is QualityClass {
  return (QUALITY_CLASSES as readonly string[]).includes(value);
}

export function digits(phone: string) {
  return phone.replace(/\D/g, "");
}

/** UAE-shaped mobile/landline. Missing-country 05x and +971 are accepted. */
export function isValidUaePhone(phone: string) {
  const d = digits(phone);
  if (d.startsWith("971") && d.length >= 11 && d.length <= 12) return true;
  if (d.startsWith("05") && d.length >= 9 && d.length <= 10) return true;
  if (d.startsWith("5") && d.length === 9) return true;
  return false;
}

export function isValidEmail(email: string | null | undefined) {
  if (!email) return false;
  const v = email.trim();
  const at = v.indexOf("@");
  if (at < 1) return false;
  const domain = v.slice(at + 1);
  return domain.includes(".") && !v.includes(" ");
}

export function isClearRequirement(text: string) {
  const t = text.replace(/\s+/g, " ").trim();
  if (t.length < 20) return false;
  if (/^(.)\1+$/u.test(t.replace(/\s/g, ""))) return false;
  return true;
}

const SPAM_WORDS =
  /\b(bitcoin|btc|crypto|forex|viagra|cialis|casino|backlink|seo\s*rank|seo\s*backlink|بيتكوين|فوركس)\b/iu;

export function hasSpamLexicon(text: string) {
  const urls = text.match(/https?:\/\//gi) || [];
  if (urls.length >= 2) return true;
  if (SPAM_WORDS.test(text) && urls.length >= 1) return true;
  if (SPAM_WORDS.test(text)) return true;
  return false;
}

export function photoCount(photos: string) {
  try {
    const parsed = JSON.parse(photos) as unknown;
    return Array.isArray(parsed) ? parsed.length : 0;
  } catch {
    return 0;
  }
}
