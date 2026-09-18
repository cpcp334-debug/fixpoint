# Locale-specific slugs (EN Latin / AR Arabic)

## Policy
- **`/en/...`** uses **Latin** slugs only (`drain-blockage-removal`, `abu-dhabi`, `faq-ac-maintenance`)
- **`/ar/...`** prefers Arabic forms from `scripts/_slug-maps.json` when Hostinger/nginx can serve Unicode paths.
- **Hostinger note (2026-09):** Unicode path segments currently **404 at the edge** before Next.js. Until that is fixed, public **blog** and **FAQ** hrefs stay **Latin for both locales**. Lookup still accepts Arabic URL params for soft recovery.
- No 301 redirect table. Lookup accepts either form so soft recovery still works.

## Implementation
- DB primary `slug` is **Latin** (restored via `scripts/restore-latin-primary-slugs.ts` from `scripts/_slug-maps.json`).
- Blog articles: restore with `scripts/restore-latin-article-slugs.ts` → Latin SEC `{service}-{estate}-{city}`; Arabic forms in `_slug-maps.json` → `article`.
- FAQ articles: restore with `scripts/restore-latin-faq-slugs.ts` / `scripts/finish-faq-latin-restore.ts` → `faq-{latinService}`; Arabic forms in `_slug-maps.json` → `faq`.
- Arabic public forms come from `_slug-maps.json` via `src/lib/slug/locale-slug.ts`, `src/lib/slug/faq-slug-map.ts`, and `src/lib/slug/blog-slug-map.ts`.
- Resolvers use `serviceLookupCandidates` / `locationLookupCandidates` / `faqLookupCandidates` / `blogLookupCandidates`.
- FAQ index identity is **`categorySlugs` contains `service-faq`**, not slug prefix alone.
- Blog public copy never surfaces `REVIEW_REQUIRED` (scrubbed in `src/lib/blog/catalog.ts`).

## Restore (Hostinger MySQL)
```bash
npx tsx scripts/restore-latin-primary-slugs.ts --dry-run
npx tsx scripts/restore-latin-primary-slugs.ts
npx tsx scripts/restore-latin-faq-slugs.ts --dry-run
npx tsx scripts/restore-latin-faq-slugs.ts
npx tsx scripts/finish-faq-latin-restore.ts
npx tsx scripts/restore-latin-article-slugs.ts --dry-run --limit=20
npx tsx scripts/restore-latin-article-slugs.ts --batch=250
npx tsx scripts/finish-article-latin-restore.ts
```

## Smoke after Redeploy
- `/en/faq` — ~454 service FAQ pages (not empty; no `__restore_faq_*`)
- `/en/blog` — Latin article hrefs; featured detail **200** with full body
- `/ar/blog` — Latin article hrefs; titles scrubbed of `REVIEW_REQUIRED`
- `/en/blog/wood-painting-town-square-dubai-dubai` (after article restore)
- AR chrome brand: **فكس بوينت**
