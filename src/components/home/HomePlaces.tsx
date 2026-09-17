"use client";

import { useMemo, useState } from "react";
import { Link } from "@/i18n/routing";

type Group = {
  slug: string;
  name: string;
  count: number;
  places: Array<{ slug: string; name: string }>;
};

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
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const needle = query.trim().toLowerCase();
  const filtered = useMemo(() => {
    if (!needle) return groups;
    return groups
      .map((group) => ({
        ...group,
        places: group.places.filter(
          (place) => place.name.toLowerCase().includes(needle) || group.name.toLowerCase().includes(needle),
        ),
      }))
      .filter((group) => group.places.length > 0 || group.name.toLowerCase().includes(needle));
  }, [groups, needle]);

  return (
    <div>
      <label className="block max-w-md">
        <span className="sr-only">{searchPlaceholder}</span>
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={searchPlaceholder}
          className="pass w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-navy"
        />
      </label>
      <div className="mt-3 grid grid-cols-7 gap-2">
        {filtered.map((group) => {
          const expanded = Boolean(open[group.slug] || needle);
          return (
            <article
              key={group.slug}
              className={`pass min-w-0 rounded-xl border bg-white p-2.5 ${expanded ? "border-accent" : "border-line"}`}
            >
              <div className="flex items-start justify-between gap-1">
                <h3 className="min-w-0 text-sm font-semibold leading-tight text-navy">
                  <Link href={`/locations/${group.slug}`} className="hover:text-accent" title={openLabel}>
                    {group.name}
                  </Link>
                </h3>
                <span className="shrink-0 rounded-full bg-sand px-1.5 py-0.5 text-[11px] font-medium text-navy">{group.count}</span>
              </div>
              {group.places.length ? (
                <button
                  type="button"
                  className="mt-2 text-xs font-medium text-accent hover:underline"
                  aria-expanded={expanded}
                  onClick={() => setOpen((current) => ({ ...current, [group.slug]: !current[group.slug] }))}
                >
                  {expanded && !needle ? lessLabel : moreLabel}
                </button>
              ) : null}
            </article>
          );
        })}
      </div>
      {filtered.some((group) => group.places.length && (open[group.slug] || needle)) ? (
        <div className="mt-2 grid gap-2">
          {filtered
            .filter((group) => group.places.length && (open[group.slug] || needle))
            .map((group) => (
              <div key={group.slug}>
                <p className="text-xs font-medium text-muted">{group.name}</p>
                <ul className="mt-1 flex flex-wrap gap-2">
                  {group.places.map((place) => (
                    <li key={place.slug}>
                      <Link
                        href={`/locations/${place.slug}`}
                        className="pass inline-flex rounded-full border border-line bg-white px-3 py-1.5 text-sm text-navy hover:border-accent"
                      >
                        {place.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
        </div>
      ) : null}
      {!filtered.length ? <p className="mt-4 text-sm text-muted">{emptyLabel}</p> : null}
    </div>
  );
}
