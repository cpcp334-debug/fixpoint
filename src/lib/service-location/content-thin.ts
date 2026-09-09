import type { ServiceLocationContentJson } from "./content-contract";
import { normalizeTokens } from "./content-similarity";

export type ThinContentResult = {
  ok: boolean;
  reasons: string[];
};

const MIN_DIRECT = 40;
const MIN_EXPLANATION = 40;
const MIN_INTRO = 40;
const MIN_FAQ_ANSWER = 20;
const BOILERPLATE_MARKERS = [
  "request a quote today",
  "contact us now",
  "lorem ipsum",
  "TODO",
  "placeholder",
  "{{",
  "service in location",
];

function filled(value: string | null | undefined, min = 8) {
  return Boolean(value && value.replace(/\s+/g, " ").trim().length >= min);
}

/**
 * Thin-content detector for STRICT_NEW_CONTENT.
 * Fails when required substantive sections are missing or mostly boilerplate/substitution.
 */
export function scanThinContent(args: {
  intro: string;
  localInfo: string;
  h1?: string;
  serviceName: string;
  locationName: string;
  content: ServiceLocationContentJson | null;
}): ThinContentResult {
  const reasons: string[] = [];
  if (!filled(args.intro, MIN_INTRO)) reasons.push("intro_thin");
  if (!filled(args.localInfo, 20)) reasons.push("local_info_thin");

  const content = args.content;
  if (!content) {
    reasons.push("content_json_missing");
    return { ok: false, reasons };
  }

  if (!filled(content.aeo.directAnswer, MIN_DIRECT)) reasons.push("direct_answer_thin");
  if (!filled(content.main.serviceExplanation, MIN_EXPLANATION)) reasons.push("explanation_thin");
  if (content.main.problems.length < 1) reasons.push("problems_missing");
  if (content.main.process.length < 1) reasons.push("process_missing");
  if (!filled(content.geo.coverageStatement, 20)) reasons.push("geo_coverage_thin");
  if (!content.geo.emirate && !content.geo.city && !content.geo.community) reasons.push("geo_facts_missing");

  const approvedFaqs = content.faq.filter(
    (f) => f.approvalState === "approved" && filled(f.question, 8) && filled(f.answer, MIN_FAQ_ANSWER),
  );
  if (approvedFaqs.length < 1) reasons.push("faq_thin");

  const blob = [
    args.intro,
    args.localInfo,
    content.aeo.directAnswer,
    content.main.serviceExplanation,
    content.geo.coverageStatement,
  ]
    .join(" ")
    .toLowerCase();

  for (const marker of BOILERPLATE_MARKERS) {
    if (blob.includes(marker.toLowerCase())) {
      reasons.push(`boilerplate:${marker}`);
      break;
    }
  }

  // Substitution-only heuristic: if intro is basically "{service} in {location}" with little else
  const introNorm = args.intro.toLowerCase().replace(/\s+/g, " ").trim();
  const svc = args.serviceName.toLowerCase();
  const loc = args.locationName.toLowerCase();
  const tokens = normalizeTokens(args.intro);
  if (
    tokens.length > 0 &&
    tokens.length <= 8 &&
    introNorm.includes(svc) &&
    introNorm.includes(loc)
  ) {
    reasons.push("substitution_only");
  }

  return { ok: reasons.length === 0, reasons };
}
