# ServiceLocation content length report

Generated: 2026-09-10T03:45:48.971Z

## Method
Rendered word count via `countRenderedWords` (matches `ServiceLocationView`).

## Population
| Metric | Value |
|--------|------:|
| Total SL | 63400 |
| Draft / published | 63351 / 49 |
| Draft locales target (EN+AR) | 126702 |
| Longform jobs succeeded | 44302 |
| Matrix / legacy | 60800 / 2600 |

## Protected published 49
| | EN | AR |
|--|---:|---:|
| Counted | 49 | 49 |
| Average | 419 | 325 |
| Median | 415 | 324 |
| Under 800 | 49 | 49 |

Grandfathered — not auto-regenerated.

## Draft sample (first 1000 pairs / 2000 locales) — post longform composer
### EN
| Band | Count |
|------|------:|
| <500 | 0 |
| 500–799 | 0 |
| 800–999 | 511 |
| 1,000–1,200 | 489 |
| >1,200 | 0 |
| Average / median | 993 / 999 |

### AR
| Band | Count |
|------|------:|
| <500 | 0 |
| 500–799 | 0 |
| 800–999 | 952 |
| 1,000–1,200 | 48 |
| >1,200 | 0 |
| Average / median | 973 / 974 |

## Readiness
| Status | Count |
|--------|------:|
| Publishable (quality) | 260 |
| Draft | 63351 |
| Review required | 63091 |
| Quality failed | 0 |
| Published | 49 |
| Indexable EN / AR | 49 / 49 |

## Notes
- Coverage is never invented by generation.
- Published 49 protected.
- Continuous longform: `npm run db:content-sl-long-continue`
