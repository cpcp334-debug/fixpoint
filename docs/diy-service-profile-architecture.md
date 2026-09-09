# Phase A1-DIY — Service-Specific DIY Knowledge Architecture

**Status:** Architecture + content-specification + audit only  
**Date:** 2026-09-09  
**Scope:** READ-ONLY design. No page generation, no Service×Location DIY duplication, no schema migration in this pass.  
**Canonical catalog source:** `prisma/data/catalog-a1.ts` + `prisma/data/services.ts` + `prisma/data/diy.ts`

---

## 0. Verdict

| Claim | Actual from A1 data |
|--------|---------------------|
| 18 parents + 293 children = **311 offerings** | **Confirmed** via `assertCatalogA1Counts()` |
| Every offering has a DIY profile | **No** — 0 dedicated DIY profiles; only 6 `DiyGuide` rows (2 published) |
| DIY is service-specific | **Partial** — guides link via optional `DiyGuide.serviceId`, but map only to **category-anchor** services, not to the 293 children |
| Location pages get unique DIY | **Must not** — inherit by `serviceId` / offering profile; never 200× copy |

**Honest count note:** `Service` table rows after A1 seed = **317** (293 approved children + 7 active anchors + 4 draft anchors + 13 unmapped legacy drafts). The business **311** = **18 `ServiceCategory` + 293 child `Service`**. Category-anchor `Service` rows are URL/booking carriers for parents; they are **not** an extra 18 DIY targets beyond the 18 parent definitions.

---

## 1. Existing systems (as-built)

### 1.1 Prisma models (relevant)

| Model | Role today | DIY relevance |
|--------|------------|---------------|
| `ServiceCategory` | 18 approved parents (+ 9 legacy orphan drafts) | Parent taxonomy; no DIY fields |
| `Service` | Offerings + anchors | `riskLevel` (`green`\|`yellow`\|`red`), `diyAvailable`, optional `diyGuides[]` |
| `ServiceI18n` | EN/AR service copy | Has `safetyNotes`, `whenProfessional` — **not** a full DIY profile |
| `DiyCategory` | DIY hub taxonomy | Separate from `ServiceCategory` (5 seeded; only plumbing + ac published) |
| `DiyGuide` | Publishable DIY article/HowTo | Optional `serviceId`; rich `DiyGuideI18n` fields; `ContentStatus`; `RiskLevel` |
| `KnowledgeDocument` | Internal SOP / Co-Founder knowledge | **Separate** — public AI explicitly must not load these (`phase-2g2-verify`) |
| `ServiceLocation` | Matrix row | No DIY fields — correct place to **inherit**, not store |

### 1.2 Enums

- `RiskLevel`: `green` | `yellow` | `red` — **no** `REVIEW_REQUIRED` in Prisma (A1 uses string flag in `schemaData.diyReview` / `arabicReview`).
- `ContentStatus`: `draft` | `review` | `published` | `archived`.
- `ServiceStatus`: includes `draft` / `active` (children are draft).

### 1.3 Public routes

| Route | Behavior |
|--------|----------|
| `/[locale]/diy` | Hub of published guides/categories |
| `/[locale]/diy/[slug]` | Category **or** guide (published + indexable only) |
| `/[locale]/[service]` | Lists linked guides if `diyAvailable && guides.length` |
| Sitemap | Published DIY categories + guides only |

Draft guides **404** publicly (by design).

### 1.4 Admin DIY

- `/admin/diy` list + `/admin/diy/[id]` minimal edit: status, EN title, quickAnswer, fallback, indexable.
- **No** create-guide UI, no AR editor, no steps/tools editor, no risk workflow, no per-service profile editor.
- Service admin can toggle `diyAvailable` only.

### 1.5 Public AI DIY

- Loads **published + indexable** guides only (`src/lib/ai/context.ts`).
- Safety gate strips DIY on `red` / hazard; allows only allowlisted guide slugs (`src/lib/ai/safety.ts`).
- HowTo JSON-LD only when `schemaType === "howto"` **and** `riskLevel === "green"` **and** ≥2 steps.

### 1.6 Co-Founder / KnowledgeDocument

- Internal SOP documents with audience/scope — **not** public DIY.
- Architecture rule: never merge SOP body into public DIY or AI DIY context.

---

## 2. Core architecture (target)

