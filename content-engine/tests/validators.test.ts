/**
 * Unit-style checks for validators + publication gate (no DB).
 */
import { countRenderedWords, validateWordCount } from "../validators/word-count";
import { tokenSimilarity, exactDuplicate, locationSwapDetected } from "../validators/uniqueness";
import { validateSafety } from "../validators/safety";
import { evaluatePublicationGate } from "../config/publication-gate";
import { HARD_GATES } from "../config/engine.config";

function assert(cond: unknown, msg: string) {
  if (!cond) throw new Error(`ASSERT: ${msg}`);
}

function main() {
  assert(countRenderedWords("one two three") === 3, "word count");
  assert(validateWordCount("short").issues.some((i) => i.code === "WORDS_BELOW_FLOOR"), "floor");
  const long = Array.from({ length: 1100 }, (_, i) => `word${i}`).join(" ");
  assert(validateWordCount(long).issues.length === 0, "long ok");

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
  });
  assert(!gate.passed, "approval required");
  assert(HARD_GATES.aiMayPublish === false, "ai never publishes");

  console.log(JSON.stringify({ ok: true, tests: "validators+gate" }, null, 2));
}

main();
