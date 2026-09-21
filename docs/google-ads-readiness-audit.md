# FIXPOINT.AE — Google Ads / Paid Traffic Pre-Launch Audit

**Audit type:** READ-ONLY (no code/DB/campaign/env changes; no real lead submissions)  
**Domain:** https://fixpoint.ae  
**Workspace:** `alnajah-aldaem`  
**Audit date:** 2026-09-20  
**Code HEAD (local):** `0f9db4b` (includes apex-rewrite commits `fb455ca` / `526554c`)  
**Authority:** Live HTTP/HTML + source + Prisma schema. Local `.env` names only (no values). Production MySQL not queryable from this workstation (`DATABASE_URL` not `mysql://`).  
**Related context:** `docs/SITE-AUDIT-REPORT-FOR-CHATGPT.md` — reconciled where stale.

---

## Executive summary

| Field | Verdict |
|------:|---------|
| **Overall paid readiness** | **NOT READY** for meaningful Google Ads spend |
| **Landing / commercial UX** | **PARTIALLY READY** (real quote/booking/contact flows exist) |
| **Measurement / Ads conversion** | **NOT READY** |
| **Budget safety (measurement)** | **NOT READY** |
| **Can I start ads?** | **NO — ONLY AFTER SPECIFIC FIXES** (see §A–H and next steps) |

**One-line verdict:** The site can take leads, but Google Ads cannot safely optimize or report because there is **no GTM/gtag/GA4/Google Ads tag**, **no gclid/UTM capture**, **no Ads-primary conversion on verified submit**, and the **cookie/privacy copy explicitly forbids third-party trackers**.

### Top blockers (P0)

1. **Zero Google tags on live HTML** — no `googletagmanager`, `gtag(`, `G-`, `GTM-`, `AW-` on `/en`, quote, booking, service, or SL pages.
2. **No GA/Ads script implementation in code** — `NEXT_PUBLIC_GA_ID` only widens CSP in `security-headers.ts`; **no component injects gtag/GTM**.
3. **Legal conflict** — live cookie policy: *“We do not use Google Analytics or other third-party trackers.”*
4. **No click-ID / UTM persistence** — admin analytics explicitly: “Campaign / UTM / referrer: Unknown / not captured.”
5. **Quote “conversion” is inline success text** — no dedicated thank-you URL for reliable page-load conversion (booking `/received?ref=` is better but still untagged).
6. **WhatsApp / phone / quote-button clicks ≠ leads** — first-party events exist; must not be Ads primary conversions.

### Redeploy / live-vs-code reconciliation (vs site audit report)

| Claim in site audit | Live 2026-09-20 evidence | Status |
|---------------------|--------------------------|--------|
| Apex `/` rewrite (zero Location) | `https://fixpoint.ae/` → **307** `Location: /en` | **NOT live** / CDN still redirects |
| Sitemap 64 shards | robots + sitemap index list **0–63** | **Live** (report “still 32” is **stale**) |
| EN no webfonts | Plus Jakarta **0**; still **1× woff2 preload** (`/_next/static/media/…woff2`) | **Partial** |
| Default `og:image` | `https://fixpoint.ae/media/logo-512.webp` | **Live** |
| Sitemap shard 0 ~242k URLs | `/sitemap/0.xml` ≈ **6,042** `<loc>`, ~1.18 MB | **Fixed live** (report pre-fix defect resolved) |

---

## 1. Live domain access

| URL | Status | Notes |
|-----|-------:|-------|
| `/` | **307** → `/en` | Code middleware intends **rewrite** (no Location). Redeploy/CDN gap. |
| `/en` | 200 | ~184 KB HTML; ~0.97 s sample |
| `/ar` | 200 | ~197 KB; RTL |
| `www.fixpoint.ae/` | 307 → `/en` | Code wants **301 www→apex**; relative `/en` may keep www host |
| `/en/get-a-quote` | 200 | Primary quote LP |
| `/ar/get-a-quote` | 200 | Arabic quote |
| `/en/book-a-service` | 200 | Booking |
| `/en/contact` | 200 | Contact |
| `/en/book` | 404 | Do not use |
| `/en/thank-you`, `/en/thanks`, `/en/get-a-quote/received` | 404 | No generic thank-you |
| `/en/book-a-service/received` | 404 without `?ref=` | Expected; receipt page exists in code |