```
SERVICE DIY KNOWLEDGE (canonical per offering)
        │
        ├─► Public DiyGuide page(s)           [optional publish surface]
        ├─► Service page “DIY / self-help”    [inherit by serviceId]
        ├─► Service × Location pages          [inherit same profile; localize only CTA/geo chrome]
        └─► Public AI                         [published GREEN/YELLOW allowlist only]
```

**Hard rule:** One canonical DIY knowledge definition per approved offering. Location pages **reference** it; they do **not** store unique DIY prose.

### 2.1 Recommended model: extend `DiyGuide` + service gates — do **not** invent a parallel `DIYProfile` table first

| Brief “DIYProfile” concept | Map to existing |
|----------------------------|-----------------|
| Offering identity | `Service` (child) or category-level profile key |
| Safety class | `Service.riskLevel` + future `diyReviewStatus` (see §11) |
| `diyAvailable` | `Service.diyAvailable` (gate) |
| Title / problem / quick answer / tools / materials / safety / steps / check / when to stop / pro fallback / FAQ | `DiyGuide` + `DiyGuideI18n` (already present) |
| Related services | `relatedServiceSlugs` |
| Content lifecycle | `DiyGuide.status` (`draft`→`review`→`published`) |
| AEO direct answer | `DiyGuideI18n.quickAnswer` (+ optional dedicated `directAnswer` later if needed) |
| SEO title/meta | Existing i18n SEO fields |
| Images | Out of band; rules by safety (see §7) — **not** generated this phase |

**Why not a new `DiyProfile` table immediately:** `DiyGuide` already is the publishable knowledge object with almost all §2 content fields. A second system would duplicate admin, AI allowlists, sitemap, and votes/Q&A relations.

**When a thin binding on `Service` is still needed:**

- Enforce **exactly one primary guide per offering** (today `serviceId` is optional many-guides).
- Store **REVIEW_REQUIRED** safety review state without overloading `RiskLevel`.
- Attach DIY to the **18 parents** that lack a 1:1 child (category-level definition) without forcing fake child rows.

### 2.2 311 coverage mapping

| Offering class | Count | DIY definition attaches to |
|----------------|-------|----------------------------|
| Approved parent categories | 18 | Category-level DIY profile (prefer existing category-anchor `Service` when present; else `DiyCategory` + category guide) |
| Approved children | 293 | Child `Service` → primary `DiyGuide` (`serviceId`) |
| **Total DIY defs required** | **311** | |

**Category anchors today (11 of 18 parents):**

| Parent slug | Anchor `Service` | Status |
|-------------|------------------|--------|
| cleaning | `cleaning-services` | active |
| general-maintenance | `building-maintenance` | active |
| plumbing | `plumbing-maintenance` | active |
| electrical | `electrical-maintenance` | active |
| ac | `ac-maintenance` | active |
| painting | `painting-services` | active |
| walls | `wall-maintenance` | active |
| swimming-pool | `swimming-pool-maintenance` | draft |
| sauna | `sauna-maintenance` | draft |
| water-tank | `water-tank-cleaning` | draft |
| gym | `gym-cleaning-maintenance` | draft |
| refrigerator, microwave, washing-machine, water-heater, dishwasher, oven, burner-cooker | **none** | Need category DIY without inventing merge into legacy appliance drafts |

**Out of 311 scope (do not require A1 DIY profiles):** 13 `UNMAPPED_LEGACY_DRAFT_SLUGS` — leave unchanged until remapped.

### 2.3 Inheritance for Service × Location (future Phase B — not started)

```
ServiceLocation page DIY block =
  resolvePrimaryDiy(serviceId)
  + location chrome (name, local CTA, geo schema)
  − never copy steps/tools/safety into ServiceLocationI18n
```

`DiyGuide.locationSlugs` exists but should stay empty for canonical guides (local pages inherit; they do not own DIY).

---

## 3. Safety classification (§3)

### 3.1 Classes

| Class | Meaning | Publish steps? | AI may suggest guide? | HowTo schema? |
|-------|---------|----------------|------------------------|---------------|
| **GREEN** | Low-risk household / observation / cleaning when safe | Yes, after human review | Yes if published | Yes if ≥2 steps |
| **YELLOW** | Caution; limited steps or observation-only | Possible with strong stop rules | Only if published **and** gate allows | Prefer Article, not HowTo |
| **RED** | Hazardous / licensed / gas / live electrical / sealed systems | **No repair steps** — professional-only + when-to-stop + CTA | **Never** | Never |
| **REVIEW_REQUIRED** | Unknown — **do not invent** | Stay draft; no index; no AI | No | No |

