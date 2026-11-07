// Browser-safe projection of APPROVED_CATEGORIES; parity is checked by the regression script.
export const DIRECTORY_CATEGORY_SLUGS = [
  "cleaning", "general-maintenance", "plumbing", "electrical", "ac", "painting", "walls",
  "swimming-pool", "sauna", "water-tank", "refrigerator", "microwave", "washing-machine",
  "water-heater", "dishwasher", "gym", "oven", "burner-cooker",
] as const;

const categories = new Set<string>(DIRECTORY_CATEGORY_SLUGS);
const reviewLocations = new Set([
  "dubai", "abu-dhabi", "sharjah", "ajman", "umm-al-quwain", "ras-al-khaimah", "fujairah",
]);

const visitTypes = new Set([
  "inspection", "site_inspection", "emergency", "recurring", "recurring_cleaning", "amc", "amc_visit",
]);

/** Carry only supported directory or enquiry state, never queries on remapped detail/fallback paths. */
export function localeDirectoryHref(pathname: string, target: string, search: string): string {
  const path = pathname.replace(/\/$/, "");
  if (target.replace(/\/$/, "") !== path) return target;
  if (path === "/get-a-quote" || path === "/book-a-service") {
    const source = new URLSearchParams(search);
    const result = new URLSearchParams();
    if (path === "/book-a-service") {
      const types = source.getAll("type");
      if (types.length === 1 && visitTypes.has(types[0])) result.set("type", types[0]);
    }
    for (const key of ["service", "location"] as const) {
      const values = source.getAll(key);
      const value = values[0];
      if (values.length === 1 && value.length <= 160 && /^[\p{L}\p{N}][\p{L}\p{M}\p{N}]*(?:-[\p{L}\p{N}][\p{L}\p{M}\p{N}]*)*$/u.test(value)) {
        result.set(key, value);
      }
    }
    const query = result.toString();
    return query ? `${target}?${query}` : target;
  }
  if (path === "/reviews") {
    const source = new URLSearchParams(search);
    const result = new URLSearchParams();
    for (const key of ["service", "location", "stars", "verified"] as const) {
      const values = source.getAll(key);
      if (values.length !== 1) continue;
      const value = values[0];
      const valid = key === "service"
        ? value.length <= 160 && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value)
        : key === "location" ? reviewLocations.has(value)
        : key === "stars" ? /^[1-5]$/.test(value)
        : value === "1";
      if (valid) result.set(key, value);
    }
    const query = result.toString();
    return query ? `${target}?${query}` : target;
  }
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
