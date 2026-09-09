import type { ComponentProps, ReactNode } from "react";
import { Link } from "@/i18n/routing";
import { cn } from "@/lib/utils";

const variants = {
  primary: "bg-accent text-white hover:bg-accent-hover",
  secondary: "border border-line bg-white text-navy hover:border-navy/20 hover:bg-sand",
  ghost: "text-navy hover:bg-sand",
  inverse: "border border-white/25 bg-white/5 text-white hover:bg-white/10",
  inversePrimary: "bg-white text-navy hover:bg-sand",
} as const;

type Variant = keyof typeof variants;

const base =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-4 text-sm font-medium transition-colors motion-reduce:transition-none";

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
