# Locale-specific slugs (EN Latin / AR Arabic)

## Policy
- **`/en/...`** uses **Latin** slugs only (`drain-blockage-removal`, `abu-dhabi`)
- **`/ar/...`** uses **Arabic** slugs only (`إزالة-الصرف`, `أبوظبي`)
- No 301 redirect table. Lookup accepts either form so soft recovery still works.

## Implementation
- DB primary `slug` is **Latin** (restored via `scripts/restore-latin-primary-slugs.ts` from `scripts/_slug-maps.json`).
- Arabic public forms come from `_slug-maps.json` via `src/lib/slug/locale-slug.ts` (`servicePathSlug`, `locationPathSlug`, `serviceHref`, `serviceLocationHref`).
- Resolvers use `serviceLookupCandidates` / `locationLookupCandidates` (Latin + Arabic).

## Restore (Hostinger MySQL)
```bash
npx tsx scripts/restore-latin-primary-slugs.ts --dry-run
npx tsx scripts/restore-latin-primary-slugs.ts
```

## Smoke after Redeploy
- `/en/services` — full list ~436, Latin hrefs
- `/ar/services` — same list, Arabic hrefs
- `/en/drain-blockage-removal` and `/ar/إزالة-الصرف`
- `/en/locations/abu-dhabi` and `/ar/locations/أبوظبي`
- Soft SL: `/ar/أبوظبي/إزالة-الصرف` and `/ar/إزالة-الصرف/أبوظبي`
- AR chrome brand: **فكس بوينت**
