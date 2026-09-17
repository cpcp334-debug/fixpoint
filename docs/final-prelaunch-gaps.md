# Final pre-launch gaps

Audited: 2026-09-11. Read-only. No fixes were applied.

Status: **NOT READY**

## Q. Blockers

### P0 — blocks safe progress

- **P0-1** No production environment. No deployment config, domain, HTTPS target, production Postgres, backups, or monitoring was found. Code refuses PGlite in production. That is not a running production system.
- **P0-2** create-product was not verified. Do not redeploy live until `/admin/product-form` works on staging.
- **P0-3** Do not treat listing as coverage. Covered and public ServiceLocation rows: **49**. Uncovered rows: **63,351**. Do not build 454 × 277.

### P1 — blocks the next production phase

- **P1-1** Generated blogs, place blogs, FAQ pages, and DIY guides are indexable templates. Word count passes. Uniqueness does not.
- **P1-2** 298 RED DIY articles are public. RED HowTo is 0. A strict “no public RED DIY” rule is not met.
- **P1-3** Only 7 service pages are indexable. The 454 catalog is not 454 public service URLs.
- **P1-4** 454 FAQ pages have no image and no alt text.

### P2 — quality

- **P2-1** `how-to-fix-dripping-faucet` Arabic is 846 words. Above 800, below 1,000.
- **P2-2** 13 legacy service drafts sit outside the 454. 7 appliance hubs have no Service row.
- **P2-3** 114 draft locations are leftovers. Master JSON note still says places are not published. The database says they are.
- **P2-4** District families are siblings under the emirate, not parent/child.
- **P2-5** `ac-maintenance` is `diyAvailable` and yellow. Generated AC guides are red stop-guides.
- **P2-6** Two public pages display “Al Rashidiya” (`al-rashidiya-dubai` and `al-rashidiya`).

### P3 — optional

- **P3-1** 16 electrical same-stem pairs (repair / replacement / installation). Keep them unless the catalog is reopened.
- **P3-2** Eligibility helper allows publish from `review`. The publish function still requires `approved` and `CONFIRM_PUBLISH`.

## R. Remaining work

[ ] Stand up staging Postgres with SSL and backups
    Why: local database cannot be production
    Dependency: none
    Files: `src/server/db-env.ts`, `.env.example`
    Risk: launching on a laptop database
    Priority: P0

[ ] Verify create-product on `/admin/product-form` on staging
    Why: adding a product must work before any live redeploy
    Dependency: staging Postgres
    Files: admin product form
    Risk: operations cannot add a product
    Priority: P0

[ ] Keep ServiceLocation coverage at 49 until a real pair is approved
    Why: 63,400 rows exist; 49 are covered
    Dependency: explicit coverage decision per pair
    Files: `src/lib/service-location/publication-ops.ts`
    Risk: invented coverage
    Priority: P0

[ ] Decide whether generated blogs, place blogs, FAQ pages, and RED DIY stay indexable
    Why: they are public templates
    Dependency: editorial policy
    Files: `src/app/sitemap.ts`, DIY and FAQ composers
    Risk: duplicate pages in search
    Priority: P1

[ ] Rewrite generated public copy so it is not a name swap
    Why: 1,000-word floor is not uniqueness
    Dependency: indexing decision
    Files: `src/lib/blog/service-offering-article.ts`, `src/lib/blog/location-article.ts`, `src/lib/diy/service-guide.ts`, `src/lib/faq/service-faq.ts`
    Risk: thin results
    Priority: P1

[ ] Add images and localized alt to 454 FAQ pages
    Why: image coverage is 0%
    Dependency: approved images, not invented job photos
    Files: `src/app/[locale]/faq/[slug]/page.tsx`
    Risk: incomplete pages
    Priority: P1

[ ] Raise `how-to-fix-dripping-faucet` Arabic above 1,000 words
    Why: only public DIY under the target
    Dependency: none
    Files: that DIY guide
    Risk: one short editorial page
    Priority: P2

[ ] Align `ac-maintenance` DIY chip with red AC guides
    Why: the parent can advertise DIY while the guide says stop
    Dependency: safety review
    Files: `src/lib/diy/service-guide.ts`
    Risk: visitors attempt AC work
    Priority: P2

[ ] Keep 13 legacy services draft until a catalog decision
    Why: they are not in the 454
    Dependency: catalog stays frozen
    Files: `prisma/data/catalog-a1.ts`
    Risk: publishing unapproved services
    Priority: P2

[ ] Resolve 7 appliance hubs that have no Service row
    Why: no public service page for those slugs
    Dependency: catalog decision
    Files: `src/lib/catalog/approved-nav.ts`
    Risk: missing hub URLs
    Priority: P2

[ ] Update the location master file note so it matches the database
    Why: file still says draft / not published
    Dependency: none
    Files: `prisma/data/uae-location-master-200.json`
    Risk: a later import treats public places as draft
    Priority: P2

[ ] Disambiguate the two public Al Rashidiya labels
    Why: same English name, two emirates
    Dependency: do not invent Arabic
    Files: location page
    Risk: wrong-emirate requests
    Priority: P2

[ ] Do not rebuild district parent/child until that model is approved
    Why: public URLs already use emirate parents
    Dependency: location model decision
    Files: location master
    Risk: slug and parent changes
    Priority: P3

## S. Next 5 steps

1. Do not deploy. Do not expand ServiceLocation. Freeze 454 offerings and 277 public places.
2. Stand up staging Postgres and verify create-product on `/admin/product-form`.
3. Decide indexing for generated blogs, place blogs, FAQ pages, and RED DIY articles. Noindex until the copy is unique, or accept the template risk in writing.
4. Fix the known defects that are not a catalog rewrite: faucet Arabic, FAQ images, AC `diyAvailable` mismatch, appliance hubs without service pages.
5. After staging and create-product pass, review only the 49 covered pairs. Do not generate the 125,758 matrix.

## Current exact counts

- Catalog in code: 18 + 436 = 454
- Service rows: 460 (7 active indexable, 453 draft)
- Electrical: 160 children + 1 parent row
- Locations: 392 in DB, 277 public places, 114 extra drafts, 1 country not indexable
- ServiceLocation: 63,400 rows, 49 covered/published/indexable
- Theoretical matrix not built: 454 × 277 = 125,758
- DIY public: 456 (298 red article, 156 yellow, 2 green). RED HowTo: 0
- Blog public: 776 (45 + 454 + 277)
- FAQ public: 454
- Reviews: 0
