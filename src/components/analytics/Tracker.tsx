"use client";

import { useEffect } from "react";
import { usePathname } from "@/i18n/routing";
import { startAnalyticsRuntime, trackClient } from "@/lib/analytics/client";
import { viewsForPath } from "@/lib/analytics/types";

/** Defer analytics until after first paint / idle so it stays off the LCP critical path. */
export function Tracker() {
  const pathname = usePathname();

  useEffect(() => {
    let idleId: number | undefined;
    let delayId: ReturnType<typeof setTimeout> | undefined;
    let fallbackId: ReturnType<typeof setTimeout> | undefined;
    let cancelled = false;

    const start = () => {
      if (!cancelled) startAnalyticsRuntime();
    };

    const schedule = () => {
      delayId = setTimeout(() => {
        if (typeof window.requestIdleCallback === "function") {
          idleId = window.requestIdleCallback(start, { timeout: 8000 });
        } else {
          fallbackId = setTimeout(start, 5000);
        }
      }, 2000);
    };

    if (document.readyState === "complete") schedule();
    else window.addEventListener("load", schedule, { once: true });

    return () => {
      cancelled = true;
      window.removeEventListener("load", schedule);
      if (idleId !== undefined && typeof window.cancelIdleCallback === "function") {
        window.cancelIdleCallback(idleId);
      }
      if (delayId !== undefined) clearTimeout(delayId);
      if (fallbackId !== undefined) clearTimeout(fallbackId);
    };
  }, []);

  useEffect(() => {
    const path = window.location.pathname;
    // Queued until runtime/flush is ready — safe to call early.
    for (const view of viewsForPath(path)) {
      trackClient(view.name, { path, entityType: view.entityType, entityId: view.entityId });
    }
  }, [pathname]);

  return null;
}
