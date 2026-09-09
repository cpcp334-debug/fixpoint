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
        "group flex h-full flex-col rounded-xl border border-line bg-white p-5 transition-colors hover:border-navy/20",
        featured && "lg:p-6",
      )}
    >
      <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-sand text-navy">
        <Icon className="h-4 w-4" />
      </span>
      <h3 className="mt-4 text-lg font-semibold tracking-tight text-navy">{name}</h3>
      <p className="mt-2 flex-1 text-sm leading-relaxed text-muted">{description}</p>
      {benefit ? <p className="mt-3 text-sm text-ink">{benefit}</p> : null}
      <div className="mt-4 flex flex-wrap gap-2">
        {diyLabel ? <span className="rounded-md bg-sand px-2 py-0.5 text-xs text-navy">{diyLabel}</span> : null}
        {emergencyLabel ? <span className="rounded-md bg-sand px-2 py-0.5 text-xs text-navy">{emergencyLabel}</span> : null}
        {amcLabel ? <span className="rounded-md bg-sand px-2 py-0.5 text-xs text-navy">{amcLabel}</span> : null}
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
    <article className="flex h-full flex-col rounded-xl border border-line bg-white p-5">
      {category ? <p className="text-xs font-medium text-accent">{category}</p> : null}
      <h3 className="mt-2 text-lg font-semibold tracking-tight text-navy">
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
      className="flex h-full flex-col rounded-xl border border-line bg-white p-4 hover:border-navy/20"
    >
      <p className="font-semibold text-navy">{name}</p>
      <p className="mt-2 text-xs leading-relaxed text-muted">{note}</p>
    </Link>
  );
}

const problemTones = {
  cool: { card: "bg-[#eff6ff] border-[#bfdbfe]/80 hover:border-[#60a5fa]", icon: "bg-white text-[#1d4ed8]" },
  water: { card: "bg-[#f0f9ff] border-[#bae6fd]/80 hover:border-[#38bdf8]", icon: "bg-white text-[#0369a1]" },
  power: { card: "bg-[#eff6ff] border-[#93c5fd]/70 hover:border-[#2563eb]", icon: "bg-white text-[#1e40af]" },
  paint: { card: "bg-[#f8fafc] border-[#cbd5e1]/80 hover:border-[#64748b]", icon: "bg-white text-[#0f172a]" },
  wall: { card: "bg-[#f1f5f9] border-[#cbd5e1]/80 hover:border-[#475569]", icon: "bg-white text-[#1e3a8a]" },
  pipe: { card: "bg-[#eff6ff] border-[#93c5fd]/70 hover:border-[#3b82f6]", icon: "bg-white text-[#1e40af]" },
  clean: { card: "bg-[#f0f9ff] border-[#7dd3fc]/60 hover:border-[#0ea5e9]", icon: "bg-white text-[#075985]" },
} as const;

export type ProblemTone = keyof typeof problemTones;

export function ProblemCard({
  href,
  title,
  icon: Icon,
  tone = "cool",
}: {
  href: string;
  title: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  tone?: ProblemTone;
}) {
  const colors = problemTones[tone] ?? problemTones.cool;
  return (
    <Link
      href={href}
      className={cn(
        "group flex min-h-[6.25rem] flex-col items-start justify-between rounded-2xl border p-4 transition-colors",
        colors.card,
      )}
    >
      <span className={cn("inline-flex h-9 w-9 items-center justify-center rounded-xl shadow-sm", colors.icon)}>
        <Icon className="h-4 w-4" />
      </span>
      <span className="mt-3 text-sm font-semibold tracking-tight text-navy">{title}</span>
    </Link>
  );
}
