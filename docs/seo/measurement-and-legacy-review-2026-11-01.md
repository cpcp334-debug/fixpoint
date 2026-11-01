# Fixpoint SEO measurement baseline and legacy review — 1 November 2026

This baseline distinguishes observed public behaviour from account metrics. Traffic growth, ranking gains and new enquiries are not yet verified. Latest [public audit 41330536574](https://github.com/cpcp334-debug/fixpoint/actions/runs/41330536574) also confirmed `G-WBQ2B83BTM` with the corrected ID extraction. The public snapshot is reproducible with `node scripts/fixpoint-public-audit.mjs`; it sends bounded GET requests and submits no forms.

## Verified baseline

Evidence: [public snapshot at approximately 17:07 UTC](https://github.com/cpcp334-debug/fixpoint/actions/runs/41329846155). Exact observations are in [the JSON baseline](2026-11-01-public-baseline.json).

- Live HTML on English and Arabic pages includes GTM container `GTM-TPPFX2WM`. The published container script returned HTTP 200 and contains `quote_submit_success`.
- A later [public configuration snapshot](https://github.com/cpcp334-debug/fixpoint/actions/runs/41330355983) identified Google tag destination `G-WBQ2B83BTM` in the published container (`vtp_tagId`). This supersedes the earlier limited ID scan. Its presence establishes configuration only; browser firing and authenticated GA4 receipt remain unverified.
- Search Console access, GA4 property access, event receipt and enquiry reconciliation remain unverified. Staff authentication and a read-only production database connection were established later on 1 November. No new account/property/container was created.
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

- Access the existing `GTM-TPPFX2WM` workspace, confirm the observed published GA4 destination `G-WBQ2B83BTM`, and confirm the existing web stream is for `fixpoint.ae`.
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

[PR 3](https://github.com/cpcp334-debug/fixpoint/pull/3) contains the shared availability rule for catalog, metadata, sitemap and locale switching. The current release candidate incorporates main through `6f118e2de1e9a9849a7fbb19247e65d14c0d37c3`; concurrent content/image changes are retained.

Production read-only access confirmed MariaDB **11.8.9** and utf8mb4_unicode_ci. The first candidate count query exceeded the 15-second limit. The optimized predicate performs editorial-marker replacement only where the body begins with a removable marker. Related-article loading no longer runs a full catalog count.

The [same-snapshot comparison](production-locale-parity-2026-11-01.json) evaluated **239,860 translation rows** across **119,930 eligible articles** and found **zero old/new availability differences**. At 22:48 UTC, 119,930 English and 43,502 Arabic entries were available. The earlier inventory found 76,425 Arabic review placeholders and five empty titles; two Arabic entries became available between snapshots during concurrent publishing. These counts are content-presence results, not evidence of language quality or Google indexing. Placeholder rows can contain thousands of characters; do not describe all affected rows as blank pages.

The [optimized production measurements](production-locale-optimized-2026-11-01.json) recorded:
- 16 synthetic SQL/JavaScript cases and 18 private samples passed; no private body text is included in these reports.
- English unfiltered count: 4,927 ms; Arabic: 3,889 ms.
- Filtered counts: 5,442 ms English and 3,775 ms Arabic.
- Page 1, page 2, page 100 and search ID queries: 771–932 ms.
- Counts still scan the eligible catalog. These single-run, read-only measurements are not a load test or a front-end speed score.

The previous successful [validation run](https://github.com/cpcp334-debug/fixpoint/actions/runs/41330356008) predates this optimization. Fresh validation now includes MySQL 8, MariaDB 10.11 and production-series MariaDB 11.8, with a production build/runtime check and source package on MariaDB 11.8. Do not deploy the earlier source artifact as the current release.

Hostinger deployment and production verification are still pending. No production migration, seed, reset or bulk data update was executed during validation. The availability rule changes exposure of placeholder translations but retains their database records.

After a successful current-source build, deploy through the established Hostinger flow under the owner's existing authorization. Record the deployed commit and retain the previous build for rollback. Verify:
- English BOQ remains complete; empty Arabic BOQ is no longer an indexable empty article or advertised translation.
- Populated Arabic testing/commissioning remains available with reciprocal alternates.
- Sitemap shards and locale API responses agree with availability.
- English/Arabic pagination, canonical/filter state, content, images and FAQ schema remain correct.
- Server logs, latency and errors remain acceptable.

Traffic, ranking and enquiry impact remain unverified until measured against account baselines.
