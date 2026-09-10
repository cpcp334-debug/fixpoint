# Live public QA final

Generated: 2026-09-10T08:19:02.757Z
Base: http://127.0.0.1:3000
Server healthy: yes (home 200)

## FINAL METRICS

1. Public articles: **94**
2. DIY public: **45**
3. SL public: **49**
4. EN >=1000 (DIY DB/render corpus): **45/45**
5. AR >=1000: **45/45**
6. Unique articles: high-similarity flags **0** @ 0.85
7. WebP coverage: **PASS (live sample + asset probe)**
8. Alt coverage: **PASS (live sample)**
9. Related-link health: **PASS** (invalid remaining 0, live bad 0)
10. SEO: TECHNICAL **PASS** · SEARCH PERFORMANCE **NOT YET PROVEN**
11. AEO: IMPLEMENTATION **PASS** · AT SCALE **NOT YET PROVEN**
12. GEO: IMPLEMENTATION **PASS** · AT SCALE **NOT YET PROVEN**
13. Sitemap: **PASS**
14. Security: **PASS**
15. Remaining drafts: DIY **518**, SL uncovered **63351**
16. Exact external blockers:
   - Real coverage not verified for 63,351 uncovered Service×Location pairs
   - YELLOW/RED/REVIEW_REQUIRED DIY remain gated
   - Search performance / rankings / AI citations not measured
   - GEO at UAE matrix scale not proven (only 49 public SL pages)
17. Exact next operational action: Keep SL pilot at 0 until real coverage decisions; optionally strengthen GF49 AEO/GEO copy quality without mass-publish; measure search only after intentional indexing window

## DIY
- Live sample locales: 24
- Live under 1000 (main text extract): 0
- Catalog EN/AR: 200/200

## Grandfathered 49
- HTTP locales checked: 98, fails: 0
- Deep tech fails: 0; AEO weak: 0; GEO weak: 0; image fails: 0
- Word-count exception: bodies not rewritten for 1000-word floor

## Security probes
- Draft DIY: {"slug":"how-to-touch-up-interior-paint","en":404,"ar":404}
- Uncovered SL: {"path":"/villa-cleaning/al-ain","en":404,"ar":404}
- Invalid slug: {"en":404,"ar":404}

## Notes
- None

## Browser spot-checks (cursor-ide-browser)
- `/en/diy/diy-bathroom-cleaning` — 200, H1 present, Quick answer/Safety/Steps/FAQ, CTA `/get-a-quote`, related service link, WebP `/media/topics/cleaning.webp` in HTML
- `/ar/diy/how-to-fix-dripping-faucet` — 200, RTL, Arabic H1, FAQ/CTA/related service, WebP `/media/topics/plumbing.webp` in HTML
- `/en/cleaning-services/abu-dhabi` — 200, title `Cleaning Services in Abu Dhabi | ALNAJAH ALDAEM`, Area context + Quick answers + local availability Q&A, CTA, WebP hero in HTML

## Sitemap architecture note
- Authoritative public sitemaps: `/sitemap/{0..31}.xml` (Next.js `generateSitemaps`)
- `/sitemap.xml` may abort on local `next dev`; not treated as a production defect when shards PASS
