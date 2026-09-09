import { createHash } from "node:crypto";
import { SEO_TITLE_MODIFIERS, type SeoTitleModifier } from "./types";

const BANNED = /\b(best|#1|number one|certified|licensed|award[- ]winning)\b/i;
const MAX_LEN = 65;

export function stableModifier(serviceId: string, locationId: string, locale: string): SeoTitleModifier {
  const hex = createHash("sha256").update(`${serviceId}:${locationId}:${locale}`).digest("hex");
  const idx = Number.parseInt(hex.slice(0, 8), 16) % SEO_TITLE_MODIFIERS.length;
  return SEO_TITLE_MODIFIERS[idx]!;
}

export function normalizeTitleKey(title: string) {
  return title.toLowerCase().replace(/\s+/g, " ").trim();
}

export function buildServiceLocationTitle(args: {
  serviceName: string;
  locationName: string;
  parentName?: string | null;
  locale: "en" | "ar";
  serviceId: string;
  locationId: string;
  existingTitles?: string[];
}): { title: string; unique: boolean; lengthOk: boolean; banned: boolean; modifier: SeoTitleModifier | null } {
  const modifier = args.locale === "en" ? stableModifier(args.serviceId, args.locationId, args.locale) : null;
  const parent =
    args.parentName && args.parentName !== args.locationName ? `, ${args.parentName}` : "";
  const brandEn = "ALNAJAH ALDAEM";
  const brandAr = "النجاح الدائم";
  let title =
    args.locale === "ar"
      ? `${args.serviceName} في ${args.locationName}${parent} | ${brandAr}`
      : `${modifier} ${args.serviceName} in ${args.locationName}${parent} | ${brandEn}`;
  if (title.length > MAX_LEN && modifier) {
    title = `${args.serviceName} in ${args.locationName}${parent} | ${brandEn}`;
  }
  if (title.length > MAX_LEN) {
    title = title.slice(0, MAX_LEN).trim();
  }
  const banned = BANNED.test(title);
  if (banned) {
    title =
      args.locale === "ar"
        ? `${args.serviceName} في ${args.locationName} | ${brandAr}`.slice(0, MAX_LEN)
        : `${args.serviceName} in ${args.locationName} | ${brandEn}`.slice(0, MAX_LEN);
  }
  const key = normalizeTitleKey(title);
  const unique = !(args.existingTitles ?? []).map(normalizeTitleKey).includes(key);
  return { title, unique, lengthOk: title.length <= MAX_LEN && title.length > 0, banned: BANNED.test(title), modifier };
}