`REVIEW_REQUIRED` is a **workflow state**, not currently in `RiskLevel`. Until migration: keep A1 pattern `schemaData.diyReview = "REVIEW_REQUIRED"` and treat unknown as non-publishable.

### 3.2 Non-negotiable RED families (content policy — classification still human-confirmed)

Do **not** invent step-by-step repair for:

- Live electrical work, wiring replacement, DB/breaker replacement, short-circuit “fixes”
- Gas leakage, gas hose/valve replacement, gas burner repair, sealed refrigerant / AC gas recharge
- Structural crack “repair”, demolition, roof/exterior high work
- Water heater electrical element work when live / pressurized unknown
- Microwave magnetron / high-voltage internals
- Confined-space / underground tank entry without professional protocol

For RED offerings, DIY knowledge = **diagnosis framing + stop conditions + book professional** only.

---

## 4. Content-spec templates by category (§4–§29)

Specify **what** each category’s DIY must include. Do **not** author full prose for all 311 here.

### Shared required sections (every non-RED profile)

1. **Direct answer (AEO)** — 2–4 sentences: can the customer try something / what / when to stop  
2. **Problem symptoms** — what the customer notices  
3. **Safety / prerequisites**  
4. **Tools & materials** (empty allowed if observation-only)  
5. **Steps** — only if GREEN/YELLOW and reviewed; empty for RED  
6. **Check your work**  
7. **When to stop / call professional**  
8. **Professional fallback CTA** (quote / book / inspect / WhatsApp — no invented price)  
9. **Common mistakes** (new field or FAQ cluster — not in schema yet; store as FAQ until migration)  
10. **EN + AR** — AR hazardous tech = `REVIEW_REQUIRED` until human translation (do not LLM-invent)  
11. **Status** — default `draft`; publish only after safety + AR gates

### Category templates

#### Cleaning (`cleaning` — 23 children + parent)

| Include | Notes |
|---------|--------|
| Scope (room type, frequency) | Match child name (villa vs office vs post-construction) |
| Chemical safety | Never mix bleach/acids/ammonia; ventilation |
| When DIY OK | Routine household surfaces |
| When pro | Mould large area, sewage, post-construction dust control, height, common areas |
| Image rules | Before/after OK for GREEN; no hazardous chemical demos |

#### General building maintenance (`general-maintenance` — 17)

| Include | Notes |
|---------|--------|
| Handyman vs specialist boundary | Locks/hardware vs civil/structural |
| Observation checklist | Property inspection DIY = observe/report only |
| RED-adjacent | Minor civil / common area — REVIEW_REQUIRED until classified |
| Always | Stop for structural, electrical, gas, height |

#### Plumbing (`plumbing` — 19)

| Include | Notes |
|---------|--------|
| Isolation first | If valve won’t close → stop |
| Fixture-level GREEN candidates | Dripping faucet (existing published guide pattern) |
| Drain | No chemical recipes until reviewed; wall/sewage = pro |
| Leak into wall / pressure | YELLOW/RED → professional |

#### Electrical (`electrical` — 17) — **default RED posture**

| Include | Notes |
|---------|--------|
| DIY allowed content | Power-off confirmation awareness, breaker trip **observation**, when to call |
| Forbidden | Socket/switch replacement steps, wiring, DB work, short-circuit repair steps |
| `diyAvailable` | Remain **false** until a specific GREEN observation guide is approved |
| AI | Must never suggest electrical DIY slugs for RED services |

#### AC (`ac` — 18)

| Include | Notes |
|---------|--------|
| GREEN pattern | User-accessible filter clean (existing published guide) |
| YELLOW | Drain observation, noise/cooling **diagnosis framing** without opening sealed systems |
| RED | Gas check/recharge, installation, electrical faults, refrigerant |
| Explicit | “Filter clean ≠ fix cooling/leak/ice” |

#### Painting (`painting` — 16)

| Include | Notes |
|---------|--------|
| GREEN/YELLOW | Small interior touch-up after review |
| Stop | Height, damp/mould, exterior, large area, unknown coatings |
| Draft stub exists | `how-to-touch-up-interior-paint` — no steps until review |