**HTTPS:** Live serves HTTPS; HSTS `max-age=31536000; includeSubDomains` present.

---

## 2. Commercial landing page inventory

### Safe-to-consider paid destinations (commercial intent)

| Type | Examples (live 200) | Paid fit |
|------|---------------------|----------|
| Home | `/en`, `/ar` | Brand / general; weak for Search intent |
| Quote | `/en/get-a-quote`, `/ar/get-a-quote` | **Best default conversion LP** |
| Booking | `/en/book-a-service`, `/ar/book-a-service` | Strong for “book” intent |
| Contact | `/en/contact` | Secondary |
| Service hubs | `/en/services/electrical`, `plumbing`, `ac`, `painting`, `walls`, `general-maintenance` | Good category LPs |
| Service pages | `/en/electrical-inspection`, `/en/socket-repair`, etc. | Good high-intent Search LPs |
| Covered Service×Location | e.g. `/en/electrical-maintenance/dubai` (200, ~155 KB, H1 “Electrical Maintenance - Dubai”, CTAs present) | **Best geo+service match** when `ServiceLocation.covered=true` |
| Locations index | `/en/locations` | Directory; weak LP |
| Emirate hubs | `/en/locations/dubai`, `/sharjah` | **Do not use as Ads LPs** — ~1.4 MB HTML samples |

### Do not advertise yet (see also §DO NOT ADVERTISE)

- Entire **~119k SEO blog / SEC article** corpus  
- DIY guides as primary conversion destinations  
- Unverified / uncovered ServiceLocation URLs (`covered` is coverage truth)  
- Huge emirate listing pages  
- Admin, login, API, AI endpoints  

---

## 3. Landing page quality + paid relevance

**Strengths**

- Clear brand: Al Najah Al Daem · Fixpoint; phone, WhatsApp, quote CTAs on commercial pages.
- Service pages have H1 matching trade; quote disclaimer present.
- Bilingual EN/AR.
- Licenses listed in site config (Sharjah cleaning; Ajman maintenance).

**Weaknesses for Ads**

- Emirate hubs extremely heavy (TTFB ~4s / ~1.4 MB) — poor Quality Score / UX.
- Apex redirect adds an extra hop vs code intent.
- No Ads-specific message-match variants (no dedicated campaign LPs).
- AI widget failsafe if `OPENAI_API_KEY` missing on Hostinger (local env: present but empty) — do not promise AI in ads.

---

## 4–8. Quote, booking, phone, WhatsApp, contact

| Channel | Mechanism | Creates CRM lead? | First-party event | Ads-ready conversion? |
|---------|-----------|-------------------|-------------------|------------------------|
| **Quote form** | `LeadForm` → `POST /api/leads` `source=quote` | **Yes** → `Lead` | `QUOTE_START` / `QUOTE_SUBMIT` | **No tag**; success is **inline** text |
| **Booking form** | `BookingForm` → `POST /api/bookings` → redirect `/book-a-service/received?ref=` | **Yes** → `Booking` (+ `BOOKING_SUBMIT`) | `BOOKING_START` / `BOOKING_SUBMIT` | **No tag**; thank-you URL exists |
| **Contact form** | `LeadForm` mode contact | **Yes** → `Lead` `CONTACT_SUBMIT` | Yes | No tag; inline success |
| **Phone** | `tel:+971543447959` | **No** | `PHONE_CLICK` | Click ≠ call; **not primary** |
| **WhatsApp** | `https://wa.me/971543447959` | **No** (unless staff later logs) | `WHATSAPP_CLICK` | Click ≠ lead; **not primary** |
| **Email mailto** | `alnajahaldaem42@gmail.com` | No | `EMAIL_CLICK` | Micro only |
| **AI chat lead** | `/api/ai/chat` → lead source `ai` | Possible when AI configured | `AI_*` server events | Unreliable for Ads until AI always on |

