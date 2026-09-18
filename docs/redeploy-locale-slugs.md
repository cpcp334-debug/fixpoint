# Locale-specific slugs (EN Latin / AR Arabic, percent-encoded)

## Policy
- **`/en/...`** uses **Latin** slugs only (`drain-blockage-removal`, `abu-dhabi`, `faq-ac-maintenance`)
- **`/ar/...`** uses **Arabic** slugs from `scripts/_slug-maps.json`, emitted as **percent-encoded** path segments (`encodeURIComponent` per segment) so Hostinger/nginx receives ASCII-safe URLs that decode to Arabic
- **No 301 redirect table.** Lookup accepts Latin, Arabic, or encoded forms (decodeURIComponent + NFC)
- DB primary `slug` stays **Latin** — never overwrite Article/Service/DIY primary with Arabic

## Hostinger note
Raw Unicode path segments historically **404 at the edge**. Prefer encoded AR hrefs. If encoded Arabic still 404s after deploy, keep EN Latin working and report the blocker (do not add 301s).

## Implementation
- Path builders: `src/lib/slug/locale-slug.ts`, `blog-slug-map.ts`, `faq-slug-map.ts`, `diy-slug-map.ts`
- Encoding: `encodePathSegment` / `normalizeRouteSlug` in `src/lib/slug/route-slug.ts`
- Maps: `scripts/_slug-maps.json` (`service`, `location`, `article`, `faq`, `diyGuide`, `diyCategory`)
- FAQ identity: `categorySlugs` contains `service-faq`
- Public AR copy never surfaces `REVIEW_REQUIRED` (scrub + `public-i18n` + catalog)

## Restore (Hostinger MySQL)
```bash
npx tsx scripts/restore-latin-primary-slugs.ts --dry-run
npx tsx scripts/restore-diy-latin-slugs.ts --dry-run
npx tsx scripts/restore-diy-latin-slugs.ts
npx tsx scripts/restore-latin-faq-slugs.ts
npx tsx scripts/finish-faq-latin-restore.ts
npx tsx scripts/restore-latin-article-slugs.ts --batch=250
npx tsx scripts/finish-article-latin-restore.ts
npx tsx scripts/phase1-backfill-service-ar-names.ts
```

## Smoke after Redeploy
- `/en/faq` — ~454 service FAQ pages
- `/en/blog/{latin-sec-slug}` — 200
- `/ar/blog/{percent-encoded-arabic}` — 200 (or report Hostinger blocker)
- `/en/ac-cleaning`, `/ar/%D8%AA%D9%86%D8%B8%D9%8A%D9%81-...`
- `/en/locations/abu-dhabi`, `/ar/locations/%D8%A3%D8%A8%D9%88%D8%B8%D8%A8%D9%8A`
- AR chrome brand: **فكس بوينت**
