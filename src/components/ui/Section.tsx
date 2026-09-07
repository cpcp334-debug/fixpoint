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
        "scroll-mt-24 py-14 sm:py-16 lg:py-20",
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
      {eyebrow ? (
        <p className="text-[0.75rem] font-medium uppercase tracking-[0.16em] text-gold">{eyebrow}</p>
      ) : null}
      <h2 className="mt-2 text-[1.5rem] font-semibold leading-tight text-navy sm:text-[1.75rem]">{title}</h2>
      {lead ? <p className="mt-3 text-muted">{lead}</p> : null}
    </div>
  );
}

export function EmptyState({ title, body }: { title?: string; body: string }) {
  return (
    <div className="rounded-[16px] border border-line bg-sand/60 px-5 py-6">
      {title ? <h2 className="text-[1.5rem] font-semibold text-navy">{title}</h2> : null}
      <p className={cn("text-muted", title && "mt-3")}>{body}</p>
    </div>
  );
}