#### Walls (`walls` — 15)

| Include | Notes |
|---------|--------|
| Observation only for cracks | Measure/photo; no chase/fill structural |
| RED | Structural crack assessment, moisture/mold treatment methods until reviewed |
| Draft stub | `how-to-check-a-small-wall-crack` |

#### Swimming pool (`swimming-pool` — 15)

| Include | Notes |
|---------|--------|
| Possible GREEN | Skimming, surface vacuum if trained, visual inspection |
| YELLOW | Water testing / chemical balancing — **REVIEW_REQUIRED** (dose invention forbidden) |
| RED | Pump electrical, leak repair under structure, confined equipment rooms |

#### Sauna (`sauna` — 14)

| Include | Notes |
|---------|--------|
| Cleaning GREEN candidates | Bench/floor/glass with non-damaging products after review |
| RED | Heater electrical/gas, ventilation alterations |
| AR | Parent category AR is `REVIEW_REQUIRED` |

#### Water tank (`water-tank` — 16)

| Include | Notes |
|---------|--------|
| DIY | Exterior visual inspection, lid check — limited |
| RED | Confined space entry, disinfection chemistry doses, underground tank work |
| Note | Child `water-tank-cleaning-service` ≠ legacy anchor `water-tank-cleaning` |

#### Refrigerator / microwave / washing-machine / water-heater / dishwasher (appliance parents)

| Include | Notes |
|---------|--------|
| GREEN | Filter clean, door seal visual, level/vibration observation, unplug safety |
| YELLOW | Drain blockage observation |
| RED | Compressor, sealed system, magnetron/HV, live element replacement, control board “repair” steps |
| Content shape | Symptom → safe checks → stop → book appliance tech |

#### Gym (`gym` — 15)

| Include | Notes |
|---------|--------|
| Cleaning | Similar to cleaning template + equipment wipe sanitation |
| Equipment maintenance | Inspection/report; treadmill/bike internal repair = pro / REVIEW_REQUIRED |

#### Oven (`oven` — 15)

| Include | Notes |
|---------|--------|
| GREEN | Exterior/interior cleaning when cool, door seal visual |
| RED | Heating element live replacement, gas oven internals, electrical fault DIY |

#### Burner / cooker (`burner-cooker` — 19) — **default RED for gas**

| Include | Notes |
|---------|--------|
| Possible limited | Cool hob surface cleaning, knob cosmetic — after review |
| RED | Gas leak, hose/valve, flame adjustment, ignition gas path, any gas smell → evacuate/pro |
| Electric/induction | Separate from gas; still REVIEW_REQUIRED for repair steps |

---

## 5. AEO / SEO / GEO inheritance

| Layer | Source of truth | Location page adds |
|-------|-----------------|--------------------|
| **AEO direct answer** | `DiyGuideI18n.quickAnswer` (canonical) | Optional one-line geo wrapper (“in {location}”) — **not** a new DIY |
| **SEO title/meta** | Guide + service i18n | `ServiceLocationI18n` seo fields only |
| **GEO** | Service serving area + location record | Local NAP/CTA; DIY body unchanged |
| **FAQ** | Guide FAQ (+ service FAQ) | Location FAQ must not contradict DIY safety |

Publish gate: indexable DIY only when `status=published` **and** safety ≠ REVIEW_REQUIRED **and** AR verified for hazardous content.

---

## 6. EN / AR + human review gates

| Gate | Rule |
|------|------|
| Safety review | Human sets GREEN/YELLOW/RED; unknown stays REVIEW_REQUIRED |
| Arabic | Do not invent AR for hazardous tech; placeholder `REVIEW_REQUIRED` until translator/reviewer |
| Content status | `draft` → `review` → `published` (admin already has status enum) |
| Indexable | Only with published + gates passed |
| AI allowlist | Published guides only; RED services never get DIY suggestion |

A1 children already: `arabicReview` + `diyReview` = `REVIEW_REQUIRED` in `schemaData`; AR name = `REVIEW_REQUIRED`.

---

## 7. Image rules by safety (no generation this phase)

| Safety | Allowed imagery (future) |
|--------|---------------------------|
| GREEN | Tools layout, filter removal, before/after cleaning |
| YELLOW | Symptom photos, stop-condition illustrations — no risky action demos |
| RED | Professional CTA imagery only; **no** step photos that teach forbidden work |
| REVIEW_REQUIRED | No public images |

