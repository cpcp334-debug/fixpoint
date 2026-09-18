import { ServiceCard } from "@/components/home/Cards";

export type CategoryChildGridItem = {
  slug: string;
  href: string;
  name: string;
  description: string;
};

export function CategoryChildGrid({
  items,
  searchPlaceholder,
  emptyLabel,
  cta,
  query = "",
  filterLabel,
  hiddenFields,
}: {
  items: CategoryChildGridItem[];
  searchPlaceholder: string;
  emptyLabel: string;
  cta: string;
  /** Current search query (server-driven via ?q=). */
  query?: string;
  filterLabel: string;
  /** Preserve other list params (e.g. catPage) when submitting search. */
  hiddenFields?: Record<string, string>;
}) {
  return (
    <div>
      <form method="get" className="flex max-w-lg flex-wrap gap-3">
        {hiddenFields
          ? Object.entries(hiddenFields).map(([name, value]) => (
              <input key={name} type="hidden" name={name} value={value} />
            ))
          : null}
        <label className="min-w-[12rem] flex-1">
          <span className="sr-only">{searchPlaceholder}</span>
          <input
            type="search"
            name="q"
            defaultValue={query}
            placeholder={searchPlaceholder}
            className="w-full rounded-lg border border-line bg-white px-3 py-3 text-base text-navy outline-none ring-accent focus:ring-2"
          />
        </label>
        <button type="submit" className="rounded-lg bg-navy px-4 py-3 text-sm font-medium text-white">
          {filterLabel}
        </button>
      </form>
      {items.length ? (
        <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <li key={item.slug}>
              <ServiceCard
                slug={item.slug}
                href={item.href}
                name={item.name}
                description={item.description}
                cta={cta}
              />
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-6 text-sm text-muted">{emptyLabel}</p>
      )}
    </div>
  );
}
