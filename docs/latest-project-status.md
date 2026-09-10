# Latest Project Status Report (READ-ONLY)

**Inspected at:** 2026-09-10T14:26:33.344Z (UTC)  
**Method:** Live PostgreSQL via Prisma + HTTP probes + repository inspection.  
**No** code/content/DB mutations (except this report pair). No migrations. No generation/publish/cover.

---

## 1. Overall project state

| Area | Status | Evidence |
|------|--------|----------|
| Application | **PARTIAL — core public OK; Blog/sitemap broken** | `/en`,`/ar`,`/services`,`/diy`,`/get-a-quote`,`/faq`, SL pages **200**; `/en/blog*`, `/sitemap/0.xml` **500** |
| Database | **Reachable local Postgres** | Counts succeeded (`127.0.0.1`) |
| Prisma | **Schema ahead of generated client** | `Article.publishedAt` in schema/DB usage; client throws `Unknown argument/field publishedAt` → Blog + sitemap 500 |
| Content Engine | **Foundation PARTIAL** | `content-engine/` present; generator stub; engine tables **0** rows |
| Generation system | **Legacy jobs heavy; engine stub** | `ContentGenerationJob` = 254,012 all `succeeded` |
| Publication system | **Catalog gates exist** | Public DIY/SL via status+indexable+covered |
| Admin | **Session gate works** | `/admin` → **307** (redirect login) |
| Blog | **Data + routes exist; runtime FAIL** | 45 published in DB; pages 500 due Prisma client drift |
| DIY | **OK** | 563 total; 45 public GREEN |
| Service × Location | **OK for public 49** | 63,400 total; 49 covered/public |
| Images | **Local WebP OK on public DIY/SL/Blog fields** | `/public/media/topics/*.webp` |
| SEO / AEO / GEO | **PARTIAL** | Code present; SL word/AEO/uniqueness weak; Blog HTTP broken |
| Sitemap | **Architecture OK; live FAIL** | 32 shards; shard 0 500 (`publishedAt`) |
| Security | **PARTIAL** | Admin redirect; public filters; prod secrets missing |
| Production | **MISSING** | Local DB + localhost `SITE_URL` |

**FAQ update (since prior report):** Normalizer `src/lib/faq.ts` present; global=6; active services 7×≥6; public SL 49×≥6; Blog 45×≥6; empty FAQ boxes **0** on scanned public rows.

---

## 2. Exact content counts (live DB)

### Services / locations

| Metric | Count |
|--------|------:|
| Total `Service` | **317** |
| `active` | **7** |
| `draft` | **310** |
| active+indexable | **7** |
| Approved offerings (matrix rows) | **311** |
| Total `Location` | **200** |
| Location active | **8** |
| Location serves | **8** |
| Global published FAQs | **6** |

### Service × Location

| Metric | Count |
|--------|------:|
| Total | **63,400** |
| covered | **49** |
| coverageStatus=published | **49** |
| indexable | **49** |
| Public (covered+published+indexable+active S/L) | **49** |
| Uncovered | **63,351** |

### DIY

| Metric | Count |
|--------|------:|
| Total | **563** |
| isPrimary | **302** |
| published | **45** |
| public published+indexable | **45** |
| public GREEN-only | **45** |
| draft | **518** |

#### Safety (`profileJson.matrixSafety` / risk fallback)

| Class | Count |
|-------|------:|
| GREEN | **46** |
| YELLOW | **245** |
| RED | **222** |
| REVIEW_REQUIRED | **50** |

#### Matrix 311 file

| Class | Count |
|-------|------:|
| GREEN | 46 |
| YELLOW | 128 |
| RED | 112 |
| REVIEW_REQUIRED | 25 |
| Rows | **311** |

### Blog / Article

| Metric | Count |
|--------|------:|
| Total Article | **45** |
| Published | **45** |
| Public published+indexable | **45** |
| Draft | **0** |

### Corpus totals (DIY + SL)

| Metric | Count |
|--------|------:|
| **TOTAL CONTENT RECORDS** | **63,963** |
| **EN VERSIONS** | **63,963** |
| **AR VERSIONS** | **63,963** |
| **TOTAL EN/AR** | **127,926** |

Blog **45** is **additional** to the 63,963 DIY+SL corpus.

### Public units

| Set | Count |
|-----|------:|
| DIY + SL | **94** |
| + Blog | **139** |

---

## 3. 311 DIY mapping

### Docs (`docs/diy-service-311-mapping.json`)

- approvedServices **311** · primaryExists **304** · needsCreation **7** · uniquePrimaryGuideIds **302**
- Missing hubs: refrigerator, microwave, washing-machine, water-heater, dishwasher, oven, burner-cooker

### Live DB

