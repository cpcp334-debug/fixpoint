import { Link } from "@/i18n/routing";

type Group = {
  slug: string;
  name: string;
  count: number;
  places: Array<{ slug: string; name: string }>;
};

/**
 * Server-rendered emirate grid for the homepage.
 * Intentionally omits nested place lists from HTML/RSC (was a major mobile weight:
 * ~277 places serialized into the document). Full directories live on /locations.
 */
export function HomePlaces({
  groups,
  searchPlaceholder,
  emptyLabel,
  openLabel,
  moreLabel,
  lessLabel,
}: {
  groups: Group[];
  searchPlaceholder: string;
  emptyLabel: string;
  openLabel: string;
  moreLabel: string;
  lessLabel: string;
}) {
  void searchPlaceholder;
  void lessLabel;
  void moreLabel;

  if (!groups.length) {
    return <p className="mt-4 text-sm text-muted">{emptyLabel}</p>;
  }

  return (
    <div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7">
        {groups.map((group) => (
          <article key={group.slug} className="pass min-w-0 rounded-xl border border-line bg-white p-2.5">
            <div className="flex items-start justify-between gap-1">
              <h3 className="min-w-0 text-sm font-semibold leading-tight text-navy">
                <Link href={`/locations/${group.slug}`} className="hover:text-accent" title={openLabel}>
                  {group.name}
                </Link>
              </h3>
              <span className="shrink-0 rounded-full bg-sand px-1.5 py-0.5 text-[11px] font-medium text-navy">
                {group.count}
              </span>
            </div>
            <Link
              href={`/locations/${group.slug}`}
              className="mt-2 inline-block text-xs font-medium text-accent hover:underline"
            >
              {openLabel}
            </Link>
          </article>
        ))}
      </div>
    </div>
  );
}
