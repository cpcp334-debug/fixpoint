# Final service catalog audit (PRE-LAUNCH PROPOSAL)

**Status:** Audit + proposal only.  
**No** database mutation · **No** seed mutation · **No** public content · **No** ServiceLocation expansion · **No** Arabic/Blog/sitemap indexing changes.

## Locked decisions

- **1A** Audit/proposal only  
- **2C** Electrical count from audit quality  
- **3B** Full 18-category audit  
- **4A** Appliance electrical diagnosis stays under appliances  

## Baseline → Proposed

| | OLD | PROPOSED |
|--|----:|---------:|
| Parents | 18 | **18** |
| Children | 293 | **430** |
| Total offerings | 311 | **448** |
| Electrical children | 17 | **121** |

### Deltas

| Change | Count |
|--------|------:|
| Electrical added | 104 |
| Other categories added | 37 |
| Merged away (deprecate) | 4 |
| Renamed | 1 |

Net children math check: 293 + 104 + 37 - 4 = **430** (must equal 430)

## Parents (18) — KEEP all

No parent split/merge recommended in this audit. Hubs remain commercially clear.

1. Cleaning Services (`cleaning` / anchor `cleaning-services`) — KEEP
2. General Building Maintenance (`general-maintenance` / anchor `building-maintenance`) — KEEP
3. Plumbing Maintenance (`plumbing` / anchor `plumbing-maintenance`) — KEEP
4. Electrical Maintenance (`electrical` / anchor `electrical-maintenance`) — KEEP
5. AC / Air Conditioning Maintenance (`ac` / anchor `ac-maintenance`) — KEEP
6. Painting Services (`painting` / anchor `painting-services`) — KEEP
7. Wall Maintenance & Repair (`walls` / anchor `wall-maintenance`) — KEEP
8. Swimming Pool Cleaning & Maintenance (`swimming-pool` / anchor `swimming-pool-maintenance`) — KEEP
9. Sauna Room Cleaning & Maintenance (`sauna` / anchor `sauna-maintenance`) — KEEP
10. Water Tank Cleaning & Maintenance (`water-tank` / anchor `water-tank-cleaning`) — KEEP
11. Refrigerator Maintenance / Repair (`refrigerator` / anchor `refrigerator`) — KEEP
12. Microwave Maintenance / Repair (`microwave` / anchor `microwave`) — KEEP
13. Washing Machine Maintenance / Repair (`washing-machine` / anchor `washing-machine`) — KEEP
14. Water Heater Maintenance / Repair (`water-heater` / anchor `water-heater`) — KEEP
15. Dishwasher Maintenance / Repair (`dishwasher` / anchor `dishwasher`) — KEEP
16. Gym Cleaning & Maintenance (`gym` / anchor `gym-cleaning-maintenance`) — KEEP
17. Oven Maintenance / Repair (`oven` / anchor `oven`) — KEEP
18. Burner / Cooker Maintenance / Repair (`burner-cooker` / anchor `burner-cooker`) — KEEP

## Children by category (proposed)

- **ac**: 23
- **burner-cooker**: 20
- **cleaning**: 25
- **dishwasher**: 16
- **electrical**: 121
- **general-maintenance**: 20
- **gym**: 16
- **microwave**: 14
- **oven**: 16
- **painting**: 20
- **plumbing**: 24
- **refrigerator**: 16
- **sauna**: 15
- **swimming-pool**: 18
- **walls**: 17
- **washing-machine**: 17
- **water-heater**: 16
- **water-tank**: 16

## Safety totals (proposed children)

| Risk | Count |
|------|------:|
| GREEN | 5 |
| YELLOW | 309 |
| RED | 90 |
| REVIEW_REQUIRED | 26 |

> Baseline risk values for existing services are **proposal heuristics** for planning. Historical DIY matrix (`diy-classification-matrix-311.json`) remains the audit history SoT until a future apply phase rebuilds `diy-classification-matrix-FINAL.*`.

## Merges proposed

- MERGE `regular-cleaning` → `recurring-cleaning` — Near-identical booking intent (scheduled/recurring). Keep Recurring Cleaning as canonical.
- MERGE `water-tank-sanitization` → `water-tank-disinfection` — Substantially identical chemical sanitation intent. Keep Disinfection as canonical.
- MERGE `moisture-damage-repair` → `damp-wall-repair` — High overlap; damp/moisture wall corrective work. Keep Damp Wall Repair; redirect moisture naming.
- MERGE `general-property-repair` → `minor-building-repairs` — Broad catch-all overlap. Prefer Minor Building Repairs; handyman remains separate.

## Renames proposed

- `electrical-fault-finding` → `electrical-fault-diagnosis` (Electrical Fault Finding → Electrical Fault Diagnosis) — Aligns terminology with other diagnosis offerings; clearer customer language. Pre-launch OK to change.

## Near-duplicates kept (with rationale)

- House Cleaning / Residential Cleaning — **KEEP_BOTH** — House vs residential class still useful for UAE villa/apartment marketing; monitor overlap.
- Window Cleaning / Glass Cleaning — **KEEP_BOTH** — Window assemblies vs general glass/partitions.
- One-Time Cleaning / Deep Cleaning — **KEEP_BOTH** — Visit pattern vs intensity.
- Interior Painting / Wall Painting — **KEEP_BOTH** — Scope (interior suite) vs surface (walls).
- Residential Painting / Villa Painting / Apartment Painting — **KEEP_ALL** — Property-type intents remain commercially useful.
- AC Gas Check / AC Gas Recharge — **KEEP_BOTH** — Diagnosis/check vs refrigerant work.
- Gym Sanitization / Gym Disinfection — **KEEP_BOTH_FOR_NOW** — Similar; future merge candidate if content converges.
- Light Installation / LED Light Installation — **KEEP_BOTH** — General vs LED-specific customer search.
- Light Repair / LED Light Replacement — **KEEP_BOTH** — Repair vs replace LED emitters/fixtures.
- Preventive Electrical Maintenance / Building Electrical Preventive Maintenance — **KEEP_BOTH** — Unit/home PM vs building-wide PM contracts.

## Appliance electrical (4A)

Kept under appliance categories (not moved to Electrical):

- Refrigerator Electrical Fault Diagnosis  
- Microwave Electrical Diagnosis  
- Water Heater Electrical Fault Diagnosis  
- Oven Electrical Fault Diagnosis  

Building-side connection work proposed under Electrical instead (e.g. AC Isolator Installation, Cooker Electrical Connection).

## Validation (proposal)

| Check | Result |
|-------|--------|
| Duplicate child slugs | **0** |
| Duplicate child names | **0** |
| Parents | 18 |
| Children | 430 |
| Total | 448 |
| Forced 311? | No |
| Forced 454? | No |
| Forced Electrical 160? | No (landed **121**) |

## STOP

This phase stops at audit + proposal artifacts:

- `docs/final-service-catalog-audit.md`
- `docs/final-service-catalog.json`
- `docs/final-service-catalog.csv`
- `docs/final-service-changes.md`
- `docs/final-service-changes.json`
- `docs/electrical-service-expansion.md`
- `docs/electrical-service-expansion.json`
- `docs/electrical-service-expansion.csv`

**Next (requires explicit approval):** apply phase to seed/DB + DIY matrix FINAL — not started.