**Spam protection (forms):** honeypot `website` field; IP rate limit 5 / 10 min; duplicate phone+requirement within 2 min returns ok/duplicate. **No CAPTCHA / Turnstile** observed on live quote HTML.

---

## 9. Thank-you / success states

| Flow | Success UX | Indexable? | Good for page-load conversion? |
|------|------------|------------|--------------------------------|
| Quote | Inline green status on same URL | Same page stays indexable | **Weak** (SPA-style; no unique URL) |
| Contact | Inline | Same | **Weak** |
| Booking | Dedicated `/book-a-service/received?ref=` (`index: false` in code) | noindex | **Stronger** once tagged |
| Generic `/thank-you` | Missing | — | N/A |

---

## 10–14. GTM / gtag / GA4 / Google Ads tags

| Check | Result |
|-------|--------|
| Live HTML GTM/gtag/GA4/AW | **Absent** (sampled home, quote, services, SL, AR) |
| Code injects Google tags | **Absent** (only CSP allowlist if `NEXT_PUBLIC_GA_ID`) |
| Env `NEXT_PUBLIC_GA_ID` (local) | **ABSENT** |
| Env `GTM_ID` / `AW_*` / `GA4_*` | **ABSENT** (not in `.env.example` beyond optional GA_ID comment) |
| Cookie policy | Explicitly **no Google Analytics / third-party trackers** |
| First-party `/api/t` | Present in code; deferred until gesture or **15s**; not in initial HTML |

**Conclusion:** Google Ads conversion tracking is **not installed**. Enabling it requires **product + legal** work, not just an Ads UI toggle.

---

## 15. Conversion definitions (recommended from EXISTING capabilities)

### PRIMARY (count as Ads “conversion” only after tagging + legal update)

1. **Quote lead created** — successful `POST /api/leads` with `source=quote` and `ok:true` (not honeypot ignored; prefer non-duplicate).
2. **Booking request created** — successful booking with redirect to `/book-a-service/received?ref=…`.

### SECONDARY

3. Contact lead submit (`source=contact`).
4. Qualified lead statuses / `LeadScore` human class (offline / enhanced conversions later).

### MICRO (observe only — never optimize Ads to these alone)

5. `QUOTE_START` / `BOOKING_START`  
6. `WHATSAPP_CLICK` / `PHONE_CLICK` / `EMAIL_CLICK`  
7. `PAGE_VIEW` / `SERVICE_VIEW` / `SERVICE_LOCATION_VIEW`  
8. AI open/message  

**Critical distinctions (enforced in this audit):**

- WhatsApp click ≠ lead  
- Quote button click / form focus ≠ successful lead  
- Phone click ≠ phone-call conversion unless call tracking verifies  

---

## 16. Lead data flow: Ad → Revenue

**As-built path (code):**

```
Ad click (no gclid store today)
  → Landing page (path only in AnalyticsEvent)
  → Form start events (first-party)
  → POST /api/leads | /api/bookings
  → Lead | Booking (+ optional visitorId stamp via cookies)
  → LeadScore / AutomationJob (NEW_LEAD) / AdminNotification (in_app)
  → Manual Quote / Booking confirm / WorkOrder / Invoice
  → Payment (status default "unconfigured")
```

**Breaks for Ads ROAS**

- No gclid/gbraid/wbraid/UTM on Lead or Visitor  
- Payment often **unconfigured** — revenue not Ads-ready  
- Email/WhatsApp automation providers optional and locally **ABSENT**  

---

## 17. UTM / gclid / gbraid / wbraid

