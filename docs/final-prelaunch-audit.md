# Final pre-launch audit

Audited: 2026-09-11. Read-only. Database counts are from the current local database. HTTP routes were not probed. Where an old report conflicts with this database or these files, this audit wins.

**PROJECT STATUS: NOT READY**

**Overall completion: 38%** toward a production launch. Volume of pages is high. Launch gates are not met.

## A. Executive summary

COMPLETED:
- Code catalog is locked at 18 parents + 436 children = 454 offerings. Electrical children in code are 160.
- Location master file has 278 records. All 278 slugs are in the database. 277 places are active, indexable, and `serves=true`.
- Published and indexable: 454 service blogs, 277 place blogs, 454 FAQ pages, 454 generated DIY guides, plus 2 older DIY guides and 45 original blog posts.
- Generated sets clear 1,000 rendered words in English and Arabic.
- ServiceLocation public coverage is still 49. The matrix was not expanded.
- ServiceLocation publish still requires `CONFIRM_PUBLISH`, approved status, and eligibility that includes `covered=true`.

PARTIALLY COMPLETED:
- Database has 460 Service rows. 447 match the approved catalog. 13 legacy drafts sit outside it. 7 appliance hubs have no Service row.
- Only 7 services are active and indexable.
- 114 extra draft locations remain. District families are not parent/child.
- 298 RED DIY articles are public. RED HowTo is 0.
- SEO tags exist. Generated copy is template substitution.

REMAINING:
- Staging Postgres, deployment, and create-product verification.
- Indexing decision for template pages and RED DIY articles.
- Uniqueness rewrite before production SEO.
- FAQ images, one short Arabic DIY, legacy service rows, hub pages.

BLOCKED:
- Production launch. This workspace is local. No deployment target was found.
- Safe indexing of the generated corpus. Templates repeat.
- Coverage expansion. Listing is not coverage. Do not build the 125,758 matrix.

NEXT REQUIRED ACTION:
Do not deploy and do not expand ServiceLocation. Freeze the 454 catalog and the 277 public places. Stand up staging Postgres and verify create-product before any production phase. Then decide whether generated pages and RED DIY articles stay indexable.

## B. Service catalog

| Item | Current |
| --- | ---: |
| Parents in code | 18 |
| Children in code | 436 |
| Approved offerings | 454 |
| Prisma Service rows | 460 |
| Active | 7 |
| Draft | 453 |
| Indexable | 7 |
| Duplicate slugs | 0 |
| Duplicate English names | 0 |

The old 311 catalog is superseded. Code asserts 454. Do not treat 311 as current.

Active and indexable (the only service URLs in the sitemap):

- `cleaning-services`
- `building-maintenance`
- `plumbing-maintenance`
- `electrical-maintenance`
- `ac-maintenance`
- `painting-services`
- `wall-maintenance`

Approved slugs can still render while draft. Metadata sets `index: false` unless the row is active and indexable. Sitemap includes only active + indexable services.

Missing Service rows (category hubs, not a failed child import):

- `refrigerator`
- `microwave`
- `washing-machine`
- `water-heater`
- `dishwasher`
- `oven`
- `burner-cooker`

Those 7 have blog, DIY, and FAQ pages. They do not have a `/{slug}` service page. FAQ pages only link a service when a Service row exists, so those hub FAQ pages do not link a missing URL.

Legacy drafts outside the 454 (do not publish without a catalog decision):

- `carpentry-joinery`
- `flooring-tiling`
- `waterproofing-sealing`
- `roof-exterior-maintenance`
- `bathroom-maintenance`
- `kitchen-maintenance`
- `doors-windows`
- `preventive-maintenance`
- `emergency-maintenance`
- `demolition-dismantling`
- `home-appliance-maintenance`
- `oven-cooker-maintenance`
- `kitchen-appliance-maintenance`

Database has 27 categories. The approved catalog has 18. The extra categories belong to those legacy rows.

Bad naming and placement: no slug collisions. Appliance work is split between the 7 hubs (no Service row) and 3 legacy `appliances` drafts. That is a placement problem, not a missing child in the 436.

### Electrical

