// Browser-safe projection of APPROVED_CATEGORIES; parity is checked by the regression script.
export const DIRECTORY_CATEGORY_SLUGS = [
  "cleaning", "general-maintenance", "plumbing", "electrical", "ac", "painting", "walls",
  "swimming-pool", "sauna", "water-tank", "refrigerator", "microwave", "washing-machine",
  "water-heater", "dishwasher", "gym", "oven", "burner-cooker",
] as const;

const categories = new Set<string>(DIRECTORY_CATEGORY_SLUGS);

/** Carry only supported directory state, never queries on remapped detail/fallback paths. */
export function localeDirectoryHref(pathname: string, target: string, search: string): string {
  const path = pathname.replace(/\/$/, "");
  if (target.replace(/\/$/, "") !== path) return target;
  const faq = path === "/faq";
  const category = /^\/services\/([^/]+)$/.exec(path)?.[1];
  if (!faq && (!category || !categories.has(category))) return target;
  const source = new URLSearchParams(search);
  const result = new URLSearchParams();
  let rejectedFilter = false;
  if (faq) {
    const values = source.getAll("category");
    if (values.length === 1 && categories.has(values[0])) result.set("category", values[0]);
    else if (values.length) rejectedFilter = true;
  }
  const queries = source.getAll("q");
  if (queries.length === 1 && queries[0].trim()) result.set("q", queries[0].trim());
  else if (queries.length > 1) rejectedFilter = true;
  const pages = source.getAll("page");
  if (!rejectedFilter && pages.length === 1 && /^\d+$/.test(pages[0])) {
    const page = Number(pages[0]);
    if (Number.isSafeInteger(page) && page > 1) result.set("page", String(page));
  }
  const query = result.toString();
  return query ? `${target}?${query}` : target;
}
