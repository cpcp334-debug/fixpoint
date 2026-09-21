# FIXPOINT.AE — P0 Google Ads Conversion Implementation Report

**Date:** 2026-09-20  
**Workspace:** `alnajah-aldaem`  
**Live:** https://fixpoint.ae  
**Scope:** Controlled production-ready code for tracking / legal / attribution / conversion boundaries only.  
**Deploy:** **NOT performed** (no auto-deploy, no campaigns, no ad spend).

---

## 0. Pre-change inventory (Phase 0)

| Area | Pre-change state | Stop? |
|------|------------------|-------|
| Live Google tags (GTM/gtag/GA4/AW) | Absent per `docs/google-ads-readiness-audit.md` + `docs/conversion-tracking-audit.md` (2026-09-20) | **No stop** — no unexpected live Google tracking |
| Code Google injector | None (CSP allowlist only if `NEXT_PUBLIC_GA_ID`) | OK |
| Local env GTM/GA/AW IDs | Absent in `.env` / `.env.example` (GA commented only) | OK |
| `/api/t` first-party | Present (`Tracker` → ingest); micro events only | Kept intact |
| Lead / Booking / Visitor | No utm/gclid fields | Schema extended |
| Quote success UX | Inline on `/get-a-quote` | Dedicated `/get-a-quote/received` added |
| Booking success UX | `/book-a-service/received?ref=` | Kept; dataLayer added |
| Cookie/privacy copy | Claimed no Google Analytics / third-party trackers | Updated |
| CSP | Google hosts only if `NEXT_PUBLIC_GA_ID` | Extended for GTM + Ads hosts when GTM/GA env set |

**CRITICAL STOP:** Not triggered.

---

## 1–2. GTM as central layer

- Component: `src/components/analytics/GoogleTagManager.tsx`
- Loads **only** when `NEXT_PUBLIC_GTM_ID` matches `GTM-…`
- No hardcoded `gtag(` / invented `G-` / `AW-` IDs
- GA4 + Google Ads conversions are expected to be wired **inside GTM** listening to `dataLayer` events
- Helper: `src/lib/analytics/gtm.ts` → `readGtmId()`
- Mounted from `src/app/[locale]/layout.tsx`

---

## 3. Privacy / cookie wording diffs

### EN `Legal.cookieAnalytics`

| | Text |
|--|------|
| **Before** | “…We do not use Google Analytics or other third-party trackers. Events are kept for 13 months.” |
| **After** | Describes first-party cookies + optional GTM → GA4 / Google Ads conversion cookies when enabled; no sale of personal data; first-party opt-out preserved |

### EN `Legal.privacyAnalytics`

| | Text |
|--|------|
| **Before** | “…not advertising profiles…” + opt-out |
| **After** | Accurate GA4/Ads technical measurement + campaign/click-id storage on successful quote/booking; first-party opt-out preserved |

### AR

Parallel updates to `cookieAnalytics` / `privacyAnalytics` in `messages/ar.json`.

**Preserved:** Cookie policy opt-out UI (`cookieOptOut` / `/api/t/optout`) unchanged.

---

## 4. Attribution capture + persistence

| Signal | Client | Server persistence |
|--------|--------|--------------------|
| `utm_source/medium/campaign/term/content` | First-touch localStorage + `alnajah_attr` cookie | Lead + Booking columns |
| `gclid` / `gbraid` / `wbraid` | Same | Lead + Booking columns |
| `landing_path` | First path with campaign params | `landingPath` |
| First-touch rule | `mergeFirstTouch` — never overwrite non-empty | Applied on create |

**Files:** `src/lib/attribution/{types,shared,client,server}.ts`, `AttributionCapture` in layout  
**Schema migration:** `prisma/migrations/20260920210000_p0_attribution/migration.sql`  
**Visitor columns:** Added for future first-touch mirror; Lead/Booking writes are authoritative for P0.

---

## 5. Quote conversion boundary

| Requirement | Implementation |
|-------------|----------------|
| URL | `/en|ar/get-a-quote/received?ref=` |
| After server-confirmed lead only | Redirect only when `ok && id && !ignored && !duplicate` |
| noindex | `buildMetadata({ index: false })` |
| Not in sitemap | Sitemap lists `/get-a-quote` only |
| dataLayer | `quote_submit_success` via `ConversionDataLayer` (session-once) |
| No PII in events | Ref id only + locale |
| No fire on honeypot / rate-limit / click | Ignored stays inline; errors/rate-limit no redirect |

---

## 6. Booking conversion boundary

| Requirement | Implementation |
|-------------|----------------|
| Keep `/book-a-service/received?ref=` | Yes |
| ONE `booking_submit_success` | `ConversionDataLayer` + sessionStorage once |
| noindex | Already |

---

## 7. Contact (secondary)

- `contact_submit_success` dataLayer push on successful contact create (not duplicate / not ignored)
- Inline success UX retained (no dedicated thank-you URL)

---

## 7b. Micro events via `/api/t` (NOT Ads primary)

