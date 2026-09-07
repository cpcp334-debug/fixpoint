"use client";

import { useState } from "react";
import { HeroFallback } from "@/components/public/HeroFallback";

export function HeroMedia({ hasPhoto }: { hasPhoto: boolean }) {
  const [failed, setFailed] = useState(false);
  if (!hasPhoto || failed) return <HeroFallback />;
  return (
    // Optional brand photo. Missing file falls back to the composed graphic.
    // eslint-disable-next-line @next/next/no-img-element
    <img src="/media/hero.jpg" alt="" className="h-full w-full object-cover" onError={() => setFailed(true)} />
  );
}
