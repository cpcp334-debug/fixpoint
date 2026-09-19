# Redeploy — independent Arabic location hubs + better AR slugs

## What landed
- Independent MSA Arabic for **277** serving location hubs (5 hand pilots + 272 bank composer).
- EN `LocationI18n` unchanged; no OpenAI; no 301s.
- Arabic slugs improved in `scripts/_slug-maps.json` (e.g. وسط-مدينة-دبي, ممشى-المدينة).
- Soft `replaceState` on `/ar/locations/*` when Latin path is still in the address bar.

## Counts
- Independent/pilot AR bodies: **277**
- Thin GEO AR left: **0**
- AR word range (composer batch): **1112–1160** (gate ≥800)

## Sample AR URLs (percent-encoded)
- https://fixpoint.ae/ar/locations/%D9%85%D8%B1%D8%B3%D9%89-%D8%AF%D8%A8%D9%8A (مرسى دبي)
- https://fixpoint.ae/ar/locations/%D9%88%D8%B3%D8%B7-%D9%85%D8%AF%D9%8A%D9%86%D8%A9-%D8%AF%D8%A8%D9%8A (وسط مدينة دبي)
- https://fixpoint.ae/ar/locations/%D9%85%D9%85%D8%B4%D9%89-%D8%A7%D9%84%D9%85%D8%AF%D9%8A%D9%86%D8%A9 (ممشى المدينة)
- https://fixpoint.ae/ar/locations/%D9%85%D8%AF%D9%8A%D9%86%D8%A9-%D8%A7%D9%84%D9%85%D8%AD%D8%B1%D9%83%D8%A7%D8%AA (مدينة المحركات)

Latin `/ar/locations/{latin}` still loads; address bar soft-replaces to Arabic when JS runs.

## Redeploy
Push `main`, then Redeploy on Hostinger. Report the **new** commit hash as the Redeploy hash.
