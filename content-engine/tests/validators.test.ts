/**
 * Unit-style checks for validators + publication gate (no DB).
 */
import { countRenderedWords, validateWordCount } from "../validators/word-count";
import { tokenSimilarity, exactDuplicate, locationSwapDetected } from "../validators/uniqueness";
import { validateSafety } from "../validators/safety";
import { evaluatePublicationGate } from "../config/publication-gate";
import { HARD_GATES, minWordsForContentType } from "../config/engine.config";

function assert(cond: unknown, msg: string) {
  if (!cond) throw new Error(`ASSERT: ${msg}`);
}

function main() {
  assert(countRenderedWords("one two three") === 3, "word count");
  assert(validateWordCount("short").issues.some((i) => i.code === "WORDS_BELOW_FLOOR"), "floor");
  const mid = Array.from({ length: 850 }, (_, i) => `word${i}`).join(" ");
  assert(validateWordCount(mid, "SERVICE_LOCATION").issues.length === 0, "sl 850 ok");
  assert(validateWordCount(mid, "BLOG").issues.some((i) => i.code === "WORDS_BELOW_FLOOR"), "blog 850 fail");
  const long = Array.from({ length: 1100 }, (_, i) => `word${i}`).join(" ");
  assert(validateWordCount(long, "BLOG").issues.length === 0, "blog 1100 ok");

  assert(minWordsForContentType("SERVICE_LOCATION") === 800, "sl floor 800");
  assert(minWordsForContentType("BLOG") === 1000, "blog floor 1000");
  assert(HARD_GATES.minRenderedWords === 800, "default floor 800");

  assert(exactDuplicate("Hello World", ["hello world"]).duplicate, "exact dup");
  assert(tokenSimilarity("alpha bravo charlie delta echo", "alpha bravo charlie delta echo") === 1, "token identical");
  assert(
    locationSwapDetected(
      "AC repair in Dubai for homes",
      "AC repair in Sharjah for homes",
      ["Dubai", "Sharjah"],
    ),
    "location swap",
  );

  assert(
    validateSafety({
      safetyClass: "YELLOW",
      intendsPublic: true,
      contentType: "DIY",
    }).length > 0,
    "yellow diy block",
  );
  assert(
    validateSafety({
      safetyClass: "GREEN",
      intendsPublic: true,
      contentType: "SERVICE_LOCATION",
      covered: false,
    }).some((i) => i.code === "SAFETY_COVERAGE"),
    "uncovered sl block",
  );

  const gate = evaluatePublicationGate({
    wordCount: HARD_GATES.minRenderedWords,
    unique: true,
    visitorUseful: true,
    hasWebpImage: true,
    hasAlt: true,
    enComplete: true,
    arComplete: true,
    noEnglishFallback: true,
    seoOk: true,
    aeoOk: true,
    geoOk: true,
    qualityOk: true,
    safetyOk: true,
    coverageOk: true,
    humanApproved: false,
    contentType: "SERVICE_LOCATION",
  });
  assert(!gate.passed, "approval required");
  assert(HARD_GATES.aiMayPublish === false, "ai never publishes");

  console.log(JSON.stringify({ ok: true, tests: "validators+gate", floors: { sl: 800, blog: 1000 } }, null, 2));
}

main();