| Item | Count |
| --- | ---: |
| DB rows in electrical | 161 |
| Active indexable | 1 (`electrical-maintenance`) |
| Draft children | 160 |
| Code children | 160 |
| Exact name duplicates | 0 |
| Same-stem pairs (repair / replacement / installation) | 16 |

Those 16 pairs are separate approved jobs, not accidental duplicates. Do not merge or reject them in this audit. A later catalog decision could collapse them. Current code does not.

Recommended final Electrical count: **160 children + 1 parent row = 161 rows**. Do not add more. Do not drop any of the 160 without an explicit catalog change.

CURRENT CATALOG COUNT: **454**

PROPOSED FINAL CATALOG COUNT: **454**

## C. Location master

The 277 master is not only a proposal. It is in the file and in the database, and the 277 places are public.

| Item | Count |
| --- | ---: |
| File records | 278 (277 places + `uae`) |
| DB locations | 392 |
| Emirates | 7 |
| Cities | 21 |
| Communities | 363 |
| Areas / subareas | not a separate type |
| Active | 278 |
| Draft | 114 |
| `serves=true` | 278 |
| Indexable | 277 |
| Master slugs missing in DB | 0 |
| Extra rows not in the master | 114, all draft, none published |
| Orphans | 0 |
| Duplicate slugs | 0 |

`uae` is active and `serves=true`, not indexable. That is the one master record that is not a public place page.

File note in `prisma/data/uae-location-master-200.json` still says `APPLIED_DRAFT` and that new places are not published. That note is stale. Current database: 277 places are published and indexable.

OLD (about 200 in the historical filename) → CURRENT: 392 rows, 277 public places.

PROPOSED 277 → CURRENT: implemented and public. 114 leftovers were not deleted.

Aliases:

- Al Sajaa is the public slug `al-sajaa`. Al Saja'a is an alias in the file, not a second public page. Draft leftover `al-sajaa-industrial-1` is not public.
- Maliha is the public slug `maliha`. No public Mleiha row was found.

District families (Al Barsha, Umm Suqeim, Al Safa, Al Jurf, Nuaimiya, Rashidiya, Mowaihat, Rawdha, Helio) are **siblings under the emirate**, not children of a district parent. Example: `al-barsha`, `al-barsha-first`, and `al-barsha-3` all parent to `dubai`.

Public same-name collision: `al-rashidiya-dubai` and `al-rashidiya` (Ajman) both display "Al Rashidiya" and are both indexable.

Industrial: Sharjah industrial areas in the master are public. Draft leftovers include `khalifa-industrial`, `al-ruwais-industrial-city`, `al-sajaa-industrial-1`, and `ajman-industrial-1`. Those drafts are not coverage and are not in the public place list.

Arabic: 7 `REVIEW_REQUIRED` Arabic location names remain. None of those are on indexable rows. Public Arabic place names are not invented. Some public pages therefore show the English name in Arabic.

## D. Service × Location

| Item | Count |
| --- | ---: |
| Rows | 63,400 |
| Covered | 49 |
| Uncovered | 63,351 |
| Published | 49 |
| Draft | 63,351 |
| Indexable EN | 49 |
| Indexable AR | 49 |
| Duplicate pairs | 0 |
| Invalid service or location IDs | 0 |

The stored matrix is **317 services × 200 locations = 63,400**. It is not 311 × locations and not 454 × 277.

Public rows are the 7 parent hubs × 7 emirates. No community ServiceLocation page is public.

Theoretical full matrix, not created:

- 454 approved offerings × 277 public places = **125,758**
- 447 approved Service rows × 277 public places = **123,819**

`ServiceLocation.covered` is still the public source of truth. A row existing as draft is not coverage.

## E. DIY

| Item | Count |
| --- | ---: |
| Guides | 717 |
| Published | 456 |
| Draft | 261 |
| Public indexable | 456 |
| Public RED | 298 |
| Public YELLOW | 156 |
| Public GREEN | 2 |
| Public HowTo | 2 |
| Public RED HowTo | 0 |
| Services with `primaryDiyGuideId` | 447 |
| Services with `diyAvailable=true` | 11 |

COMPLETED:
- One generated guide per approved offering, published, English and Arabic present.
- Hazardous generated guides use `schemaType=article` and risk `red`. They are observation and stop, not a HowTo repair schema.
- RED procedural HowTo publicly exposed = 0.

