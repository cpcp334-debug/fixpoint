import { EmptyState } from "@/components/ui/Section";
import { RatingStars } from "@/components/trust/RatingStars";

export function ReviewSummary({
  count,
  average,
  labels,
}: {
  count: number;
  average: number | null;
  labels: { title: string; empty: string; basedOn: string };
}) {
  if (!count || average == null) {
    return <EmptyState title={labels.title} body={labels.empty} />;
  }
  return (
    <div>
      <h2 className="text-[1.5rem] font-semibold leading-tight text-navy">{labels.title}</h2>
      <p className="mt-3 flex flex-wrap items-center gap-2 text-muted">
        <RatingStars value={average} />
        <span>
          {average.toFixed(1)} · {labels.basedOn}
        </span>
      </p>
    </div>
  );
}
