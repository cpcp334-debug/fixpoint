import { Link } from "@/i18n/routing";

type Props = {
  currentPage: number;
  totalPages: number;
  /** Full href for previous page (locale-aware path + query). */
  previousHref: string | null;
  /** Full href for next page (locale-aware path + query). */
  nextHref: string | null;
  previousLabel: string;
  nextLabel: string;
  /** Already interpolated, e.g. "Page 2 of 38". */
  pageOfLabel: string;
};

const btnBase =
  "inline-flex min-h-10 items-center justify-center rounded-md border px-3 py-1.5 text-sm font-medium transition-colors";
const btnActive = "border-line bg-white text-navy hover:border-navy/25 hover:bg-sand";
const btnDisabled = "cursor-not-allowed border-line/60 bg-sand/60 text-muted";

/**
 * Single-line list pager: Previous | Page X of Y | Next.
 * Used on public blog / FAQ indexes (not DIY).
 */
export function PrevNextPagination({
  currentPage,
  totalPages,
  previousHref,
  nextHref,
  previousLabel,
  nextLabel,
  pageOfLabel,
}: Props) {
  if (totalPages <= 1) return null;

  return (
    <nav
      className="mt-8 flex flex-wrap items-center justify-center gap-3"
      aria-label={pageOfLabel}
    >
      {previousHref ? (
        <Link href={previousHref} className={`${btnBase} ${btnActive}`} rel="prev">
          {previousLabel}
        </Link>
      ) : (
        <span className={`${btnBase} ${btnDisabled}`} aria-disabled="true">
          {previousLabel}
        </span>
      )}

      <p className="min-w-[8rem] text-center text-sm font-medium text-navy" aria-current="page">
        {pageOfLabel}
      </p>

      {nextHref ? (
        <Link href={nextHref} className={`${btnBase} ${btnActive}`} rel="next">
          {nextLabel}
        </Link>
      ) : (
        <span className={`${btnBase} ${btnDisabled}`} aria-disabled="true">
          {nextLabel}
        </span>
      )}

      <span className="sr-only">
        {currentPage} / {totalPages}
      </span>
    </nav>
  );
}

/** Build list-page href with optional filters and a page query. */
export function listPageHref(
  path: string,
  page: number,
  extras?: Record<string, string | undefined>,
): string {
  const qs = new URLSearchParams();
  if (extras) {
    for (const [key, value] of Object.entries(extras)) {
      if (value) qs.set(key, value);
    }
  }
  if (page > 1) qs.set("page", String(page));
  const query = qs.toString();
  return query ? `${path}?${query}` : path;
}
