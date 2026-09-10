import { HARD_GATES } from "../config/engine.config";
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

export function validateWordCount(text: string): { wordCount: number; issues: EngineIssue[] } {
  const wordCount = countRenderedWords(text);
  const issues: EngineIssue[] = [];
  if (wordCount < HARD_GATES.minRenderedWords) {
    issues.push({
      code: "WORDS_BELOW_FLOOR",
      severity: "blocker",
      message: `${wordCount} < ${HARD_GATES.minRenderedWords} rendered words`,
      field: "body",
    });
  }
  return { wordCount, issues };
}
