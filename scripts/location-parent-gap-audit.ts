/** Read-only location parent-link gap report (no mutation). */
import {
  PARENT_CITY_ALIASES,
  loadLocationMaster,
  resolveParentCityName,
  validateLocationMaster,
} from "../prisma/data/location-master";

const master = loadLocationMaster();
const cities = master.locations.filter((l) => l.type === "city");
const cityByEmName = new Map(cities.map((c) => [`${c.emirateSlug}|${c.nameEn}`, c]));

const gaps: Array<Record<string, unknown>> = [];
let n = 0;
for (const l of master.locations) {
  if (l.type !== "community" && l.type !== "area") continue;
  n += 1;
  const raw = l.parentCityMunicipality;
  const resolved = resolveParentCityName(raw);
  const exactKey = `${l.emirateSlug}|${raw}`;
  const resolvedKey = `${l.emirateSlug}|${resolved}`;
  const exact = Boolean(raw && cityByEmName.has(exactKey));
  if (exact) continue;

  const clear = Boolean(resolved && cityByEmName.has(resolvedKey) && raw !== resolved);
  const city = clear ? cityByEmName.get(resolvedKey) : undefined;
  gaps.push({
    n,
    childLocation: l.nameEn,
    childSlug: l.slug,
    emirateSlug: l.emirateSlug,
    currentParent: raw,
    intendedParent: clear ? resolved : "REVIEW_REQUIRED",
    intendedCitySlug: city?.slug ?? null,
    reason: clear
      ? `Parent label alias "${raw}" maps to city nameEn "${resolved}" (slug ${city?.slug})`
      : `No city with nameEn matching parent label under ${l.emirateSlug}`,
    confidence: clear ? "CLEAR FROM SOURCE CITY NAME" : "AMBIGUOUS → REVIEW_REQUIRED",
    aliasUsed: raw && PARENT_CITY_ALIASES[raw] ? PARENT_CITY_ALIASES[raw] : null,
  });
}

const validation = validateLocationMaster(master);
console.log(
  JSON.stringify(
    {
      note: "These are LOCATION parent gaps (not ServiceCategory). Service catalog gaps are separate.",
      masterTotal: master.locations.length,
      validationOk: validation.ok,
      validationErrors: validation.errors,
      aliasesInCode: PARENT_CITY_ALIASES,
      gapCount: gaps.length,
      clearCount: gaps.filter((g) => g.confidence === "CLEAR FROM SOURCE CITY NAME").length,
      ambiguousCount: gaps.filter((g) => g.confidence === "AMBIGUOUS → REVIEW_REQUIRED").length,
      gaps,
    },
    null,
    2,
  ),
);
