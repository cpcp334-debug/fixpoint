"use client";

import { useEffect } from "react";
import { usePathname } from "@/i18n/routing";
import { startAnalyticsRuntime, trackClient } from "@/lib/analytics/client";
import { viewsForPath } from "@/lib/analytics/types";

/**
 * Start analytics after first user gesture (or very late fallback).
 * Avoids competing with LCP / fonts on mobile PageSpeed lab runs.
 */
export function Tracker() {
  const pathname = usePathname();

  useEffect(() => {
    let cancelled = false;
    let fallbackId: ReturnType<typeof setTimeout> | undefined;
    let started = false;

    const removeListeners = () => {
      window.removeEventListener("pointerdown", onGesture);
      window.removeEventListener("keydown", onGesture);
      window.removeEventListener("touchstart", onGesture);
    };

    const start = () => {
      if (cancelled || started) return;
      started = true;
      removeListeners();
      if (fallbackId !== undefined) clearTimeout(fallbackId);
      startAnalyticsRuntime();
    };

    function onGesture() {
      start();
    }

    window.addEventListener("pointerdown", onGesture, { passive: true });
    window.addEventListener("keydown", onGesture);
    window.addEventListener("touchstart", onGesture, { passive: true });

    // Lab tools often never gesture — still avoid early main-thread work.
    fallbackId = setTimeout(start, 15000);

    return () => {
      cancelled = true;
      removeListeners();
      if (fallbackId !== undefined) clearTimeout(fallbackId);
    };
  }, []);

  useEffect(() => {
    const path = window.location.pathname;
    for (const view of viewsForPath(path)) {
      trackClient(view.name, { path, entityType: view.entityType, entityId: view.entityId });
    }
  }, [pathname]);

  return null;
}
