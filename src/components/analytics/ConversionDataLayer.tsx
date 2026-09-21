"use client";

import { useEffect } from "react";
import { pushConversionOnce, type ConversionEventName } from "@/lib/analytics/datalayer";

/**
 * Fire a conversion dataLayer event once per browser session for a given ref.
 * Used on quote/booking received pages after server-confirmed success.
 */
export function ConversionDataLayer({
  event,
  refId,
  locale,
}: {
  event: ConversionEventName;
  refId: string;
  locale?: string;
}) {
  useEffect(() => {
    if (!refId) return;
    pushConversionOnce(`fp_conv_${event}_${refId}`, event, {
      conversion_ref: refId.slice(0, 80),
      ...(locale === "ar" || locale === "en" ? { locale } : {}),
    });
  }, [event, refId, locale]);

  return null;
}
