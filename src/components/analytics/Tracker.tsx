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
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    let cancelled = false;

    const start = () => {
      if (!cancelled) startAnalyticsRuntime();
    };

    const schedule = () => {
      if (typeof window.requestIdleCallback === "function") {
        idleId = window.requestIdleCallback(start, { timeout: 4500 });
      } else {
        timeoutId = setTimeout(start, 3000);
      }
    };

    if (document.readyState === "complete") schedule();
    else window.addEventListener("load", schedule, { once: true });

    return () => {
      cancelled = true;
      window.removeEventListener("load", schedule);
      if (idleId !== undefined && typeof window.cancelIdleCallback === "function") {
        window.cancelIdleCallback(idleId);
      }
      if (timeoutId !== undefined) clearTimeout(timeoutId);
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
