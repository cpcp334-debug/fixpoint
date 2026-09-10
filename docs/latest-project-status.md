# Latest Project Status Report (READ-ONLY)

**Inspected at:** 2026-09-10T13:59:52.891Z (UTC)  
**Method:** Live PostgreSQL counts via Prisma + repository inspection. No writes to application data. No migrations. No generation/publish/cover.

**Source artifact:** `content-engine/reports/_status-probe-raw.json` (probe output; disposable).

---

## 1. Overall project state

| Area | Status | Evidence |
|------|--------|----------|
| Application | **Running locally but returning HTTP 500** on probed public/admin routes | `http://127.0.0.1:3000/en`, `/en/blog`, `/en/diy`, `/en/get-a-quote`, `/admin`, `/sitemap/0.xml` all 500 |
| Database | **Reachable local Postgres** (`127.0.0.1:5433`) | Counts succeeded; `DATABASE_URL` points at localhost |
| Prisma | **Schema present; client usable for queries** | Models include Content Engine tables; prior `generate` EPERM risk if `next dev` locks Windows DLL |
| Content Engine | **Foundation present; not production-generating** | `content-engine/` scaffold; generator stub; engine tables empty (0 rows) |
| Generation system | **Legacy job queue heavy; engine generator stub** | `ContentGenerationJob` = 254,012 all `succeeded`; no live AI publish path in Phase 1 engine |
| Publication system | **Catalog gates exist; engine pub queue in-memory only** | Public DIY/SL via status+indexable+covered; engine `publication-queue.ts` not DB-backed |
| Admin system | **Implemented with staff session** | `src/app/admin/layout.tsx` redirects to `/login` without session; `requireStaff` on actions |
| Blog system | **Implemented + 45 published** | Routes `/[locale]/blog` + `[slug]`; Article model |
| DIY system | **563 guides; 45 public GREEN** | Status/indexable + safety matrix |
| Service × Location | **63,400 pairs; 49 public covered** | `covered` + `coverageStatus=published` + indexable |
| Image system | **Local WebP topic assets** | `/public/media/topics/*.webp`; no object storage/CDN in env |
| SEO / AEO / GEO | **Implemented in app + partial engine validators** | Metadata/hreflang/schema helpers; SL `directAnswer` often empty in DB |
| Sitemap | **32-shard architecture** | `src/app/sitemap.ts` `SITEMAP_PAIR_SHARDS=32` |
| Security | **PARTIAL (code present; live 500 blocks full HTTP proof)** | Admin login gate; public queries filter published/indexable/covered |
| Production/deploy | **MISSING / local-only** | Local DB + localhost `SITE_URL`; prod secrets not configured in inspected env keys |

---

## 2. Exact content counts (live DB)

### Services / locations

| Metric | Count |
|--------|------:|
| Total `Service` | **317** |
| `Service.status=active` | **7** |
| `Service.status=draft` | **310** |
| `Service` active+indexable | **7** |
| Approved offerings (matrix `docs/diy-classification-matrix-311.json` rows) | **311** |
| Total `Location` | **200** |
| Location `active` | **8** |
| Location `serves=true` | **8** |

**Note:** “311 approved services” is the **catalog/matrix offering set**, not `Service.status=active`. Only **7** service rows are currently `active` in DB.

### Service × Location

| Metric | Count |
|--------|------:|
| Total `ServiceLocation` | **63,400** |
| `covered=true` | **49** |
| `coverageStatus=published` | **49** |
| `indexable=true` | **49** |
| Public (covered + published + indexable + active service/location) | **49** |
| Uncovered (`covered=false`) | **63,351** |

### DIY

| Metric | Count |
|--------|------:|
| Total `DiyGuide` | **563** |
| `isPrimary=true` | **302** |
| `status=published` | **45** |
| Public (`published` + `indexable`) | **45** |
| Public GREEN-only (published+indexable+GREEN) | **45** |
| `status=draft` | **518** |

#### DIY safety (from `profileJson.matrixSafety` with `riskLevel` fallback)

