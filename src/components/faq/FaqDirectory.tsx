"use client";

import { useMemo, useState } from "react";
import { Link } from "@/i18n/routing";

type Item = { slug: string; title: string; excerpt: string };
type Group = { slug: string; name: string; items: Item[] };

export function FaqDirectory({
  groups,
  searchPlaceholder,
  emptyLabel,
  openLabel,
}: {
  groups: Group[];
  searchPlaceholder: string;
  emptyLabel: string;
  openLabel: string;
}) {
  const [query, setQuery] = useState("");
  const needle = query.trim().toLowerCase();
  const filtered = useMemo(() => {
    if (!needle) return groups;
    return groups
      .map((group) => ({
        ...group,
        items: group.items.filter(
          (item) => item.title.toLowerCase().includes(needle) || group.name.toLowerCase().includes(needle),
        ),
      }))
      .filter((group) => group.items.length > 0);
  }, [groups, needle]);

  return (
    <div>
      <label className="block max-w-md">
        <span className="sr-only">{searchPlaceholder}</span>
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={searchPlaceholder}
          className="w-full rounded-xl border border-line bg-white px-4 py-3 text-sm text-navy"
        />
      </label>
      {filtered.length ? (
        <div className="mt-8 grid gap-8">
          {filtered.map((group) => (
            <section key={group.slug}>
              <h2 className="text-lg font-semibold text-navy">
                {group.name} <span className="text-sm font-normal text-muted">({group.items.length})</span>
              </h2>
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
