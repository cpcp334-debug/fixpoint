import type { ComponentType, SVGProps } from "react";
import { Link } from "@/i18n/routing";
import { cn } from "@/lib/utils";
import { IconArrow, serviceIcons } from "@/components/ui/Icon";

export function ServiceCard({
  slug,
  name,
  description,
  benefit,
  cta,
  diyLabel,
  emergencyLabel,
  amcLabel,
  featured,
  href,
}: {
  slug: string;
  name: string;
  description: string;
  benefit?: string;
  cta: string;
  diyLabel?: string;
  emergencyLabel?: string;
  amcLabel?: string;
  featured?: boolean;
  href?: string;
}) {
  const Icon = serviceIcons[slug as keyof typeof serviceIcons] ?? serviceIcons["building-maintenance"];
  return (
    <Link
      href={href ?? `/${slug}`}
      className={cn(
        "group flex h-full flex-col rounded-[16px] border border-line/80 bg-white p-5 transition duration-200 motion-reduce:transition-none",
        "hover:-translate-y-0.5 hover:border-navy/15 hover:shadow-[0_8px_30px_rgba(11,31,58,0.06)]",
        featured && "lg:p-6",
      )}
    >
      <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-sand text-navy">
        <Icon className="h-5 w-5" />
      </span>
      <h3 className="mt-4 text-lg font-semibold text-navy">{name}</h3>
      <p className="mt-2 flex-1 text-sm leading-relaxed text-muted">{description}</p>
      {benefit ? <p className="mt-3 text-sm text-ink">{benefit}</p> : null}
      <div className="mt-4 flex flex-wrap gap-2">
        {diyLabel ? <span className="rounded-full bg-sand px-2.5 py-0.5 text-xs text-navy">{diyLabel}</span> : null}
        {emergencyLabel ? <span className="rounded-full bg-sand px-2.5 py-0.5 text-xs text-navy">{emergencyLabel}</span> : null}
        {amcLabel ? <span className="rounded-full bg-sand px-2.5 py-0.5 text-xs text-navy">{amcLabel}</span> : null}
      </div>
      <span className="mt-5 inline-flex items-center gap-1 text-sm font-medium text-accent">
        {cta}
        <IconArrow className="h-4 w-4 rtl:rotate-180" />
      </span>
    </Link>
  );
}

export function DiyCard({
  slug,
  title,
  category,
  difficulty,
  time,
  summary,
  cta,
}: {
  slug: string;
  title: string;
  category?: string;
  difficulty: string;
  time: string;
  summary: string;
  cta: string;
}) {
  return (
    <article className="flex h-full flex-col rounded-[16px] border border-line/80 bg-white p-5 transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_8px_30px_rgba(11,31,58,0.06)] motion-reduce:transition-none">
      {category ? <p className="text-xs font-medium uppercase tracking-[0.12em] text-gold">{category}</p> : null}
      <h3 className="mt-2 text-lg font-semibold text-navy">
        <Link href={`/diy/${slug}`} className="hover:text-accent">
          {title}
        </Link>
      </h3>
      <p className="mt-2 text-xs text-muted">
        {difficulty}
        {time ? ` · ${time}` : ""}
      </p>
      <p className="mt-3 flex-1 text-sm text-muted">{summary}</p>
      <Link href={`/diy/${slug}`} className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-accent">
        {cta}
        <IconArrow className="h-4 w-4 rtl:rotate-180" />
      </Link>
    </article>
  );
}

export function LocationCard({
  slug,
  name,
  note,
  href,
}: {
  slug: string;
  name: string;
  note: string;
  href?: string;
}) {
  return (
    <Link
      href={href ?? `/locations/${slug}`}
      className="flex h-full flex-col rounded-[16px] border border-line/80 bg-white p-4 transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_8px_30px_rgba(11,31,58,0.06)] motion-reduce:transition-none"
    >
      <p className="font-semibold text-navy">{name}</p>
      <p className="mt-2 text-xs leading-relaxed text-muted">{note}</p>
    </Link>
  );
}

export function ProblemCard({
  href,
  title,
  icon: Icon,
}: {
  href: string;
  title: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
}) {
  return (
    <Link
      href={href}
      className="flex min-h-[6.5rem] flex-col items-start justify-between rounded-[16px] bg-sand p-4 transition duration-200 hover:-translate-y-0.5 hover:bg-sand-2 motion-reduce:transition-none"
    >
      <span className="text-navy">
        <Icon className="h-5 w-5" />
      </span>
      <span className="mt-3 font-medium text-navy">{title}</span>
    </Link>
  );
}
