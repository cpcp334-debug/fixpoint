"use client";

import { useEffect, useId, useState } from "react";
import { useTranslations } from "next-intl";
import { brandName } from "@/config/site";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { AiMark } from "@/components/ui/AiMark";
import { AiPanel } from "@/components/ai/AiPanel";
import { IconClose, IconMinus } from "@/components/ui/Icon";
import { cn } from "@/lib/utils";

export function AiWidget({ locale }: { locale: string }) {
  const t = useTranslations("Nav");
  const uid = useId();
  const [open, setOpen] = useState(false);
  const [minimized, setMinimized] = useState(false);

  function show() {
    setOpen(true);
    setMinimized(false);
  }

  useEffect(() => {
    function onPrefill() {
      show();
    }
    function onOpen() {
      show();
    }
    function onClick(event: MouseEvent) {
      const link = (event.target as HTMLElement | null)?.closest("a[href]");
      if (!link) return;
      const href = link.getAttribute("href") || "";
      if (!href.includes("#alnajah-ai")) return;
      event.preventDefault();
      show();
    }

    window.addEventListener("alnajah-ai-prefill", onPrefill);
    window.addEventListener("alnajah-ai-open", onOpen);
    document.addEventListener("click", onClick);
    if (window.location.hash === "#alnajah-ai") show();
    return () => {
      window.removeEventListener("alnajah-ai-prefill", onPrefill);
      window.removeEventListener("alnajah-ai-open", onOpen);
      document.removeEventListener("click", onClick);
    };
  }, []);

  return (
    <div className="fixed bottom-[max(1.25rem,env(safe-area-inset-bottom))] end-[max(1.25rem,env(safe-area-inset-right))] z-50 flex flex-col items-end gap-3">
      <div
        id="alnajah-ai"
        className={cn(
          "flex w-[min(calc(100vw-1.5rem),24rem)] flex-col overflow-hidden rounded-2xl border border-line bg-white shadow-[0_18px_50px_rgba(15,23,42,0.14)]",
          !open && "hidden",
          open && !minimized && "h-[min(70vh,32rem)]",
          open && minimized && "h-auto",
        )}
      >
        <header className="flex items-center gap-2 border-b border-line bg-navy px-3 py-2 text-white">
          <BrandLogo size={36} locale={locale} />
          <p className="min-w-0 flex-1 truncate text-sm font-semibold">
            {brandName(locale)} <span className="text-gold">AI</span>
          </p>
          <button
            type="button"
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted hover:bg-sand hover:text-navy"
            aria-label="Minimize"
            onClick={() => setMinimized((value) => !value)}
          >
            <IconMinus className="h-4 w-4" />
          </button>
          <button
            type="button"
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted hover:bg-sand hover:text-navy"
            aria-label="Close"
            onClick={() => {
              setOpen(false);
              setMinimized(false);
            }}
          >
            <IconClose className="h-4 w-4" />
          </button>
        </header>
        <div className={cn("flex min-h-0 flex-1 flex-col", minimized && "hidden")}>
          <AiPanel locale={locale} />
        </div>
      </div>

      <button
        type="button"
        aria-label={t("ai")}
        aria-expanded={open && !minimized}
        className="rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        onClick={() => {
          if (open && !minimized) {
            setOpen(false);
            setMinimized(false);
            return;
          }
          show();
        }}
      >
        <AiMark id={`${uid}-fab`} size={64} />
      </button>
    </div>
  );
}