| Class | Count |
|-------|------:|
| GREEN | **46** |
| YELLOW | **245** |
| RED | **222** |
| REVIEW_REQUIRED | **50** |

#### DIY `riskLevel` enum (DB field; not identical to matrixSafety)

| riskLevel | Count |
|-----------|------:|
| green | 46 |
| yellow | 245 |
| red | 272 |

#### Matrix 311 file safety distribution

| Class | Count |
|-------|------:|
| GREEN | 46 |
| YELLOW | 128 |
| RED | 112 |
| REVIEW_REQUIRED | 25 |
| Rows | 311 |

### Blog / Article

| Metric | Count |
|--------|------:|
| Total `Article` | **45** |
| Published | **45** |
| Published + indexable (public Blog) | **45** |
| Draft | **0** |

### Corpus totals (DIY + ServiceLocation architecture)

| Metric | Count |
|--------|------:|
| **TOTAL CONTENT RECORDS** (`DiyGuide` + `ServiceLocation`) | **63,963** |
| **EN VERSION COUNT** (1 per record, architectural) | **63,963** |
| **AR VERSION COUNT** | **63,963** |
| **TOTAL EN/AR VERSIONS** | **127,926** |

Blog Articles (**45**) are **additional** to the 63,963 DIY+SL corpus (same note as prior blog launch docs).

### Public content units

| Set | Count |
|-----|------:|
| Public DIY + public SL (classic “94”) | **94** |
| + public Blog | **139** |

---

## 3. 311 DIY mapping

### From docs (`docs/diy-service-311-mapping.json`)

| Metric | Value |
|--------|------:|
| approvedServices | 311 |
| primaryExists | 304 |
| needsCreation | 7 |
| uniquePrimaryGuideIds | 302 |
| missing hubs | refrigerator, microwave, washing-machine, water-heater, dishwasher, oven, burner-cooker |

### Live DB

| Metric | Value |
|--------|------:|
| Services with `primaryDiyGuideId` | **304** |
| Services without primary | **13** (sample: carpentry-joinery, flooring-tiling, … kitchen-appliance-maintenance — legacy/non-matrix parents, not the 7 hubs) |
| Invalid primary FK | **0** |
| `DiyGuide.isPrimary=true` | **302** |
| `isPrimary` but not linked from Service | **0** |
| Service primary points to guide with `isPrimary=false` | **0** |
| Shared primary guide used by multiple services | **0** (in this scan of shared ID counts) |
| Active services with primary | 7/7 |

`coveragePrimaryGuideSlug` remains code in `src/lib/diy/coverage.ts` (matrix-driven). Seven hubs remain **category-only** (`CATEGORY_ONLY_HUBS` in `approved-nav.ts`) — **do not invent shells**.

---

## 4. Content Engine component matrix

| Component | Status | Notes |
|-----------|--------|-------|
| Folder `content-engine/` | **IMPLEMENTED** | config, manifests, generators, validators, pipeline, images, reports, scripts, tests |
| Scripts (1/10/100 dry) | **IMPLEMENTED** | `engine:test:*`; dry path only |
| Generators | **PARTIAL** | `generators/stub.ts` — generation disabled |
| Validators | **PARTIAL** | Engine validators exist; not fully wired to production `content-similarity.ts` / render pipeline |
| Review queue | **PARTIAL** | In-memory for dry-run |
| Publication queue | **PARTIAL** | In-memory + gate; AI cannot publish |
| Worker | **PARTIAL** | Legacy `src/lib/content-generation/process-job.ts` for old job kinds |
| Retry | **PARTIAL** | On `ContentGenerationJob`; engine helpers only |
| Checkpoint / resume | **PARTIAL** | Helpers in `pipeline/batch.ts` |
| Idempotency | **PARTIAL** | Job `idempotencyKey` + engine key helper |
| Generation versions | **PARTIAL** | Config version string + job `generationVersion` |
| Cost tracking | **MISSING** | Config constants only |
| Failure queue | **PARTIAL** | Job `failed`/`dead` statuses; engine not driving them |
| Audit logs | **PARTIAL** | In-memory dry audit |
| Reporting | **PARTIAL** | Dry-batch JSON + architecture docs |
| DB models | **IMPLEMENTED** | Manifest/Validation/Batch/RunItem exist |
| Engine table rows | **EMPTY** | Manifest/Validation/Batch/RunItem = **0** |
| Legacy generation jobs | **PRESENT** | 254,012 succeeded `ContentGenerationJob` rows |

