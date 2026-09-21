/** Normalize catalog multi-select + write-in service fields from public forms. */

export type ServiceSelectionInput = {
  serviceSlug?: string | null;
  serviceSlugs?: string[] | null;
  serviceOther?: string | null;
};

export type ServiceSelection = {
  primarySlug?: string;
  slugs: string[];
  other?: string;
};

export function resolveServiceSelection(input: ServiceSelectionInput): ServiceSelection {
  const fromArray = (input.serviceSlugs || [])
    .map((s) => String(s || "").trim())
    .filter(Boolean);
  const legacy = String(input.serviceSlug || "").trim();
  const slugs = [...new Set(legacy ? [legacy, ...fromArray] : fromArray)].slice(0, 20);
  const other = String(input.serviceOther || "").trim().slice(0, 200) || undefined;
  return {
    primarySlug: slugs[0] || undefined,
    slugs,
    other,
  };
}

export function formatServicesLine(names: string[], other?: string | null) {
  const parts = [...names.map((n) => n.trim()).filter(Boolean)];
  const custom = String(other || "").trim();
  if (custom) parts.push(custom);
  return parts.length ? parts.join(", ") : null;
}

export function prependServicesToRequirement(requirement: string, servicesLine: string | null) {
  if (!servicesLine) return requirement;
  const prefix = `Services: ${servicesLine}`;
  if (requirement.startsWith("Services:")) return requirement.slice(0, 4000);
  return `${prefix}\n\n${requirement}`.slice(0, 4000);
}
