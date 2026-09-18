# Redeploy — locale-specific slugs (EN Latin / AR Arabic)

## Policy (updated)
- **`/en`** → Latin slugs only  
- **`/ar`** → Arabic slugs only  
- Not Option 3 (Arabic-everywhere). See `docs/redeploy-locale-slugs.md`.

## What changed
- DB primary `slug` restored to **Latin** via `scripts/restore-latin-primary-slugs.ts` + `scripts/_slug-maps.json`.
- Link builders / resolvers are locale-aware (`src/lib/slug/locale-slug.ts`).
- Soft Service×Location pages when matrix empty; AR chrome brand **فكس بوينت**; public AR copy never shows `REVIEW_REQUIRED`.

## Smoke
- `/en/services` (~436), `/ar/services`
- `/en/drain-blockage-removal`, `/ar/إزالة-الصرف`
- `/en/locations/abu-dhabi`, `/ar/locations/أبوظبي`
- Soft SL: `/ar/أبوظبي/إزالة-الصرف`

## Redeploy
Push `main`, then Redeploy on Hostinger. Report the commit hash as the Redeploy hash.