**Verdict:** A **real foundation** exists beside the app. A **production Content Engine that generates/validates/publishes the corpus** does **not** yet exist.

---

## 5. Content quality — word counts (DB field assembly)

Counted from stored publication fields (not full HTML render). SL uses intro+body+localInfo+directAnswer+geoIntro+faq+h1.

### Public DIY (45) EN / AR

| | EN | AR |
|--|---:|---:|
| min | 1257 | 1025 |
| max | 1734 | 1438 |
| avg | 1619 | 1341 |
| median | 1630 | 1343 |
| under 1000 | **0** | **0** |
| 1000–1099 | 0 | 2 |
| 1100–1299 | 1 | 6 |
| 1300+ | 44 | 37 |

### Public Service × Location (49) EN / AR

| | EN | AR |
|--|---:|---:|
| min | 286 | 245 |
| max | 328 | 284 |
| avg | 307 | 261 |
| median | 305 | 261 |
| under 1000 | **49** | **49** |

**Finding:** Public SL stored bodies are **well under 1,000 words** (sample `cleaning-services/abu-dhabi`: body dominated by DIY self-help section; `directAnswer`/`geoIntro`/`h1` empty). Grandfathered 49 remain public; **do not treat DB SL as meeting the new 1,000-word floor**.

### Public Blog (45) EN / AR

| | EN | AR |
|--|---:|---:|
| min | 1215 | 1210 |
| max | 1954 | 1325 |
| avg | 1592 | 1268 |
| under 1000 | **0** | **0** |

---

## 6. Uniqueness

**Authoritative threshold:** `SIMILARITY_THRESHOLD = 0.85` in `src/lib/service-location/content-similarity.ts`.

### Live pairwise scan (public only, token Jaccard ≥0.85 = blocking)

| Corpus | n | Exact dups | Blocking pairs | High (0.70–0.84) |
|--------|--:|----------:|---------------:|-----------------:|
| Public DIY EN | 45 | 0 | **0** | 0 |
| Public Blog EN body | 45 | 0 | **0** | 0 |
| Public SL EN body | 49 | **42** | **637** | 0 |

### Prior blog audit doc

`docs/blog-uniqueness-audit.json`: **blockingSimilarity = 2** (2026-09-10). Live body-only scan now shows 0 — treat as **PARTIAL / needs reconcile** (methodology differs).

Template dominance / location-swap: **high risk on public SL** given exact-dup and blocking similarity counts. Engine location-swap detector exists but is not continuously enforced on live SL.

---

## 7. DIY / self-help

| Check | Result |
|-------|--------|
| Public DIY guides | 45 (inherently DIY) |
| Public SL with DIY markers EN | **42 / 49** |
| Public SL with DIY markers AR | **49 / 49** |
| Public Blog diySection/markers EN | **45 / 45** |
| Public Blog AR | **45 / 45** |
| DIY safety counts | See §2 (GREEN 46 / YELLOW 245 / RED 222 / RR 50) |

---

## 8. Images

| Check | Result |
|-------|--------|
| Public SL with image path | 49/49 |
| Public SL WebP path | 49/49 |
| Public SL alt OK | 49/49 |
| Public Blog with image | 45/45 |
| Public Blog WebP | 45/45 |
| Public Blog missing alt | 0 |
| Storage | **Local** `/public/media/topics/*.webp` (and categories) |
| Object storage / CDN | **MISSING** in env |
| Broken-image HTTP verify | **NOT RUN** (site 500); paths exist on disk |
| Image render pipeline in engine | **PARTIAL** (contract only) |

