# Current-state reconciliation — ServiceLocation & DIY

Generated as part of final-completion verification reconciliation.
**No rows were deleted.** Expanded DB state is the working state.

## 1. Historical checkpoint

| Metric | Historical A3.2 |
|--------|-----------------|
| ServiceLocation | **99** (49 published + 50 pilots) |
| Published | 49 |
| Pilots | 50 |

## 2. Current state (live)

| Metric | Value |
|--------|--------|
| ServiceLocation total | **63,400** |
| Unique (serviceId, locationId) | 63,400 (0 duplicates) |
| Published + covered + indexable | **49** |
| Draft | 63,351 |
| Covered | 49 |
| Uncovered | 63,351 |
| indexable / indexableEn / indexableAr | 49 / 49 / 49 |
| Original A3.2 pilots preserved | **50** (still draft, uncovered, non-indexable) |
| Service rows (non-archived) | **317** |
| Locations | **200** (1 country + 7 emirates + 21 cities + 171 communities) |
| Category-only hubs present as Service | **0** (correct) |

## 3. Approved theoretical matrix

```
311 offerings × 200 locations = 62,200
```

This figure **assumes** Service rows exist for all 311 offerings, including the 7 category-only hubs.

## 4. Exact excess analysis (62,200 → 63,400 = +1,200)

**Not** “1,200 mystery rows.” Net arithmetic:

| Component | Rows | Notes |
|-----------|------|--------|
| Approved offerings with Service rows | 304 × 200 = **60,800** | 311 − 7 hubs (matrix offering slugs) |
| Legacy / outside approved matrix | 13 × 200 = **2,600** | `UNMAPPED_LEGACY_DRAFT_SLUGS` |
| **Live total** | **63,400** | 317 × 200 |
| Hubs never materialized | −7 × 200 = **−1,400** | category-only policy |
| Theoretical 311×200 | 62,200 | includes hubs |
| **Net vs 62,200** | **+1,200** | −1,400 hubs + 2,600 legacy |

**Legitimacy:** `DOCUMENTED_LEGACY_PLUS_APPROVED_MATRIX` (verified live; unexplainedRows=0, duplicates=0).


### Equation

```
60,800 approved-matrix candidates
+ 2,600 LEGACY_OUTSIDE_APPROVED_MATRIX
= 63,400 ServiceLocation rows

62,200 − 1,400 (hubs absent) + 2,600 (legacy) = 63,400
```

### Exact 13 legacy services (each × 200 locations)

1. bathroom-maintenance  
2. carpentry-joinery  
3. demolition-dismantling  
4. doors-windows  
5. emergency-maintenance  
6. flooring-tiling  
7. home-appliance-maintenance  
8. kitchen-appliance-maintenance  
9. kitchen-maintenance  
10. oven-cooker-maintenance  
11. preventive-maintenance  
12. roof-exterior-maintenance  
13. waterproofing-sealing  

Classification: **LEGACY / OUTSIDE_APPROVED_MATRIX / REVIEW_REQUIRED for publish**.  
Preserved. Not deleted. Not treated as approved 311×200 candidates.

## 5. DIY

| Class | Matrix | Authored | Policy |
|-------|--------|----------|--------|
| GREEN | 46 | **46** | procedural DIY OK (draft) |
| YELLOW | 128 | **121** | limited troubleshooting; 7 excluded |
| RED | 112 | **111** | safety/fallback only (burner-cooker hub absent) |
| REVIEW_REQUIRED | 25 | **25** | held; no publishable dangerous procedure |

YELLOW exclusions (not failed authoring):

- 6 missing hubs from YELLOW batch policy (subset of 7 category-only hubs)  
- painting-services (HUMAN_REVIEW hold)  
- ⇒ 128 = 121 authored + 7 intentionally excluded  

## 6. Seven category-only hubs

No Service rows (locked):

refrigerator, microwave, washing-machine, water-heater, dishwasher, oven, burner-cooker

## 7. painting-services

Unchanged: `riskLevel=green`, `diyAvailable=true`, matrix=YELLOW.  
Published ServiceLocation rows for painting remain untouched.

## 8. Legacy records

13 unmapped draft services + 2,600 ServiceLocation pairs = documented extras outside the approved 311 matrix.  
Source of truth for the list: `prisma/data/catalog-a1.ts` → `UNMAPPED_LEGACY_DRAFT_SLUGS`.

## 9. Verification changes

Historical hardcodes replaced with state-aware invariants:

- A3.2 / A3.3 / A4.1 / A4.1.1: no longer require ServiceLocation === 99  
- Assert: published=49, pilots=50 preserved, no duplicates, hubs absent  
- Assert: approvedMatrixRows + legacyOutsideMatrixRows = total  
- A4.2 GREEN: GREEN=46; RED/YELLOW tracked independently (not forced to 0)  
- A4.2 YELLOW: 121 authored; 128 = 121 + 7 excluded  

Helper: `src/lib/service-location/population.ts`  
Report script: `scripts/service-location-population-report.ts`  
Machine report: `docs/service-location-population-report.json`

## 10. Is 63,400 intended / documented / legacy / accidental?

**Documented legitimate expansion:**

- Intended approved candidates with real Service rows: **60,800** (304×200)  
- Documented legacy extras: **2,600** (13×200)  
- Accidental duplicates: **0**  
- Hub Service rows: **never created** (correct)

Materialize previously included all non-archived services (legacy included when expanded). Default materialize now excludes legacy unless `MATRIX_INCLUDE_LEGACY=1`; existing legacy pairs are preserved.

**Verdict:** `DOCUMENTED_LEGACY_PLUS_APPROVED_MATRIX` — not an unexplained anomaly. Deletion of the 2,600 requires separate explicit approval.
