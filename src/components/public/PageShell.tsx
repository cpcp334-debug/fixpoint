import type { ReactNode } from "react";
import { Container } from "@/components/ui/Section";
import { cn } from "@/lib/utils";

export function PageShell({
  breadcrumbs,
  children,
}: {
  breadcrumbs?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div>
      {breadcrumbs ? (
        <div className="border-b border-line bg-white">
          <Container className="py-4">{breadcrumbs}</Container>
        </div>
      ) : null}
      {children}
    </div>
  );
}

export function ProseCard({
  title,
  children,
  className,
}: {
  title?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("rounded-xl border border-line bg-white p-5", className)}>
      {title ? <h2 className="font-semibold text-navy">{title}</h2> : null}
      <div className={cn("text-sm leading-relaxed text-muted", title && "mt-2")}>{children}</div>
    </div>
  );
}
