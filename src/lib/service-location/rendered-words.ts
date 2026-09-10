/**
 * Deterministic rendered-text extraction — matches ServiceLocationView visitor copy.
 */
import type { ServiceLocationPageModel } from "./page-model";
import { parseContentJson } from "./content-parse";

export function getRenderedContentText(model: ServiceLocationPageModel): string {
  const parts: string[] = [];
  const push = (value: string | null | undefined) => {
    const t = (value || "").replace(/\s+/g, " ").trim();
    if (t) parts.push(t);
  };

  push(model.locationName);
  push(model.content.h1);
  push(model.content.intro);
  push(model.content.geoIntro);
  const geoBits = [
    model.hierarchyLabels.emirate,
    model.hierarchyLabels.city,
    model.hierarchyLabels.community,
  ].filter(Boolean);
  if (geoBits.length) push(geoBits.join(" → "));
  push(model.content.localInfo);
  push(model.content.body || model.serviceLongDescription);

  const parsed = model.content.contentJson
    ? parseContentJson(
        typeof model.content.contentJson === "string"
          ? model.content.contentJson
          : JSON.stringify(model.content.contentJson),
      )
    : null;
  const structured = parsed?.ok ? parsed.value : null;
  if (structured?.main) {
    push(structured.main.serviceExplanation);
    for (const x of structured.main.problems) push(x);
    for (const x of structured.main.symptomsUseCases) push(x);
    for (const x of structured.main.process) push(x);
    push(structured.main.professionalRecommendation);
  }
  if (structured?.diy) {
    for (const x of structured.diy.safeSelfChecks) push(x);
    for (const x of structured.diy.whatNotToDo) push(x);
    for (const x of structured.diy.safetyNotes) push(x);
    push(structured.diy.professionalFallback);
    if (structured.diy.safetyState === "GREEN" || structured.diy.safetyState === "YELLOW") {
      for (const x of structured.diy.steps) push(x);
    }
  }
  if (structured?.expert?.helpSummary) push(structured.expert.helpSummary);

  if (model.diy.visible) {
    push(model.diy.title);
    push(model.diy.quickAnswer);
    push(model.diy.whenToStop);
  }

  for (const block of model.aeo) {
    push(block.question);
    push(block.answer);
  }
  for (const faq of model.content.faqs) {
    push(faq.q);
    push(faq.a);
  }
  for (const rel of model.relatedServices) push(rel.label);
  for (const rel of model.relatedLocations) push(rel.label);

  return parts.join("\n");
}

export function countRenderedWords(model: ServiceLocationPageModel): number {
  const text = getRenderedContentText(model);
  if (!text.trim()) return 0;
  if (model.locale === "ar") {
    const ar = text.match(/[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]+/g);
    const latin = text.match(/[A-Za-z0-9]+/g);
    return (ar?.length || 0) + (latin?.length || 0);
  }
  return text.split(/\s+/).filter(Boolean).length;
}

export function wordCountBand(n: number): "<500" | "500-799" | "800-999" | "1000-1200" | ">1200" {
  if (n < 500) return "<500";
  if (n < 800) return "500-799";
  if (n < 1000) return "800-999";
  if (n <= 1200) return "1000-1200";
  return ">1200";
}

export const RENDERED_WORD_MIN_PUBLISH = 800;
export const RENDERED_WORD_TARGET = 1000;
export const RENDERED_WORD_MAX_SOFT = 1200;
