import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Container({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={cn("mx-auto w-full max-w-6xl px-4 sm:px-6", className)}>{children}</div>;
}

export function Section({
  children,
  className,
  id,
  tone = "white",
}: {
  children: ReactNode;
  className?: string;
  id?: string;
  tone?: "white" | "sand" | "navy";
}) {
  return (
    <section
      id={id}
      className={cn(
        "scroll-mt-20 py-7 sm:py-9",
        tone === "sand" && "bg-sand",
        tone === "navy" && "bg-navy text-white",
        tone === "white" && "bg-white",
        className,
      )}
    >
      <Container>{children}</Container>
    </section>
  );
}

export function SectionHeader({
  eyebrow,
  title,
  lead,
  className,
}: {
  eyebrow?: string;
  title: string;
  lead?: string;
  className?: string;
}) {
  return (
    <div className={cn("max-w-2xl", className)}>
      {eyebrow ? <p className="text-sm font-medium text-accent">{eyebrow}</p> : null}
      <h2 className={cn("text-xl font-semibold tracking-tight text-navy sm:text-2xl", eyebrow && "mt-1.5")}>{title}</h2>
      {lead ? <p className="mt-2 max-w-xl text-sm text-muted sm:text-base">{lead}</p> : null}
    </div>
  );
}

export function EmptyState({ title, body }: { title?: string; body: string }) {
  return (
    <div className="rounded-xl border border-line bg-sand px-4 py-4">
      {title ? <h2 className="text-lg font-semibold text-navy">{title}</h2> : null}
      <p className={cn("text-sm text-muted", title && "mt-2")}>{body}</p>
    </div>
  );
}
