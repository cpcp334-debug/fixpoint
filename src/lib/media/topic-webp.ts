/**
 * Topic → WebP media path map for public DIY / Service heroes.
 */
export const TOPIC_WEBP: Record<string, string> = {
  plumbing: "/media/topics/plumbing.webp",
  ac: "/media/topics/ac.webp",
  cleaning: "/media/topics/cleaning.webp",
  painting: "/media/topics/painting.webp",
  walls: "/media/topics/walls.webp",
  electrical: "/media/topics/electrical.webp",
  pool: "/media/topics/pool.webp",
  sauna: "/media/topics/sauna.webp",
  appliance: "/media/topics/appliance.webp",
  general: "/media/topics/general.webp",
};

export function topicWebpForDiyCategory(categorySlug: string): string {
  return TOPIC_WEBP[categorySlug] || TOPIC_WEBP.general!;
}

export function topicWebpForServiceSlug(serviceSlug: string): string {
  const s = serviceSlug.toLowerCase();
  if (s.includes("plumb") || s.includes("faucet") || s.includes("drain") || s.includes("pipe")) return TOPIC_WEBP.plumbing!;
  if (s.includes("ac") || s.includes("air-condition") || s.includes("hvac")) return TOPIC_WEBP.ac!;
  if (s.includes("paint")) return TOPIC_WEBP.painting!;
  if (s.includes("wall") || s.includes("crack") || s.includes("gypsum") || s.includes("plaster")) return TOPIC_WEBP.walls!;
  if (s.includes("electric") || s.includes("socket") || s.includes("wiring") || s.includes("light")) return TOPIC_WEBP.electrical!;
  if (s.includes("pool") || s.includes("swim")) return TOPIC_WEBP.pool!;
  if (s.includes("sauna")) return TOPIC_WEBP.sauna!;
  if (
    s.includes("refrigerat") ||
    s.includes("dishwasher") ||
    s.includes("washing") ||
    s.includes("microwave") ||
    s.includes("oven") ||
    s.includes("appliance")
  ) {
    return TOPIC_WEBP.appliance!;
  }
  if (s.includes("clean") || s.includes("hygien") || s.includes("janitor")) return TOPIC_WEBP.cleaning!;
  return TOPIC_WEBP.general!;
}

export function altForTopic(locale: "en" | "ar", topicLabelEn: string, topicLabelAr: string) {
  if (locale === "ar") return `صورة توضيحية لـ${topicLabelAr} — محتوى تعليمي`;
  return `Educational illustration for ${topicLabelEn}`;
}
