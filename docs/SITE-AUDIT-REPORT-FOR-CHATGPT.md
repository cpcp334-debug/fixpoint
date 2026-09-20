# Fixpoint (fixpoint.ae) — Full Site Audit Report for ChatGPT

**Generated:** 2026-09-20  
**App path:** `alnajah-aldaem`  
**Live origin:** https://fixpoint.ae  
**Primary locales:** `/en` (LTR, Latin slugs) · `/ar` (RTL, Arabic percent-encoded slugs)  
**Audience:** Paste this entire document into ChatGPT for strategy, SEO/AEO/GEO planning, or prioritization. Do not treat marketing claims as verified rankings.

---

## 1. Executive summary

Fixpoint is a bilingual (EN/AR) Next.js App Router site for **Al Najah Al Daem · Fixpoint** — cleaning and building maintenance across the UAE. The public surface is large: static hubs, ~277 location hubs, services, DIY, FAQ, and a very large **service×estate×city (SEC) blog** corpus (~119k+ published article rows → ~240k locale URLs).

**Performance (live pre this Redeploy):** Hostinger Mobile diagnostics still show score **0** on document latency, render-blocking, dependency tree, and multiple redirects — **`da86e24` / `fb455ca` apex rewrite was NOT live** (`https://fixpoint.ae/` still **307** → `/en`). This release strengthens apex rewrite + www→apex, removes public webfonts, shrinks home RSC, and documents Hostinger panel/CDN ceiling.

**Critical GSC finding (pre-fix):** `/sitemap/0.xml` was returning on the order of **~242,000 `<loc>` URLs / ~50MB** — over Google’s **50,000 URL / 50MB** per-sitemap limits. Pair shards were often empty or useless while shard 0 swallowed the entire article catalog. **This release shards articles across 64 files and keeps shard 0 for small catalogs only.**

**SEO readiness after this release (code):** crawl allowed; robots/sitemap index aligned to 64 shards; default `og:image` / Twitter image; `hreflang` + `x-default`; public pages indexable; admin/login noindex. **Still requires Hostinger Redeploy** before live matches code. **AI chat still needs `OPENAI_API_KEY` in Hostinger env.**

**Honest readiness label:** **Technically GSC-submittable after Redeploy**, with caveats: enormous thin/template corpus risk, dual-slug Hostinger quirks, and coverage truthfulness for ServiceLocation (do not invent `covered`).

---

## 2. Tech stack / hosting

| Layer | Choice |
|-------|--------|
| Framework | Next.js (App Router) + React |
| i18n | `next-intl` (`en`, `ar`) |
| ORM / DB | Prisma → **Hostinger MySQL** (`provider = "mysql"`) |
| Hosting | Hostinger Web App (Node). Deploy via git push **or** `npm run zip:hostinger` → `deploy/out/alnajah-aldaem-hostinger.zip` |
| Images | `public/media/**` WebP/JPEG; `next/image` on content heroes; **brand LCP logo now plain `<img>` WebP** |
| AI | Public widget → `/api/ai/chat` → OpenAI when `OPENAI_API_KEY` set; else failsafe copy. **Mount is interaction-only** (never idle). |
| Analytics | First-party `/api/t` (first gesture or 15s fallback — off LCP path) |
| Fonts | **EN: system UI stack (zero webfont bytes)**; `IBM_Plex_Sans_Arabic` only on `/ar`, not preloaded |

**Required production env (see `deploy/HOSTINGER.md`, `deploy/AI-CHAT.md`):**

```
DATABASE_URL=mysql://...
SITE_URL=https://fixpoint.ae
NODE_ENV=production
ADMIN_EMAIL=...
ADMIN_PASSWORD=...
AUTOMATION_CRON_SECRET=...
HEALTH_CHECK_SECRET=...
DOWNLOAD_CSRF_SECRET=...
OPENAI_API_KEY=sk-...          # REQUIRED for real AI chat
OPENAI_MODEL=gpt-4o-mini       # optional
```

Remove any Neon `postgresql://` / `DIRECT_URL` leftovers on Hostinger.

---

## 3. Mobile & desktop performance

### 3.1 Live baseline (Hostinger Page Speed UI)

