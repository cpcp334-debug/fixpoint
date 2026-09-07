"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";

export function AnalyticsOptOut({ label, done }: { label: string; done: string }) {
  const [saved, setSaved] = useState(false);

  async function onOptOut() {
    try {
      await fetch("/api/t/optout", { method: "POST", credentials: "include" });
    } catch {
      /* still show confirmation; cookie may already be blocked */
    }
    setSaved(true);
  }

  if (saved) return <p className="mt-4 text-sm text-accent">{done}</p>;
  return (
    <p className="mt-6">
      <Button type="button" variant="secondary" onClick={() => void onOptOut()}>
        {label}
      </Button>
    </p>
  );
}