Unchanged: `PHONE_CLICK`, `WHATSAPP_CLICK`, `EMAIL_CLICK`, `QUOTE_START`, `BOOKING_START`, etc.

---

## 8–9. Ads conversion defs + GA4 (prepare only — no invented IDs)

Configure **in Google Ads / GA4 / GTM UI** after setting env:

| dataLayer event | Suggested Ads role | Suggested GA4 |
|-----------------|--------------------|---------------|
| `quote_submit_success` | Primary — Submit lead form | `generate_lead` (or custom) |
| `booking_submit_success` | Primary alt | custom `booking` / generate_lead |
| `contact_submit_success` | Secondary | generate_lead / contact |

**Do not invent** `AW-` conversion labels or `G-` measurement IDs in code.

---

## 10. Enhanced conversions — architecture only (NOT enabled)

1. On lead/booking create, server already has email/phone.  
2. Future: hash (SHA-256 normalized) email/phone and push via GTM enhanced conversions / Google Ads API.  
3. Requires consent/policy review + GTM user-provided data tags.  
4. **P0 does not enable** enhanced conversions or send hashed PII to Google.

---

## 11. `/api/t`

Left intact.

---

## 12. CSP

`src/server/security-headers.ts`: when `NEXT_PUBLIC_GTM_ID` **or** `NEXT_PUBLIC_GA_ID` set, allow:

- script/connect/img: googletagmanager, google-analytics, analytics.google.com, googleadservices, google.com, doubleclick stats/ads  
- frame-src: googletagmanager (noscript iframe)

Bare CSP (no env) still excludes Google hosts.

---

## 13–16. Testing status

| Check | Status |
|-------|--------|
| EN/AR attribution survival (code path) | **CODE VERIFIED** — capture → submit payload → sanitize → columns |
| Safe tests (no real prod customer leads) | **Not run against live prod forms** |
| Live tag presence | **GOOGLE UI NOT VERIFIED** — `NEXT_PUBLIC_GTM_ID` not set locally/on live yet |
| GTM container / Tag Assistant | **Blocked on Hostinger env + redeploy** |

---

## 17. Hostinger env vars (names only)

Set then **Redeploy** (do not invent values):

1. `NEXT_PUBLIC_GTM_ID` — required for GTM bootstrap  
2. `NEXT_PUBLIC_GA_ID` — optional (CSP also widens if set; prefer GA4 via GTM)  
3. Existing DB URL / secrets unchanged  

After redeploy, apply migration `20260920210000_p0_attribution` via normal `postdeploy` / `prisma migrate`.

---

## 18. typecheck / lint / build

| Check | Result |
|-------|--------|
| `tsc --noEmit` | **PASS** |
| ESLint (P0-touched files only) | **PASS** (`--max-warnings 0`) |
| `npm run lint` (full repo) | **FAIL (pre-existing)** — not introduced by P0 |
| `next build` | **PASS** (EXIT 0) |
| `verify:security-headers` | **PASS** |

**No auto-deploy.**

Note: Next 16 Turbopack forbids `next/dynamic(..., { ssr: false })` in Server Components. P0 moved Tracker/AttributionCapture into `DeferredPublicAnalytics` and HeaderMobile into `DeferredHeaderMobile` (same pattern as `DeferredAiWidget`).

---

## 19. Files changed (summary)

- Attribution lib + capture component  
- GTM + dataLayer + ConversionDataLayer  
- LeadForm / BookingForm + APIs  
- Quote received page; booking received conversion hook  
- Prisma schema + migration  
- CSP; messages EN/AR; `.env.example`  
- security-headers verify script  
- This report + JSON  

---

## 20. Final gate statuses

| Gate | Status |
|------|--------|
| GTM code path | **PASS** (env-gated) |
| No duplicate hardcoded gtag | **PASS** |
| Legal copy accurate | **PASS** |
| Attribution persist Lead/Booking | **PASS** (pending migrate on Hostinger) |
| Quote thank-you boundary | **PASS** |
| Booking thank-you boundary | **PASS** |
| Contact secondary event | **PASS** |
| Micro `/api/t` unchanged primary | **PASS** |
| Enhanced conversions off | **PASS** |
| CSP Google hosts when configured | **PASS** |
| No auto-deploy / no campaigns | **PASS** |
| Live Tag Assistant | **FAIL / BLOCKED** — needs Hostinger env + redeploy |
| Ads spend ready | **NOT READY** until Hostinger GTM ID + GTM UI conversions + migrate + verify |

### Remaining blockers for Hostinger redeploy

1. Create real GTM container + GA4 + Ads conversion actions in Google UI  
2. Set `NEXT_PUBLIC_GTM_ID` on Hostinger  
3. Redeploy web app  
4. Ensure migration `20260920210000_p0_attribution` applies  
5. Tag Assistant verify on quote/booking received  
6. Only then: micro Search pilot budget  

---

## Companion

- `docs/p0-google-ads-implementation-report.json`