| Device | Score | Notes |
|--------|------:|-------|
| Mobile | **~88** | Was 80 → 84 → 88; still chasing 90+ |
| Desktop | **98** | Healthy |

**Re-test URL (required):** `https://fixpoint.ae/en` — **not** bare `/` (apex redirect / Hostinger CDN path can under-report).

### 3.2 Remaining opportunities (live `/en` HTML audit, pre–wave-3 deploy)

Lab PSI API was quota-exhausted; headless Lighthouse got **403** from Hostinger WAF. Local curl of production HTML:

| Signal | Observation | Est. savings if fixed |
|--------|-------------|------------------------|
| HTML | ~**225 KB** (down from ~386 KB after wave 2) | Further cut below-fold |
| RSC flight | ~**144 KB** string payload | Trim home sections / descriptions |
| Fonts | **2× woff2 preloads** (Plus Jakarta 400+700) | ~80–120 KB + main-thread → **removed on EN** |
| LCP images | **Dual preload** `logo-128.webp` + `logo-280.webp` | Competing LCP candidates → hero mark desktop-only |
| AI / analytics | Idle timers still scheduled | JS after LCP window → **interaction-only** |
| Below-fold | Electrical×8, DIY, credentials, how×5, full FAQs | Parse/layout cost → **omitted / linked out** |

### 3.3 Wave 2 fixes (commit `5aeb996`, builds on `e0ee30d`)

1. **HomePlaces → server, emirates only** — no nested place lists on homepage HTML/RSC.
2. **HelpServices → server** — homepage passes only **4** cards.
3. **BrandLogo → plain `<img>` sized WebP** — kills optimizer srcset bloat.
4. **Hero LCP mark** sized down; AI/analytics longer idle; header blur `sm:+`.
5. **FAQ JSON-LD** capped; **OG/x-default**; sitemap **64** shards.

### 3.4 Wave 3 fixes (this commit — push toward 90+)

1. **AI widget: interaction only** — no idle/timer mount; `#alnajah-ai` / events only.
2. **Analytics: gesture or 15s** — off critical path for lab runs.
3. **EN system fonts** — drop Plus Jakarta webfont entirely on public locale layout.
4. **Hero LCP minimum** — remove grid pattern + mobile hero mark; header `logo-128.webp` is sole eager brand image; H1 text LCP-friendly.
5. **Homepage lean** — drop electrical strip / DIY / credentials / reviews blocks; compact category cards; FAQ×4; `content-visibility` on below-fold.
6. **Problem chips** — server Links (no homepage client island); AI prompt chips only on service pages.
7. **PublicHero / HeroMedia** quality **60**.

### 3.5 Expected outcome + Hostinger ceiling

After Redeploy, re-run **Mobile** on `https://fixpoint.ae` (**apex**, not only `/en`). Apex `/` is now an **internal rewrite** to EN home (zero `Location` redirect).

**Hostinger / CDN may still cap the score below 90** even when the app is maxed:
- TTFB / origin cold starts on Web App (document request latency)
- WAF/CDN variance (headless tools often **403**)
- Shared hosting main-thread noise unrelated to our JS

If Mobile stays **~87–89** with **0 redirects** and green TBT/CLS after this Redeploy, treat further gains as **hosting/CDN TTFB**, not missing app redirects.

### 3.6 Residual performance risks (P1)

- Homepage still fetches active services + FAQs server-side (TTFB/MySQL).
- `Header` remains a client island (mobile nav).
- `next-intl` messages still in RSC.
- Deep templates with heavy heroes on non-home URLs.

---

## 4. SEO

### 4.1 Titles / meta / canonical / hreflang

- Central helper: `src/lib/seo.ts` → `buildMetadata()`.
- **Canonical:** `https://fixpoint.ae/{locale}{path}`.
- **hreflang:** `en` + `ar`; this release also emits **`x-default` → EN** when missing.
- Live `/en` (pre-deploy): `robots=index,follow`, canonical correct; **og:image empty** (fixed in code).
- Service×Location pages pass locale-specific `languages` from `model.hreflang` (only indexable locales).

### 4.2 robots.txt

