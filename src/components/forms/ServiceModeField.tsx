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
}) {
  const [mode, setMode] = useState<ServiceMode>("catalog");
  const [selected, setSelected] = useState<string[]>(defaultSlug ? [defaultSlug] : []);
  const [other, setOther] = useState("");

  function setCatalogMode() {
    setMode("catalog");
    setOther("");
  }

  function setCustomMode() {
    setMode("custom");
    setSelected([]);
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
        <div className="mt-3 max-h-56 space-y-2 overflow-y-auto rounded-[12px] border border-line bg-white p-3">
          {services.length === 0 ? (
            <p className="text-sm text-muted">{labels.pickOne}</p>
          ) : (
            services.map((s) => {
              const inputId = `${idPrefix}-svc-${s.slug}`;
              const checked = selected.includes(s.slug);
              return (
                <label key={s.slug} htmlFor={inputId} className="flex cursor-pointer items-start gap-2 text-sm text-navy">
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