| Item | Status |
|------|--------|
| Capture in URL → cookie/DB | **Not implemented** |
| Lead model fields | **None** for UTM/gclid |
| Visitor model | id, locale, optedOut, customerId — **no attribution fields** |
| Admin UI | Explicitly “Unknown / not captured” |
| Privacy scrubber | Treats `utm_source` / `referrer` as sensitive tokens (not stored) |

---

## 18. `/api/t` first-party analytics

| Aspect | Evidence |
|--------|----------|
| Endpoint | `POST /api/t` → `ingestClientEvents` |
| Client | `Tracker` dynamic `ssr:false`; starts on gesture or 15s |
| Events | See `src/lib/analytics/types.ts` client + server lists |
| Identity | Cookies `alnajah_vid` / `alnajah_sid` (per cookie policy copy) |
| Opt-out | `/api/t/optout` + UI on cookie policy |
| Ads linkage | **None** — cannot replace Google conversion tags for bidding |

Journey “conversion” set in admin includes form starts and even `AI_OPEN` — **do not confuse with Google Ads conversions**.

---

## 19. Lead DB models (schema — read-only)

| Model | Role |
|-------|------|
| `Lead` | name, phone, email?, whatsapp?, service/location, requirement, source, status, visitorId?, locale |
| `LeadScore` / `LeadScoreHistory` | Quality class, quarantine |
| `Booking` | Public booking requests; visitorId?; receipt number |
| `Quote` / `QuoteItem` | Ops quotes linked to lead |
| `Invoice` / `Payment` | Downstream; Payment.status default `unconfigured` |
| `Visitor` / `VisitSession` / `AnalyticsEvent` | First-party journey |
| `Customer` | CRM link |
| `AdminNotification` | In-app ops alerts |
| `ServiceLocation.covered` | **Coverage truth** for advertising geo claims |

**Local DB query:** failed — datasource must be `mysql://`. Production counts **not verified** from this machine.

---

## 20–22. Notifications, lifecycle, revenue attribution

- `emitDomainEventSafe({ trigger: "NEW_LEAD" })` on lead create.  
- Email notify only if `AUTOMATION_EMAIL_PROVIDER` set; WhatsApp if `AUTOMATION_WHATSAPP_PROVIDER` set — both **ABSENT** locally; production unknown.  
- In-app notifications supported.  
- Revenue path exists in schema but **not Ads-attribution ready**.  

---

## 23–24. EN / AR / mobile / desktop

- Locales `/en` (LTR) and `/ar` (RTL) both live for quote/booking.  
- Header/mobile expose quote + WhatsApp.  
- No separate m. site.  
- Performance: prior Hostinger scores ~88 mobile / ~98 desktop (site audit); this audit sampled document times only (not full Lighthouse — WAF often 403).

---

## 25. Page speed samples (document fetch)

| URL | Status | Bytes (approx) | Time (ms) |
|-----|-------:|---------------:|----------:|
| `/en` | 200 | 184k | 971 |
| `/en/get-a-quote` | 200 | 134k | 560 |
| `/en/book-a-service` | 200 | 139k | 646 |
| `/en/services/electrical` | 200 | 102k | 1119 |
| `/en/electrical-maintenance/dubai` | 200 | 155k | — |
| `/en/locations/dubai` | 200 | **~1.41 MB** | **3932** |
| `/en/locations/sharjah` | 200 | **~1.40 MB** | **4160** |

---

## 26–27. Spam protection, security / privacy

**Security headers (live `/en`):** HSTS, `X-Frame-Options: DENY`, `nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` locked down.  
**CSP live:** only `upgrade-insecure-requests` (not full app CSP from `buildContentSecurityPolicy`) — Hostinger/proxy difference.  

**Privacy for Ads:**

- Cookie + privacy copy: first-party only; **not advertising profiles**; **no GA**.  
- Adding GTM/GA4/Ads tags **requires legal copy update** before launch.  
- Opt-out exists for first-party analytics only.

---

## 28. Duplicate conversion risks

