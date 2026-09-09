"use client";

type Chip = { label: string; prompt: string };

export function ProblemChips({ chips, hint }: { chips: Chip[]; hint: string }) {
  function choose(prompt: string) {
    window.dispatchEvent(new CustomEvent("alnajah-ai-prefill", { detail: prompt }));
  }

  return (
    <div>
      <p className="text-sm text-muted">{hint}</p>
      <ul className="mt-4 flex flex-wrap gap-2">
        {chips.map((chip) => (
          <li key={chip.label}>
            <button
              type="button"
              onClick={() => choose(chip.prompt)}
              className="min-h-10 rounded-lg border border-line bg-white px-3 text-sm text-navy hover:border-navy/20"
            >
              {chip.label}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
