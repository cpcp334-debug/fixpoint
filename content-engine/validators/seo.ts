import type { EngineIssue } from "../config/types";

export type SeoInput = {
  title?: string | null;
  metaDescription?: string | null;
  h1?: string | null;
  h2Count?: number;
  canonical?: string | null;
  hreflangEn?: string | null;
  hreflangAr?: string | null;
  robots?: string | null;
  internalLinkCount?: number;
  hasSchema?: boolean;
};

export function validateSeo(input: SeoInput): EngineIssue[] {
  const issues: EngineIssue[] = [];
  if (!input.title || input.title.trim().length < 10) {
    issues.push({ code: "SEO_TITLE", severity: "blocker", message: "Title missing or too short", field: "title" });
  }
  if (!input.metaDescription || input.metaDescription.trim().length < 50) {
    issues.push({
      code: "SEO_META",
      severity: "blocker",
      message: "Meta description missing or too short",
      field: "metaDescription",
    });
  }
  if (!input.h1 || !input.h1.trim()) {
    issues.push({ code: "SEO_H1", severity: "blocker", message: "H1 required", field: "h1" });
  }
  if ((input.h2Count ?? 0) < 2) {
    issues.push({ code: "SEO_H2", severity: "warn", message: "Prefer >= 2 H2 sections" });
  }
  if (!input.canonical) {
    issues.push({ code: "SEO_CANONICAL", severity: "blocker", message: "Canonical required" });
  }
  if (!input.hreflangEn || !input.hreflangAr) {
    issues.push({ code: "SEO_HREFLANG", severity: "blocker", message: "hreflang EN+AR required" });
  }
  if (input.robots && /noindex/i.test(input.robots) && !/indexable/i.test(String(input.robots))) {
    // informational — covered SL may be indexable; uncovered must stay noindex
  }
  if ((input.internalLinkCount ?? 0) < 1) {
    issues.push({ code: "SEO_INTERNAL_LINKS", severity: "warn", message: "Add internal links" });
  }
  if (!input.hasSchema) {
    issues.push({ code: "SEO_SCHEMA", severity: "warn", message: "Structured data recommended" });
  }
  return issues;
}