| Risk | Detail |
|------|--------|
| Quote inline + future thank-you | Could double-count if both tagged |
| Booking submit event + thank-you page | Tag **one** primary |
| WhatsApp click + form lead | Same user both — do not count click as primary |
| Honeypot returns `ok: true, ignored` | Must not fire conversion |
| Duplicate lead short-circuit | Returns ok without new row — decide whether to fire |
| First-party + Google both optimized | Confusing ops metrics |

---

## 29. Google Ads destination policy basics

- Site is real business maintenance/cleaning; licenses in config — generally OK destination type.  
- Avoid claiming coverage where `ServiceLocation.covered` is false.  
- Avoid “guaranteed price / same-day” unless operationally true (quote disclaimer says human review).  
- AI must not be advertised as always available if key missing.  
- Blog/thin template pages as destinations risk poor experience / policy quality issues.

---

## 30. Trust / unsupported claims

- Prefer license-backed claims (Sharjah / Ajman).  
- Do not invent rankings, “#1”, or coverage.  
- Maps URL and social exist; reviews pages exist — use only verified review claims.  
- Quote pages correctly disclaim final quotation after review.

---

## 31. Ad-to-landing match recommendations (no campaign creation)

| Intent | Suggested destination |
|--------|----------------------|
| “Get quote” / brand | `/en/get-a-quote` or `/ar/get-a-quote` |
| “Book electrician Dubai” | Covered SL e.g. `/en/electrical-maintenance/dubai` **if covered** |
| Category | `/en/services/electrical` etc. |
| Book visit | `/en/book-a-service` |
| Avoid | `/en/locations/dubai` hub, blog articles, DIY |

Message match: H1/service name ≈ keyword; CTA = Get a quote / Book; show phone + WhatsApp as secondary.

---

## 32. DO NOT ADVERTISE THESE YET

1. Any of the **~119k SEO blog / SEC** URLs  
2. DIY guides as paid primary LPs  
3. Uncovered Service×Location pages  
4. Emirate mega-hubs (`/locations/dubai`, `/sharjah`)  
5. `/` apex (redirect hop) — prefer `/en` or `/ar` until rewrite is live  
6. AI chat as guaranteed channel  
7. WhatsApp-only campaigns without call/lead verification  
8. Price / same-day guarantees  
9. Services outside licensed/covered scope  
10. Admin, login, API, thank-you without ref  

---

## 33. Priority matrix

| Pri | Item |
|-----|------|
| **P0** | Install GTM **or** gtag + GA4 + Google Ads conversion; fire on **verified quote/booking success only** |
| **P0** | Update cookie + privacy copy before any third-party tag |
| **P0** | Persist `gclid`/`gbraid`/`wbraid` + UTM onto Lead/Booking (or Visitor) |
| **P0** | Dedicated quote thank-you URL (noindex) **or** robust event tag on successful JSON `ok` |
| **P1** | Confirm Hostinger `NEXT_PUBLIC_GA_ID` / GTM container + Redeploy; verify apex rewrite live |
| **P1** | Offline conversion / lead quality import using `LeadScore` |
| **P1** | Ops email notification for NEW_LEAD (`AUTOMATION_EMAIL_PROVIDER`) |
| **P2** | CAPTCHA if spam rises under paid traffic |
| **P2** | Trim or avoid heavy location hubs for Ads |
| **P3** | Enhanced conversions / consent mode if expanding EU/EEA traffic |

---

## 34. Final readiness table

| Area | Status |
|------|--------|
| Domain / HTTPS | READY |
| Quote/booking UX | PARTIALLY READY |
| Thank-you (booking) | PARTIALLY READY |
| Thank-you (quote) | NOT READY |
| Google tags | NOT READY |
| Conversion design clarity | READY (documented) / NOT implemented |
| UTM/gclid | NOT READY |
| First-party analytics | PARTIALLY READY |
| Lead CRM storage | READY (schema) |
| Revenue/ROAS | NOT READY |
| Legal for third-party tags | NOT READY |
| Suitable LPs inventory | PARTIALLY READY |
| **Overall** | **NOT READY** |

