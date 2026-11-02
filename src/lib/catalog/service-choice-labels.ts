type ServiceChoice = { slug: string; name: string; englishName?: string | null };

function englishLabel(choice: ServiceChoice): string {
  const text = choice.englishName?.trim() || "";
  return text.startsWith("REVIEW_REQUIRED") ? "" : text;
}

/** Distinguish colliding Arabic form labels without changing service identifiers. */
export function serviceChoiceLabels(choices: ServiceChoice[], locale: string): Array<{ slug: string; name: string }> {
  const groups = new Map<string, ServiceChoice[]>();
  if (locale === "ar") {
    for (const choice of choices) {
      const key = choice.name.trim();
      groups.set(key, [...(groups.get(key) || []), choice]);
    }
  }
  return choices.map((choice) => {
    const group = groups.get(choice.name.trim()) || [];
    const english = englishLabel(choice);
    const distinct = group.filter((item) => englishLabel(item) === english).length === 1;
    const suffix = group.length > 1 && english && english !== choice.name.trim() && distinct;
    return { slug: choice.slug, name: suffix ? `${choice.name} (${english})` : choice.name };
  });
}
