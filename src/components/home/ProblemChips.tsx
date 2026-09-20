import { Link } from "@/i18n/routing";

type Chip = { label: string; href: string };

/** Server-only chips — no client JS on the homepage critical path. */
export function ProblemChips({ chips, hint }: { chips: Chip[]; hint: string }) {
  return (
    <div>
      <p className="text-sm text-muted">{hint}</p>
      <ul className="mt-4 flex flex-wrap gap-2">
        {chips.map((chip) => (
          <li key={chip.label}>
            <Link
              href={chip.href}
              className="pass inline-flex min-h-10 items-center rounded-lg border border-line bg-white px-3 text-sm text-navy hover:border-navy/20"
            >
              {chip.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
