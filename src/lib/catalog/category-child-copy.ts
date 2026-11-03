type CardCopy = { name: string; description: string };

const cleaningNames: Record<string, { before: string; after: string }> = {
  "one-time-cleaning": { before: "خدمة ضمن التنظيف", after: "تنظيف لمرة واحدة" },
  "recurring-cleaning": { before: "خدمة ضمن التنظيف", after: "تنظيف متكرر" },
  "move-in-cleaning": { before: "تنظيف الانتقال", after: "تنظيف قبل الانتقال" },
  "move-out-cleaning": { before: "تنظيف الانتقال", after: "تنظيف عند المغادرة" },
};

const plumbingNames: Record<string, { before: string; after: string }> = {
  "running-toilet-repair": { before: "إصلاح المرحاض", after: "إصلاح تدفق مياه المرحاض المستمر" },
};

/** Correct known ambiguous category previews without replacing reviewed content or URLs. */
export function categoryChildCopy(category: string, locale: string, masterSlug: string, copy: CardCopy): CardCopy {
  if (locale !== "ar") return copy;
  const replacement = category === "cleaning" ? cleaningNames[masterSlug]
    : category === "plumbing" ? plumbingNames[masterSlug] : undefined;
  if (!replacement || copy.name !== replacement.before) return copy;
  return {
    name: replacement.after,
    description: copy.description.startsWith(`${replacement.before} `)
      ? replacement.after + copy.description.slice(replacement.before.length)
      : copy.description,
  };
}
