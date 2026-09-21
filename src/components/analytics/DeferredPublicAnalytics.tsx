"use client";

import dynamic from "next/dynamic";

const Tracker = dynamic(
  () => import("@/components/analytics/Tracker").then((m) => ({ default: m.Tracker })),
  { ssr: false },
);

const AttributionCapture = dynamic(
  () =>
    import("@/components/analytics/AttributionCapture").then((m) => ({
      default: m.AttributionCapture,
    })),
  { ssr: false },
);

/** Client island — next/dynamic ssr:false is illegal in Server Components (Next 16). */
export function DeferredPublicAnalytics() {
  return (
    <>
      <AttributionCapture />
      <Tracker />
    </>
  );
}
