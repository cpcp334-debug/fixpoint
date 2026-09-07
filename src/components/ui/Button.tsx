import type { ComponentProps, ReactNode } from "react";
import { Link } from "@/i18n/routing";
import { cn } from "@/lib/utils";

const variants = {
  primary:
    "bg-accent text-white hover:bg-accent-hover shadow-[0_8px_24px_rgba(26,122,109,0.18)]",
  secondary: "border border-line bg-white text-navy hover:border-navy/30",
  ghost: "text-navy hover:bg-sand",
  inverse: "border border-white/30 bg-white/5 text-white hover:bg-white/10",
  inversePrimary: "bg-accent text-white hover:bg-accent-hover",
} as const;

type Variant = keyof typeof variants;

const base =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-[12px] px-5 text-[0.9375rem] font-medium transition-colors motion-reduce:transition-none";

export function ButtonLink({
  href,
  variant = "primary",
  className,
  children,
  external,
  ...props
}: {
  href: string;
  variant?: Variant;
  className?: string;
  children: ReactNode;
  external?: boolean;
} & Omit<ComponentProps<"a">, "href">) {
  const cls = cn(base, variants[variant], className);
  if (external) {
    return (
      <a href={href} className={cls} {...props}>
        {children}
      </a>
    );
  }
  return (
    <Link href={href} className={cls}>
      {children}
    </Link>
  );
}

export function Button({
  variant = "primary",
  className,
  ...props
}: ComponentProps<"button"> & { variant?: Variant }) {
  return <button className={cn(base, variants[variant], className)} {...props} />;
}