---

## 8. AI compatibility

Current path is compatible if canonical knowledge publishes as `DiyGuide`:

1. Seed/publish guide with `serviceId` = offering  
2. `status=published`, `indexable=true`, risk not red for suggestable DIY  
3. `loadAiContext` picks it up; `applySafetyGate` enforces allowlist + red strip  

**Gaps to close later:** AI catalog today only includes **active** services (7). Child offerings won’t be AI-routable until activation policy is defined — separate from DIY knowledge authoring.

---

## 9. Pipeline (§38) — DIY slice only

```
A1 catalog (done)
  → A1-DIY architecture (this doc)
  → Safety classification pass (human) per offering
  → Content authoring EN (templates) — DRAFT
  → AR review (hazardous = human)
  → Admin publish gates
  → Wire primary guide ↔ service
  → (Later) Service×Location inherit DIY
  → (Later) AI expand allowlist as services activate
```

**Do not** start A2 locations, A3 matrix, or SEO generation from this phase.

---

## 10. Quality checks (§39)

Before any DIY publish:

1. Safety class set (not REVIEW_REQUIRED)  
2. RED guides have **zero** repair steps  
3. GREEN HowTo has ≥2 real steps + isolation/stop language  
4. EN/AR parity or explicit AR REVIEW_REQUIRED blocking index  
5. No price invention; CTA to quote/book/inspect  
6. `serviceId` points at correct offering  
7. No duplicate near-identical guides for same child  
8. Electrical/gas/refrigerant forbidden patterns absent  
9. Sitemap only after publish+indexable  
10. AI regression: red service never returns `diySlug`

---

## 11. Proposed DIY model (concrete)

### 11.1 Prefer (Phase DIY-impl, future)

1. Keep `DiyGuide` / `DiyGuideI18n` as canonical **content** store.  
2. Add on `Service` (migration later):
   - `primaryDiyGuideId String? @unique` (or enforce in app layer)
   - `diyReviewStatus` enum: `review_required | classified` **or** continue JSON until enum approved
3. Extend `DiyGuideI18n` only if needed: `commonMistakes` JSON, `directAnswer` if split from `quickAnswer`.  
4. Align `DiyCategory.slug` with `ServiceCategory.slug` for the 18 parents (today DIY categories are a subset and independent).  
5. Category-level DIY for 7 appliance parents without anchors: create `DiyCategory` + one category hub guide **or** add draft category-anchor services in a later approved catalog change — **decision required** (see §15).

### 11.2 Reject for now

- Generating 293×200 DIY rows  
- Storing DIY in `ServiceLocationI18n`  
- Using `KnowledgeDocument` as public DIY  
- Inventing GREEN/YELLOW/RED at scale in code without human review  

---

## 12. §43 Audit report

### 12.1 Inventory — 311 offerings

| Bucket | Count | Source |
|--------|-------|--------|
| Approved parents (`APPROVED_CATEGORIES`) | **18** | `catalog-a1.ts` |
| Approved children (`APPROVED_CHILDREN`) | **293** | `catalog-a1.ts` |
| **Offerings** | **311** | parents + children |
| Legacy orphan categories | 9 | not in 311 |
| Unmapped legacy draft services | 13 | not in 311 DIY mandate |
| Total `Service` seed rows | **317** | 293 + 7 + 4 + 13 |

**Children per parent**

| Parent | Children |
|--------|----------|
| cleaning | 23 |
| general-maintenance | 17 |
| plumbing | 19 |
| electrical | 17 |
| ac | 18 |
| painting | 16 |
| walls | 15 |
| swimming-pool | 15 |
| sauna | 14 |
| water-tank | 16 |
| refrigerator | 15 |
| microwave | 13 |
| washing-machine | 16 |
| water-heater | 15 |
| dishwasher | 15 |
| gym | 15 |
| oven | 15 |
| burner-cooker | 19 |
| **Sum** | **293** |

### 12.2 DIY profile availability

| Metric | Count |
|--------|-------|
| Dedicated DIY profiles (new model) | **0** |
| Offerings with any linked guide via seed `serviceSlug` | **5 anchors** (see mappings) — not 311 |
| Approved children with DIY definition | **0 / 293** |
| Parent-level DIY definitions complete | **0 / 18** (partial stubs via 5 DIY categories / 6 guides only) |

