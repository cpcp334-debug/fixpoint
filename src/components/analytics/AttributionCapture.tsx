"use client";

import { useEffect } from "react";
import { usePathname } from "@/i18n/routing";
import { captureAttributionFromUrl } from "@/lib/attribution/client";

/** Persist first-touch utm_* / gclid / gbraid / wbraid from the landing URL. */
export function AttributionCapture() {
  const pathname = usePathname();

  useEffect(() => {
    captureAttributionFromUrl(window.location.search, window.location.pathname);
  }, [pathname]);

  return null;
}
