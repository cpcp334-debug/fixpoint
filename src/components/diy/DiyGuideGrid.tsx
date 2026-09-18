import { DiyCard } from "@/components/home/Cards";

export type DiyGuideGridItem = {
  slug: string;
  title: string;
  category?: string;
  difficulty: string;
  time: string;
  summary: string;
};

export function DiyGuideGrid({
  items,
  searchPlaceholder,
  emptyLabel,
  cta,
  query = "",
  filterLabel,
}: {
  items: DiyGuideGridItem[];
  searchPlaceholder: string;
  emptyLabel: string;
  cta: string;
  /** Current search query (server-driven via ?q=). */
  query?: string;
  filterLabel: string;
}) {
  return (
    <div>
      <form method="get" className="flex max-w-lg flex-wrap gap-3">
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
        <ul className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <li key={item.slug}>
              <DiyCard
                slug={item.slug}
                title={item.title}
                category={item.category}
                difficulty={item.difficulty}
                time={item.time}
                summary={item.summary}
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
