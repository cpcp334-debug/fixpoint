# Blog — One Article Master Standard

Authoritative checklist for every Blog article (`/en/blog/{slug}` + `/ar/blog/{slug}`).

Shared public-article gates (SL + Blog + DIY floors, claims, lifecycle):  
→ **`docs/public-article-publication-gates.md`**

Corpus context (unchanged):

- TOTAL CONTENT: **63,963**
- TOTAL EN/AR VERSIONS: **127,926**
- Public Blog is a **gated** subset — content existing ≠ publishable

Quote CTA: `/get-a-quote`  
Uniqueness SoT: `SIMILARITY_THRESHOLD = 0.85` in `src/lib/service-location/content-similarity.ts`  
Safety: GREEN / YELLOW / RED / REVIEW_REQUIRED — never downgrade

**Word floor (Blog stays stricter than Service × Location):** Blog ≥ **1,000** EN and AR. SL fail-below is **800** (see shared gates doc).

## Identity

Every article needs: unique ID, content type `blog`, service/topic, location if applicable, EN + AR, canonical slug, publication status, safety class when DIY applies.

## Hard gates (any fail = DO NOT PUBLISH)

| Gate | Rule |
|------|------|
| EN words | ≥ 1,000 **rendered** (body + DIY + FAQ answers only) |
| AR words | ≥ 1,000 rendered |
| Uniqueness | exact dup = 0; blocking similarity @ 0.85 = 0 |
| Visitor use | decision-oriented, not SEO filler |
| DIY | useful self-help where applicable; respect safety |
| Image | relevant WebP under `/media/`, renders, localized alt EN+AR |
| SEO | unique title + meta; one H1; canonical; hreflang; robots |
| AEO | answer-first; clear Q headings; useful FAQs |
| GEO | truthful place/emirate context only — no fake branches/jobs/stats |
| Claims | no Best / #1 / Cheapest / Guaranteed / Certified / Licensed / 24/7 unless verified |
| Filler | no lexicon padding / repeated “extra field note” blocks |
| Links | only public DIY / active services / verified public SL / `/get-a-quote` |

## SEO title pattern (unique per slug)

`{Powerful word} {Service/Topic} in {Place}, {Emirate} | ALNAJAH ALDAEM`

Example: `Professional Socket Overheat Safety Guidance in Sharjah Homes, Sharjah | ALNAJAH ALDAEM`

Arabic: localized power + topic + place + emirate + `| النجاح الدائم`

Do **not** invent communities (e.g. Al Majaz) unless the article’s editorial GEO is actually about that community.

## Section contract

H1 → Intro/What is this → Applies? → Symptoms → Causes → DIY → What not to do → When to call → How service works → Expectations → Prep checklist → Local context → AEO direct answers → FAQs → Related → CTA `/get-a-quote`

## Code

- Spec + body/SEO builder: `src/lib/blog/article-standard.ts`
- Publish gates: `src/lib/blog/publication-gates.ts`
- Apply/remediate: `scripts/blog-apply-one-article-standard.ts`
- Report: `docs/blog-one-article-remediation-report.md`

## Browser accept

HTTP 200 → H1 → 1,000+ visible words → unique → DIY → image/WebP/alt → SEO/AEO/GEO → FAQ → links → CTA → canonical → hreflang → robots (AR: Arabic + RTL + localized meta/alt).