Sample paths: `/media/topics/plumbing.webp`, `ac.webp`, `cleaning.webp`, etc.

---

## 9. Blog

| Item | Status |
|------|--------|
| `/en/blog`, `/ar/blog` | **IMPLEMENTED** (app routes; HTTP currently 500) |
| `/en/blog/[slug]`, `/ar/blog/[slug]` | **IMPLEMENTED** |
| Article / ArticleI18n | **IMPLEMENTED** |
| Counts | 45 published, 0 draft |
| Categories | plumbing, cleaning, ac, electrical, painting-walls, building-maintenance, home-maintenance, diy-safety, uae-local-guides |
| Pagination/search | **PARTIAL / likely minimal** (list page present; no dedicated search engine found in this pass) |
| SEO/AEO/GEO/images/EN+AR | **IMPLEMENTED** in content model; quality PASS on word/image gates for stored fields |

---

## 10–12. SEO / AEO / GEO (implementation, not rankings)

| Layer | Classification | Notes |
|-------|----------------|-------|
| Technical SEO | **PARTIAL** | Metadata builders, robots, sitemap shards; live HTTP 500 blocks proof |
| On-page SEO | **PARTIAL** | DIY/Blog strong; SL H1/directAnswer often empty in DB |
| Indexability | **PASS** (code) | Public filters: published+indexable; SL also covered |
| Sitemap | **PARTIAL** | Architecture PASS; live fetch 500 |
| Canonical / hreflang | **PARTIAL** | Implemented in page-resolve / metadata |
| Structured data | **PARTIAL** | JsonLd helpers for DIY/etc. |
| Internal linking | **PARTIAL** | Related slugs on Blog/DIY; public-only intent |
| Image SEO | **PARTIAL** | WebP+alt on public Blog/SL paths |
| **AEO** | **PARTIAL** | Blog FAQ 45/45; public SL `directAnswer` length>40 = **0/49** |
| **GEO** | **PARTIAL** | SL geo/localInfo markers 49/49; template/swap risk HIGH on SL uniqueness |

Do **not** claim search rankings, AI citations, or UAE-scale GEO performance.

---

## 13. Public routes (HTTP probe)

| Route | HTTP |
|-------|------|
| `/en` | **500** |
| `/en/blog` | **500** |
| `/en/diy` | **500** |
| `/en/get-a-quote` | **500** |
| `/admin` | **500** |
| `/sitemap/0.xml` | **500** |

Server appears up but **application errors** on request. Root cause not debugged in this read-only pass.

---

## 14. Security

| Check | Classification |
|-------|----------------|
| Draft DIY not in public catalog queries | **PASS** (code: published+indexable) |
| Uncovered SL not public | **PASS** (covered required) |
| Admin requires session | **PASS** (layout redirect) |
| Secrets in env (prod) | **FAIL / MISSING** for production readiness |
| Live proof drafts unreachable | **PARTIAL** (blocked by 500) |

Overall security implementation: **PARTIAL**.

---

## 15. Sitemap

| Item | Value |
|------|--------|
| Architecture | Next.js sitemap + **32** pair shards |
| Shard 0 | Static + services + emirates + DIY + Blog |
| Shards 1–31 | Public ServiceLocation pairs |
| Public DIY URLs (expected) | 45 × 2 locales |
| Public SL URLs (expected) | 49 × 2 locales |
| Blog URLs (expected) | 45 × 2 locales |
| Draft exclusion | By query filters |
| Live sitemap HTTP | **500** |

---

## 16. Production / deployment

| Item | Classification |
|------|----------------|
| Hosting | **MISSING** |
| Production domain | **MISSING** |
| HTTPS | **MISSING** |
| DNS | **MISSING** |
| Managed PostgreSQL | **MISSING** (local 5433) |
| DATABASE_URL | **PARTIAL** (local only) |
| Pooling | **PARTIAL** (local pgbouncer flags in example) |
| Backups / PITR | **MISSING** |
| Object storage | **MISSING** |
| CDN | **MISSING** |
| Monitoring / cron / secrets | **MISSING** / empty in `.env.example` prod section |
| Deployment target | **MISSING** |
| SITE_URL | **PARTIAL** (set, localhost) |

