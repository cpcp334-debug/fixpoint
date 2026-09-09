import { isReservedSlug } from "@/config/reserved-slugs";

export const CLIENT_EVENT_NAMES = [
  "PAGE_VIEW",
  "SERVICE_VIEW",
  "LOCATION_VIEW",
  "SERVICE_LOCATION_VIEW",
  "DIY_VIEW",
  "WHATSAPP_CLICK",
  "PHONE_CLICK",
  "EMAIL_CLICK",
  "SHARE",
  "QUOTE_START",
  "BOOKING_START",
  "SERVICE_LOCATION_QUOTE_START",
  "SERVICE_LOCATION_BOOKING_START",
  "SERVICE_LOCATION_WHATSAPP",
  "SERVICE_LOCATION_CALL",
  "REVIEW_START",
  "QUESTION_START",
  "CONTACT_START",
] as const;

export const SERVER_EVENT_NAMES = [
  "AI_OPEN",
  "AI_MESSAGE",
  "AI_SERVICE_SUGGESTION",
  "AI_HANDOVER",
  "PHOTO_UPLOAD",
  "QUOTE_SUBMIT",
  "BOOKING_SUBMIT",
  "CONTACT_SUBMIT",
  "REVIEW_SUBMIT",
  "QUESTION_SUBMIT",
] as const;

export type ClientEventName = (typeof CLIENT_EVENT_NAMES)[number];
export type ServerEventName = (typeof SERVER_EVENT_NAMES)[number];
export type AnalyticsEventName = ClientEventName | ServerEventName;

export const START_EVENTS = new Set<string>([
  "QUOTE_START",
  "BOOKING_START",
  "REVIEW_START",
  "QUESTION_START",
  "CONTACT_START",
]);

export const META_KEYS = new Set(["slug", "count", "riskClass"]);
export const MAX_BATCH = 20;
export const MAX_BODY_BYTES = 16_384;
export const MAX_PATH = 200;
export const MAX_META_BYTES = 512;

export type TrackableView = {
  name: ClientEventName;
  entityType?: string;
  entityId?: string;
};

export function sanitizePath(raw: string) {
  const path = raw.split("?")[0].split("#")[0].slice(0, MAX_PATH);
  return path.startsWith("/") ? path : `/${path}`;
}

export function localeFromPath(pathname: string): "en" | "ar" | null {
  const first = pathname.split("/").filter(Boolean)[0];
  return first === "ar" || first === "en" ? first : null;
}

export function publicPathWithoutLocale(pathname: string) {
  const clean = sanitizePath(pathname);
  const parts = clean.split("/").filter(Boolean);
  if (parts[0] === "en" || parts[0] === "ar") {
    return `/${parts.slice(1).join("/")}`;
  }
  return clean === "" ? "/" : clean;
}

export function viewsForPath(pathname: string): TrackableView[] {
  const rest = publicPathWithoutLocale(pathname);
  const parts = rest.split("/").filter(Boolean);
  const views: TrackableView[] = [{ name: "PAGE_VIEW" }];
  if (parts.length === 0) return views;

  if (parts[0] === "locations" && parts[1] && !parts[2]) {
    views.push({ name: "LOCATION_VIEW", entityType: "location", entityId: parts[1] });
    return views;
  }
  if (parts[0] === "diy" && parts[1] && !parts[2]) {
    views.push({ name: "DIY_VIEW", entityType: "diy", entityId: parts[1] });
    return views;
  }
  if (!isReservedSlug(parts[0]) && !parts[0].includes(".")) {
    views.push({ name: "SERVICE_VIEW", entityType: "service", entityId: parts[0] });
    if (parts[1]) {
      views.push({ name: "LOCATION_VIEW", entityType: "location", entityId: parts[1] });
      views.push({
        name: "SERVICE_LOCATION_VIEW",
        entityType: "service_location",
        entityId: `${parts[0]}/${parts[1]}`,
      });
    }
  }
  return views;
}

export function sanitizeMeta(raw: unknown): Record<string, string | number> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const out: Record<string, string | number> = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (!META_KEYS.has(key)) continue;
    if (typeof value === "number" && Number.isFinite(value)) out[key] = value;
    else if (typeof value === "string") out[key] = value.slice(0, 80);
  }
  const encoded = JSON.stringify(out);
  if (encoded.length > MAX_META_BYTES) return {};
  return out;
}
