# Redeploy — Arabic estate/area directory + admin LocationI18n

## Problem
On `/ar/locations/{emirate}`, the cities/areas/estates directory was empty. Public filter compared **Arabic path slugs** to the DB publish set of **Latin master slugs**, so every place was filtered out. Visitors could not see (or name) places under an area in Arabic.

Admin locations list showed EN name only; edit form only saved name/intro (not hub body/SEO).

## Fix
- `public-filter.ts`: match publish set via `toMasterLocationSlug`
- Master Arabic display names require Arabic script; hub pages fall back to master when LocationI18n AR is Latin/REVIEW_REQUIRED
- City pages list estates/communities under that place with AR labels (`childrenTitle`, `estates`, `underThisArea`, `parentArea`)
- Admin `/admin/locations`: EN + AR columns, hierarchy type labels, type filter, AR preview path
- Admin edit: full LocationI18n EN+AR (intro, localServiceInfo, propertyTypes, nearbyAreas, SEO); child places list
- Blogs 50/100 pager untouched

## Smoke after Redeploy
- https://fixpoint.ae/ar/locations/دبي — section «المدن والمناطق في هذه الإمارة» with Arabic place chips
- https://fixpoint.ae/ar/locations/dubai-marina (or AR slug) — parent «ضمن» + nearby/emirate lists in Arabic
- `/admin/locations` — EN name + AR name columns; Edit shows Arabic hub/SEO fields

## Redeploy
Push `main`, then Redeploy on Hostinger. Report the **new** commit hash as the Redeploy hash.
