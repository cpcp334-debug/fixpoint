# Redeploy — locale-specific slugs (EN Latin / AR Arabic encoded)

## Policy
- **`/en`** → Latin slugs only  
- **`/ar`** → Arabic slugs, **percent-encoded** path segments (Hostinger ASCII-safe)  
- No 301 redirects. Soft recovery via slug maps + decodeURIComponent/NFC lookup + optional `replaceState`.
- DB primary `slug` stays **Latin**. Never run Phase 3 primary-slug overwrite.

## What changed (this pass)
- Filled **~99k** missing `scripts/_slug-maps.json` → `article` entries from AR titles + SEC service/estate/city AR names (incl. `electrical-preventive-maintenance-dubai-sports-city-dubai` → `صيانة-الكهرباء-الوقائية-مدينة-دبي-الرياضية-دبي`).
- SEC composer `padToWords` no longer repeats `##` heading blocks (was causing 5× TOC entries).
- Blog article page: unique TOC + render-time skip of duplicate heading sections.
- Soft client `replaceState` when `/ar` still shows a Latin segment but the mapped Arabic public slug is known.

## Live proof (pre-redeploy findings)
- Hostinger already served **18c6f5b** behavior: many `/ar/blog` card hrefs were percent-encoded Arabic.
- Unmapped SEC rows (e.g. Sports City electrical PM, wood-painting with `REVIEW_REQUIRED` titles) still emitted **Latin** hrefs — fixed by the map fill above.

## Smoke after Redeploy
- `/ar/blog` card href for Sports City electrical must contain Arabic percent-encoding, e.g.  
  `/ar/blog/%D8%B5%D9%8A%D8%A7%D9%86%D8%A9-%D8%A7%D9%84%D9%83%D9%87%D8%B1%D8%A8%D8%A7%D8%A1-…`
- Latin bookmark `/ar/blog/electrical-preventive-maintenance-dubai-sports-city-dubai` still **loads** (no 301); address bar soft-replaces to Arabic when JS runs.
- TOC on that article: each heading once (no 5× “أسئلة قبل الحجز”).
- `/en/blog/electrical-preventive-maintenance-dubai-sports-city-dubai` stays Latin.

## Redeploy
Push `main`, then Redeploy on Hostinger. Report the **new** commit hash as the Redeploy hash (must be after this fill).