| Metric | Value |
|--------|------:|
| Services with `primaryDiyGuideId` | **304** |
| Without primary | **13** (legacy parents, listed in JSON) |
| Invalid primary FK | **0** |
| `isPrimary=true` | **302** |
| isPrimary unlinked | **0** |
| linked but not isPrimary | **0** |
| Shared primary guide IDs | **1** (one guide referenced by multiple services) |

`coveragePrimaryGuideSlug` remains in `src/lib/diy/coverage.ts`. Do not invent the 7 hubs.

---

## 4. Content Engine

| Component | Status |
|-----------|--------|
| Folder structure | **IMPLEMENTED** |
| Scripts (dry 1/10/100) | **IMPLEMENTED** |
| Generators | **PARTIAL** (stub only) |
| Validators | **PARTIAL** |
| Review / publication queues | **PARTIAL** (in-memory dry) |
| Worker | **PARTIAL** (legacy `process-job`) |
| Retry / checkpoint / idempotency | **PARTIAL** |
| Generation versions | **PARTIAL** |
| Cost tracking | **MISSING** |
| Reporting | **PARTIAL** |
| DB models | **IMPLEMENTED** (empty: Manifest/Validation/Batch/RunItem = **0**) |
| Legacy ContentGenerationJob | **PRESENT** (254,012 succeeded) |

**Verdict:** Foundation exists; **not** a production generator for the 63,963 corpus.

---

## 5. Content quality (DB field assembly)

Method: stored publication fields (not full HTML render).

### Public DIY (45)

| | EN | AR |
|--|---:|---:|
| min | 1149 | 944 |
| max | 1626 | 1385 |
| avg | 1508 | 1278 |
| under 1000 | **0** | **2** |

### Public SL (49)

| | EN | AR |
|--|---:|---:|
| min | 417 | 364 |
| max | 485 | 402 |
| avg | 447 | 383 |
| under 1000 | **49** | **49** |

### Public Blog (45)

| | EN | AR |
|--|---:|---:|
| min | 1271 | 1265 |
| max | 2020 | 1382 |
| under 1000 | **0** | **0** |

---

## 6. Uniqueness

**Authoritative:** `SIMILARITY_THRESHOLD = 0.85` in `src/lib/service-location/content-similarity.ts`.

| Corpus | Exact | Blocking ≥0.85 | High 0.70–0.84 |
|--------|------:|---------------:|---------------:|
| Public DIY EN | 0 | **0** | 0 |
| Public Blog EN body | 0 | **0** | 0 |
| Public SL EN body | **42** | **637** | 0 |
| Public SL EN intros | 0 | 0 | **113** |

- Dominant FAQ question templates across SL (LOC-normalized): **1** family reused ≥10 times (expected after structured rewrite; still template-led).
- Prior blog audit doc still lists **2** blocking pairs (methodology may differ from live body scan).
- **Template dominance / location-swap risk: HIGH on public SL bodies.**

---

## 7. DIY / self-help

| Check | Result |
|-------|--------|
| Public SL DIY markers EN/AR | **49/49** |
| Public Blog DIY markers EN/AR | **45/45** |
| Public DIY guides | 45 (inherently DIY) |
| DIY safety counts | GREEN 46 / YELLOW 245 / RED 222 / RR 50 |

---

## 8. Images

| Check | Result |
|-------|--------|
| Public SL image/WebP/alt | **49/49/49** |
| Public Blog image/WebP | **45/45**; alt missing **0** |
| Storage | **Local** `public/media/topics` |
| Object storage / CDN | **MISSING** |
| Broken-image HTTP verify | **Not fully run** (Blog HTTP 500) |

---

## 9. Blog

| Item | Status |
|------|--------|
| Routes | Implemented |
| Article model + 45 published | **In DB** |
| HTTP `/en/blog`, `/ar/blog`, detail | **500** — Prisma client missing `publishedAt` |
| Categories | 9 (plumbing, cleaning, ac, …) |
| Pagination/search | **PARTIAL** |
| FAQs (≥6) | **45/45** in DB |
| EN/AR | Complete in DB |

---

## 10–12. SEO / AEO / GEO

| Layer | Class | Notes |
|-------|-------|-------|
| Technical SEO | **PARTIAL** | Metadata helpers; sitemap/blog broken at runtime |
| On-page | **PARTIAL** | DIY/Blog strong in DB; SL short |
| Indexability | **PASS** (code) | published+indexable; SL covered |
| Sitemap | **FAIL** (live) | `publishedAt` client error |
| Canonical / hreflang | **PARTIAL** | Implemented in resolve |
| Structured data | **PARTIAL** | JsonLd helpers |
| Internal linking | **PARTIAL** | |
| Image SEO | **PARTIAL** | WebP+alt on public fields |
| **AEO** | **PARTIAL** | FAQs strong after rewrite; SL `directAnswer` **0/49** |
| **GEO** | **PARTIAL** | localInfo 49/49; SL body uniqueness HIGH risk |

