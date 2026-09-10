import type { ManifestRecord } from "../config/types";
import { CORPUS } from "../config/engine.config";
import { FREEZE } from "../config/freeze";

/**
 * Builds a *summary* manifest for the engine — not the full 63,963 rows in Phase 1.
 * Full corpus expansion is Phase 7 (batch scripts), never auto-run here.
 */
export function buildManifestSummary() {
  return {
    totals: CORPUS,
    freeze: FREEZE,
    stages: ["MANIFEST", "GENERATOR", "VALIDATOR", "REVIEW_QUEUE", "PUBLICATION_QUEUE", "DATABASE"],
    note: "Phase 1 foundation only — do not expand to full corpus yet",
  };
}

/** Sample dry-run records for 1/10/100 harnesses (synthetic; not published). */
export function sampleManifestRecords(n: number): ManifestRecord[] {
  const out: ManifestRecord[] = [];
  for (let i = 0; i < n; i++) {
    const idx = i + 1;
    out.push({
      contentKey: `engine-test-blog-${String(idx).padStart(3, "0")}`,
      contentType: "BLOG",
      locale: idx % 2 === 0 ? "ar" : "en",
      articleSlug: `engine-test-${idx}`,
      required: true,
      priority: 1000 - idx,
      coverageRequired: false,
    });
  }
  return out;
}

export function contentKeyForServiceLocation(serviceSlug: string, locationSlug: string, locale: "en" | "ar") {
  return `sl:${serviceSlug}:${locationSlug}:${locale}`;
}

export function contentKeyForDiy(diySlug: string, locale: "en" | "ar") {
  return `diy:${diySlug}:${locale}`;
}

export function contentKeyForBlog(articleSlug: string, locale: "en" | "ar") {
  return `blog:${articleSlug}:${locale}`;
}
