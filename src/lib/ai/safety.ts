import type { CatalogGuide, CatalogService } from "@/lib/ai/provider";
import type { AiModelOutput, CollectedLead, RiskClass } from "@/lib/ai/schema";
import { collectedLeadSchema } from "@/lib/ai/schema";
import { defaultRiskForService, detectHazard, suggestDiySlug, suggestServiceSlug, userText } from "@/lib/ai/suggest";

const INVENTION =
  /\b(aed\s*\d|price is|it will cost|we are licensed in every|24\/7|best in (the )?uae|certified by|google review|⭐|years of experience|available today at|available (today|tomorrow)|appointment (is )?confirmed|you('re| are) booked|slot (is )?reserved|technician is (assigned|on the way)|we will arrive at)\b/i;

export function applySafetyGate(opts: {
  parsed: AiModelOutput;
  services: CatalogService[];
  guides: CatalogGuide[];
  allowedEmirates: Set<string>;
  messages: Array<{ role: string; content: string }>;
}): AiModelOutput {
  const allowedServices = new Set(opts.services.map((s) => s.slug));
  const allowedDiy = new Set(opts.guides.map((g) => g.slug));
  const text = `${userText(opts.messages)}\n${opts.parsed.reply}`;
  const hazard = detectHazard(text);

  let suggested = opts.parsed.suggestedServiceSlug;
  if (suggested && !allowedServices.has(suggested)) suggested = undefined;
  if (!suggested) suggested = suggestServiceSlug(userText(opts.messages), allowedServices);

  let diy = opts.parsed.diySlug;
  if (diy && !allowedDiy.has(diy)) diy = undefined;
  if (!diy && !hazard) diy = suggestDiySlug(userText(opts.messages), allowedDiy);

  let risk: RiskClass = opts.parsed.riskClass ?? defaultRiskForService(suggested, opts.services);
  if (hazard) risk = "red";
  if (suggested) {
    const serviceRisk = defaultRiskForService(suggested, opts.services);
    if (serviceRisk === "red") risk = "red";
  }
  if (risk === "red") diy = undefined;
  if (diy && !hazard && risk !== "red") {
    const guide = opts.guides.find((g) => g.slug === diy);
    if (guide?.riskLevel === "green") risk = "green";
  }

  const collectedParse = collectedLeadSchema.safeParse(opts.parsed.collected ?? {});
  const collected: CollectedLead = extractCollectedFromUserText(
    userText(opts.messages),
    opts.allowedEmirates,
    collectedParse.success ? collectedParse.data : {},
  );
  if (collected.serviceSlug && !allowedServices.has(collected.serviceSlug)) delete collected.serviceSlug;
  if (suggested) collected.serviceSlug = collected.serviceSlug ?? suggested;
  if (collected.emirateSlug && !opts.allowedEmirates.has(collected.emirateSlug)) delete collected.emirateSlug;
  if (collected.email && !collected.email.includes("@")) delete collected.email;

  let reply = opts.parsed.reply;
  if (INVENTION.test(reply)) {
    reply =
      opts.messages.some((m) => m.content && /[\u0600-\u06FF]/.test(m.content))
        ? "لا يمكنني تأكيد السعر أو الرخصة أو التشخيص من هذه المعلومات. يمكنني مساعدتك على طلب معاينة أو عرض سعر يراجعه شخص."
        : "I cannot confirm a price, license, or diagnosis from this information. I can help you request an inspection or a human-reviewed quote.";
  }

  const recommendProfessional = risk === "red" ? true : Boolean(opts.parsed.recommendProfessional) || !diy;
  const needsInspection = risk !== "green" ? true : Boolean(opts.parsed.needsInspection);

  return {
    reply,
    suggestedServiceSlug: suggested,
    diySlug: diy,
    riskClass: risk,
    needsInspection,
    recommendProfessional,
    uncertain: true,
    photosUseful: Boolean(opts.parsed.photosUseful ?? collected.photosUseful) || risk === "red",
    collected,
    missingFields: missingFrom(collected),
    handoverRequested: Boolean(opts.parsed.handoverRequested || collected.handoverRequested || recommendProfessional),
  };
}

export function missingFrom(collected: CollectedLead) {
  const missing: string[] = [];
  if (!collected.name) missing.push("name");
  if (!collected.phone) missing.push("phone");
  if (!collected.requirement) missing.push("requirement");
  if (!collected.emirateSlug) missing.push("emirate");
  return missing;
}

/** Conservative labeled-field extraction so failsafe can still create a Lead. */
export function extractCollectedFromUserText(
  text: string,
  allowedEmirates: Set<string>,
  existing: CollectedLead,
): CollectedLead {
  const next: CollectedLead = { ...existing };

  if (!next.name) {
    const m =
      text.match(/(?:^|\n|\b)(?:name|الاسم)\s*[:：]\s*([^\n,.]{2,80})/i) ||
      text.match(/\bmy name is\s+([^\n,.]{2,80})/i);
    if (m?.[1]) next.name = m[1].trim();
  }

  if (!next.phone) {
    const labeled = text.match(/(?:phone|whatsapp|mobile|هاتف|واتساب)\s*[:：]\s*([+\d][\d\s-]{7,19})/i);
    const loose = text.match(/(\+971[\d\s-]{8,14}|\b05\d[\d\s-]{7,10}\b)/);
    const raw = (labeled?.[1] || loose?.[1] || "").replace(/[\s-]/g, "");
    if (raw.length >= 8 && raw.length <= 20) next.phone = raw;
  }

  if (!next.email) {
    const m = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
    if (m) next.email = m[0];
  }

  if (!next.emirateSlug) {
    for (const slug of allowedEmirates) {
      const label = slug.replace(/-/g, "[\\s-]");
      if (new RegExp(`\\b${label}\\b`, "i").test(text)) {
        next.emirateSlug = slug;
        break;
      }
    }
  }

  if (!next.city) {
    const m = text.match(/(?:city|المدينة)\s*[:：]\s*([^\n,.]{2,80})/i);
    if (m?.[1]) next.city = m[1].trim();
  }

  if (!next.area) {
    const m = text.match(/(?:area|community|المنطقة)\s*[:：]\s*([^\n,.]{2,80})/i);
    const value = m?.[1]?.trim();
    if (value && !allowedEmirates.has(value.toLowerCase().replace(/\s+/g, "-"))) {
      next.area = value;
    }
  }

  return next;
}
