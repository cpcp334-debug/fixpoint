"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

const AiWidget = dynamic(() => import("@/components/ai/AiWidget").then((m) => ({ default: m.AiWidget })), {
  ssr: false,
});

function wantsAiNow() {
  if (typeof window === "undefined") return false;
  return window.location.hash === "#alnajah-ai";
}

/**
 * Mount AI after LCP window: intent first, then long idle.
 * Avoid competing with hero/fonts on mobile PageSpeed.
 */
export function DeferredAiWidget({ locale }: { locale: string }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (wantsAiNow()) {
      setReady(true);
      return;
    }

    let idleId: number | undefined;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    let cancelled = false;

    const enable = () => {
      if (!cancelled) setReady(true);
    };

    const onAiIntent = (event: Event) => {
      const target = event.target as HTMLElement | null;
      if (event.type === "click") {
        const link = target?.closest?.("a[href]");
        const href = link?.getAttribute("href") || "";
        if (!href.includes("#alnajah-ai")) return;
      }
      enable();
    };

    window.addEventListener("alnajah-ai-prefill", enable);
    window.addEventListener("alnajah-ai-open", enable);
    document.addEventListener("click", onAiIntent);

    const scheduleIdle = () => {
      if (typeof window.requestIdleCallback === "function") {
        idleId = window.requestIdleCallback(enable, { timeout: 6000 });
      } else {
        timeoutId = setTimeout(enable, 4500);
      }
    };

    // Wait for load so AI chunk does not share the LCP bandwidth budget.
    if (document.readyState === "complete") {
      scheduleIdle();
    } else {
      window.addEventListener("load", scheduleIdle, { once: true });
    }

    return () => {
      cancelled = true;
      window.removeEventListener("alnajah-ai-prefill", enable);
      window.removeEventListener("alnajah-ai-open", enable);
      window.removeEventListener("load", scheduleIdle);
      document.removeEventListener("click", onAiIntent);
      if (idleId !== undefined && typeof window.cancelIdleCallback === "function") {
        window.cancelIdleCallback(idleId);
      }
      if (timeoutId !== undefined) clearTimeout(timeoutId);
    };
  }, []);

  if (!ready) return null;
  return <AiWidget locale={locale} />;
}
