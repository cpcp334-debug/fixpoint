"use client";

import { useState } from "react";
import { IconShare } from "@/components/ui/Icon";
import { trackClient } from "@/lib/analytics/client";
import { cn } from "@/lib/utils";

export function ShareButton({
  url,
  label,
  copiedLabel,
  tone = "light",
}: {
  url: string;
  label: string;
  copiedLabel: string;
  tone?: "light" | "inverse";
}) {
  const [copied, setCopied] = useState(false);

  async function onShare() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
      return;
    }
    try {
      trackClient("SHARE");
    } catch {
      /* analytics must not undo a successful copy */
    }
  }

  return (
    <div className="relative inline-flex">
      <button
        type="button"
        onClick={() => void onShare()}
        className={cn(
          "inline-flex min-h-10 items-center gap-2 rounded-lg px-3 text-sm",
          tone === "inverse" ? "text-white/75 hover:text-white" : "border border-line bg-white text-navy hover:border-navy/25",
        )}
        aria-label={label}
      >
        <IconShare className="h-4 w-4" />
        <span>{label}</span>
      </button>
      {copied ? (
        <span role="status" className="absolute start-0 top-full z-10 mt-2 whitespace-nowrap rounded-md bg-navy px-2 py-1 text-xs text-white">
          {copiedLabel}
        </span>
      ) : null}
    </div>
  );
}