No ranking / AI citation / UAE-scale GEO claims.

---

## 13. Public routes (HTTP)

| Route | Status |
|-------|-------:|
| `/en` | 200 |
| `/ar` | 200 |
| `/en/services` | 200 |
| `/en/services/cleaning` | 200 |
| `/en/cleaning-services` | 200 |
| `/en/diy` | 200 |
| `/en/diy/diy-house-cleaning` | 200 |
| `/en/cleaning-services/dubai` | 200 |
| `/en/get-a-quote` | 200 |
| `/en/faq` | 200 |
| `/en/blog` | **500** |
| `/en/blog/[slug]` | **500** |
| `/ar/blog` | **500** |
| `/sitemap/0.xml` | **500** |
| `/admin` | **307** |

---

## 14. Security

| Check | Class |
|-------|-------|
| Draft DIY not public | **PASS** (code) |
| Uncovered SL not public | **PASS** (code) |
| Admin requires session | **PASS** (307) |
| Prod secrets | **FAIL / MISSING** |
| Overall | **PARTIAL** |

---

## 15. Sitemap

| Item | Value |
|------|--------|
| Pair shards | **32** |
| Expected DIY locale URLs | 45×2 = 90 |
| Expected SL locale URLs | 49×2 = 98 |
| Expected Blog locale URLs | 45×2 = 90 |
| Draft exclusion | By query |
| Live shard 0 | **500** (`Article.publishedAt` unknown to client) |

---

## 16. Production / deployment

| Item | Class |
|------|-------|
| Hosting / domain / HTTPS / DNS | **MISSING** |
| Managed Postgres | **MISSING** (local) |
| DATABASE_URL | **PARTIAL** (local) |
| Pooling | **PARTIAL** (local) |
| Backups / PITR / CDN / object storage | **MISSING** |
| Monitoring / cron / secrets | **MISSING** |
| SITE_URL | localhost |

---

## 17. Test / build state

| Item | Status |
|------|--------|
| Engine dry path (prior) | PASS |
| FAQ rewrite applied | YES (DB) |
| Blog/sitemap runtime | **FAIL** (Prisma generate drift) |
| Windows Prisma generate | **EPERM risk** while Next locks DLL |
| Production build this pass | **Not verified** |
| Typecheck this pass | **Not run** (read-only) |

---

## 18. Blockers

### A. CODE
1. **Prisma client out of sync** — `Article.publishedAt` → Blog + sitemap **500**
2. Content Engine generator still **stub**; engine tables empty
3. Shared primary DIY guide count = **1** (review consistency)

### B. CONTENT
1. Public SL **49/49 under 1,000** words (stored)
2. Public SL uniqueness **42 exact / 637 blocking**
3. Public SL `directAnswer` **0/49**
4. Public DIY AR **2 under 1,000**
5. Only **7** Service rows `active` vs **311** matrix offerings
6. Blog audit doc still cites **2** blocking pairs

### C. SAFETY
1. **7** missing hubs (do not invent)
2. Keep YELLOW/RED/RR non-public without policy

### D. COVERAGE
1. **63,351** uncovered — correctly private; never invent `covered`

### E. INFRASTRUCTURE
1. No production host/DB/HTTPS/backups/CDN/monitoring

### F. SEARCH NOT-YET-PROVEN
1. No GSC / ranking / AEO citation / GEO visibility measurement

---

## 19. Current project phase (ONE)

**CONTENT ENGINE BUILD**

Evidence: Engine foundation + dry tests exist; real corpus generator not live; public baseline 94 (+Blog data) frozen; Blog/sitemap blocked by client drift; next work is engine hardening / Prisma sync — not mass generation or production deploy.

---

## 20. Recommended next (no changes made here)

### Complete
- DIY+SL corpus architecture counts
- 94 public DIY+SL; FAQ rewrite + normalizer
- Content Engine scaffold
- 311 mapping docs + 304 primaries

### Partial
- Content Engine (stub)
- SEO/AEO/GEO
- Blog (DB yes, HTTP no)
- Admin/security

### Missing
- `prisma generate` sync (stop Next if EPERM)
- Real generator + live 1→10→100
- Production infra

### Next step
**Stop `next dev` if needed → `prisma generate` → verify `/en/blog` + `/sitemap/0.xml` return 200**, then continue Content Engine toward a single live test generation under freeze.

### Do not touch
- Mass generate 63,963 · invent coverage · delete DIY · safety downgrade · production deploy before engine+QA

---

## 21. Files written

- `docs/latest-project-status.md` (this file)
- `docs/latest-project-status.json`
