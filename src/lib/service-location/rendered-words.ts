/**
 * Deterministic rendered-text extraction — matches ServiceLocationView visitor copy.
 */
import { parseFaqJson } from "@/lib/faq";
import type { ServiceLocationPageModel } from "./page-model";
import { parseContentJson } from "./content-parse";
import type { WorkingCopy } from "./types";

/** Hard floor for Service × Location publish / READY_FOR_PUBLISH. */
export const RENDERED_WORD_MIN_PUBLISH = 800;
/** Editorial target band start. */
export const RENDERED_WORD_TARGET = 1000;
/** Soft upper band for acceptable longform. */
export const RENDERED_WORD_MAX_SOFT = 1200;
/** Soft preferred upper (pilot target ~1000–1300). */
export const RENDERED_WORD_TARGET_MAX = 1300;

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

function countPlainWords(text: string, locale: string) {
  const t = text.replace(/\s+/g, " ").trim();
  if (!t) return 0;
  if (locale === "ar") {
    const ar = t.match(/[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]+/g);
    const latin = t.match(/[A-Za-z0-9]+/g);
    return (ar?.length || 0) + (latin?.length || 0);
  }
  return t.split(/\s+/).filter(Boolean).length;
}

/**
 * Approximate visitor word count from a WorkingCopy (eligibility / ops).
 * Does not count SEO title, meta, or image alt.
 */
export function estimateWorkingCopyWords(copy: WorkingCopy | null | undefined, locale = "en"): number {
  if (!copy) return 0;
  const parts: string[] = [];
  const push = (v?: string | null) => {
    const t = (v || "").trim();
    if (t) parts.push(t);
  };
  push(copy.h1);
  push(copy.intro);
  push(copy.geoIntro);
  push(copy.localInfo);
  push(copy.body);
  push(copy.directAnswer);
  for (const f of parseFaqJson(copy.faq || "")) {
    push(f.a);
  }
  if (copy.contentJson) {
    const parsed = parseContentJson(
      typeof copy.contentJson === "string" ? copy.contentJson : JSON.stringify(copy.contentJson),
    );
    if (parsed.ok && parsed.value) {
      const c = parsed.value;
      push(c.main?.serviceExplanation);
      for (const x of c.main?.problems ?? []) push(x);
      for (const x of c.main?.symptomsUseCases ?? []) push(x);
      for (const x of c.main?.process ?? []) push(x);
      push(c.main?.professionalRecommendation);
      for (const x of c.diy?.safeSelfChecks ?? []) push(x);
      for (const x of c.diy?.whatNotToDo ?? []) push(x);
      for (const x of c.diy?.safetyNotes ?? []) push(x);
      push(c.diy?.professionalFallback);
      if (c.diy?.safetyState === "GREEN" || c.diy?.safetyState === "YELLOW") {
        for (const x of c.diy?.steps ?? []) push(x);
      }
      push(c.aeo?.directAnswer);
      push(c.geo?.coverageStatement);
      push(c.expert?.helpSummary);
      for (const f of c.faq ?? []) {
        if (f.approvalState === "approved") push(f.answer);
      }
    }
  }
  return countPlainWords(parts.join("\n"), locale);
}
