/**
 * Orchestrates all hard validators for a content unit draft.
 */
import { validateWordCount } from "./word-count";
import { validateAgainstCorpus } from "./uniqueness";
import { validateSeo, type SeoInput } from "./seo";
import { validateAeo, type AeoInput } from "./aeo";
import { validateGeo, type GeoInput } from "./geo";
import { validateSafety, type SafetyInput } from "./safety";
import { validateLocalization, type LocaleInput } from "./localization";
import { validateImage, type ImageInput } from "./image";
import { validateDiySelfHelp } from "./diy-selfhelp";
import { evaluatePublicationGate } from "../config/publication-gate";
import type { EngineIssue, ValidationResult } from "../config/types";

export type DraftValidationInput = {
  bodyEn: string;
  bodyAr: string;
  titleEn?: string;
  titleAr?: string;
  corpusBodies?: string[];
  seo?: SeoInput;
  aeo?: AeoInput;
  geo?: GeoInput;
  safety: SafetyInput;
  image?: ImageInput;
  diySelfHelpRequired?: boolean;
  visitorUseful?: boolean;
  qualityOk?: boolean;
  humanApproved?: boolean;
};

export function runValidationPipeline(input: DraftValidationInput): ValidationResult {
  const issues: EngineIssue[] = [];

  const wordsEn = validateWordCount(input.bodyEn);
  const wordsAr = validateWordCount(input.bodyAr);
  issues.push(...wordsEn.issues, ...wordsAr.issues);

  const uniq = validateAgainstCorpus(input.bodyEn, input.corpusBodies || []);
  issues.push(...uniq.issues);

  issues.push(...validateSeo(input.seo || {}));
  issues.push(...validateAeo(input.aeo || {}));
  issues.push(...validateGeo(input.geo || { applicable: false }));
  issues.push(...validateSafety(input.safety));
  issues.push(
    ...validateLocalization({
      enBody: input.bodyEn,
      arBody: input.bodyAr,
      enTitle: input.titleEn,
      arTitle: input.titleAr,
    } satisfies LocaleInput),
  );
  issues.push(...validateImage(input.image || {}));
  issues.push(...validateDiySelfHelp(input.bodyEn, !!input.diySelfHelpRequired));

  const blockers = issues.filter((i) => i.severity === "blocker");
  const gate = evaluatePublicationGate({
    wordCount: Math.min(wordsEn.wordCount, wordsAr.wordCount),
    unique: uniq.issues.length === 0,
    visitorUseful: input.visitorUseful !== false,
    hasWebpImage: !issues.some((i) => i.code.startsWith("IMAGE_")),
    hasAlt: !issues.some((i) => i.code === "IMAGE_ALT"),
    enComplete: !issues.some((i) => i.code === "EN_INCOMPLETE"),
    arComplete: !issues.some((i) => i.code === "AR_INCOMPLETE"),
    noEnglishFallback: !issues.some((i) => i.code.startsWith("ENGLISH_FALLBACK")),
    seoOk: !issues.some((i) => i.code.startsWith("SEO_") && i.severity === "blocker"),
    aeoOk: !issues.some((i) => i.code.startsWith("AEO_") && i.severity === "blocker"),
    geoOk: !issues.some((i) => i.code.startsWith("GEO_")),
    qualityOk: input.qualityOk !== false && !issues.some((i) => i.code === "DIY_SELF_HELP"),
    safetyOk: !issues.some((i) => i.code.startsWith("SAFETY_")),
    coverageOk:
      input.safety.contentType !== "SERVICE_LOCATION" ||
      !!input.safety.covered ||
      !input.safety.intendsPublic,
    humanApproved: !!input.humanApproved,
  });

  // Merge gate issues that aren't already present
  for (const gi of gate.issues) {
    if (!issues.some((i) => i.code === gi.code)) issues.push(gi);
  }

  const allBlockers = issues.filter((i) => i.severity === "blocker");
  return {
    passed: allBlockers.length === 0,
    lifecycle: gate.lifecycle,
    wordCount: Math.min(wordsEn.wordCount, wordsAr.wordCount),
    score: gate.score,
    issues,
  };
}
