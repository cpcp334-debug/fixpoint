"use client";

import { useState } from "react";
import { fieldControlClass, fieldLabelClass } from "@/components/public/FormShell";

export type ServiceMode = "catalog" | "custom";

export function ServiceModeField({
  idPrefix,
  services,
  labels,
  defaultSlug,
  error,
  search,
}: {
  idPrefix: string;
  services: Array<{ slug: string; name: string }>;
  labels: {
    service: string;
    chooseOur: string;
    writeOwn: string;
    writePlaceholder: string;
    pickOne: string;
  };
  defaultSlug?: string;
  error?: string;
  search?: { label: string; clear: string; empty: string; shown: string; selected: string };
}) {
  const [mode, setMode] = useState<ServiceMode>("catalog");
  const [selected, setSelected] = useState<string[]>(defaultSlug ? [defaultSlug] : []);
  const [other, setOther] = useState("");
  const [query, setQuery] = useState("");
  const normalizedQuery = search ? query.trim().toLowerCase() : "";
  const matches = (name: string) => name.toLowerCase().includes(normalizedQuery);
  const visibleCount = services.filter((service) => matches(service.name)).length;

  function setCatalogMode() {
    setMode("catalog");
    setOther("");
    setQuery("");
  }

  function setCustomMode() {
    setMode("custom");
    setSelected([]);
    setQuery("");
  }

  function toggleSlug(slug: string) {
    setSelected((prev) => (prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug]));
  }

  return (
    <div>
      <p className={fieldLabelClass}>{labels.service}</p>
      <div className="mt-2 flex flex-wrap gap-2" role="group" aria-label={labels.service}>
        <ModeButton
          active={mode === "catalog"}
          onClick={setCatalogMode}
          label={labels.chooseOur}
        />
        <ModeButton
          active={mode === "custom"}
          onClick={setCustomMode}
          label={labels.writeOwn}
        />
      </div>

      {mode === "catalog" ? (
        <div>
          {search ? (
            <div className="mt-3">
              <label htmlFor={`${idPrefix}-service-search`} className={fieldLabelClass}>{search.label}</label>
              <div className="mt-2 flex gap-2">
                <input
                  id={`${idPrefix}-service-search`}
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  onKeyDown={(event) => { if (event.key === "Enter") event.preventDefault(); }}
                  aria-describedby={`${idPrefix}-service-results`}
                  className={`${fieldControlClass} min-w-0 flex-1`}
                />
                <button type="button" onClick={() => setQuery("")} className="rounded-[10px] border border-line px-3 py-2 text-sm text-navy">
                  {search.clear}
                </button>
              </div>
              <p id={`${idPrefix}-service-results`} role="status" aria-live="polite" aria-atomic="true" className="mt-2 text-sm text-muted">
                {visibleCount} {search.shown} · {selected.length} {search.selected}
              </p>
            </div>
          ) : null}
        <div className="mt-3 max-h-56 space-y-2 overflow-y-auto rounded-[12px] border border-line bg-white p-3">
          {search && services.length > 0 && visibleCount === 0 ? <p className="text-sm text-muted">{search.empty}</p> : null}
          {services.length === 0 ? (
            <p className="text-sm text-muted">{labels.pickOne}</p>
          ) : (
            services.map((s) => {
              const inputId = `${idPrefix}-svc-${s.slug}`;
              const checked = selected.includes(s.slug);
              return (
                <label key={s.slug} htmlFor={inputId} className={matches(s.name) ? "flex cursor-pointer items-start gap-2 text-sm text-navy" : "hidden"}>
                  <input
                    id={inputId}
                    type="checkbox"
                    name="serviceSlugs"
                    value={s.slug}
                    checked={checked}
                    onChange={() => toggleSlug(s.slug)}
                    className="mt-0.5"
                  />
                  <span>{s.name}</span>
                </label>
              );
            })
          )}
          {/* Primary slug for legacy consumers */}
          <input type="hidden" name="serviceSlug" value={selected[0] || ""} />
        </div>
        </div>
      ) : (
        <div className="mt-3">
          <input type="hidden" name="serviceSlug" value="" />
          <label htmlFor={`${idPrefix}-service-other`} className="sr-only">
            {labels.writeOwn}
          </label>
          <input
            id={`${idPrefix}-service-other`}
            name="serviceOther"
            value={other}
            onChange={(e) => setOther(e.target.value)}
            placeholder={labels.writePlaceholder}
            maxLength={200}
            aria-invalid={Boolean(error)}
            className={fieldControlClass}
          />
        </div>
      )}
      {error ? <p className="mt-1 text-sm text-danger">{error}</p> : null}
    </div>
  );
}

function ModeButton({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={
        active
          ? "rounded-[10px] bg-navy px-3 py-2 text-sm text-white"
          : "rounded-[10px] border border-line bg-white px-3 py-2 text-sm text-navy"
      }
    >
      {label}
    </button>
  );
}
