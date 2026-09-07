import type { CatalogEmirate, CatalogGuide, CatalogService } from "@/lib/ai/provider";
import type { RiskClass } from "@/lib/ai/schema";

const SERVICE_HINTS: Array<{ slug: string; pattern: RegExp }> = [
  { slug: "plumbing-maintenance", pattern: /\b(leak|leaking|drip|faucet|tap|drain|cistern|toilet|pipe)\b|سبك|تسرب|حنفية|مصرف|مرحاض/i },
  { slug: "electrical-maintenance", pattern: /\b(socket|breaker|trip|flicker|wiring|electric)\b|كهرب|فيش|قاطع|شرارة/i },
  { slug: "ac-maintenance", pattern: /\b(ac|air.?cond|filter|cooling|thermostat)\b|تكييف|فلتر|تبريد/i },
  { slug: "painting-services", pattern: /\b(paint|peel|colour|color)\b|دهان|طلاء|تقشر/i },
  { slug: "wall-maintenance", pattern: /\b(crack|plaster|damp wall)\b|جدار|تشقق|رطوبة الجدار/i },
  { slug: "cleaning-services", pattern: /\b(clean|dust|maid)\b|تنظيف|غبار/i },
  { slug: "building-maintenance", pattern: /\b(repair|maintenance|broken)\b|صيانة|عطل|إصلاح/i },
];

const DIY_HINTS: Array<{ slug: string; pattern: RegExp }> = [
  { slug: "how-to-fix-dripping-faucet", pattern: /\b(drip\w*\s+(faucet|tap)|(faucet|tap).{0,24}drip\w*)\b|حنفية تقطر|حنفية تقطير/i },
  { slug: "how-to-clean-ac-filter", pattern: /\b(ac filter|air.?con filter)\b|فلتر التكييف|فلتر مكيف/i },
];

const RED_PATTERN =
  /\b(live wire|live electrical|breaker panel|meter|gas leak|lpg|refrigerant|freon|demolish|structural beam|scaffold|roof edge|burning smell|scorch|water on (the )?socket)\b|كهرباء حية|لوحة الكهرباء|تسرب غاز|فريون|هدم|سقالة|رائحة حريق/i;

export function userText(messages: Array<{ role: string; content: string }>) {
  return messages
    .filter((m) => m.role === "user")
    .map((m) => m.content)
    .join("\n");
}

export function detectHazard(text: string) {
  return RED_PATTERN.test(text);
}

export function suggestServiceSlug(text: string, allowed: Set<string>) {
  for (const hint of SERVICE_HINTS) {
    if (hint.pattern.test(text) && allowed.has(hint.slug)) return hint.slug;
  }
  return undefined;
}

export function suggestDiySlug(text: string, allowed: Set<string>) {
  for (const hint of DIY_HINTS) {
    if (hint.pattern.test(text) && allowed.has(hint.slug)) return hint.slug;
  }
  return undefined;
}

export function defaultRiskForService(
  slug: string | undefined,
  services: CatalogService[],
): RiskClass {
  const row = services.find((s) => s.slug === slug);
  if (!row) return "yellow";
  return row.riskLevel;
}

export function buildCatalogLines(services: CatalogService[], guides: CatalogGuide[], emirates: CatalogEmirate[]) {
  const serviceLines = services
    .map((s) => `${s.slug}: ${s.name} (risk ${s.riskLevel}, diyAvailable ${s.diyAvailable})`)
    .join("\n");
  const guideLines = guides
    .map(
      (g) =>
        `${g.slug}: ${g.title} (category ${g.categorySlug ?? "none"}, service ${g.serviceSlug ?? "none"}, risk ${g.riskLevel}${g.quickAnswer ? `, short: ${g.quickAnswer}` : ""})`,
    )
    .join("\n");
  const emirateLines = emirates.map((e) => `${e.slug}: ${e.name}`).join(", ");
  return { serviceLines, guideLines, emirateLines };
}
