export function RatingStars({ value, max = 5 }: { value: number; max?: number }) {
  const safe = Math.max(0, Math.min(max, Math.round(value)));
  return (
    <span className="text-sm text-gold" aria-label={`${safe} out of ${max}`}>
      {"★".repeat(safe)}
      <span className="text-line">{"★".repeat(max - safe)}</span>
    </span>
  );
}
