# Fixpoint SEO measurement baseline and legacy review — 1 November 2026

This baseline distinguishes observed public behaviour from account metrics. Traffic growth, ranking gains and new enquiries are not yet verified. The public snapshot is reproducible with `node scripts/fixpoint-public-audit.mjs`; it sends bounded GET requests and submits no forms.

## Verified baseline

Evidence: [public snapshot at approximately 17:07 UTC](https://github.com/cpcp334-debug/fixpoint/actions/runs/41329846155). Exact observations are in [the JSON baseline](2026-11-01-public-baseline.json).

- Live HTML on English and Arabic pages includes GTM container `GTM-TPPFX2WM`. The published container script returned HTTP 200 and contains `quote_submit_success`.
- No GA4 measurement ID was detected by the limited static scan. This does **not** establish that GA4 is absent: container variables, downstream tags and browser execution require separate inspection.
- Search Console access, GA4 property access, event receipt and enquiry reconciliation are unavailable to this execution. No new account/property/container was created.
- The Arabic BOQ article still returns HTTP 200 with blank title/H1 and zero article words, index/follow, self-canonical, a sitemap entry and a locale-switch API target.
- The Arabic testing/commissioning article now has an Arabic title/H1 and 1,113 body words. It is a bilingual control, not a remaining empty-page example.
- English BOQ/testing articles have 1,627/1,532 body words. The English blog page-2 canonical retains `?page=2`.

## Measurement specification to activate in the existing accounts

Use the existing verified properties where available. Do not install a second Google tag or invent a measurement ID.

| Measurement | Definition and source | Segments / cadence | Current state |
| --- | --- | --- | --- |
| Organic visibility | Search Console clicks, impressions, CTR and average position; use Web search | Date, query, canonical page, country, device; UAE first, English/Arabic page groups; daily collection with latest complete date recorded | Access needed |
| Organic visits | GA4 sessions/users for Organic Search | Landing page, locale, device, UAE and source/medium; 28 complete days versus previous 28 | Receipt and reporting access needed |
| Quote requests | Existing `quote_submit_success` after server-confirmed success | Event count and distinct legitimate submission receipts; locale and landing page | Code exists; container name observed; end-to-end receipt not verified |
| Bookings | Existing `booking_submit_success` after server-confirmed success | Same rules as quote requests | Code exists; GA4 mapping not verified |
| Contact requests | Existing `contact_submit_success` after successful submission | Reconcile with accepted backend records | Code exists; GA4 mapping not verified |
| Phone / WhatsApp / email intent | Existing first-party `PHONE_CLICK`, `WHATSAPP_CLICK`, `EMAIL_CLICK` events through `/api/t` | Report separately as contact intent, never count a click as an enquiry | Code reviewed; account totals unavailable |
| Confirmed enquiries | Accepted non-spam quote/contact/booking records, deduplicated by submission reference; telephone/WhatsApp conversations require a confirmed record | Compare with GA4 receipt, excluding test submissions | Not verified |
| AI referrals / citations | Recognized referral sources where present; dated manual citation observations with exact query and cited URL | Separate observed mentions from attributable sessions and leads | No baseline claimed |

For Search Console, verify ownership of `fixpoint.ae` or access the existing Domain/URL-prefix property. Inspect the actual deployed sitemap index and submit it if not already submitted. Inspect BOQ Arabic, its English counterpart and the now-populated Arabic testing guide; record Google-selected canonical and indexed status separately from live URL test status.

Export:
1. Latest complete 28 days and prior 28 days: daily clicks/impressions/CTR/average position, plus query and page tables; record property, search type, country, device, date boundaries and source timezone.
2. GA4 matching periods: Organic Search landing-page sessions, users, engagement and the three successful-submission event counts. Record the property timezone and event settings.
3. Accepted backend enquiries for the same period, with test/spam exclusion and deduplication. Keep customer personal data out of public reports.

CTR = clicks / impressions. Organic lead rate = verified attributable organic enquiries / organic sessions. Use null for unavailable metrics. Search Console average position is not a fixed Google UAE rank. Do not infer improvements from changing query or device mixes.

## GTM / GA4 validation checklist

- Access the existing `GTM-TPPFX2WM` workspace, identify its published GA4 destination (if any), and confirm the existing web stream is for `fixpoint.ae`.
- In GTM Preview and GA4 DebugView, confirm one page-view event per intended navigation, including client navigation and both languages.
- Map the existing custom events `quote_submit_success`, `booking_submit_success` and `contact_submit_success` to GA4. Mark the chosen successful-lead events as key events after validation. Avoid creating a second redundant lead event that doubles totals.
- Test successful submission, invalid/rejected submission, refresh/back navigation and duplicate receipt. Schedule clearly labelled test enquiries with the owner/team; no forms were submitted in this audit.
- Pass locale and safe attribution fields. Do not send names, phone numbers, email addresses or free-text requirements. The code excludes common PII keys, but browser payloads still need inspection.
- Quote/booking conversion guards deduplicate per browser session and receipt. This is not global lead deduplication; reconcile with backend records.
- Verify existing consent behaviour and use one intended tag installation path. Public presence of the GTM loader alone is not proof of data collection.

Google references: [GA4 event setup and DebugView](https://developers.google.com/analytics/devguides/collection/ga4/events), [Search Console setup](https://developers.google.com/search/docs/monitor-debug/search-console-start), [Performance report definitions](https://support.google.com/webmasters/answer/7576553).

## Legacy review

The following URLs returned HTTP 200, index/follow and self-canonicals. Their medical-career subject matter does not match Fixpoint's electrical subcontracting/maintenance offer. Six URLs were observed; this is a bounded sample, not a full catalog count or proof of Google indexing.

| URL path | Observed body words | Review disposition |
| --- | ---: | --- |
| /en/blog/kw-emergency-room-technician | 612 | Off-topic medical career; candidate for exclusion after evidence review |
| /ar/blog/kw-emergency-room-technician | 541 | Arabic counterpart; review together with English |
| /en/blog/kw-emergency-medical-technician-training | 616 | Off-topic training/career; candidate for exclusion |
| /en/blog/kw-sterile-processing-technician-certification | 616 | Off-topic certification/career; candidate for exclusion |
| /en/blog/kw-central-service-technician | 612 | Confirmed off-topic healthcare career; candidate for exclusion |
| /en/blog/kw-operating-room-technician | 612 | Off-topic medical career; candidate for exclusion |

Three candidate paths already returned 404/noindex: `/en/blog/kw-medical-lab-technician`, `/en/blog/kw-medical-laboratory-technologist`, and `/en/blog/kw-medical-lab-tech`. Do not create redirects or new articles for these solely because they appear in an old keyword list.

[Body snapshot](https://github.com/cpcp334-debug/fixpoint/actions/runs/41330124755) confirmed that all six pages discuss healthcare careers and explicitly disclaim medical training. The English samples reuse the same general advisory structure; their 612–616 word lengths do not establish originality or service relevance.

Before changing live indexing, review each candidate's Search Console clicks/queries, conversions, external links and actual content. If no business purpose exists, select a deliberate noindex/removal policy and remove it from sitemaps/internal recommendations consistently. Redirect only where a genuinely equivalent relevant destination exists; do not redirect medical articles to electrical service pages. No deletion, redirect or bulk indexing change was performed in this review.

## Arabic fix deployment checkpoint

[PR 3](https://github.com/cpcp334-debug/fixpoint/pull/3) contains catalog, metadata, sitemap and locale-switch availability checks, including bodies that become empty after editorial cleanup. Both MySQL 8.0.46 and MariaDB 10.11.19 passed 38 source checks and eight real database checks each, plus TypeScript: [successful matrix](https://github.com/cpcp334-debug/fixpoint/actions/runs/41329218450).

The branch integrates main through `e336a404dc11e6ef47fbcfc4864cc8c0657fc0fe`; later concurrent main changes must be reconciled before release. Full build/runtime validation is tracked in the PR's Actions runs.

A fresh MySQL 8 schema bootstrap failed because existing TEXT columns have literal defaults. No schema was changed to hide this existing compatibility issue. Runtime validation uses MariaDB, while the locale query tests continue on both engines. Confirm Hostinger's actual engine/version before rollout.

Required before release: authenticated Hostinger access, a read-only affected-locale inventory and representative production query plans/timings (the 23-fixture timings are not production performance). Count affected locale rows and sample URLs before enabling a rule across the large catalog.

Deploy the validated source through the established Hostinger flow under the owner's existing authorization. No database seed/reset is part of this fix. Record the deployed commit and deployment result, then verify:
- English BOQ remains complete; empty Arabic BOQ is no longer an indexable empty article or advertised translation.
- Now-populated Arabic testing/commissioning remains available, with reciprocal alternates.
- Both affected sitemap shards and locale API responses match availability.
- English/Arabic blog pagination keeps correct canonical/filter state; headings, content, images and FAQ schema render correctly.
- Logs, query latency and errors remain acceptable; retain the previous deployed build for rollback.

Traffic, ranking and enquiry impact remain unverified until measured against account baselines.