**Summary:** **311 missing** full service-specific DIY definitions relative to the brief mandate.

### 12.3 Existing DIY guides (`prisma/data/diy.ts`)

| Slug | Category | Status | Risk | Steps | Linked service |
|------|----------|--------|------|-------|----------------|
| `how-to-fix-dripping-faucet` | plumbing | **published** | green | yes | `plumbing-maintenance` |
| `how-to-clean-ac-filter` | ac | **published** | green | yes | `ac-maintenance` |
| `how-to-touch-up-interior-paint` | painting | draft | yellow | none | `painting-services` |
| `how-to-check-a-small-wall-crack` | walls | draft | yellow | none | `wall-maintenance` |
| `how-to-clean-a-bathroom` | cleaning | draft | yellow | none | `cleaning-services` |
| `how-to-unclog-a-sink-safely` | plumbing | draft | yellow | none | `plumbing-maintenance` |

**DiyCategory seed:** plumbing, ac (**published**); painting, walls, cleaning (**draft**). Missing DIY categories for 13 of 18 service parents.

### 12.4 Service → guide mappings

| Service slug | Guides |
|--------------|--------|
| `plumbing-maintenance` | faucet (pub), unclog (draft) |
| `ac-maintenance` | filter (pub) |
| `painting-services` | touch-up (draft) |
| `wall-maintenance` | crack check (draft) |
| `cleaning-services` | bathroom (draft) |
| All other anchors + all 293 children | **none** |

Note: multiple guides can share one service today (plumbing has 2) — future primary-guide rule needed.

### 12.5 Services missing DIY definitions

- **All 293** approved children (`diyAvailable=false`, `diyReview=REVIEW_REQUIRED`)  
- **All 18** parents as formal profiles (only incidental stubs on 5 anchors)  
- Draft anchors without guides: pool, water-tank, sauna, gym  
- Active without guide: `building-maintenance`, `electrical-maintenance`  

### 12.6 Existing risk levels (seed)

| Population | green | yellow | red |
|------------|-------|--------|-----|
| 7 active anchors | cleaning, painting | building, plumbing, ac, walls | **electrical** |
| 4 draft anchors | — | pool, water-tank, sauna, gym | — |
| 13 unmapped legacy | — | most | waterproofing, roof-exterior, emergency, demolition, oven-cooker |
| **293 children** | **0** | **293** (conservative default) | **0** |

Guide risks: 2 green published, 4 yellow draft.

### 12.7 Existing DIY flags (`diyAvailable`)

| Population | true | false |
|------------|------|-------|
| Active anchors | cleaning, building, plumbing, ac, painting, walls | **electrical** |
| Draft anchors | 0 | 4 |
| Unmapped legacy | carpentry, flooring, bath, kitchen, doors | rest |
| **293 children** | **0** | **293** |

### 12.8 Services requiring safety review

- **293 children** — `schemaData.diyReview = REVIEW_REQUIRED`  
- All draft DIY guides (4)  
- All offerings in electrical, burner-cooker gas path, AC gas, structural walls, tank confined space, appliance sealed systems — even after first pass, prefer human RED confirmation  
- Do **not** auto-promote child `yellow` defaults to publishable DIY

### 12.9 Services requiring Arabic review

- **293 children** — AR copy + `arabicReview = REVIEW_REQUIRED`  
- **11 categories** with `nameAr = REVIEW_REQUIRED` (pool, sauna, water-tank, fridge, microwave, washer, heater, dishwasher, gym, oven, burner-cooker)  
- Hazardous DIY AR for any future RED/YELLOW technical content  
- Existing published guides already have AR — still subject to safety re-review if expanded

### 12.10 Duplicate DIY content

| Issue | Detail |
|-------|--------|
| Near-duplicate risk | Parent anchor DIY vs child DIY (e.g. bathroom cleaning child vs `how-to-clean-a-bathroom`) — must differentiate or link primary |
| Plumbing | Two guides on same service — OK if distinct problems; need primary designation |
| Legacy vs child | `water-tank-cleaning` (anchor) vs `water-tank-cleaning-service` (child) — DIY must not conflate slugs |
| Cross-system | `ServiceI18n.safetyNotes` vs guide `safety` — keep guide as DIY SoT; service safety = short marketing/safety blurb |

No duplicated full DIY bodies across 293 children yet (none exist).

### 12.11 Proposed DIY model

