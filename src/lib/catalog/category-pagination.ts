export type CategorySearchParams = { page?: string | string[]; q?: string | string[] };

export const CATEGORY_PAGE_SIZE = 24;

export function firstCategoryQueryValue(value: string | string[] | undefined) {
  return (Array.isArray(value) ? value[0] : value)?.trim();
}

export function categoryPagination(value: string | string[] | undefined, count: number) {
  const requested = Number(firstCategoryQueryValue(value));
  const pageHint = Number.isSafeInteger(requested) && requested > 0 ? requested : 1;
  const totalPages = Math.max(1, Math.ceil(count / CATEGORY_PAGE_SIZE));
  return { page: Math.min(pageHint, totalPages), totalPages };
}
