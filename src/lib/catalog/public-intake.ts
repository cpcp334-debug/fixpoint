/** Public intake labels must not expose editorial placeholders. */
export function publicIntakeQuestions(raw: string, locale: string): string[] {
  let entries: unknown;
  try { entries = JSON.parse(raw); } catch { return []; }
  if (!Array.isArray(entries)) return [];
  const usable = (value: unknown): string => {
    if (typeof value !== 'string') return '';
    const text = value.trim();
    return !text || text.startsWith('REVIEW_REQUIRED') ? '' : text;
  };
  return entries.flatMap((entry: unknown) => {
    if (typeof entry === 'string') {
      const label = usable(entry);
      return label ? [label] : [];
    }
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return [];
    const question = entry as Record<string, unknown>;
    const label = locale === 'ar'
      ? usable(question.ar) || usable(question.en)
      : usable(question.en) || usable(question.ar);
    return label ? [label] : [];
  });
}
