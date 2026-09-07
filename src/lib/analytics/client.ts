"use client";

import { START_EVENTS, type ClientEventName } from "@/lib/analytics/types";

type Queued = { n: ClientEventName; p?: string; e?: string; i?: string; m?: Record<string, string | number> };

const queue: Queued[] = [];
let flushTimer: number | null = null;
let cookiesReady = false;
let started = false;

function localeFromPath(pathname: string): "en" | "ar" {
  return pathname.split("/").filter(Boolean)[0] === "ar" ? "ar" : "en";
}

function startKey(name: string) {
  return `alnajah_start_${name}`;
}

export function trackClient(
  name: ClientEventName,
  extra?: { path?: string; entityType?: string; entityId?: string; meta?: Record<string, string | number> },
) {
  if (typeof window === "undefined") return;
  if (START_EVENTS.has(name)) {
    try {
      if (sessionStorage.getItem(startKey(name))) return;
      sessionStorage.setItem(startKey(name), "1");
    } catch {
      /* ignore quota */
    }
  }
  queue.push({
    n: name,
    p: extra?.path || window.location.pathname,
    e: extra?.entityType,
    i: extra?.entityId,
    m: extra?.meta,
  });
  scheduleFlush(false);
}

function scheduleFlush(useBeacon: boolean) {
  if (useBeacon) {
    void flush(true);
    return;
  }
  if (flushTimer != null) return;
  const later = (cb: () => void) => {
    if (typeof window.requestIdleCallback === "function") {
      window.requestIdleCallback(cb, { timeout: 2000 });
    } else {
      window.setTimeout(cb, 200);
    }
  };
  flushTimer = window.setTimeout(() => {
    flushTimer = null;
    later(() => void flush(false));
  }, 200);
}

async function flush(useBeacon: boolean) {
  if (!queue.length) return;
  const events = queue.splice(0, 20);
  const body = JSON.stringify({ events, locale: localeFromPath(window.location.pathname) });
  try {
    if (useBeacon && cookiesReady && navigator.sendBeacon) {
      navigator.sendBeacon("/api/t", new Blob([body], { type: "application/json" }));
      return;
    }
    await fetch("/api/t", {
      method: "POST",
      credentials: "include",
      keepalive: true,
      headers: { "content-type": "application/json" },
      body,
    });
    cookiesReady = true;
  } catch {
    queue.unshift(...events);
  }
}

export function startAnalyticsRuntime() {
  if (started || typeof window === "undefined") return;
  started = true;

  document.addEventListener(
    "click",
    (event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const link = target.closest("a");
      if (!link) return;
      const href = link.getAttribute("href") || "";
      if (href.startsWith("mailto:")) trackClient("EMAIL_CLICK");
      else if (href.startsWith("tel:")) trackClient("PHONE_CLICK");
      else if (/wa\.me|whatsapp/i.test(href)) trackClient("WHATSAPP_CLICK");
    },
    true,
  );

  window.addEventListener("pagehide", () => {
    void flush(true);
  });
}

export function formStart(name: ClientEventName) {
  return () => trackClient(name);
}