PARTIALLY COMPLETED:
- RED observation pages are public and indexable (298). A strict reading of "no public RED DIY" fails. A reading of "no public RED repair procedure" passes.
- `ac-maintenance` is `diyAvailable=true` and yellow, while the AC category composer treats AC work as hazardous and publishes red stop-guides. The parent chip can say DIY while the generated guide says stop.
- Five legacy drafts still have `diyAvailable=true`: `carpentry-joinery`, `flooring-tiling`, `bathroom-maintenance`, `kitchen-maintenance`, `doors-windows`.

REMAINING:
- Arabic on `how-to-fix-dripping-faucet` is 846 words. English is 1,022. It is the only public DIY under 1,000. It is above the 800 fail line.
- 261 draft guides are not the public set. They were not deleted.
- Do not set `diyAvailable` on electrical, gas, refrigerant, or sealed-appliance services.

Generated public DIY words: English min 1,022 / avg 1,153. Arabic min 846 / avg 1,093. Under 800: 0.

## F. Public content

HTTP was not probed. Counts below are database flags plus route code. A missing live server was not treated as a 404.

| Surface | Public / indexable | Draft / not the public set | Notes |
| --- | ---: | ---: | --- |
| Service pages | 7 | 453 draft | Approved drafts can render noindex |
| Service × Location | 49 | 63,351 uncovered drafts | Emirates only |
| DIY | 456 | 261 | `/diy/{slug}` |
| Blog | 776 | 0 in this table | 45 + 454 `guide-` + 277 `place-` |
| FAQ | 454 | 0 `Faq` table rows | `/faq/faq-{slug}` stored as articles |

Broken internal links known from data, not from HTTP:

- Appliance hub service URLs do not exist. FAQ does not link them when no Service row exists.
- DIY and blog still exist for those hub slugs (`diy-refrigerator`, `guide-refrigerator`, `faq-refrigerator`).

Canonical and hreflang are emitted by `buildMetadata` for pages that use it. Arabic layout sets `lang=ar` and `dir=rtl`.

English fallback in Arabic: public location names that were `REVIEW_REQUIRED` were not invented. Indexable rows no longer store that token. Some Arabic display still uses the English place name on purpose.

## G. Content quality

Rendered words counted from body, excerpt or problem fields, steps, and FAQ answers. Navigation, metadata, schema, and alt text were not counted.

| Set | EN min | EN avg | AR min | AR avg | Under 800 | Under 1000 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Original 45 blogs | 1,307 | 1,337 | 1,281 | 1,305 | 0 | 0 |
| 454 service blogs | 1,361 | 1,428 | 1,183 | 1,235 | 0 | 0 |
| 277 place blogs | 1,707 | 1,783 | 1,308 | 1,374 | 0 | 0 |
| 454 FAQ pages | 1,070 | 1,120 | 1,018 | 1,063 | 0 | 0 |
| 456 public DIY | 1,022 | 1,153 | 846 | 1,093 | 0 | 1 |

Pages failing the 800 floor: **0**.

Pages below the 1,000 target: **1** (`how-to-fix-dripping-faucet` Arabic 846). Rewrite that page before calling the DIY set clean.

Exact duplicate slugs: 0. Pairwise similarity was not computed as a number. The generated blogs, place guides, DIY guides, and FAQs are composer templates with the service or place name swapped. That is blocking similarity for production SEO even though the word floor passes. Unsupported claims of price, visit time, and area coverage were not found in those composers. That part is truthful, not unique.

## H. Images

| Set | Hero | EN alt | AR alt | Notes |
| --- | ---: | ---: | ---: | --- |
| 45 original blogs | 100% | 100% | 100% | present |
| 454 service blogs | 100% | 100% | 100% | shared topic WebP |
| 277 place blogs | 100% | 100% | 100% | shared topic WebP |
| 454 FAQ pages | 0% | 0% | 0% | missing required image |
| 7 indexable services | 100% | n/a | n/a | only these 7 services have `heroImage` |
| DIY | category topic fallback | not unique | not unique | not a unique photo per guide |

