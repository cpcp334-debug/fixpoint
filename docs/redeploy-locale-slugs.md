# Locale-specific slugs (EN Latin / AR Arabic)

## Policy
- **`/en/...`** uses **Latin** slugs only (`drain-blockage-removal`, `abu-dhabi`, `faq-ac-maintenance`)
- **Services / locations `/ar/...`** use **Arabic** slugs (`إزالة-الصرف`, `أبوظبي`)
- **FAQ public paths stay Latin** (`/en/faq/faq-…` and `/ar/faq/faq-…`) — Hostinger cannot serve Unicode URL paths reliably. Arabic FAQ forms are kept in `_slug-maps.json` → `faq` for soft lookup only.
- No 301 redirect table. Lookup accepts either form so soft recovery still works.

## Implementation
- DB primary `slug` is **Latin** (restored via `scripts/restore-latin-primary-slugs.ts` from `scripts/_slug-maps.json`).
- FAQ articles: `scripts/restore-latin-faq-slugs.ts` → `faq-{latinService}`; map rebuild: `scripts/rebuild-faq-slug-map.ts`.
- FAQ index identity is **`categorySlugs` contains `service-faq`**, not slug prefix alone (`src/lib/faq/pages.ts`).
- Resolvers: `serviceLookupCandidates` / `locationLookupCandidates` / `faqLookupCandidates`.

## Restore (Hostinger MySQL)
```bash
npx tsx scripts/restore-latin-primary-slugs.ts --dry-run
npx tsx scripts/restore-latin-primary-slugs.ts
npx tsx scripts/restore-latin-faq-slugs.ts --dry-run
npx tsx scripts/restore-latin-faq-slugs.ts
npx tsx scripts/rebuild-faq-slug-map.ts
```

## Smoke after Redeploy
- `/en/faq` — ~454 service FAQ pages (not empty); Latin `faq-*` hrefs
- `/ar/faq` — same list; Arabic titles; Latin `faq-*` hrefs
- `/en/services` — full list ~436, Latin hrefs
- `/ar/services` — same list, Arabic hrefs
- `/en/diy` and `/en/blog` — lists still populated (FAQs excluded from blog)
- AR chrome brand: **فكس بوينت**
