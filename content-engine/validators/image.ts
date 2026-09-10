import type { EngineIssue } from "../config/types";

export type ImageInput = {
  src?: string | null;
  alt?: string | null;
  format?: string | null;
  renders?: boolean;
};

export function validateImage(input: ImageInput): EngineIssue[] {
  const issues: EngineIssue[] = [];
  if (!input.src) {
    issues.push({ code: "IMAGE_MISSING", severity: "blocker", message: "Image required", field: "image" });
    return issues;
  }
  const fmt = (input.format || input.src).toLowerCase();
  if (!fmt.includes("webp") && !/\.webp(\?|$)/i.test(input.src)) {
    issues.push({ code: "IMAGE_WEBP", severity: "blocker", message: "WebP required", field: "image" });
  }
  if (!input.alt || input.alt.trim().length < 5) {
    issues.push({ code: "IMAGE_ALT", severity: "blocker", message: "Alt text required", field: "alt" });
  }
  if (input.renders === false) {
    issues.push({ code: "IMAGE_BROKEN", severity: "blocker", message: "Image does not render" });
  }
  return issues;
}
