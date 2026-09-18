# Redeploy — Arabic primary slugs (Option 3, no redirects)

## What changed
- **Service / location / category / DIY** display names and **primary slugs** are Arabic Unicode.
- **SEC blogs** are being recomposed to Arabic titles/bodies/slugs (`scripts/phase3-recompose-sec-ar.ts`, resume-safe).
- **Latin URLs intentionally 404** — no 301 redirects / no redirect table / no middleware remaps (product decision).
- Publisher gates reject `REVIEW_REQUIRED`, non-Arabic AR titles/bodies, and non-Arabic slugs.

## Before Redeploy
1. Confirm Phase 1 names: `npx tsx scripts/audit-ar-quality.ts` → services/locations should be ~0 `REVIEW_REQUIRED` / latin.
2. Confirm slug maps exist: `scripts/_slug-maps.json`.
3. Let Phase 3 run (or resume):  
   `npx tsx scripts/phase3-recompose-sec-ar.ts --batch=50 --skip-gates`  
   Cursor: `scripts/_phase3-sec-recompose-cursor.json`.
4. Smoke `/ar/services`, `/ar/locations/دبي`, one Arabic blog slug after a few batches.

## Redeploy
Push this branch, then Redeploy on Hostinger (or your usual pipeline).  
`postdeploy` already runs migrate + import hooks — no redirect migration.

## Rollback note
Restoring Latin slugs requires a DB restore or re-import from a backup. There is no automatic Latin→Arabic redirect layer.
