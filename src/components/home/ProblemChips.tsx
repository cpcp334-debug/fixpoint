"use client";

type Chip = { label: string; prompt: string };

export function ProblemChips({ chips, hint }: { chips: Chip[]; hint: string }) {
  function choose(prompt: string) {
    window.dispatchEvent(new CustomEvent("alnajah-ai-prefill", { detail: prompt }));
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    document.getElementById("alnajah-ai")?.scrollIntoView({ behavior: reduce ? "auto" : "smooth" });
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
              className="min-h-11 rounded-full border border-line bg-white px-4 text-sm text-navy transition hover:border-navy/30 motion-reduce:transition-none"
            >
              {chip.label}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
