import { Link } from "@/i18n/routing";
import type { NavCategory } from "@/lib/catalog/approved-nav";
import { getNavCategoryLocalized } from "@/lib/catalog/approved-nav";
import { IconArrow, serviceIcons } from "@/components/ui/Icon";

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
  const iconSlug = category.anchorSlug || "building-maintenance";
  const Icon = serviceIcons[iconSlug as keyof typeof serviceIcons] ?? serviceIcons["building-maintenance"];

  return (
    <Link
      href={category.href}
      className="group flex h-full min-h-[11rem] flex-col rounded-xl border border-line bg-white p-5 transition-colors hover:border-navy/25 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      aria-label={exploreLabel || loc.exploreLabel}
    >
      <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-sand text-navy">
        <Icon className="h-5 w-5" aria-hidden />
      </span>
      <h3 className="mt-4 text-lg font-semibold tracking-tight text-navy">{loc.name}</h3>
      <p className="mt-2 flex-1 text-sm leading-relaxed text-muted">{loc.description}</p>
      <p className="mt-3 text-xs font-medium text-muted">{loc.childCountLabel}</p>
      <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-accent">
        {exploreLabel || loc.exploreLabel}
        <IconArrow className="h-4 w-4 rtl:rotate-180" aria-hidden />
      </span>
    </Link>
  );
}
