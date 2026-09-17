# Public Article Publication Gates

Authoritative acceptance rules for ALNAJAH ALDAEM public longform.
**Generation ≠ publication.** Any hard fail → reject / do not publish.

Corpus context (unchanged): TOTAL CONTENT **63,963** → EN/AR **127,926**.
Only gated, covered, approved content may become public.

---

## Content-type word floors

| Type | Fail below | Acceptable | Target |
|------|------------|------------|--------|
| **Service × Location** | **&lt; 800** rendered | 800–1,200 | ~1,000–1,300 |
| **Blog** | **&lt; 1,000** rendered | ≥1,000 | 1,100–1,300 |
| **DIY (new public)** | **&lt; 1,000** rendered | ≥1,000 | 1,100–1,300 |

Count **only visitor-facing rendered body** (main + DIY allowed text + FAQ answers + AEO/GEO visible copy).
Do **not** count: nav, metadata, schema, hidden fields, image alt text.

Code SoT:

- SL floor: `RENDERED_WORD_MIN_PUBLISH = 800` in `src/lib/service-location/rendered-words.ts`
- Blog floor: `evaluateBlogPublicationGates` ≥1000 in `src/lib/blog/publication-gates.ts`
- Blog checklist: `docs/blog-one-article-standard.md`

---

## Hard reject matrix (any FAIL = reject)

| Gate | Rule |
|------|------|
| EN content | Independent EN body + H1/H2 structure + FAQ + CTA path |
| AR content | Independent AR (no English fallback) + RTL + AR meta/FAQ/CTA/alt |
| EN words | SL ≥800 / Blog ≥1000 rendered |
| AR words | Same floor as EN for that content type |
| Unique | No location-swap / synonym / template spam (similarity threshold 0.85) |
| H1 | Exactly one clear H1 |
| SEO title | Unique, brand-suffixed where applicable |
| Meta description | Unique, useful |
| Canonical | Correct per locale |
| Hreflang | Valid EN/AR pairing |
| AEO | Direct answers: what / problem / when pro / availability / next step |
| FAQ | Useful FAQs (not filler) |
| GEO | Real local context only — never fake branches/teams/jobs/stats |
| Safety | GREEN procedural DIY; YELLOW limited; RED / REVIEW_REQUIRED no dangerous procedures |
| Image | Relevant rendered image; WebP preferred for new publishes |
| Localized alt | EN + AR alt present and meaningful |
| Internal links | Public only — never draft / 404 / admin / unpublished DIY |
| CTA | Clear next step (e.g. Get a Quote) — no unsupported guarantees |
| Claims | No Best / #1 / Cheapest / Guaranteed / Certified / Licensed / 24/7 / Fastest / Most trusted unless verified |
| Coverage (SL) | `ServiceLocation.covered` is source of truth — never invent |

---

## Required article structure (service / location)

1. H1  
2. Introduction / answer-first summary  
3. What is the service?  
4. What problems does it solve?  
5. Common problems / situations  
6. Main causes  
7. Safe DIY / self-help (per safety class only)  
8. What NOT to do  
9. When professional help is needed  
10. How the service works  
11. What the customer should expect  
12. How to prepare before the visit  
13. Local / location-specific information (genuine GEO)  
14. FAQ  
15. Direct AEO answers  
16. Related services  
17. CTA / Get a Quote  

Blocks already distinguished in architecture: MAIN, AEO, GEO, DIY, FAQ, EXPERT.

---

## Lifecycle (intended)

```
DISCOVERED → QUEUED → GENERATING → GENERATED → VALIDATING → VALIDATED
→ READY_FOR_REVIEW → APPROVED → READY_TO_PUBLISH → PUBLISHED
```

App lifecycle enum for ServiceLocation coverage remains:
`draft → review → approved → published` (plus `archived`).
Promotion and publish are **manual / controlled** (`src/lib/service-location/publication-ops.ts`).
AI must never set `aiMayPublish`.

---

## Uniqueness

Do **not** create pages by only swapping:

- Dubai → Sharjah → Ajman  
- Cleaning → Deep Cleaning  

Avoid synonym swaps, paragraph/FAQ shuffling, copied intros/conclusions, location-name replacement as “uniqueness.”

---

## Implementation map

| Concern | Module |
|---------|--------|
| SL eligibility buckets | `src/lib/service-location/publication-eligibility.ts` |
| SL gate assemble | `src/lib/service-location/gates.ts` |
| SL quality / GEO / AEO / FAQ | `src/lib/service-location/content-quality.ts` |
| Claims | `src/lib/service-location/content-claims.ts` |
| Rendered words | `src/lib/service-location/rendered-words.ts` |
| Controlled publish | `src/lib/service-location/publication-ops.ts` |
| Blog gates | `src/lib/blog/publication-gates.ts` |
| Content Engine gate | `content-engine/config/publication-gate.ts` |

---

## Explicit non-goals of this document

- Does **not** authorize mass blog or SL generation  
- Does **not** invent coverage or expand ServiceLocation  
- Does **not** change sitemap indexing by itself  
