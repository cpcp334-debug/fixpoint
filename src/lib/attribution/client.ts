"use client";

import {
  ATTR_COOKIE,
  ATTR_MAX_AGE_SEC,
  ATTR_STORAGE_KEY,
  ATTRIBUTION_KEYS,
  type AttributionPayload,
} from "@/lib/attribution/types";
import { mergeFirstTouch } from "@/lib/attribution/shared";

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const parts = document.cookie.split(";");
  for (const part of parts) {
    const trimmed = part.trim();
    const eq = trimmed.indexOf("=");
    if (eq < 1) continue;
    if (trimmed.slice(0, eq) !== name) continue;
    try {
      return decodeURIComponent(trimmed.slice(eq + 1));
    } catch {
      return trimmed.slice(eq + 1);
    }
  }
  return null;
}

function writeCookie(name: string, value: string) {
  if (typeof document === "undefined") return;
  const secure = typeof location !== "undefined" && location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=${ATTR_MAX_AGE_SEC}; SameSite=Lax${secure}`;
}

function parseStored(raw: string | null): AttributionPayload | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return null;
    return parsed as AttributionPayload;
  } catch {
    return null;
  }
}

export function readStoredAttribution(): AttributionPayload | null {
  if (typeof window === "undefined") return null;
  try {
    const fromLs = parseStored(window.localStorage.getItem(ATTR_STORAGE_KEY));
    const fromCookie = parseStored(readCookie(ATTR_COOKIE));
    return mergeFirstTouch(fromLs, fromCookie);
  } catch {
    return null;
  }
}

function persistAttribution(attr: AttributionPayload) {
  if (typeof window === "undefined") return;
  const json = JSON.stringify(attr);
  try {
    window.localStorage.setItem(ATTR_STORAGE_KEY, json);
  } catch {
    // private mode / quota
  }
  writeCookie(ATTR_COOKIE, json);
}

/** Capture utm_* + click ids from the current URL (first-touch; never overwrite). */
export function captureAttributionFromUrl(search?: string, pathname?: string): AttributionPayload | null {
  if (typeof window === "undefined") return null;
  const params = new URLSearchParams(search ?? window.location.search);
  const incoming: AttributionPayload = {};
  for (const key of ATTRIBUTION_KEYS) {
    const v = params.get(key)?.trim();
    if (v) incoming[key] = v.slice(0, 200);
  }
  const path = pathname ?? window.location.pathname;
  if (path.startsWith("/")) {
    incoming.landing_path = path.slice(0, 500);
  }
  if (!Object.keys(incoming).some((k) => k !== "landing_path" && (incoming as Record<string, string>)[k])) {
    // No campaign params — still keep existing store; optionally set landing if empty.
    const existing = readStoredAttribution();
    if (existing) return existing;
    return null;
  }
  incoming.captured_at = new Date().toISOString();
  const merged = mergeFirstTouch(readStoredAttribution(), incoming);
  if (merged) persistAttribution(merged);
  return merged;
}

/** Payload to attach on lead/booking POST (no PII). */
export function getAttributionForSubmit(): AttributionPayload | null {
  captureAttributionFromUrl();
  return readStoredAttribution();
}

