import { HARD_GATES, minWordsForContentType, type ContentType } from "../config/engine.config";
import type { EngineIssue } from "../config/types";

/** Count meaningful words from rendered/plain text (strips simple markdown). */
export function countRenderedWords(text: string): number {
  const plain = String(text || "")
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/[#>*_`~\-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!plain) return 0;
  return plain.split(/\s+/).filter(Boolean).length;
}

export function validateWordCount(
  text: string,
  contentType: ContentType = "SERVICE_LOCATION",
): { wordCount: number; issues: EngineIssue[] } {
  const wordCount = countRenderedWords(text);
  const floor = minWordsForContentType(contentType);
  const issues: EngineIssue[] = [];
  if (wordCount < floor) {
    issues.push({
      code: "WORDS_BELOW_FLOOR",
      severity: "blocker",
      message: `${wordCount} < ${floor} rendered words`,
      field: "body",
    });
  }
  return { wordCount, issues };
}
