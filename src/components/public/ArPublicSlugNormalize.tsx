"use client";

import { useEffect } from "react";

/**
 * Soft address-bar normalize for /ar: if the user landed on a Latin segment
 * but the public Arabic (percent-encoded) slug is known, replaceState to it.
 * No navigation, no 301 — history entry is rewritten in place.
 */
export function ArPublicSlugNormalize({
  locale,
  preferredSegment,
}: {
  locale: string;
  /** Already locale-mapped path segment (percent-encoded Arabic on /ar). */
  preferredSegment: string;
}) {
  useEffect(() => {
    if (locale !== "ar" || typeof window === "undefined") return;
    const preferred = String(preferredSegment || "").trim();
    if (!preferred) return;
    // Preferred must look non-Latin (Arabic or %XX encoding of Arabic).
    const looksArabic =
      /[\u0600-\u06FF]/.test(preferred) || /%[0-9A-Fa-f]{2}/.test(preferred);
    if (!looksArabic) return;

    const parts = window.location.pathname.split("/").filter(Boolean);
    // Expect /ar/<kind>/<slug>… — normalize the last segment of blog|faq|diy|locations
    if (parts[0] !== "ar" || parts.length < 3) return;
    const kind = parts[1];
    if (!["blog", "faq", "diy", "locations"].includes(kind)) return;
    const current = parts[parts.length - 1] || "";
    if (!current || current === preferred) return;
    // Only rewrite when the address bar still shows ASCII Latin.
    if (/[\u0600-\u06FF]/.test(current) || /%[0-9A-Fa-f]{2}/.test(current)) return;
    if (!/^[a-z0-9-]+$/i.test(current)) return;

    const nextParts = [...parts.slice(0, -1), preferred];
    const next = `/${nextParts.join("/")}${window.location.search}${window.location.hash}`;
    window.history.replaceState(window.history.state, "", next);
  }, [locale, preferredSegment]);

  return null;
}