---

## 17. Test / build state

| Item | Status |
|------|--------|
| Content engine dry 1/10/100 | **Passed** (prior session) |
| Engine validator unit test | **Passed** (prior session) |
| Live site HTTP | **Failing (500)** |
| Prisma generate on Windows | **Known EPERM** when `next` locks query engine DLL |
| Production build | **Not verified in this pass** |
| TypeScript / full test suite | **Not re-run** (avoid rebuild per instructions) |

---

## 18. Blockers

### A. CODE BLOCKERS
1. **Local app HTTP 500** across homepage, DIY, Blog, quote, admin, sitemap.
2. Prisma **generate EPERM** risk under Windows + running Next.
3. Content Engine **generator stub** — cannot run real 1→10→100 generation yet.
4. Engine DB tables **empty**; validations not persisted.

### B. CONTENT BLOCKERS
1. Public SL **49/49 under 1,000 words** in stored fields.
2. Public SL **uniqueness severe** (42 exact dups, 637 blocking pairs at 0.85).
3. Public SL **AEO directAnswer empty** (0/49 by length heuristic).
4. Blog uniqueness audit doc still reports **2** blocking pairs (reconcile with live scan).
5. Only **7** services `active` while 311 offerings exist in matrix (catalog vs DB status gap).

### C. SAFETY BLOCKERS
1. **7 missing hubs** still need creation (not invented).
2. YELLOW/RED/RR DIY must not become public without policy (currently 45 GREEN public — OK).

### D. COVERAGE BLOCKERS
1. **63,351** uncovered SL — correctly private; must not invent coverage.
2. Publication of SL matrix remains gated by `ServiceLocation.covered`.

### E. INFRASTRUCTURE BLOCKERS
1. No production host/domain/HTTPS/managed DB/backups/CDN/monitoring.

### F. SEARCH / PERFORMANCE NOT-YET-PROVEN
1. No GSC / ranking / AEO citation / GEO visibility measurement.
2. Do not claim LIVE SEO/AEO/GEO performance.

---

## 19. Current project phase (ONE)

**CONTENT ENGINE BUILD**

Evidence: `content-engine/` foundation + dry tests exist; generator stub; engine tables empty; mass generation off; production not configured; public corpus frozen at 94 (+45 Blog); next work is completing the engine (schema/validators/worker) before controlled generation.

---

## 20. Recommended next phase (no changes made)

### Already complete
- DIY+SL corpus architecture totals (63,963 / 127,926)
- 49 covered public SL + 45 public GREEN DIY (=94)
- 45 Blog articles in DB
- 311 mapping docs + 304 primary links
- Content Engine folder + dry validators/gates
- Local media WebP set

### Partially complete
- Content Engine (stub generator, empty engine tables)
- SEO/AEO/GEO (code yes; SL AEO/word/uniqueness weak)
- Admin/security (code yes; live 500)
- Legacy ContentGenerationJob system

### Missing
- Real generator + persisted validation
- Production infrastructure
- Rendered-word counter against HTML
- Full uniqueness pipeline on SL
- Go-live measurement

### Should be done next
1. **Diagnose/fix local HTTP 500** (read-only root-cause then separate fix approval).
2. Complete Content Engine toward **live 1-article dry generation** (still no mass publish).
3. Keep freeze: no invent coverage, no mass publish, no safety downgrade.

### Should NOT be touched
- Mass generate 63,963
- Mass cover / invent `covered`
- Delete DIY records
- Rewrite grandfathered 94 solely for word floor without explicit approval
- Production deploy before engine + QA

---

## 21. Files created by this investigation

- `docs/latest-project-status.md` (this file)
- `docs/latest-project-status.json` (machine-readable twin)
