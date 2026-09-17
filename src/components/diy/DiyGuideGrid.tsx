"use client";

import { useMemo, useState } from "react";
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
}: {
  items: DiyGuideGridItem[];
  searchPlaceholder: string;
  emptyLabel: string;
  cta: string;
}) {
  const [q, setQ] = useState("");
  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return items;
    return items.filter(
      (item) =>
        item.title.toLowerCase().includes(needle) ||
        item.slug.toLowerCase().includes(needle) ||
        (item.category?.toLowerCase().includes(needle) ?? false) ||
        item.summary.toLowerCase().includes(needle),
    );
  }, [items, q]);

  return (
    <div>
      <label className="block text-sm text-navy">
        <span className="sr-only">{searchPlaceholder}</span>
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={searchPlaceholder}
          className="w-full rounded-lg border border-line bg-white px-3 py-3 text-base text-navy outline-none ring-accent focus:ring-2"
        />
      </label>
      {filtered.length ? (
        <ul className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((item) => (
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
