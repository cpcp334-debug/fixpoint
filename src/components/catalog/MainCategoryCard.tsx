import { Link } from "@/i18n/routing";
import type { NavCategory } from "@/lib/catalog/approved-nav";
import { getNavCategoryLocalized } from "@/lib/catalog/approved-nav";
import { IconArrow, IconBuilding, categoryIcons } from "@/components/ui/Icon";

/** Card-only: drop rejected coverage wording without changing catalog copy. */
const COVERAGE_SENTENCES = [
  /A listed job is not a coverage promise\.?/gi,
  /Live electrical work is not a DIY topic\.?/gi,
  /ذكر الخدمة لا يعني التغطية\.?/g,
  /أعمال الكهرباء الحية ليست دليلاً منزلياً\.?/g,
];

function cardDescription(text: string): string {
  let next = text;
  for (const pattern of COVERAGE_SENTENCES) next = next.replace(pattern, "");
  return next.replace(/\s+/g, " ").trim();
}

export function MainCategoryCard({
  category,
  locale,
  exploreLabel,
}: {
  category: NavCategory;
  locale: string;
  exploreLabel?: string;
}) {
  const loc = getNavCategoryLocalized(category, locale);
  const description = cardDescription(loc.description);
  const Icon = categoryIcons[category.slug as keyof typeof categoryIcons] ?? IconBuilding;

  return (
    <Link
      href={category.href}
      className="pass group flex h-full w-full flex-col rounded-xl border border-line bg-white p-4 transition-colors hover:border-navy/25 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      aria-label={exploreLabel || loc.exploreLabel}
    >
      <span className="flex h-16 shrink-0 items-center">
        <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-navy text-gold ring-1 ring-inset ring-gold/40">
          <Icon className="h-6 w-6" />
        </span>
      </span>
      <h3 className="mt-3 line-clamp-2 min-h-12 text-base font-semibold tracking-tight text-navy">{loc.name}</h3>
      <p className="mt-1 line-clamp-2 min-h-10 text-sm leading-snug text-muted">{description}</p>
      <p className="mt-auto pt-3 text-xs font-medium text-muted">{loc.childCountLabel}</p>
      <span className="mt-1.5 inline-flex items-center gap-1 text-sm font-medium text-accent">
        {exploreLabel || loc.exploreLabel}
        <IconArrow className="h-4 w-4 rtl:rotate-180" aria-hidden />
      </span>
    </Link>
  );
}
