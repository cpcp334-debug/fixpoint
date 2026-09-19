# Redeploy — locale-specific slugs (EN Latin / AR Arabic encoded)

## Policy
- **`/en`** → Latin slugs only  
- **`/ar`** → Arabic slugs, **percent-encoded** path segments (Hostinger ASCII-safe)  
- No 301 redirects. Soft recovery via slug maps + decodeURIComponent/NFC lookup.
- DB primary `slug` stays **Latin**. Never run Phase 3 primary-slug overwrite.

## What changed (this pass)
- Filled missing `scripts/_slug-maps.json` → `article` entries (~10k) from AR titles.
- SEC blog publish now writes Arabic maps (`slugAr`) without touching DB slugs.
- Language switcher remaps EN↔AR via `/api/locale-path`.
- Hide system blog tags (`service-location`) from public kickers; AR topic cover variants (`*-ar.webp`).

## Smoke
- `/en/blog/electrical-cable-repair-south-ajman-ajman`
- `/ar/blog/%D8%A5%D8%B5%D9%84%D8%A7%D8%AD-%D8%A7%D9%84%D9%83%D9%87%D8%B1%D8%A8%D8%A7%D8%A1-%D8%A7%D9%84%D9%83%D8%A7%D8%A8%D9%84-%D8%AC%D9%86%D9%88%D8%A8-%D8%B9%D8%AC%D9%85%D8%A7%D9%86-%D8%B9%D8%AC%D9%85%D8%A7%D9%86`
  (browser shows Arabic; wire path is percent-encoded)
- Latin `/ar/blog/electrical-cable-repair-south-ajman-ajman` still **loads** (no 301)

## Redeploy
Push `main`, then Redeploy on Hostinger. Report the commit hash as the Redeploy hash.
