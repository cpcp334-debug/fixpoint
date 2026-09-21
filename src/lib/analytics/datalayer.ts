/**
 * dataLayer helpers for GTM → GA4 / Google Ads.
 * Never put PII (name, phone, email, requirement text) in events.
 */

export type ConversionEventName =
  | "quote_submit_success"
  | "booking_submit_success"
  | "contact_submit_success";

declare global {
  interface Window {
    dataLayer?: Record<string, unknown>[];
  }
}

export function pushDataLayer(event: ConversionEventName, extra?: Record<string, unknown>) {
  if (typeof window === "undefined") return;
  window.dataLayer = window.dataLayer || [];
  const payload: Record<string, unknown> = { event };
  if (extra) {
    for (const [k, v] of Object.entries(extra)) {
      // Hard deny common PII keys even if a caller slips.
      if (/name|phone|email|whatsapp|requirement|message|address/i.test(k)) continue;
      if (v === undefined || v === null) continue;
      payload[k] = v;
    }
  }
  window.dataLayer.push(payload);
}

/** Session-once guard so reloads / back-nav do not double-fire Ads conversions. */
export function pushConversionOnce(storageKey: string, event: ConversionEventName, extra?: Record<string, unknown>) {
  if (typeof window === "undefined") return false;
  try {
    if (window.sessionStorage.getItem(storageKey) === "1") return false;
    window.sessionStorage.setItem(storageKey, "1");
  } catch {
    // continue without guard if storage blocked
  }
  pushDataLayer(event, extra);
  return true;
}