`MediaAsset` rows: 0. Images in use are static files under `public/media/`. About 15 topic/category WebP files exist. Coverage of a file is not unique coverage. FAQ pages fail the image requirement. Broken-image HTTP checks were not run.

## I. SEO

**PARTIAL**

Pass:
- Titles and meta descriptions are stored on published articles, DIY translations, and indexable services.
- Canonical and hreflang EN/AR come from `buildMetadata`.
- `lang` and RTL are set in the locale layout.
- Robots disallow admin, login, account, and API.
- Sitemap emits published services, indexable locations, DIY, and articles. `faq-` articles are mapped to `/faq/{slug}`, not `/blog/`.
- Draft services are noindex. Uncovered ServiceLocation rows are not in the public sitemap gate.
- FAQ pages emit FAQPage JSON-LD. DIY HowTo JSON-LD is limited to green HowTo with at least two steps.

Fail / incomplete:
- Most approved service pages are noindex drafts. Search will not treat the 454 catalog as public service pages.
- Generated titles and descriptions are formulaic.
- FAQ pages have no Open Graph image.
- Location master file comment is stale; sitemap itself follows the database, which is correct.
- Live canonical/hreflang was not fetched.

## J. AEO

**PARTIAL**

What works:
- FAQ pages open with a direct answer, then questions, then a next step (quote form, service page when it exists).
- DIY pages have a quick answer, stop rule, and professional fallback.
- Public ServiceLocation eligibility requires AEO checks before publish.
- Copy refuses to treat a page as coverage or a price.

What is weak:
- Answers are reusable templates. They name the service and the emirates, then repeat the same visitor steps.
- 453 service pages are not the indexed answer surface.
- No approved reviews exist (review count 0). Do not invent any.

## K. GEO

**PARTIAL**

Truthful:
- No fabricated branch, team, job count, review, or statistic was found in the generated composers.
- Place blogs and location pages name the place and tell the visitor that a listed place is not a covered visit.
- Emirates are named as access context, not as a coverage promise.

Weak:
- Repeating Dubai, Sharjah, Abu Dhabi, Ajman, Umm Al Quwain, Ras Al Khaimah, and Fujairah is not local usefulness.
- Community pages are not paired with a covered service. A visitor can open a place and a service guide and still not have a public service-in-that-place page.
- Two public "Al Rashidiya" pages can confuse local relevance.

## L. Blog

Blog routes exist: `/blog` and `/blog/{slug}`, English and Arabic.

| Item | Count |
| --- | ---: |
| Articles in table | 1,230 |
| Published indexable | 1,230 |
| Shown as blog | 776 |
| FAQ articles excluded from blog | 454 |
| Draft articles | 0 |

The existing 45 posts are not grandfathered. Current data: all 45 are published, indexable, have hero and both alts, and are above 1,000 words in both languages. They do not fail the word floor on this audit. They were not re-read line by line for claim safety in this pass.

Generated `guide-` and `place-` posts pass the word floor and fail uniqueness. They need remediation before they are treated as a finished blog program.

Prisma/client drift: not observed on the models queried in this audit. Schema was not modified.

## M. Security / production infrastructure

| Item | Status |
| --- | --- |
| Env example and secret names | PARTIAL — documented in `.env.example`, values not audited |
| Production database | NOT STARTED in this workspace — local Postgres/PGlite pattern |
| Pooling / SSL | NOT STARTED for production |
| Backups / PITR | NOT STARTED |
| Deployment / domain / HTTPS / DNS | NOT STARTED — no Dockerfile, Vercel, or workflow found |
| Cron / monitoring / error tracking | NOT STARTED as a running production system |
| Rate limiting, admin auth, private routes | PARTIAL — code and verify scripts exist |
| PGlite refused in production | READY in code (`src/server/db-env.ts`) |

## N. Publication / coverage control

ServiceLocation lifecycle code:

- `publishServiceLocation` throws unless `confirmToken === "CONFIRM_PUBLISH"`.
- It throws unless status is `approved` and eligibility passes.
- Eligibility for a new publish requires `covered=true` plus content gates.
- Public query requires `covered`, `coverageStatus=published`, `indexable`, active indexable service, and active indexable serving location.
- Draft content is not in that public gate.

