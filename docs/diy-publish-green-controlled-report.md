# Controlled DIY GREEN publication

## Before → After

| Metric | Before | After |
|--------|-------:|------:|
| Total DIY guides | 563 | 563 |
| Published + indexable | 2 | 45 |
| Draft | 561 | 518 |
| Public EN catalog cards | 2 | 45 |
| Public AR catalog cards | 2 | 45 |

## Matrix / safety

| Class | Published+indexable | Remaining draft (guide rows) |
|-------|--------------------:|-----------------------------:|
| GREEN | 45 unique guides (46 offerings; faucet shares 1 guide) | 1 legacy non-primary (`how-to-clean-a-bathroom`) |
| YELLOW | 0 | 245 |
| RED | 0 | 222 |
| REVIEW_REQUIRED | 0 | 50 |

- Matrix unchanged: GREEN 46 / YELLOW 128 / RED 112 / REVIEW_REQUIRED 25
- No YELLOW/RED/REVIEW_REQUIRED guide became public or indexable
- Grandfathered URLs still resolve: `/diy/how-to-fix-dripping-faucet`, `/diy/how-to-clean-ac-filter`

## What was published

- Newly published this run: **43** GREEN primary guides
- Already published (unchanged bodies): **2** (`how-to-fix-dripping-faucet`, `how-to-clean-ac-filter`)
- Categories promoted to published+indexable so catalogs list them: `cleaning`, `painting`, `walls` (plumbing + ac already public)

## Excluded from publication

| Guide | Gate |
|-------|------|
| `how-to-clean-a-bathroom` | Not the matrix GREEN primary (label-mismatch legacy draft). Primary for bathroom is `diy-bathroom-cleaning` (published). Left draft / non-indexable. |

## Verifies

- `verify:diy-authoring-a42` PASS
- `verify:diy-authoring-a42-yellow` PASS
- `verify:diy-authoring-a42-yellow-remaining` PASS
- `verify:diy-authoring-a42-red-rr` PASS (`publishedRed: 0`)
- `verify:diy-safety-a411` PASS

## Notes

- Public pages read `DiyGuideI18n`; authored GREEN `profileJson` was materialized into EN (+ independent AR) before publish.
- Script: `npm run db:diy-publish-green`
- Report JSON: `docs/diy-publish-green-controlled-report.json`
