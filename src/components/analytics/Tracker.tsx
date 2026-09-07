"use client";

import { useEffect } from "react";
import { usePathname } from "@/i18n/routing";
import { startAnalyticsRuntime, trackClient } from "@/lib/analytics/client";
import { viewsForPath } from "@/lib/analytics/types";

export function Tracker() {
  const pathname = usePathname();

  useEffect(() => {
    startAnalyticsRuntime();
  }, []);

  useEffect(() => {
    const path = window.location.pathname;
    for (const view of viewsForPath(path)) {
      trackClient(view.name, { path, entityType: view.entityType, entityId: view.entityId });
    }
  }, [pathname]);

  return null;
}
