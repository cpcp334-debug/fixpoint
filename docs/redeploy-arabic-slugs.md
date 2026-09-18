# Redeploy — locale-specific slugs (EN Latin / AR Arabic encoded)

## Policy
- **`/en`** → Latin slugs only  
- **`/ar`** → Arabic slugs, **percent-encoded** path segments (Hostinger ASCII-safe)  
- No 301 redirects. Soft recovery via slug maps + decodeURIComponent/NFC lookup.

## What changed
- DB primary `slug` is **Latin** (services, locations, FAQ, articles, DIY).
- Arabic forms in `scripts/_slug-maps.json`; builders encode on `/ar`.
- Soft Service×Location pages when matrix empty; AR chrome brand **فكس بوينت**; public AR copy never shows `REVIEW_REQUIRED`.

## Smoke
- `/en/services` (~436), `/ar/services`
- `/en/drain-blockage-removal`, `/ar/{encoded-إزالة-الصرف}`
- `/en/locations/abu-dhabi`, `/ar/locations/{encoded-أبوظبي}`
- `/en/blog/{latin}`, `/ar/blog/{encoded-arabic}`
- Soft SL: `/ar/{encoded-loc}/{encoded-svc}`

## Redeploy
Push `main`, then Redeploy on Hostinger. Report the commit hash as the Redeploy hash.