- Live: **Allow: /** ; Disallow `/admin`, `/login`, `/account`, `/api/**`.
- Explicit Googlebot / Bingbot / OAI-SearchBot rules.
- Sitemap list points at `/sitemap/{id}.xml` (now **64** shards in code; live still 32 until Redeploy).

### 4.3 sitemap.xml

- `/sitemap.xml` rewrites to `sitemap-index.xml` route → index of shard locs.
- Shards are **`force-dynamic`** (no Hostinger SSG OOM on 32/64 DB files).
- Soft-fail on MySQL blips (retry once) so deploy/request never hard-crashes.

**Pre-fix defect:** Shard **0** included **all** published articles (EN+AR) → ~242k URLs / ~50MB (**GSC-invalid**). Other shards often **0 URLs**.

**Post-fix design:**

| Shard | Contents |
|------:|----------|
| 0 | Static pages + active services + serving locations + DIY guides/categories (+ its article hash slice + SL pairs) |
| 0–63 | Articles (blog/FAQ) by `articleShardId(slug)` |
| 0–63 | Public ServiceLocation pairs by `pairShardId(service/location)` |
| Cap | Soft truncate at **45,000** URLs/shard with error log |

### 4.4 Structured data

Homepage emits Organization, LocalBusiness, BreadcrumbList, FAQPage (capped).  
Other templates: Service, HowTo, BlogPosting, CollectionPage, review aggregates as applicable (`src/lib/seo.ts`).

### 4.5 Crawlability / indexation risks

| Risk | Severity | Notes |
|------|----------|-------|
| Oversized sitemap shard 0 | **P0 — fixed in code** | Redeploy required |
| Template / near-duplicate SEC blogs at scale | **P0 content** | Ranking dilution / soft spam signals |
| `REVIEW_REQUIRED` leftovers in AR copy | **P1** | Scrubbers exist; verify samples |
| Uncovered ServiceLocation | Controlled | Public gate requires `covered + published + indexable`; drafts 404 / noindex |
| Admin | OK | `robots: noindex` on `/admin`, `/login` |
| Soft pages | OK | Explicit noindex in SL resolve |

### 4.6 Open Graph / Twitter

- This release: default **`/media/logo-512.webp`** for OG + Twitter when page omits image.
- Prefer per-article topic WebP when available (blog metadata paths).

---

## 5. AEO (Answer Engine Optimization)

**Strengths**

- FAQ schema helper + on-page FAQ blocks.
- Service/DIY “quick answer” fields in content contracts.
- AI widget for assisted triage (when key configured).
- Locale-aware Q&A on SL pages (`aeo` section labels).

**Gaps**

- Many generated pages are template-similar → weak unique extractability.
- Home FAQ JSON-LD intentionally capped (perf); ensure category FAQ pages remain rich.
- Answer-first lead paragraphs vary; enforce in publication gates (`docs/public-article-publication-gates.md`).

**Recommendation:** Prioritize unique H1 + first-paragraph answer + FAQ schema on money pages (parent services, emirates, top DIY GREEN), not on every SEC row at once.

---

## 6. GEO (local / location quality)

**Corpus:** **277** public location hubs published (see `docs/location-hub-publish-report.json`, redeploy `dc15224` lineage). Independent MSA Arabic composer used when OpenAI key missing.

**Truthfulness rules (non-negotiable)**

- `ServiceLocation.covered` is the **only** coverage source of truth — **never invent**.
- Directory/home cards must not imply service is performed in a community unless a covered pair exists.
- Hub copy should stay GEO-aware (emirate/city facts) without fabricating licenses, response times, or “serving every building”.

**Fabrication risks**

- Template GEO paragraphs repeated across communities.
- AR names stuck on `REVIEW_REQUIRED` or Latin (admin + public scrub paths exist).
- Claiming full UAE matrix indexable when public SL coverage is historically **49** grandfathered pairs (verify live count after DB drift).

---

## 7. Content corpus — quality risks

Approximate public/generated scale (docs + live sitemap evidence; re-count in admin after Redeploy):

| Corpus | Scale (order of magnitude) | Quality risks |
|--------|----------------------------|---------------|
| SEC / service blogs | **~119k+** published articles | Template dominance, thin uniqueness, TOC duplication (partially fixed), AR `REVIEW_REQUIRED` |
| FAQ articles | **~454** service FAQ set (+ global FAQs) | Prefix `faq-` policy; must not collide with blog routes |
| DIY | **~454** matrix guides; public GREEN subset historically smaller | RED/YELLOW must stay gated; safety class honesty |
| Locations | **277** hubs | AR independence vs shell translation |
| Services | Approved catalog ~311 offerings; fewer **active+indexable** parents | Draft noindex vs public nav |
| Service×Location | Large matrix drafts; **public only covered** | Do not mass-publish |

**Publication hygiene**

- Prefer gates in `docs/public-article-publication-gates.md`.
- Scrub `REVIEW_REQUIRED` from public AR (`public-i18n`, blog catalog scrubbers).
- Blog slugs must **not** use `faq-` prefix; FAQ uses `faq-` + `service-faq` category.

---

## 8. Dual-slug EN Latin / AR Arabic (Hostinger Unicode)

**Policy (shipped across `18c6f5b` / `fd6d849` / related):**

- **`/en/...`** → Latin slugs only.
- **`/ar/...`** → Arabic slugs as **percent-encoded** path segments (Hostinger ASCII-safe).
- DB primary `slug` stays **Latin**.
- No hard 301 required for Latin bookmarks on `/ar`; soft `replaceState` when mapped Arabic slug known.
- Slug maps: `scripts/_slug-maps.json` (+ fill scripts for ~99k missing article maps).

**Operational risk:** Unmapped rows still emit Latin on `/ar` until maps filled. After Redeploy, spot-check Sports City electrical PM and a random SEC sample.

---

## 9. Duplicate slug risks & remediations done

| Collision class | Remediation |
|-----------------|-------------|
| FAQ vs blog | FAQ prefix `faq-` + category `service-faq`; blog admin warns against `faq-` |
| EN/AR same path segment | Locale-specific maps (`blogPathSlug`, `faqPathSlug`, `locationPathSlug`, `servicePathSlug`) |
| Arabic Unicode vs Hostinger | Percent-encode on emit; decode/NFC on lookup |
| Latin primary overwritten by Phase 3 | **Forbidden** — Phase 3 recomposes AR copy only |
| DIY category vs guide | Separate maps (`diyGuidePathSlug` / `diyCategoryPathSlug`) |

Continue periodic `_tmp-dual-slug-probe` / slug-policy audits; do not commit secrets.

---

## 10. Google Search Console readiness checklist

### Submit after Redeploy

1. Property: **`https://fixpoint.ae`** (Domain or URL-prefix).
2. Confirm **robots.txt** fetched (Allow `/`, Disallow private).
3. Submit **sitemap index:** `https://fixpoint.ae/sitemap.xml`  
   - Expect **64** child sitemaps after this deploy.  
   - Spot-check `sitemap/0.xml` URL count **≪ 50,000** and size **≪ 50MB**.  
   - Spot-check `sitemap/1.xml` … non-zero article URLs.
4. URL Inspection: `/en`, `/ar`, one service, one location hub, one DIY GREEN, one FAQ, one blog.
5. Set international targeting carefully (hreflang already present; avoid conflicting GSC geo hacks).

### Fix first (ordered)

1. **Redeploy** this commit (sitemap sharding + OG + perf).  
2. Confirm sitemap children valid in GSC (watch “Couldn’t fetch” / “Sitemap is HTML”).  
3. Set **`OPENAI_API_KEY`** (product, not crawl — but support UX).  
4. Sample indexation of thin SEC URLs — consider noindex/canonical clusters if GSC shows soft spam / “Crawled – not indexed” mass.  
5. Resolve any remaining AR `REVIEW_REQUIRED` titles in Search appearance samples.

### GSC ready? 

**Yes, with caveats** — after Redeploy and sitemap validation. Not “ready to claim rankings.” Large template corpus may index slowly or be deprioritized.

---

## 11. Prioritized roadmap

### P0 (this week)

- [x] Fix sitemap 50k/50MB violation (64-way article shard).  
- [x] Mobile LCP/RSC weight cuts on `/en`.  
- [x] OG/Twitter default image + `x-default` hreflang.  
- [ ] **Hostinger Redeploy** of this commit + re-PSI mobile.  
- [ ] Paste `OPENAI_API_KEY` + Redeploy again if chat still failsafe.  
- [ ] GSC: submit `sitemap.xml`; validate shard 0 size.

### P1 (next)

- Audit “Crawled – not indexed” / duplicate SEC clusters; optional `noindex` for lowest-quality strata.  
- Finish AR REVIEW_REQUIRED scrub on remaining articles.  
- Slim more homepage below-fold JS; consider streaming.  
- Verify public ServiceLocation count vs business coverage truth.  
- Add real OG images per major template (topic WebP).

### P2 (later)

- Edge caching / CDN in front of Hostinger if TTFB blocks 90+.  
- Structured AEO packs for top commercial queries.  
- Independent GEO refresh with OpenAI for hubs (key required).  
- Reduce next-intl message payload per route.

---

## 12. Redeploy hashes / env still needed

### Redeploy hashes (lineage)

| Hash | Theme |
|------|--------|
| `e0ee30d` | Prior mobile PSI (lean LCP assets, deferred AI/analytics) |
| `4100b10` | Sitemap soft-fail + Hostinger SSG shrink |
| `18c6f5b` / `fd6d849` / `84b0545` | Arabic percent-encoded slugs |
| `dc15224` … `4b63054` | Location hubs / AR estate directory |
| **`5aeb996`** | Sitemap 64-shard + mobile RSC/LCP + OG/x-default + audit report |
| **`26e6f6a`** | Wave 3 mobile PSI: interaction-only AI, EN system fonts, lean home |
| **`fb455ca`** | Apex / rewrite (0 redirects), logo preload, server header, modern browserslist |
| **`526554c`** | PSI redirects hardening (www→apex, matcher /), no public webfonts, lean home RSC, media cache headers, Hostinger panel tips |

After push, the **Redeploy hash is the new `origin/main` HEAD**. Upload zip if not using Git deploy: `npm run zip:hostinger` → `deploy/out/alnajah-aldaem-hostinger.zip`.

### Env vars still required on Hostinger

| Var | Status |
|-----|--------|
| `DATABASE_URL` | Required (MySQL) |
| `SITE_URL=https://fixpoint.ae` | Required |
| `OPENAI_API_KEY` | **Still required for AI chat** — without it widget failsafe |
| `OPENAI_MODEL` | Optional (`gpt-4o-mini`) |
| Admin / cron / health / CSRF secrets | Required for admin & automation |

---

## 13. Smoke checklist after Redeploy

```
https://fixpoint.ae/robots.txt          → Allow /, 64 Sitemap lines
https://fixpoint.ae/sitemap.xml         → 64 <loc> children
https://fixpoint.ae/sitemap/0.xml       → <<50k URLs, <<50MB
https://fixpoint.ae/sitemap/1.xml       → non-empty article/pair URLs
https://fixpoint.ae/en                 → index,follow; og:image set; lighter HTML
https://fixpoint.ae/ar                 → RTL; canonical /ar; hreflang en+ar+x-default
https://fixpoint.ae/en/blog            → 200
https://fixpoint.ae/ar/blog            → Arabic percent-encoded card hrefs
Hostinger Page Speed Mobile /en         → re-test toward 90+
AI widget                               → real reply only if OPENAI_API_KEY set
```

---

## 14. File map (for engineers)

| Area | Path |
|------|------|
| Sitemap | `src/app/sitemap.ts`, `src/app/sitemap-index.xml/route.ts`, `src/app/robots.ts` |
| Metadata | `src/lib/seo.ts` |
| Home perf | `src/app/[locale]/page.tsx`, `HomePlaces.tsx`, `HelpServices.tsx`, `BrandLogo.tsx`, `Hero.tsx` |
| Deferral | `DeferredAiWidget.tsx`, `Tracker.tsx` |
| Hostinger | `deploy/HOSTINGER.md`, `deploy/AI-CHAT.md`, `npm run zip:hostinger` |
| Slug policy | `docs/redeploy-arabic-slugs.md`, `docs/redeploy-locale-slugs.md` |

---

*End of report. Safe to paste into ChatGPT as a single brief.*