---

## 35. Primary conversion design (EXISTING capabilities only)

1. **Primary:** `QUOTE_SUBMIT` / lead create `source=quote` — wire to Google Ads “Submit lead form” (event or thank-you).  
2. **Primary alt:** Booking received page view with valid `ref`.  
3. **Secondary:** Contact submit.  
4. **Do not primary:** WhatsApp, tel, form start, page view, AI open.  
5. Use first-party `/api/t` for internal funnels only until Google tags exist.

---

## 36. Can I start ads? (A–H)

| | Question | Answer |
|---|----------|--------|
| A | Is the site reachable & commercial? | **Yes** |
| B | Can a stranger request a quote/booking? | **Yes** |
| C | Are EN/AR conversion pages up? | **Yes** |
| D | Is Google Ads conversion tracking installed? | **No** |
| E | Can we attribute Ad → Lead? | **No** (no gclid/UTM) |
| F | Is privacy/cookie policy compatible with GA/Ads tags? | **No** (explicitly forbids) |
| G | Are there acceptable Search LPs? | **Yes** (quote, services, covered SL) |
| H | Should we spend meaningful budget now? | **No** |

---

## 37. Budget safety

**MEASUREMENT READY:** No  
**MEASUREMENT PARTIAL:** First-party only (insufficient for Google Smart Bidding)  
**MEASUREMENT NOT READY:** **Yes — authoritative for Ads**

---

## 38. Master remaining work checklist

- [ ] Legal: revise cookie/privacy for optional advertising cookies / Google tags  
- [ ] Implement GTM or gtag + GA4 + Ads conversion linker  
- [ ] Capture and store gclid/gbraid/wbraid + UTMs on lead/booking  
- [ ] Quote thank-you page (noindex) or confirmed event on success  
- [ ] Tag booking thank-you once  
- [ ] Hostinger env + Redeploy; verify tags in Tag Assistant  
- [ ] Verify apex rewrite live  
- [ ] Confirm covered SL list for geo ads  
- [ ] Ops alert path for new paid leads  
- [ ] Test conversions with Google’s debug (no real customer spam)  
- [ ] Only then: tiny Search pilot budget  

---

## 39. Exact next steps 1–10 (DO NOT IMPLEMENT in this audit)

1. Decide GTM vs hardcoded gtag (recommend **GTM**).  
2. Draft cookie/privacy amendments for advertising measurement.  
3. Add quote success URL `/get-a-quote/received` (mirror booking) **or** dataLayer `quote_submit`.  
4. Persist click IDs + UTMs server-side on lead/booking create.  
5. Configure GA4 + Google Ads conversion actions (primary = lead/booking success).  
6. Set Hostinger env (`NEXT_PUBLIC_GA_ID` and/or GTM) and Redeploy.  
7. Verify Tag Assistant on `/en/get-a-quote` and booking received.  
8. Build allowlist of covered Service×Location URLs for geo ads.  
9. Exclude blog/DIY/hub URLs from Ads.  
10. Launch **micro** Search test only after 7–9 pass — not before.

---

## 40–45. Final response pack

### SHOULD I START SPENDING MEANINGFUL MONEY ON GOOGLE ADS RIGHT NOW?

# **NO**

**ONLY AFTER SPECIFIC FIXES:** legal update + real Google conversion tags on verified quote/booking success + gclid/UTM storage + Redeploy verification.

Evidence: live HTML has **zero** Google tags; code has **no** tag injector; cookie policy forbids third-party trackers; attribution fields absent; quote success has no thank-you URL.

### Companion files

- `docs/google-ads-readiness-audit.json`  
- `docs/conversion-tracking-audit.md`  
- `docs/conversion-tracking-audit.json`  
- `docs/paid-landing-page-audit.csv`  
- `docs/conversion-event-inventory.csv`  
- `docs/lead-attribution-audit.csv`  

---

*End of Google Ads readiness audit. No fixes applied.*
