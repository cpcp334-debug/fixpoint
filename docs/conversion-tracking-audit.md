# FIXPOINT.AE — Conversion Tracking Audit (Read-Only)

**Date:** 2026-09-20  
**Domain:** https://fixpoint.ae  
**Scope:** What can be measured today vs what Google Ads needs.  
**Companion:** `docs/google-ads-readiness-audit.md`

---

## Executive verdict

**Conversion tracking for Google Ads: NOT READY**  
**Internal first-party funnel analytics: PARTIALLY READY**  
**Lead persistence (CRM): READY (schema + APIs)**  

Primary Ads conversion should be **successful quote lead** or **booking receipt**, not clicks.

---

## 1. Tag inventory (live + code)

| Tag / system | Live HTML | Code | Env |
|--------------|-----------|------|-----|
| GTM (`GTM-`) | Absent | Absent | ABSENT |
| gtag.js | Absent | Absent | — |
| GA4 (`G-`) | Absent | CSP allowlist only if `NEXT_PUBLIC_GA_ID` | ABSENT local |
| Google Ads (`AW-`) | Absent | Absent | ABSENT |
| Floodlight / other pixels | Absent | Absent | — |
| Meta Pixel | Absent | Absent | — |
| First-party `/api/t` | Deferred JS (not in raw HTML string) | `Tracker` + ingest | N/A |

**Finding:** There is **no path** in the React tree that renders Google tags. Setting `NEXT_PUBLIC_GA_ID` alone would **not** load analytics — only CSP hosts would expand.

---

## 2. First-party event catalog

### Client (`CLIENT_EVENT_NAMES`)

| Event | Meaning | Ads role |
|-------|---------|----------|
| PAGE_VIEW | Path view | Micro |
| SERVICE_VIEW / LOCATION_VIEW / SERVICE_LOCATION_VIEW / DIY_VIEW | Content views | Micro |
| WHATSAPP_CLICK | `wa.me` click | Micro **≠ lead** |
| PHONE_CLICK | `tel:` click | Micro **≠ call conversion** |
| EMAIL_CLICK | mailto | Micro |
| SHARE | Share | Micro |
| QUOTE_START | Quote form focus (session once) | Micro **≠ submit** |
| BOOKING_START | Booking form focus | Micro |
| SERVICE_LOCATION_* | SL CTAs | Micro |
| REVIEW_START / QUESTION_START / CONTACT_START | Form focus | Micro |

### Server (`SERVER_EVENT_NAMES`)

| Event | When | Ads role |
|-------|------|----------|
| QUOTE_SUBMIT | Lead create `source=quote` | **Primary candidate** |
| BOOKING_SUBMIT | Public booking create | **Primary candidate** |
| CONTACT_SUBMIT | Contact lead | Secondary |
| AI_OPEN / AI_MESSAGE / AI_SERVICE_SUGGESTION / AI_HANDOVER | AI | Micro / unreliable |
| PHOTO_UPLOAD | Upload | Micro |
| REVIEW_SUBMIT / QUESTION_SUBMIT | Trust | Not Ads primary |

**Runtime caveats**

- Tracker waits for **pointer/key/touch** or **15s** — lab tools may miss early events.  
- START events deduped via `sessionStorage`.  
- Meta limited to keys `slug`, `count`, `riskClass` — **no UTM keys allowed**.

---

## 3. Form → persistence → success UX

### Quote (`LeadForm` mode=quote)

1. Client validate name/phone/requirement  
2. `POST /api/leads` JSON `{ source: "quote", ... }`  
3. Honeypot → `{ ok:true, ignored:true }` (must **not** convert)  
4. Rate limit → 429  
5. Duplicate phone+requirement <2m → `{ ok:true, duplicate:true }`  
6. Else create `Lead`, `stampVisitor`, `trackServer("QUOTE_SUBMIT")`, `scoreLeadSafe`, `NEW_LEAD` automation  
7. UI: inline success string — **same URL**

### Booking (`BookingForm`)

1. `POST /api/bookings` FormData  
2. On success → `router.push(/book-a-service/received?ref=NUMBER)`  
3. Receipt page `index:false`; 404 without ref  

### Contact

Same as quote with `source=contact` / `CONTACT_SUBMIT`; inline success.

---

## 4. Attribution gaps

| Signal | Stored? |
|--------|---------|
| utm_* | **No** |
| gclid / gbraid / wbraid | **No** |
| document.referrer | **No** (privacy treats as blocked) |
| Landing path | Yes on `AnalyticsEvent.path` after analytics starts |
| Lead.source | Form channel only (`quote`/`booking`/`contact`/`ai`) — **not** campaign |
| visitorId on Lead/Booking | Yes if cookies present at submit |

Admin copy confirms: “Traffic UTM/referrer is not captured.”

---

## 5. Duplicate / inflation risks

1. Tagging both QUOTE_SUBMIT beacon and a future thank-you page.  
2. Counting WhatsApp + form for same user.  
3. Firing on honeypot `ignored` or client-only validation.  
4. Treating journey “conversion” (`AI_OPEN` included in admin set) as Ads conversion.  
5. Booking: server event + thank-you page both tagged.

---

## 6. Legal / consent

Live/en messages:

> “We do not use Google Analytics or other third-party trackers.”

Privacy: first-party events “are not advertising profiles.”

**Any Google Ads tag requires policy text update before production.**

---

## 7. Recommended Google Ads conversion map (design only)

| Ads conversion | Fire when | Method suggestion |
|----------------|-----------|-------------------|
| `fixpoint_quote_lead` | Lead created quote, not ignored | dataLayer / thank-you |
| `fixpoint_booking_request` | Landing on `/book-a-service/received?ref=` with valid receipt | page load |
| `fixpoint_contact_lead` | Contact submit OK | secondary |
| Observe only | WhatsApp/Phone clicks | secondary/micro |

Enhanced conversions later: hash email/phone from lead (with policy).

---

## 8. Measurement readiness

| Layer | Status |
|-------|--------|
| Google Ads tag | NOT READY |
| GA4 | NOT READY |
| GTM | NOT READY |
| First-party funnel | PARTIAL |
| CRM lead row | READY |
| Offline conversion import | NOT READY (no gclid) |
| Revenue/ROAS | NOT READY (`Payment` often unconfigured) |

**Budget safety: MEASUREMENT NOT READY**

---

## 9. Verification performed (read-only)

- HTML scans on `/en`, quote, services, SL: no Google hosts in scripts  
- Code grep: only `security-headers.ts` references googletagmanager  
- Forms inspected via live HTML (honeypot + React form)  
- Schema read for Lead/Booking/Visitor/AnalyticsEvent  
- No real leads submitted  

---

*End conversion-tracking audit. No fixes applied.*
