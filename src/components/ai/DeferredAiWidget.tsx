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

/** Mount AI after first paint / idle so it does not compete with LCP on mobile. */
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

    if (typeof window.requestIdleCallback === "function") {
      idleId = window.requestIdleCallback(enable, { timeout: 2500 });
    } else {
      timeoutId = setTimeout(enable, 1800);
    }

    return () => {
      cancelled = true;
      window.removeEventListener("alnajah-ai-prefill", enable);
      window.removeEventListener("alnajah-ai-open", enable);
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
