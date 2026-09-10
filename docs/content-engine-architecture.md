# Content Engine Architecture

**Phase:** 1 — Foundation only  
**Rule:** AI generates → code validates → DB controls → publication last. **AI never publishes.**

## Freeze (do not mutate)

| Baseline | Count |
|----------|------:|
| Public DIY (GREEN) | 45 |
| Public Service × Location | 49 |
| Public total | 94 |
| DIY DB records | 563 |
| Approved services | 311 |
| Content records (target corpus) | 63,963 |
| EN+AR versions | 127,926 |

Do **not** mass-generate, invent `ServiceLocation.covered`, change safety classes, or rewrite protected public URLs in Phase 1.

## Pipeline

```
MANIFEST → GENERATOR → VALIDATOR → REVIEW QUEUE → PUBLICATION QUEUE → DATABASE
```

## Layout

```
content-engine/
  config/       # totals, freeze, publication gate, types
  manifests/    # summary builder, 311 DIY mapping status, blog architecture
  generators/   # stub only (generation disabled)
  validators/   # words, uniqueness, SEO, AEO, GEO, safety, i18n, image, DIY
  pipeline/     # batch/idempotency, review, publication, audit, dry-run
  images/       # WebP+alt contract status
  reports/      # dry-batch JSON outputs
  scripts/      # test-batch 1|10|100
  tests/        # validator + gate unit checks
```

## Prisma (additive)

- Extended `ContentGenerationKind`: `blog_article`, `engine_validate`, `diy_primary_mapping`
- New: `ContentEngineManifest`, `ContentEngineValidation`, `ContentEngineBatch`, `ContentEngineRunItem`
- New enum: `ContentEngineLifecycle`, `ContentEngineContentType`
- Existing `ContentGenerationJob` remains the async work queue

## Hard publication gate

All must pass: ≥1,000 rendered words (EN and AR), unique, useful, WebP+alt, EN/AR complete, no English fallback, SEO, AEO, GEO where applicable, quality, safety, coverage where applicable, **human approval**.

## 311 DIY mapping

Engine references existing reconcile artifacts; does not delete the 563 DIY rows; classifies extras; does not invent the 7 missing hubs.

## Blog

Routes `/[locale]/blog` and `/[locale]/blog/[slug]` — architecture supported; **45 editorial articles not generated in Phase 1**.

## Tests

```bash
npm run engine:test:path
```

Dry path asserts: generation skipped, publication queue empty without approval, failures enter review.

## Next (not Phase 1)

Wire real generator → validators against live drafts → 1→10→100 **real** articles → only then scale toward corpus.
