"use client";

import { useState } from "react";
import Image from "next/image";
import { HeroFallback } from "@/components/public/HeroFallback";

export function HeroMedia({ hasPhoto, locale }: { hasPhoto: boolean; locale?: string }) {
  const [failed, setFailed] = useState(false);
  if (!hasPhoto || failed) return <HeroFallback locale={locale} />;
  return (
    <Image
      src="/media/hero.jpg"
      alt=""
      fill
      sizes="(max-width: 768px) 100vw, 50vw"
      className="object-cover"
      priority
      fetchPriority="high"
      quality={70}
      onError={() => setFailed(true)}
    />
  );
}