See **§11** — extend `DiyGuide` + service binding; workflow status for REVIEW_REQUIRED; inherit on locations; keep `KnowledgeDocument` separate.

### 12.12 Exact files to change (future implement — not done now)

| File | Change |
|------|--------|
| `prisma/schema.prisma` | Optional: `primaryDiyGuideId`, `diyReviewStatus`; DiyCategory alignment; i18n fields |
| `prisma/migrations/*` | Future migration only |
| `prisma/data/diy.ts` | Scale guides / category seeds |
| `prisma/data/services.ts` / `catalog-a1.ts` | Flags after human classification (not invented) |
| `prisma/seed.ts` | Wire primary guides |
| `scripts/phase-a1-catalog-verify.ts` or new `phase-a1-diy-verify.ts` | DIY coverage asserts |
| `src/lib/catalog.ts` | Resolve primary DIY; inheritance helpers |
| `src/app/[locale]/[service]/page.tsx` | Render profile by offering |
| `src/app/[locale]/diy/**` | Category coverage for 18 parents |
| `src/app/admin/diy/**` | Full editor (EN/AR, steps, risk, gates) |
| `src/app/admin/services/[id]/page.tsx` | Link primary DIY + review status |
| `src/lib/ai/context.ts` / `safety.ts` | Respect primary + REVIEW_REQUIRED |
| `src/app/sitemap.ts` | Only after deliberate publish (no 62k URLs) |
| Future Service×Location templates | Inherit DIY reference only |

### 12.13 Migration requirements (future)

1. Additive columns preferred (non-breaking).  
2. Backfill: set `primaryDiyGuideId` for 5 existing linked guides.  
3. Do not delete draft guides.  
4. Do not change `RiskLevel` enum until product approves `review_required` vs separate field (recommend **separate field**).  
5. No data migration for 62,200 locations.

### 12.14 Verification strategy (future)

1. Script: count DIY defs ≥ 311 keys (18 parent + 293 child), status distribution.  
2. Assert no published RED repair steps (`steps` empty or observation-only policy).  
3. Assert children remain `diyAvailable=false` until classified.  
4. Assert AI allowlist ⊆ published guides; electrical active service never returns diy.  
5. Assert ServiceLocation rows do not contain DIY step JSON.  
6. Snapshot: published guide count, indexable count, AR REVIEW_REQUIRED count.  
7. Regression: existing 2 published guides still resolve; seed-safety / quote-FK unchanged.

---

## 13. Admin future (§40)

Minimal → target (implement later):

- Create/edit guide with all i18n sections  
- Bind **one primary** service offering (+ related)  
- Set safety class + REVIEW_REQUIRED workflow  
- Preview EN/AR; block publish if gates fail  
- Diff / audit log (reuse `adminAudit`)  
- Bulk “mark needs safety review” for category  

Do **not** build full Admin UI in A1-DIY architecture pass.

---

## 14. Prerequisites before DIY content authoring / schema implement

1. **Approve this architecture** (especially: reuse `DiyGuide` vs new table; how to cover 7 parents without anchors).  
2. **Human safety classification pass** (at least per-category defaults + exception list) — code must not invent.  
3. **AR translation process** for hazardous content.  
4. **Primary-guide cardinality rule** approved.  
5. Optional: finish A2 location **master list** in parallel — **not** required to author service DIY knowledge.  
6. Explicit **go** for schema migration phase (separate from authoring).  
7. Stay stopped on: A3 matrix, 62,200 pages, images, sitemap expansion, Phase B.

---

## 15. Open decisions (block schema/content implement)

1. **Parent DIY without Service anchor (7 appliance categories):** create draft category-anchor services, or DiyCategory-only hubs?  
2. **Cardinality:** one primary guide per child always, or allow multiple problem-specific guides with one primary?  
3. **REVIEW_REQUIRED storage:** new Prisma enum field vs continue `schemaData` until classified?  
4. **Should category-anchor DIY count toward the 18 parent defs** while children get separate defs (recommended: **yes**)?  
5. **Activation vs DIY authoring:** may DIY stay draft forever on inactive children, or only author after activation?

---

## 16. Stop line

This document completes **Phase A1-DIY architecture + audit**.  

**Not started:** A2 location catalog wiring, A3 matrix, page/SEO/AEO generation, image generation, DIY prose for 311, schema migration, Admin redesign.