Mismatch: eligibility `canPublish` is true for `review` or `approved`, but the publish function itself requires `approved`. The function is the tighter control. CONFIRM_PUBLISH is not bypassed there.

What this does **not** cover:

- Blog, DIY, FAQ, and location publish scripts already wrote public indexable rows. Those were explicit publishes, not ServiceLocation coverage.
- Those scripts can be run again. They are not an automatic coverage job. They are still a mass-index path if someone runs them.
- Publishing a ServiceLocation sets `covered=true` in the update. It cannot reach that update unless eligibility already required covered.

No automatic coverage was created by the 454/277 content publishes. Covered count is still 49.

## O. Current files

| File | Purpose | Status | Remaining issue |
| --- | --- | --- | --- |
| `prisma/data/catalog-a1.ts` | Approved 454 catalog | Current | Asserts 454. Does not remove 13 legacy DB rows |
| `prisma/data/electrical-children-160.ts` | 160 electrical names | Current | 16 same-stem pairs are intentional unless catalog changes |
| `prisma/data/uae-location-master-200.json` | 277+country master | Implemented | File note still says draft/not published |
| `src/lib/catalog.ts` | Public service and location reads | Current | Draft approved services can render noindex |
| `src/lib/catalog/approved-nav.ts` | Visitor nav order | Current | Display order is separate from `sortOrder` |
| `src/lib/diy/service-guide.ts` | Generated DIY | Current | Hazardous jobs are stop-only; still published as RED articles |
| `src/lib/faq/service-faq.ts` | Generated FAQ pages | Current | No images |
| `src/lib/blog/service-offering-article.ts` | Service blogs | Current | Template reuse |
| `src/lib/blog/location-article.ts` | Place blogs | Current | Template reuse |
| `src/lib/service-location/publication-ops.ts` | SL publish | Current | Must stay the only SL publish path |
| `src/app/sitemap.ts` | Sitemap | Current | Includes published generated pages |
| `src/app/[locale]/faq/page.tsx` | FAQ index | Current | Replaced the old global FAQ list |
| `scripts/publish-service-blogs-454.ts` | Blog publish | Already run | Do not rerun as a content fix |
| `scripts/publish-location-blogs-277.ts` | Place blogs | Already run | Same |
| `scripts/publish-service-diy-454.ts` | DIY publish | Already run | Does not set `diyAvailable` |
| `scripts/publish-service-faqs-454.ts` | FAQ publish | Already run | Cleared `Faq` table and `ServiceI18n.faq` |

## P. Change history

| Change | State |
| --- | --- |
| A1 catalog 18/436/454 | COMPLETED in code. DB has extras and missing hubs |
| Older 311 catalog | SUPERSEDED |
| A3 ServiceLocation architecture | COMPLETED as system. Matrix still the old 317×200 |
| A4.1 safety alignment | PARTIAL. Electrical children forced red / `diyAvailable` false. AC parent still `diyAvailable` |
| DIY generated set | COMPLETED as pages. Uniqueness and RED public exposure remain |
| ServiceLocation pilot 49 | COMPLETED. Not expanded. This is still current |
| Longform content engine | PARTIAL. Gates exist. Generated pages bypass editorial uniqueness |
| 277 location proposal | SUPERSEDED as a proposal. Now public in the database |
| Electrical 160 expansion | COMPLETED in code and as draft Service rows. Parent only is indexable |
| Related links | PARTIAL. Hubs have no service page to link |
| 45 blog posts | Word and image floor passes. Not re-audited sentence by sentence |
| 454 blogs, 277 place blogs, 454 FAQs | COMPLETED as published pages. Quality not production-ready |

## T. Readiness score

| Area | Score |
| --- | --- |
| CATALOG | PARTIAL |
| LOCATION | PARTIAL |
| SERVICELOCATION | PARTIAL (pilot only; SoT intact) |
| DIY | PARTIAL |
| PUBLIC CONTENT | PARTIAL |
| BLOG | PARTIAL |
| SEO | PARTIAL |
| AEO | PARTIAL |
| GEO | PARTIAL |
| IMAGES | PARTIAL |
| SECURITY | PARTIAL |
| PRODUCTION | NOT STARTED |
| PUBLICATION CONTROL | PARTIAL |

**OVERALL: NOT READY**
