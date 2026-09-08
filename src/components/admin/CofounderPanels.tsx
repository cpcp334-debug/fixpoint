import Link from "next/link";
import type { PriorityAction } from "@/lib/cofounder/priority";
import type { ToolResultCard } from "@/lib/cofounder/result-cards";

export function ToolResultCards({ cards }: { cards: ToolResultCard[] }) {
  if (!cards.length) return null;
  return (
    <div className="mt-2 grid gap-2 sm:grid-cols-2">
      {cards.map((card) => (
        <article
          key={`${card.tool}-${card.id}`}
          className="rounded-md border border-line bg-white p-3 transition-shadow duration-200 hover:shadow-sm"
        >
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm font-medium text-navy">{card.title}</p>
            {typeof card.count === "number" ? <p className="text-lg font-semibold tabular-nums">{card.count}</p> : null}
          </div>
          {card.explanation ? <p className="mt-1 text-xs text-muted">{card.explanation}</p> : null}
          {card.context ? <p className="mt-1 text-[11px] uppercase tracking-wide text-muted">{card.context}</p> : null}
          {card.href ? (
            <Link href={card.href} className="mt-2 inline-block text-xs font-medium text-navy underline-offset-2 hover:underline">
              View
            </Link>
          ) : null}
        </article>
      ))}
    </div>
  );
}

export function PriorityActionsPanel({
  actions,
  title = "Priority actions",
  empty = "No actionable gaps right now for your role.",
}: {
  actions: PriorityAction[];
  title?: string;
  empty?: string;
}) {
  return (
    <section className="rounded-md border border-line bg-white p-4">
      <p className="text-sm font-medium">{title}</p>
      <p className="mt-1 text-xs text-muted">From live records only. Not invented KPIs.</p>
      {!actions.length ? <p className="mt-3 text-sm text-muted">{empty}</p> : null}
      <ul className="mt-3 space-y-2">
        {actions.map((action) => (
          <li key={action.id} className="rounded-md border border-line/80 bg-sand/40 p-3 transition-colors duration-200 hover:bg-sand">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-sm font-medium">{action.title}</p>
                <p className="mt-1 text-xs text-muted">{action.explanation}</p>
                <p className="mt-1 text-[11px] uppercase tracking-wide text-muted">{action.context}</p>
              </div>
              <span className="text-lg font-semibold tabular-nums text-navy">{action.count}</span>
            </div>
            <Link href={action.href} className="mt-2 inline-block text-xs font-medium text-navy underline-offset-2 hover:underline">
              View
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function SopSourceList({
  sources,
}: {
  sources: Array<{ title?: string; sopCode?: string; version?: number; updatedAt?: string }>;
}) {
  if (!sources.length) return null;
  return (
    <ul className="mt-2 space-y-1 rounded-md border border-line bg-sand/30 px-3 py-2 text-xs text-muted">
      {sources.map((source) => (
        <li key={`${source.sopCode}-${source.title}`}>
          <span className="font-medium text-navy">SOP</span>
          {source.title ? `: ${source.title}` : ""}
          {source.sopCode ? ` · ${source.sopCode}` : ""}
          {source.version ? ` · v${source.version}` : ""}
          {source.updatedAt ? ` · Updated ${source.updatedAt.slice(0, 10)}` : ""}
        </li>
      ))}
    </ul>
  );
}
