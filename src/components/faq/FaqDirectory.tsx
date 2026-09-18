import { Link } from "@/i18n/routing";

type Item = { slug: string; title: string; excerpt: string };
type Group = { slug: string; name: string; items: Item[] };

export function FaqDirectory({
  groups,
  searchPlaceholder,
  emptyLabel,
  openLabel,
  query = "",
  filterLabel,
}: {
  groups: Group[];
  searchPlaceholder: string;
  emptyLabel: string;
  openLabel: string;
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
            className="w-full rounded-xl border border-line bg-white px-4 py-3 text-sm text-navy"
          />
        </label>
        <button type="submit" className="rounded-xl bg-navy px-4 py-3 text-sm font-medium text-white">
          {filterLabel}
        </button>
      </form>
      {groups.length ? (
        <div className="mt-8 grid gap-8">
          {groups.map((group) => (
            <section key={group.slug}>
              <h2 className="text-lg font-semibold text-navy">{group.name}</h2>
              <ul className="mt-3 grid gap-3">
                {group.items.map((item) => (
                  <li key={item.slug} className="rounded-xl border border-line bg-white p-4">
                    <Link href={`/faq/${item.slug}`} className="font-semibold text-navy hover:underline">
                      {item.title}
                    </Link>
                    <p className="mt-2 text-sm leading-relaxed text-muted">{item.excerpt}</p>
                    <Link href={`/faq/${item.slug}`} className="mt-3 inline-block text-sm font-semibold text-navy">
                      {openLabel}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      ) : (
        <p className="mt-6 text-sm text-muted">{emptyLabel}</p>
      )}
    </div>
  );
}
