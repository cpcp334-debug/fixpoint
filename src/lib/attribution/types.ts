/** Paid / campaign attribution captured from landing URL — no PII. */

export const ATTRIBUTION_KEYS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
  "gclid",
  "gbraid",
  "wbraid",
] as const;

export type AttributionKey = (typeof ATTRIBUTION_KEYS)[number];

export type AttributionPayload = Partial<Record<AttributionKey, string>> & {
  landing_path?: string;
  captured_at?: string;
};

/** Prisma column mapping for Lead / Booking. */
export type AttributionColumns = {
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  utmTerm: string | null;
  utmContent: string | null;
  gclid: string | null;
  gbraid: string | null;
  wbraid: string | null;
  landingPath: string | null;
};

export const ATTR_STORAGE_KEY = "alnajah_attr_v1";
export const ATTR_COOKIE = "alnajah_attr";
/** 90 days — covers typical Ads click → convert window. */
export const ATTR_MAX_AGE_SEC = 90 * 24 * 60 * 60;
