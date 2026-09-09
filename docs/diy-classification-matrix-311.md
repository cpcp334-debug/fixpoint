# DIY Classification Matrix — 311 offerings

> Classification worksheet only. No DIY articles authored. No schema/seed/app changes.
> Sources: `prisma/data/catalog-a1.ts`, `prisma/data/diy.ts`, `docs/diy-service-profile-architecture.md`
> Machine-readable: `docs/diy-classification-matrix-311.json`
> Generated: 2026-09-09 · Catalog assert: parents=18, children=293, offerings=311

## Legend

| Field | Values |
|-------|--------|
| DIY Status | GREEN \| YELLOW \| RED \| REVIEW_REQUIRED |
| Risk Level | green \| yellow \| red \| review_required (workflow; Prisma enum is green\|yellow\|red) |
| DIY Guidance Type | step-by-step \| limited-troubleshooting \| safety-only \| professional-recommended \| review-required |
| Safety / Arabic Review | required \| review-required \| optional \| not-required |
| Professional Fallback | required \| optional |

## Existing DiyGuide → offering map (6 rows)

| Guide slug | Service (seed) | Status | Can be primary? | Mapped offerings (sample) |
|------------|----------------|--------|-----------------|---------------------------|
| `how-to-fix-dripping-faucet` | `plumbing-maintenance` | published | yes | 3: `plumbing-maintenance`, `faucet-repair`, `faucet-replacement` |
| `how-to-clean-ac-filter` | `ac-maintenance` | published | yes | 6: `ac-maintenance`, `ac-servicing`, `ac-cleaning`, `ac-filter-cleaning`, `split-ac-maintenance`, `ac-preventive-maintenance` |
| `how-to-touch-up-interior-paint` | `painting-services` | draft | yes | 9: `painting-services`, `interior-painting`, `residential-painting`, `apartment-painting`, `wall-painting`, `door-painting`, `wood-painting`, `repainting`, `touch-up-painting` |
| `how-to-check-a-small-wall-crack` | `wall-maintenance` | draft | yes | 3: `wall-maintenance`, `wall-inspection`, `wall-crack-repair` |
| `how-to-clean-a-bathroom` | `cleaning-services` | draft | yes | 2: `cleaning-services`, `bathroom-cleaning` |
| `how-to-unclog-a-sink-safely` | `plumbing-maintenance` | draft | yes | 4: `drain-cleaning`, `drain-blockage-removal`, `sink-repair`, `floor-drain-repair` |

### Guide mapping detail

| Guide slug | → service | published/draft | can be primary? |
|------------|-----------|-----------------|-----------------|
| `how-to-fix-dripping-faucet` | `plumbing-maintenance` | published | yes |
| `how-to-clean-ac-filter` | `ac-maintenance` | published | yes |
| `how-to-touch-up-interior-paint` | `painting-services` | draft | yes |
| `how-to-check-a-small-wall-crack` | `wall-maintenance` | draft | yes |
| `how-to-clean-a-bathroom` | `cleaning-services` | draft | yes |
| `how-to-unclog-a-sink-safely` | `plumbing-maintenance` | draft | yes |

## Final counts

| Metric | Count |
|--------|------:|
| Parent categories | 18 |
| Child offerings | 293 |
| **Total** | **311** |
| GREEN | 46 |
| YELLOW | 128 |
| RED | 112 |
| REVIEW_REQUIRED | 25 |
| Existing guides mapped (rows with a seed guide) | 27 |
| New guides required (primary TBD) | 284 |
| Safety review required | 311 |
| Arabic review required | 243 |
| Arabic review = review-required (workflow) | 68 |
| Ambiguous services | 26 |

## Ambiguous / REVIEW_REQUIRED offerings

| # | Parent Category | Service Offering | DIY Status | Reason |
|---|-----------------|------------------|------------|--------|
| 1 | Cleaning Services | Cleaning Services | GREEN | Cleaning practical posture; existing bathroom draft is related — may need broader hub |
| 51 | General Building Maintenance | Common Area Maintenance | REVIEW_REQUIRED | RED-adjacent civil/common-area — insufficient to invent class |
| 56 | General Building Maintenance | Fixture Replacement | REVIEW_REQUIRED | RED-adjacent civil/common-area — insufficient to invent class |
| 57 | General Building Maintenance | Minor Civil Maintenance | REVIEW_REQUIRED | RED-adjacent civil/common-area — insufficient to invent class |
| 148 | Swimming Pool Cleaning & Maintenance | Pool Water Testing | REVIEW_REQUIRED | Chemistry/filter dosing or method insufficient without human review |
| 149 | Swimming Pool Cleaning & Maintenance | Pool Chemical Balancing | REVIEW_REQUIRED | Hazardous chemical dosing — do not invent doses; human safety+AR review |
| 150 | Swimming Pool Cleaning & Maintenance | Pool Filter Cleaning | REVIEW_REQUIRED | Chemistry/filter dosing or method insufficient without human review |
| 151 | Swimming Pool Cleaning & Maintenance | Pool Filter Maintenance | REVIEW_REQUIRED | Chemistry/filter dosing or method insufficient without human review |
| 155 | Swimming Pool Cleaning & Maintenance | Pool Drain Cleaning | REVIEW_REQUIRED | Chemistry/filter dosing or method insufficient without human review |
| 162 | Sauna Room Cleaning & Maintenance | Sauna Disinfection | REVIEW_REQUIRED | Disinfection chemistry — no invented doses |
| 171 | Sauna Room Cleaning & Maintenance | Sauna Wood Treatment | REVIEW_REQUIRED | Treatment method needs human review |
| 172 | Sauna Room Cleaning & Maintenance | Sauna Equipment Inspection | REVIEW_REQUIRED | Treatment method needs human review |
| 175 | Water Tank Cleaning & Maintenance | Water Tank Disinfection | REVIEW_REQUIRED | Hazardous chemical dosing — do not invent doses; human safety+AR review |
| 176 | Water Tank Cleaning & Maintenance | Water Tank Sanitization | REVIEW_REQUIRED | Hazardous chemical dosing — do not invent doses; human safety+AR review |
| 208 | Microwave Maintenance / Repair | Microwave Turntable Problem | REVIEW_REQUIRED | May be cosmetic or interlock-related — human confirm (HV risk) |
| 209 | Microwave Maintenance / Repair | Microwave Door Problem | REVIEW_REQUIRED | May be cosmetic or interlock-related — human confirm (HV risk) |
| 268 | Gym Cleaning & Maintenance | Gym Sanitization | REVIEW_REQUIRED | Chemical protocol — REVIEW_REQUIRED |
| 269 | Gym Cleaning & Maintenance | Gym Disinfection | REVIEW_REQUIRED | Chemical protocol — REVIEW_REQUIRED |
| 272 | Gym Cleaning & Maintenance | Fitness Equipment Inspection | REVIEW_REQUIRED | Fitness equipment internals — inspection/report only until human class |
| 273 | Gym Cleaning & Maintenance | Treadmill Maintenance | REVIEW_REQUIRED | Fitness equipment internals — inspection/report only until human class |
| 274 | Gym Cleaning & Maintenance | Exercise Bike Maintenance | REVIEW_REQUIRED | Fitness equipment internals — inspection/report only until human class |
| 275 | Gym Cleaning & Maintenance | Cross-Trainer Maintenance | REVIEW_REQUIRED | Fitness equipment internals — inspection/report only until human class |
| 276 | Gym Cleaning & Maintenance | Weight Equipment Maintenance | REVIEW_REQUIRED | Fitness equipment internals — inspection/report only until human class |
| 277 | Gym Cleaning & Maintenance | Preventive Gym Maintenance | REVIEW_REQUIRED | Fitness equipment internals — inspection/report only until human class |
| 310 | Burner / Cooker Maintenance / Repair | Electric Cooker Repair | REVIEW_REQUIRED | Electric/induction repair steps — REVIEW_REQUIRED (not gas RED but still hazardous) |
| 311 | Burner / Cooker Maintenance / Repair | Induction Cooker Inspection | REVIEW_REQUIRED | Electric/induction repair steps — REVIEW_REQUIRED (not gas RED but still hazardous) |

## Full matrix (311 rows)

| # | Parent Category | Service Offering | DIY Status | Risk Level | DIY Guidance Type | Existing Guide | Existing Guide Status | Primary Guide Recommendation | Safety Review | Arabic Review | Professional Fallback | Reason |
|---:|-----------------|------------------|------------|------------|-------------------|----------------|----------------------|------------------------------|---------------|---------------|----------------------|--------|
| 1 | Cleaning Services | Cleaning Services *(parent)* | GREEN | green | step-by-step | `how-to-clean-a-bathroom` | draft | `how-to-clean-a-bathroom` | required | review-required | optional | Cleaning practical posture; existing bathroom draft is related — may need broader hub |
| 2 | General Building Maintenance | General Building Maintenance *(parent)* | YELLOW | yellow | limited-troubleshooting | — | none | TBD | required | review-required | required | Handyman hub — observation + stop for structural/electrical/gas/height |
| 3 | Plumbing Maintenance | Plumbing Maintenance *(parent)* | YELLOW | yellow | limited-troubleshooting | `how-to-fix-dripping-faucet` | published | `how-to-fix-dripping-faucet` | required | review-required | required | Parent hub; primary published faucet guide; unclog is related |
| 4 | Electrical Maintenance | Electrical Maintenance *(parent)* | RED | red | safety-only | — | none | TBD | required | required | required | Electrical default RED posture — observation/stop/CTA only |
| 5 | AC / Air Conditioning Maintenance | AC / Air Conditioning Maintenance *(parent)* | YELLOW | yellow | limited-troubleshooting | `how-to-clean-ac-filter` | published | `how-to-clean-ac-filter` | required | review-required | required | AC hub; primary published filter guide; refrigerant/electrical remain RED children |
| 6 | Painting Services | Painting Services *(parent)* | YELLOW | yellow | limited-troubleshooting | `how-to-touch-up-interior-paint` | draft | `how-to-touch-up-interior-paint` | required | review-required | required | Painting hub; draft touch-up guide as primary candidate |
| 7 | Wall Maintenance & Repair | Wall Maintenance & Repair *(parent)* | YELLOW | yellow | limited-troubleshooting | `how-to-check-a-small-wall-crack` | draft | `how-to-check-a-small-wall-crack` | required | review-required | required | Walls hub; draft crack-check observation guide |
| 8 | Swimming Pool Cleaning & Maintenance | Swimming Pool Cleaning & Maintenance *(parent)* | YELLOW | yellow | limited-troubleshooting | — | none | TBD | required | required | required | Pool hub — skimming/visual OK candidates; chemicals/equipment electrical RED/RR |
| 9 | Sauna Room Cleaning & Maintenance | Sauna Room Cleaning & Maintenance *(parent)* | YELLOW | yellow | limited-troubleshooting | — | none | TBD | required | required | required | Sauna hub — cleaning GREEN candidates; heater electrical/gas RED |
| 10 | Water Tank Cleaning & Maintenance | Water Tank Cleaning & Maintenance *(parent)* | YELLOW | yellow | safety-only | — | none | TBD | required | required | required | Tank hub — exterior visual only; confined/chem RED/RR |
| 11 | Refrigerator Maintenance / Repair | Refrigerator Maintenance / Repair *(parent)* | YELLOW | yellow | limited-troubleshooting | — | none | TBD | required | required | required | Appliance hub — filter/seal/cleaning GREEN; compressor RED |
| 12 | Microwave Maintenance / Repair | Microwave Maintenance / Repair *(parent)* | YELLOW | yellow | safety-only | — | none | TBD | required | required | required | Microwave hub — cleaning GREEN; HV internals RED |
| 13 | Washing Machine Maintenance / Repair | Washing Machine Maintenance / Repair *(parent)* | YELLOW | yellow | limited-troubleshooting | — | none | TBD | required | required | required | Washer hub — filter clean GREEN; motor/board RED |
| 14 | Water Heater Maintenance / Repair | Water Heater Maintenance / Repair *(parent)* | YELLOW | yellow | safety-only | — | none | TBD | required | required | required | Heater hub — cleaning/observation limited; element/electrical RED |
| 15 | Dishwasher Maintenance / Repair | Dishwasher Maintenance / Repair *(parent)* | YELLOW | yellow | limited-troubleshooting | — | none | TBD | required | required | required | Dishwasher hub — filter/spray-arm GREEN; pump/heating RED |
| 16 | Gym Cleaning & Maintenance | Gym Cleaning & Maintenance *(parent)* | YELLOW | yellow | limited-troubleshooting | — | none | TBD | required | required | required | Gym hub — cleaning practical; equipment internals RR |
| 17 | Oven Maintenance / Repair | Oven Maintenance / Repair *(parent)* | YELLOW | yellow | limited-troubleshooting | — | none | TBD | required | required | required | Oven hub — cool cleaning GREEN; element/gas RED |
| 18 | Burner / Cooker Maintenance / Repair | Burner / Cooker Maintenance / Repair *(parent)* | RED | red | professional-recommended | — | none | TBD | required | required | required | Burner/cooker default RED for gas; cleaning children may be YELLOW |
| 19 | Cleaning Services | Residential Cleaning | GREEN | green | step-by-step | — | none | TBD | required | review-required | optional | Routine surface cleaning — GREEN candidate after human safety review |
| 20 | Cleaning Services | Apartment Cleaning | GREEN | green | step-by-step | — | none | TBD | required | review-required | optional | Routine surface cleaning — GREEN candidate after human safety review |
| 21 | Cleaning Services | Villa Cleaning | GREEN | green | step-by-step | — | none | TBD | required | review-required | optional | Routine surface cleaning — GREEN candidate after human safety review |
| 22 | Cleaning Services | House Cleaning | GREEN | green | step-by-step | — | none | TBD | required | review-required | optional | Routine surface cleaning — GREEN candidate after human safety review |
| 23 | Cleaning Services | Office Cleaning | GREEN | green | step-by-step | — | none | TBD | required | review-required | optional | Routine surface cleaning — GREEN candidate after human safety review |
| 24 | Cleaning Services | Commercial Cleaning | GREEN | green | step-by-step | — | none | TBD | required | review-required | optional | Routine surface cleaning — GREEN candidate after human safety review |
| 25 | Cleaning Services | Building Common Area Cleaning | YELLOW | yellow | limited-troubleshooting | — | none | TBD | required | review-required | required | Specialist cleaning / dust / textiles — limited DIY; chemical safety review |
| 26 | Cleaning Services | Deep Cleaning | YELLOW | yellow | step-by-step | — | none | TBD | required | review-required | required | Practical cleaning with chemical/ventilation caution |
| 27 | Cleaning Services | One-Time Cleaning | GREEN | green | step-by-step | — | none | TBD | required | review-required | optional | Routine surface cleaning — GREEN candidate after human safety review |
| 28 | Cleaning Services | Regular Cleaning | GREEN | green | step-by-step | — | none | TBD | required | review-required | optional | Routine surface cleaning — GREEN candidate after human safety review |
| 29 | Cleaning Services | Recurring Cleaning | GREEN | green | step-by-step | — | none | TBD | required | review-required | optional | Routine surface cleaning — GREEN candidate after human safety review |
| 30 | Cleaning Services | Move-In Cleaning | GREEN | green | step-by-step | — | none | TBD | required | review-required | optional | Routine surface cleaning — GREEN candidate after human safety review |
| 31 | Cleaning Services | Move-Out Cleaning | GREEN | green | step-by-step | — | none | TBD | required | review-required | optional | Routine surface cleaning — GREEN candidate after human safety review |
| 32 | Cleaning Services | Post-Construction Cleaning | YELLOW | yellow | limited-troubleshooting | — | none | TBD | required | review-required | required | Specialist cleaning / dust / textiles — limited DIY; chemical safety review |
| 33 | Cleaning Services | Post-Renovation Cleaning | YELLOW | yellow | limited-troubleshooting | — | none | TBD | required | review-required | required | Specialist cleaning / dust / textiles — limited DIY; chemical safety review |
| 34 | Cleaning Services | Kitchen Cleaning | YELLOW | yellow | step-by-step | — | none | TBD | required | review-required | required | Practical cleaning with chemical/ventilation caution |
| 35 | Cleaning Services | Bathroom Cleaning | GREEN | green | step-by-step | `how-to-clean-a-bathroom` | draft | `how-to-clean-a-bathroom` | required | review-required | optional | Maps to existing bathroom cleaning draft guide |
| 36 | Cleaning Services | Floor Cleaning | GREEN | green | step-by-step | — | none | TBD | required | review-required | optional | Routine surface cleaning — GREEN candidate after human safety review |
| 37 | Cleaning Services | Window Cleaning | YELLOW | yellow | safety-only | — | none | TBD | required | review-required | required | Height/glass risk — household glass OK after review; high exterior = pro |
| 38 | Cleaning Services | Glass Cleaning | YELLOW | yellow | safety-only | — | none | TBD | required | review-required | required | Height/glass risk — household glass OK after review; high exterior = pro |
| 39 | Cleaning Services | Carpet Cleaning | YELLOW | yellow | limited-troubleshooting | — | none | TBD | required | review-required | required | Specialist cleaning / dust / textiles — limited DIY; chemical safety review |
| 40 | Cleaning Services | Sofa & Upholstery Cleaning | YELLOW | yellow | limited-troubleshooting | — | none | TBD | required | review-required | required | Specialist cleaning / dust / textiles — limited DIY; chemical safety review |
| 41 | Cleaning Services | Mattress Cleaning | YELLOW | yellow | limited-troubleshooting | — | none | TBD | required | review-required | required | Specialist cleaning / dust / textiles — limited DIY; chemical safety review |
| 42 | General Building Maintenance | Residential Building Maintenance | YELLOW | yellow | limited-troubleshooting | — | none | TBD | required | review-required | required | Building maintenance — caution; stop for specialist trades |
| 43 | General Building Maintenance | Commercial Building Maintenance | YELLOW | yellow | limited-troubleshooting | — | none | TBD | required | review-required | required | Building maintenance — caution; stop for specialist trades |
| 44 | General Building Maintenance | Villa Maintenance | YELLOW | yellow | limited-troubleshooting | — | none | TBD | required | review-required | required | Building maintenance — caution; stop for specialist trades |
| 45 | General Building Maintenance | Apartment Maintenance | YELLOW | yellow | limited-troubleshooting | — | none | TBD | required | review-required | required | Building maintenance — caution; stop for specialist trades |
| 46 | General Building Maintenance | Preventive Building Maintenance | YELLOW | yellow | limited-troubleshooting | — | none | TBD | required | review-required | required | Building maintenance — caution; stop for specialist trades |
| 47 | General Building Maintenance | Corrective Building Maintenance | YELLOW | yellow | limited-troubleshooting | — | none | TBD | required | review-required | required | Building maintenance — caution; stop for specialist trades |
| 48 | General Building Maintenance | General Handyman Service | YELLOW | yellow | limited-troubleshooting | — | none | TBD | required | review-required | required | Building maintenance — caution; stop for specialist trades |
| 49 | General Building Maintenance | Property Inspection | GREEN | green | limited-troubleshooting | — | none | TBD | required | review-required | optional | Observation/report checklist only |
| 50 | General Building Maintenance | Minor Building Repairs | YELLOW | yellow | limited-troubleshooting | — | none | TBD | required | review-required | required | Building maintenance — caution; stop for specialist trades |
| 51 | General Building Maintenance | Common Area Maintenance | REVIEW_REQUIRED | review_required | review-required | — | none | TBD | required | required | required | RED-adjacent civil/common-area — insufficient to invent class |
| 52 | General Building Maintenance | Door Repair & Adjustment | YELLOW | yellow | limited-troubleshooting | — | none | TBD | required | review-required | required | Fixture/hardware — limited DIY after review |
| 53 | General Building Maintenance | Door Hardware Replacement | YELLOW | yellow | limited-troubleshooting | — | none | TBD | required | review-required | required | Fixture/hardware — limited DIY after review |
| 54 | General Building Maintenance | Lock Repair & Replacement | YELLOW | yellow | limited-troubleshooting | — | none | TBD | required | review-required | required | Fixture/hardware — limited DIY after review |
| 55 | General Building Maintenance | Cabinet & Hardware Repair | YELLOW | yellow | limited-troubleshooting | — | none | TBD | required | review-required | required | Fixture/hardware — limited DIY after review |
| 56 | General Building Maintenance | Fixture Replacement | REVIEW_REQUIRED | review_required | review-required | — | none | TBD | required | required | required | RED-adjacent civil/common-area — insufficient to invent class |
| 57 | General Building Maintenance | Minor Civil Maintenance | REVIEW_REQUIRED | review_required | review-required | — | none | TBD | required | required | required | RED-adjacent civil/common-area — insufficient to invent class |
| 58 | General Building Maintenance | General Property Repair | YELLOW | yellow | limited-troubleshooting | — | none | TBD | required | review-required | required | Building maintenance — caution; stop for specialist trades |
| 59 | Plumbing Maintenance | Plumbing Inspection | YELLOW | yellow | limited-troubleshooting | — | none | TBD | required | required | required | Diagnosis/observation — stop if wall/ceiling wet |
| 60 | Plumbing Maintenance | Water Leakage Detection | YELLOW | yellow | limited-troubleshooting | — | none | TBD | required | required | required | Diagnosis/observation — stop if wall/ceiling wet |
| 61 | Plumbing Maintenance | Water Leakage Repair | RED | red | professional-recommended | — | none | TBD | required | required | required | In-wall / pressurized / installation plumbing — professional |
| 62 | Plumbing Maintenance | Pipe Repair | RED | red | professional-recommended | — | none | TBD | required | required | required | In-wall / pressurized / installation plumbing — professional |
| 63 | Plumbing Maintenance | Pipe Replacement | RED | red | professional-recommended | — | none | TBD | required | required | required | In-wall / pressurized / installation plumbing — professional |
| 64 | Plumbing Maintenance | Water Supply Line Repair | RED | red | professional-recommended | — | none | TBD | required | required | required | In-wall / pressurized / installation plumbing — professional |
| 65 | Plumbing Maintenance | Drain Cleaning | YELLOW | yellow | limited-troubleshooting | `how-to-unclog-a-sink-safely` | draft | `how-to-unclog-a-sink-safely` | required | required | required | Drain/sink — draft unclog guide; no chemical recipes until reviewed |
| 66 | Plumbing Maintenance | Drain Blockage Removal | YELLOW | yellow | limited-troubleshooting | `how-to-unclog-a-sink-safely` | draft | `how-to-unclog-a-sink-safely` | required | required | required | Drain/sink — draft unclog guide; no chemical recipes until reviewed |
| 67 | Plumbing Maintenance | Sink Repair | YELLOW | yellow | limited-troubleshooting | `how-to-unclog-a-sink-safely` | draft | `how-to-unclog-a-sink-safely` | required | required | required | Drain/sink — draft unclog guide; no chemical recipes until reviewed |
| 68 | Plumbing Maintenance | Sink Installation | RED | red | professional-recommended | — | none | TBD | required | required | required | In-wall / pressurized / installation plumbing — professional |
| 69 | Plumbing Maintenance | Faucet Repair | GREEN | green | step-by-step | `how-to-fix-dripping-faucet` | published | `how-to-fix-dripping-faucet` | required | required | optional | Fixture-level faucet — reuse published dripping-faucet guide |
| 70 | Plumbing Maintenance | Faucet Replacement | GREEN | green | step-by-step | `how-to-fix-dripping-faucet` | published | `how-to-fix-dripping-faucet` | required | required | optional | Fixture-level faucet — reuse published dripping-faucet guide |
| 71 | Plumbing Maintenance | Shower Repair | YELLOW | yellow | limited-troubleshooting | — | none | TBD | required | required | required | Fixture repair possible with isolation; sewage/concealed = stop |
| 72 | Plumbing Maintenance | Shower Mixer Replacement | RED | red | professional-recommended | — | none | TBD | required | required | required | In-wall / pressurized / installation plumbing — professional |
| 73 | Plumbing Maintenance | Toilet Repair | YELLOW | yellow | limited-troubleshooting | — | none | TBD | required | required | required | Fixture repair possible with isolation; sewage/concealed = stop |
| 74 | Plumbing Maintenance | Toilet Installation | RED | red | professional-recommended | — | none | TBD | required | required | required | In-wall / pressurized / installation plumbing — professional |
| 75 | Plumbing Maintenance | Running Toilet Repair | YELLOW | yellow | limited-troubleshooting | — | none | TBD | required | required | required | Fixture repair possible with isolation; sewage/concealed = stop |
| 76 | Plumbing Maintenance | Water Pressure Problem Diagnosis | YELLOW | yellow | limited-troubleshooting | — | none | TBD | required | required | required | Diagnosis/observation — stop if wall/ceiling wet |
| 77 | Plumbing Maintenance | Floor Drain Repair | YELLOW | yellow | limited-troubleshooting | `how-to-unclog-a-sink-safely` | draft | `how-to-unclog-a-sink-safely` | required | required | required | Drain/sink — draft unclog guide; no chemical recipes until reviewed |
| 78 | Electrical Maintenance | Electrical Inspection | RED | red | safety-only | — | none | TBD | required | required | required | Electrical default RED posture — observation/stop/CTA only |
| 79 | Electrical Maintenance | Electrical Fault Finding | RED | red | professional-recommended | — | none | TBD | required | required | required | Live/internal electrical work — no repair DIY steps |
| 80 | Electrical Maintenance | Socket Repair | RED | red | professional-recommended | — | none | TBD | required | required | required | Live/internal electrical work — no repair DIY steps |
| 81 | Electrical Maintenance | Socket Replacement | RED | red | professional-recommended | — | none | TBD | required | required | required | Live/internal electrical work — no repair DIY steps |
| 82 | Electrical Maintenance | Switch Repair | RED | red | professional-recommended | — | none | TBD | required | required | required | Live/internal electrical work — no repair DIY steps |
| 83 | Electrical Maintenance | Switch Replacement | RED | red | professional-recommended | — | none | TBD | required | required | required | Live/internal electrical work — no repair DIY steps |
| 84 | Electrical Maintenance | Light Installation | RED | red | professional-recommended | — | none | TBD | required | required | required | Live/internal electrical work — no repair DIY steps |
| 85 | Electrical Maintenance | Light Repair | RED | red | professional-recommended | — | none | TBD | required | required | required | Live/internal electrical work — no repair DIY steps |
| 86 | Electrical Maintenance | LED Light Installation | RED | red | professional-recommended | — | none | TBD | required | required | required | Live/internal electrical work — no repair DIY steps |
| 87 | Electrical Maintenance | LED Light Replacement | RED | red | professional-recommended | — | none | TBD | required | required | required | Live/internal electrical work — no repair DIY steps |
| 88 | Electrical Maintenance | Wiring Inspection | RED | red | safety-only | — | none | TBD | required | required | required | Electrical default RED posture — observation/stop/CTA only |
| 89 | Electrical Maintenance | Wiring Repair | RED | red | professional-recommended | — | none | TBD | required | required | required | Live/internal electrical work — no repair DIY steps |
| 90 | Electrical Maintenance | Wiring Replacement | RED | red | professional-recommended | — | none | TBD | required | required | required | Live/internal electrical work — no repair DIY steps |
| 91 | Electrical Maintenance | Circuit Breaker Inspection | RED | red | safety-only | — | none | TBD | required | required | required | Electrical default RED posture — observation/stop/CTA only |
| 92 | Electrical Maintenance | Circuit Breaker Replacement | RED | red | professional-recommended | — | none | TBD | required | required | required | Live/internal electrical work — no repair DIY steps |
| 93 | Electrical Maintenance | Distribution Board Inspection | RED | red | safety-only | — | none | TBD | required | required | required | Electrical default RED posture — observation/stop/CTA only |
| 94 | Electrical Maintenance | Short-Circuit Diagnosis | RED | red | professional-recommended | — | none | TBD | required | required | required | Live/internal electrical work — no repair DIY steps |
| 95 | AC / Air Conditioning Maintenance | AC Inspection | YELLOW | yellow | limited-troubleshooting | — | none | TBD | required | review-required | required | Diagnosis framing without opening sealed systems |
| 96 | AC / Air Conditioning Maintenance | AC Servicing | YELLOW | yellow | limited-troubleshooting | `how-to-clean-ac-filter` | published | `how-to-clean-ac-filter` | required | review-required | required | User-accessible cleaning/servicing framing; no sealed-system steps |
| 97 | AC / Air Conditioning Maintenance | AC Cleaning | YELLOW | yellow | limited-troubleshooting | `how-to-clean-ac-filter` | published | `how-to-clean-ac-filter` | required | review-required | required | User-accessible cleaning/servicing framing; no sealed-system steps |
| 98 | AC / Air Conditioning Maintenance | AC Filter Cleaning | GREEN | green | step-by-step | `how-to-clean-ac-filter` | published | `how-to-clean-ac-filter` | required | review-required | optional | Exact match to published AC filter guide |
| 99 | AC / Air Conditioning Maintenance | AC Drain Cleaning | YELLOW | yellow | limited-troubleshooting | — | none | TBD | required | review-required | required | Diagnosis framing without opening sealed systems |
| 100 | AC / Air Conditioning Maintenance | AC Drain Pipe Repair | RED | red | professional-recommended | — | none | TBD | required | required | required | Installation / refrigerant / complex system — professional |
| 101 | AC / Air Conditioning Maintenance | AC Water Leakage Repair | RED | red | professional-recommended | — | none | TBD | required | required | required | Installation / refrigerant / complex system — professional |
| 102 | AC / Air Conditioning Maintenance | AC Cooling Problem Diagnosis | YELLOW | yellow | limited-troubleshooting | — | none | TBD | required | review-required | required | Diagnosis framing without opening sealed systems |
| 103 | AC / Air Conditioning Maintenance | AC Gas Check | RED | red | professional-recommended | — | none | TBD | required | required | required | Refrigerant / AC gas — sealed system; no DIY charging |
| 104 | AC / Air Conditioning Maintenance | AC Gas Recharge | RED | red | professional-recommended | — | none | TBD | required | required | required | Refrigerant / AC gas — sealed system; no DIY charging |
| 105 | AC / Air Conditioning Maintenance | AC Noise Problem Diagnosis | YELLOW | yellow | limited-troubleshooting | — | none | TBD | required | review-required | required | Diagnosis framing without opening sealed systems |
| 106 | AC / Air Conditioning Maintenance | AC Installation | RED | red | professional-recommended | — | none | TBD | required | required | required | Installation / refrigerant / complex system — professional |
| 107 | AC / Air Conditioning Maintenance | AC Replacement | RED | red | professional-recommended | — | none | TBD | required | required | required | Installation / refrigerant / complex system — professional |
| 108 | AC / Air Conditioning Maintenance | Split AC Maintenance | YELLOW | yellow | limited-troubleshooting | `how-to-clean-ac-filter` | published | `how-to-clean-ac-filter` | required | review-required | required | User-accessible cleaning/servicing framing; no sealed-system steps |
| 109 | AC / Air Conditioning Maintenance | Central AC Maintenance | RED | red | professional-recommended | — | none | TBD | required | required | required | Installation / refrigerant / complex system — professional |
| 110 | AC / Air Conditioning Maintenance | Ducted AC Maintenance | RED | red | professional-recommended | — | none | TBD | required | required | required | Installation / refrigerant / complex system — professional |
| 111 | AC / Air Conditioning Maintenance | Package AC Maintenance | RED | red | professional-recommended | — | none | TBD | required | required | required | Installation / refrigerant / complex system — professional |
| 112 | AC / Air Conditioning Maintenance | AC Preventive Maintenance | YELLOW | yellow | limited-troubleshooting | `how-to-clean-ac-filter` | published | `how-to-clean-ac-filter` | required | review-required | required | User-accessible cleaning/servicing framing; no sealed-system steps |
| 113 | Painting Services | Interior Painting | YELLOW | yellow | limited-troubleshooting | `how-to-touch-up-interior-paint` | draft | `how-to-touch-up-interior-paint` | required | review-required | required | Interior painting — share touch-up draft as related; height/damp stop |
| 114 | Painting Services | Exterior Painting | YELLOW | yellow | limited-troubleshooting | — | none | TBD | required | review-required | required | Height/exterior/large-area caution — stop for damp/mould/unknown coatings |
| 115 | Painting Services | Residential Painting | YELLOW | yellow | limited-troubleshooting | `how-to-touch-up-interior-paint` | draft | `how-to-touch-up-interior-paint` | required | review-required | required | Interior painting — share touch-up draft as related; height/damp stop |
| 116 | Painting Services | Villa Painting | YELLOW | yellow | limited-troubleshooting | — | none | TBD | required | review-required | required | Height/exterior/large-area caution — stop for damp/mould/unknown coatings |
| 117 | Painting Services | Apartment Painting | YELLOW | yellow | limited-troubleshooting | `how-to-touch-up-interior-paint` | draft | `how-to-touch-up-interior-paint` | required | review-required | required | Interior painting — share touch-up draft as related; height/damp stop |
| 118 | Painting Services | Office Painting | YELLOW | yellow | limited-troubleshooting | — | none | TBD | required | review-required | required | Height/exterior/large-area caution — stop for damp/mould/unknown coatings |
| 119 | Painting Services | Commercial Painting | YELLOW | yellow | limited-troubleshooting | — | none | TBD | required | review-required | required | Height/exterior/large-area caution — stop for damp/mould/unknown coatings |
| 120 | Painting Services | Wall Painting | YELLOW | yellow | limited-troubleshooting | `how-to-touch-up-interior-paint` | draft | `how-to-touch-up-interior-paint` | required | review-required | required | Interior painting — share touch-up draft as related; height/damp stop |
| 121 | Painting Services | Ceiling Painting | YELLOW | yellow | limited-troubleshooting | — | none | TBD | required | review-required | required | Height/exterior/large-area caution — stop for damp/mould/unknown coatings |
| 122 | Painting Services | Door Painting | YELLOW | yellow | limited-troubleshooting | `how-to-touch-up-interior-paint` | draft | `how-to-touch-up-interior-paint` | required | review-required | required | Interior painting — share touch-up draft as related; height/damp stop |
| 123 | Painting Services | Metal Painting | YELLOW | yellow | limited-troubleshooting | — | none | TBD | required | review-required | required | Height/exterior/large-area caution — stop for damp/mould/unknown coatings |
| 124 | Painting Services | Wood Painting | YELLOW | yellow | limited-troubleshooting | `how-to-touch-up-interior-paint` | draft | `how-to-touch-up-interior-paint` | required | review-required | required | Interior painting — share touch-up draft as related; height/damp stop |
| 125 | Painting Services | Repainting | YELLOW | yellow | limited-troubleshooting | `how-to-touch-up-interior-paint` | draft | `how-to-touch-up-interior-paint` | required | review-required | required | Interior painting — share touch-up draft as related; height/damp stop |
| 126 | Painting Services | Touch-Up Painting | GREEN | green | step-by-step | `how-to-touch-up-interior-paint` | draft | `how-to-touch-up-interior-paint` | required | review-required | optional | Small interior touch-up — draft guide primary after safety+AR review |
| 127 | Painting Services | Texture Painting | YELLOW | yellow | limited-troubleshooting | — | none | TBD | required | review-required | required | Height/exterior/large-area caution — stop for damp/mould/unknown coatings |
| 128 | Painting Services | Decorative Painting | YELLOW | yellow | limited-troubleshooting | — | none | TBD | required | review-required | required | Height/exterior/large-area caution — stop for damp/mould/unknown coatings |
| 129 | Wall Maintenance & Repair | Wall Inspection | YELLOW | yellow | limited-troubleshooting | `how-to-check-a-small-wall-crack` | draft | `how-to-check-a-small-wall-crack` | required | required | required | Observation-only crack check — draft guide; no structural repair |
| 130 | Wall Maintenance & Repair | Wall Crack Repair | YELLOW | yellow | limited-troubleshooting | `how-to-check-a-small-wall-crack` | draft | `how-to-check-a-small-wall-crack` | required | required | required | Observation-only crack check — draft guide; no structural repair |
| 131 | Wall Maintenance & Repair | Structural Crack Assessment | RED | red | professional-recommended | — | none | TBD | required | required | required | Structural crack — professional only; no fill/chase DIY |
| 132 | Wall Maintenance & Repair | Plaster Repair | YELLOW | yellow | limited-troubleshooting | — | none | TBD | required | required | required | Cosmetic wall repair — limited DIY; stop if structural/damp |
| 133 | Wall Maintenance & Repair | Wall Hole Repair | YELLOW | yellow | limited-troubleshooting | — | none | TBD | required | required | required | Cosmetic wall repair — limited DIY; stop if structural/damp |
| 134 | Wall Maintenance & Repair | Wall Damage Repair | YELLOW | yellow | limited-troubleshooting | — | none | TBD | required | required | required | Cosmetic wall repair — limited DIY; stop if structural/damp |
| 135 | Wall Maintenance & Repair | Damp Wall Repair | RED | red | professional-recommended | — | none | TBD | required | required | required | Moisture/mold/partition — professional until reviewed methods |
| 136 | Wall Maintenance & Repair | Moisture Damage Repair | RED | red | professional-recommended | — | none | TBD | required | required | required | Moisture/mold/partition — professional until reviewed methods |
| 137 | Wall Maintenance & Repair | Mold-Affected Wall Treatment | RED | red | professional-recommended | — | none | TBD | required | required | required | Moisture/mold/partition — professional until reviewed methods |
| 138 | Wall Maintenance & Repair | Peeling Paint Repair | YELLOW | yellow | limited-troubleshooting | — | none | TBD | required | required | required | Cosmetic wall repair — limited DIY; stop if structural/damp |
| 139 | Wall Maintenance & Repair | Wall Patching | YELLOW | yellow | limited-troubleshooting | — | none | TBD | required | required | required | Cosmetic wall repair — limited DIY; stop if structural/damp |
| 140 | Wall Maintenance & Repair | Wall Skimming | YELLOW | yellow | limited-troubleshooting | — | none | TBD | required | required | required | Cosmetic wall repair — limited DIY; stop if structural/damp |
| 141 | Wall Maintenance & Repair | Surface Preparation | YELLOW | yellow | limited-troubleshooting | — | none | TBD | required | required | required | Cosmetic wall repair — limited DIY; stop if structural/damp |
| 142 | Wall Maintenance & Repair | Gypsum Wall Repair | YELLOW | yellow | limited-troubleshooting | — | none | TBD | required | required | required | Cosmetic wall repair — limited DIY; stop if structural/damp |
| 143 | Wall Maintenance & Repair | Partition Wall Repair | RED | red | professional-recommended | — | none | TBD | required | required | required | Moisture/mold/partition — professional until reviewed methods |
| 144 | Swimming Pool Cleaning & Maintenance | Swimming Pool Inspection | GREEN | green | step-by-step | — | none | TBD | required | required | optional | Surface cleaning / visual inspection — GREEN candidate after review |
| 145 | Swimming Pool Cleaning & Maintenance | Swimming Pool Cleaning | GREEN | green | step-by-step | — | none | TBD | required | required | optional | Surface cleaning / visual inspection — GREEN candidate after review |
| 146 | Swimming Pool Cleaning & Maintenance | Pool Vacuum Cleaning | GREEN | green | step-by-step | — | none | TBD | required | required | optional | Surface cleaning / visual inspection — GREEN candidate after review |
| 147 | Swimming Pool Cleaning & Maintenance | Pool Skimming | GREEN | green | step-by-step | — | none | TBD | required | required | optional | Surface cleaning / visual inspection — GREEN candidate after review |
| 148 | Swimming Pool Cleaning & Maintenance | Pool Water Testing | REVIEW_REQUIRED | review_required | review-required | — | none | TBD | required | required | required | Chemistry/filter dosing or method insufficient without human review |
| 149 | Swimming Pool Cleaning & Maintenance | Pool Chemical Balancing | REVIEW_REQUIRED | review_required | review-required | — | none | TBD | required | required | required | Hazardous chemical dosing — do not invent doses; human safety+AR review |
| 150 | Swimming Pool Cleaning & Maintenance | Pool Filter Cleaning | REVIEW_REQUIRED | review_required | review-required | — | none | TBD | required | required | required | Chemistry/filter dosing or method insufficient without human review |
| 151 | Swimming Pool Cleaning & Maintenance | Pool Filter Maintenance | REVIEW_REQUIRED | review_required | review-required | — | none | TBD | required | required | required | Chemistry/filter dosing or method insufficient without human review |
| 152 | Swimming Pool Cleaning & Maintenance | Pool Pump Inspection | RED | red | professional-recommended | — | none | TBD | required | required | required | Pool pump electrical / leak under structure / equipment — professional |
| 153 | Swimming Pool Cleaning & Maintenance | Pool Pump Maintenance | RED | red | professional-recommended | — | none | TBD | required | required | required | Pool pump electrical / leak under structure / equipment — professional |
| 154 | Swimming Pool Cleaning & Maintenance | Pool Tile Cleaning | GREEN | green | step-by-step | — | none | TBD | required | required | optional | Surface cleaning / visual inspection — GREEN candidate after review |
| 155 | Swimming Pool Cleaning & Maintenance | Pool Drain Cleaning | REVIEW_REQUIRED | review_required | review-required | — | none | TBD | required | required | required | Chemistry/filter dosing or method insufficient without human review |
| 156 | Swimming Pool Cleaning & Maintenance | Pool Equipment Inspection | RED | red | professional-recommended | — | none | TBD | required | required | required | Pool pump electrical / leak under structure / equipment — professional |
| 157 | Swimming Pool Cleaning & Maintenance | Pool Leak Inspection | RED | red | professional-recommended | — | none | TBD | required | required | required | Pool pump electrical / leak under structure / equipment — professional |
| 158 | Swimming Pool Cleaning & Maintenance | Residential Pool Maintenance | YELLOW | yellow | limited-troubleshooting | — | none | TBD | required | required | required | Pool maintenance — limited DIY; chemicals/electrical = stop |
| 159 | Sauna Room Cleaning & Maintenance | Sauna Inspection | YELLOW | yellow | limited-troubleshooting | — | none | TBD | required | required | required | Visual inspection only — stop for heater/electrical |
| 160 | Sauna Room Cleaning & Maintenance | Sauna Deep Cleaning | GREEN | green | step-by-step | — | none | TBD | required | required | optional | Sauna surface cleaning — GREEN candidate after product review |
| 161 | Sauna Room Cleaning & Maintenance | Sauna Regular Cleaning | GREEN | green | step-by-step | — | none | TBD | required | required | optional | Sauna surface cleaning — GREEN candidate after product review |
| 162 | Sauna Room Cleaning & Maintenance | Sauna Disinfection | REVIEW_REQUIRED | review_required | review-required | — | none | TBD | required | required | required | Disinfection chemistry — no invented doses |
| 163 | Sauna Room Cleaning & Maintenance | Sauna Bench Cleaning | GREEN | green | step-by-step | — | none | TBD | required | required | optional | Sauna surface cleaning — GREEN candidate after product review |
| 164 | Sauna Room Cleaning & Maintenance | Sauna Floor Cleaning | GREEN | green | step-by-step | — | none | TBD | required | required | optional | Sauna surface cleaning — GREEN candidate after product review |
| 165 | Sauna Room Cleaning & Maintenance | Sauna Wall Cleaning | GREEN | green | step-by-step | — | none | TBD | required | required | optional | Sauna surface cleaning — GREEN candidate after product review |
| 166 | Sauna Room Cleaning & Maintenance | Sauna Glass Cleaning | GREEN | green | step-by-step | — | none | TBD | required | required | optional | Sauna surface cleaning — GREEN candidate after product review |
| 167 | Sauna Room Cleaning & Maintenance | Sauna Heater Inspection | RED | red | professional-recommended | — | none | TBD | required | required | required | Sauna heater electrical/gas — professional only |
| 168 | Sauna Room Cleaning & Maintenance | Sauna Heater Maintenance | RED | red | professional-recommended | — | none | TBD | required | required | required | Sauna heater electrical/gas — professional only |
| 169 | Sauna Room Cleaning & Maintenance | Sauna Ventilation Inspection | RED | red | professional-recommended | — | none | TBD | required | required | required | Ventilation alterations — professional |
| 170 | Sauna Room Cleaning & Maintenance | Sauna Door Maintenance | GREEN | green | step-by-step | — | none | TBD | required | required | optional | Sauna surface cleaning — GREEN candidate after product review |
| 171 | Sauna Room Cleaning & Maintenance | Sauna Wood Treatment | REVIEW_REQUIRED | review_required | review-required | — | none | TBD | required | required | required | Treatment method needs human review |
| 172 | Sauna Room Cleaning & Maintenance | Sauna Equipment Inspection | REVIEW_REQUIRED | review_required | review-required | — | none | TBD | required | required | required | Treatment method needs human review |
| 173 | Water Tank Cleaning & Maintenance | Water Tank Inspection | YELLOW | yellow | safety-only | — | none | TBD | required | required | required | External visual inspection only |
| 174 | Water Tank Cleaning & Maintenance | Water Tank Cleaning | RED | red | professional-recommended | — | none | TBD | required | required | required | Tank entry / disinfection / plumbing connections — professional |
| 175 | Water Tank Cleaning & Maintenance | Water Tank Disinfection | REVIEW_REQUIRED | review_required | review-required | — | none | TBD | required | required | required | Hazardous chemical dosing — do not invent doses; human safety+AR review |
| 176 | Water Tank Cleaning & Maintenance | Water Tank Sanitization | REVIEW_REQUIRED | review_required | review-required | — | none | TBD | required | required | required | Hazardous chemical dosing — do not invent doses; human safety+AR review |
| 177 | Water Tank Cleaning & Maintenance | Water Tank Leak Inspection | YELLOW | yellow | safety-only | — | none | TBD | required | required | required | External visual / lid check — limited; no confined entry |
| 178 | Water Tank Cleaning & Maintenance | Water Tank Cover Repair | YELLOW | yellow | safety-only | — | none | TBD | required | required | required | External visual / lid check — limited; no confined entry |
| 179 | Water Tank Cleaning & Maintenance | Water Tank Valve Repair | RED | red | professional-recommended | — | none | TBD | required | required | required | Tank entry / disinfection / plumbing connections — professional |
| 180 | Water Tank Cleaning & Maintenance | Tank Pipe Connection Repair | RED | red | professional-recommended | — | none | TBD | required | required | required | Tank entry / disinfection / plumbing connections — professional |
| 181 | Water Tank Cleaning & Maintenance | Tank Overflow Repair | RED | red | professional-recommended | — | none | TBD | required | required | required | Tank entry / disinfection / plumbing connections — professional |
| 182 | Water Tank Cleaning & Maintenance | Float Valve Repair | RED | red | professional-recommended | — | none | TBD | required | required | required | Tank entry / disinfection / plumbing connections — professional |
| 183 | Water Tank Cleaning & Maintenance | Residential Water Tank Cleaning | RED | red | professional-recommended | — | none | TBD | required | required | required | Tank entry / disinfection / plumbing connections — professional |
| 184 | Water Tank Cleaning & Maintenance | Villa Water Tank Cleaning | RED | red | professional-recommended | — | none | TBD | required | required | required | Tank entry / disinfection / plumbing connections — professional |
| 185 | Water Tank Cleaning & Maintenance | Commercial Water Tank Cleaning | RED | red | professional-recommended | — | none | TBD | required | required | required | Tank entry / disinfection / plumbing connections — professional |
| 186 | Water Tank Cleaning & Maintenance | Underground Water Tank Cleaning | RED | red | professional-recommended | — | none | TBD | required | required | required | Underground / confined-space tank — professional protocol only |
| 187 | Water Tank Cleaning & Maintenance | Rooftop Water Tank Cleaning | YELLOW | yellow | safety-only | — | none | TBD | required | required | required | External visual / lid check — limited; no confined entry |
| 188 | Water Tank Cleaning & Maintenance | Scheduled Water Tank Maintenance | RED | red | professional-recommended | — | none | TBD | required | required | required | Tank entry / disinfection / plumbing connections — professional |
| 189 | Refrigerator Maintenance / Repair | Refrigerator Inspection | YELLOW | yellow | limited-troubleshooting | — | none | TBD | required | required | required | External symptom troubleshooting — stop before sealed system |
| 190 | Refrigerator Maintenance / Repair | Refrigerator Cooling Problem | YELLOW | yellow | limited-troubleshooting | — | none | TBD | required | required | required | External symptom troubleshooting — stop before sealed system |
| 191 | Refrigerator Maintenance / Repair | Refrigerator Freezing Problem | YELLOW | yellow | limited-troubleshooting | — | none | TBD | required | required | required | External symptom troubleshooting — stop before sealed system |
| 192 | Refrigerator Maintenance / Repair | Refrigerator Water Leakage | YELLOW | yellow | limited-troubleshooting | — | none | TBD | required | required | required | External symptom troubleshooting — stop before sealed system |
| 193 | Refrigerator Maintenance / Repair | Refrigerator Ice Formation Problem | YELLOW | yellow | limited-troubleshooting | — | none | TBD | required | required | required | External symptom troubleshooting — stop before sealed system |
| 194 | Refrigerator Maintenance / Repair | Refrigerator Thermostat Inspection | RED | red | professional-recommended | — | none | TBD | required | required | required | Internal sealed/control repair — professional |
| 195 | Refrigerator Maintenance / Repair | Refrigerator Compressor Inspection | RED | red | professional-recommended | — | none | TBD | required | required | required | Compressor / sealed system / electrical — professional |
| 196 | Refrigerator Maintenance / Repair | Refrigerator Compressor Replacement | RED | red | professional-recommended | — | none | TBD | required | required | required | Compressor / sealed system / electrical — professional |
| 197 | Refrigerator Maintenance / Repair | Refrigerator Fan Motor Repair | RED | red | professional-recommended | — | none | TBD | required | required | required | Internal sealed/control repair — professional |
| 198 | Refrigerator Maintenance / Repair | Refrigerator Door Seal Replacement | GREEN | green | step-by-step | — | none | TBD | required | required | optional | External cleaning / seal visual — GREEN after review |
| 199 | Refrigerator Maintenance / Repair | Refrigerator Door Hinge Repair | GREEN | green | step-by-step | — | none | TBD | required | required | optional | External cleaning / seal visual — GREEN after review |
| 200 | Refrigerator Maintenance / Repair | Refrigerator Temperature Control Repair | RED | red | professional-recommended | — | none | TBD | required | required | required | Internal sealed/control repair — professional |
| 201 | Refrigerator Maintenance / Repair | Refrigerator Drain Blockage Repair | YELLOW | yellow | limited-troubleshooting | — | none | TBD | required | required | required | External symptom troubleshooting — stop before sealed system |
| 202 | Refrigerator Maintenance / Repair | Refrigerator Electrical Fault Diagnosis | RED | red | professional-recommended | — | none | TBD | required | required | required | Compressor / sealed system / electrical — professional |
| 203 | Refrigerator Maintenance / Repair | Refrigerator Cleaning | GREEN | green | step-by-step | — | none | TBD | required | required | optional | External cleaning / seal visual — GREEN after review |
| 204 | Microwave Maintenance / Repair | Microwave Inspection | YELLOW | yellow | safety-only | — | none | TBD | required | required | required | External observation only — no panel open |
| 205 | Microwave Maintenance / Repair | Microwave Heating Problem | RED | red | professional-recommended | — | none | TBD | required | required | required | Microwave HV/magnetron-adjacent — specialist; no DIY repair steps |
| 206 | Microwave Maintenance / Repair | Microwave No-Power Diagnosis | RED | red | professional-recommended | — | none | TBD | required | required | required | Microwave HV/magnetron-adjacent — specialist; no DIY repair steps |
| 207 | Microwave Maintenance / Repair | Microwave Spark Problem | RED | red | professional-recommended | — | none | TBD | required | required | required | Microwave HV/magnetron-adjacent — specialist; no DIY repair steps |
| 208 | Microwave Maintenance / Repair | Microwave Turntable Problem | REVIEW_REQUIRED | review_required | review-required | — | none | TBD | required | required | required | May be cosmetic or interlock-related — human confirm (HV risk) |
| 209 | Microwave Maintenance / Repair | Microwave Door Problem | REVIEW_REQUIRED | review_required | review-required | — | none | TBD | required | required | required | May be cosmetic or interlock-related — human confirm (HV risk) |
| 210 | Microwave Maintenance / Repair | Microwave Door Switch Repair | RED | red | professional-recommended | — | none | TBD | required | required | required | Microwave HV/magnetron-adjacent — specialist; no DIY repair steps |
| 211 | Microwave Maintenance / Repair | Microwave Fuse Replacement | RED | red | professional-recommended | — | none | TBD | required | required | required | Microwave HV/magnetron-adjacent — specialist; no DIY repair steps |
| 212 | Microwave Maintenance / Repair | Microwave Control Panel Problem | RED | red | professional-recommended | — | none | TBD | required | required | required | Microwave HV/magnetron-adjacent — specialist; no DIY repair steps |
| 213 | Microwave Maintenance / Repair | Microwave Display Problem | RED | red | professional-recommended | — | none | TBD | required | required | required | Microwave HV/magnetron-adjacent — specialist; no DIY repair steps |
| 214 | Microwave Maintenance / Repair | Microwave Fan Problem | RED | red | professional-recommended | — | none | TBD | required | required | required | Microwave HV/magnetron-adjacent — specialist; no DIY repair steps |
| 215 | Microwave Maintenance / Repair | Microwave Internal Cleaning | GREEN | green | step-by-step | — | none | TBD | required | required | optional | Cool interior wipe — GREEN; never open HV cavity |
| 216 | Microwave Maintenance / Repair | Microwave Electrical Diagnosis | RED | red | professional-recommended | — | none | TBD | required | required | required | Microwave HV/magnetron-adjacent — specialist; no DIY repair steps |
| 217 | Washing Machine Maintenance / Repair | Washing Machine Inspection | YELLOW | yellow | limited-troubleshooting | — | none | TBD | required | required | required | External washer troubleshooting — stop for motor/board |
| 218 | Washing Machine Maintenance / Repair | Washing Machine Not Starting | YELLOW | yellow | limited-troubleshooting | — | none | TBD | required | required | required | External washer troubleshooting — stop for motor/board |
| 219 | Washing Machine Maintenance / Repair | Washing Machine Not Spinning | YELLOW | yellow | limited-troubleshooting | — | none | TBD | required | required | required | External washer troubleshooting — stop for motor/board |
| 220 | Washing Machine Maintenance / Repair | Washing Machine Water Filling Problem | YELLOW | yellow | limited-troubleshooting | — | none | TBD | required | required | required | External washer troubleshooting — stop for motor/board |
| 221 | Washing Machine Maintenance / Repair | Washing Machine Drainage Problem | YELLOW | yellow | limited-troubleshooting | — | none | TBD | required | required | required | External washer troubleshooting — stop for motor/board |
| 222 | Washing Machine Maintenance / Repair | Washing Machine Water Leakage | YELLOW | yellow | limited-troubleshooting | — | none | TBD | required | required | required | External washer troubleshooting — stop for motor/board |
| 223 | Washing Machine Maintenance / Repair | Washing Machine Excessive Noise | YELLOW | yellow | limited-troubleshooting | — | none | TBD | required | required | required | External washer troubleshooting — stop for motor/board |
| 224 | Washing Machine Maintenance / Repair | Washing Machine Vibration Problem | YELLOW | yellow | limited-troubleshooting | — | none | TBD | required | required | required | External washer troubleshooting — stop for motor/board |
| 225 | Washing Machine Maintenance / Repair | Washing Machine Door Lock Problem | YELLOW | yellow | limited-troubleshooting | — | none | TBD | required | required | required | External washer troubleshooting — stop for motor/board |
| 226 | Washing Machine Maintenance / Repair | Washing Machine Drum Problem | RED | red | professional-recommended | — | none | TBD | required | required | required | Motor/board/drum/pump internals — professional |
| 227 | Washing Machine Maintenance / Repair | Washing Machine Pump Repair | RED | red | professional-recommended | — | none | TBD | required | required | required | Motor/board/drum/pump internals — professional |
| 228 | Washing Machine Maintenance / Repair | Washing Machine Motor Inspection | RED | red | professional-recommended | — | none | TBD | required | required | required | Motor/board/drum/pump internals — professional |
| 229 | Washing Machine Maintenance / Repair | Washing Machine Belt Replacement | RED | red | professional-recommended | — | none | TBD | required | required | required | Motor/board/drum/pump internals — professional |
| 230 | Washing Machine Maintenance / Repair | Washing Machine Control Board Diagnosis | RED | red | professional-recommended | — | none | TBD | required | required | required | Motor/board/drum/pump internals — professional |
| 231 | Washing Machine Maintenance / Repair | Washing Machine Filter Cleaning | GREEN | green | step-by-step | — | none | TBD | required | required | optional | User-accessible filter clean — GREEN after review |
| 232 | Washing Machine Maintenance / Repair | Washing Machine Preventive Maintenance | YELLOW | yellow | limited-troubleshooting | — | none | TBD | required | required | required | External washer troubleshooting — stop for motor/board |
| 233 | Water Heater Maintenance / Repair | Water Heater Inspection | YELLOW | yellow | safety-only | — | none | TBD | required | required | required | External observation / cleaning framing — no live element DIY |
| 234 | Water Heater Maintenance / Repair | Water Heater No Hot Water | RED | red | professional-recommended | — | none | TBD | required | required | required | Element/electrical/pressurized heater work — professional |
| 235 | Water Heater Maintenance / Repair | Water Heater Slow Heating | RED | red | professional-recommended | — | none | TBD | required | required | required | Element/electrical/pressurized heater work — professional |
| 236 | Water Heater Maintenance / Repair | Water Heater Temperature Problem | RED | red | professional-recommended | — | none | TBD | required | required | required | Element/electrical/pressurized heater work — professional |
| 237 | Water Heater Maintenance / Repair | Water Heater Thermostat Repair | RED | red | professional-recommended | — | none | TBD | required | required | required | Element/electrical/pressurized heater work — professional |
| 238 | Water Heater Maintenance / Repair | Water Heater Heating Element Replacement | RED | red | professional-recommended | — | none | TBD | required | required | required | Element/electrical/pressurized heater work — professional |
| 239 | Water Heater Maintenance / Repair | Water Heater Water Leakage Repair | RED | red | professional-recommended | — | none | TBD | required | required | required | Element/electrical/pressurized heater work — professional |
| 240 | Water Heater Maintenance / Repair | Water Heater Pressure Problem | RED | red | professional-recommended | — | none | TBD | required | required | required | Element/electrical/pressurized heater work — professional |
| 241 | Water Heater Maintenance / Repair | Water Heater Tank Inspection | YELLOW | yellow | safety-only | — | none | TBD | required | required | required | External observation / cleaning framing — no live element DIY |
| 242 | Water Heater Maintenance / Repair | Water Heater Valve Replacement | RED | red | professional-recommended | — | none | TBD | required | required | required | Element/electrical/pressurized heater work — professional |
| 243 | Water Heater Maintenance / Repair | Water Heater Electrical Fault Diagnosis | RED | red | professional-recommended | — | none | TBD | required | required | required | Element/electrical/pressurized heater work — professional |
| 244 | Water Heater Maintenance / Repair | Water Heater Cleaning | YELLOW | yellow | safety-only | — | none | TBD | required | required | required | External observation / cleaning framing — no live element DIY |
| 245 | Water Heater Maintenance / Repair | Water Heater Scale Removal | YELLOW | yellow | safety-only | — | none | TBD | required | required | required | External observation / cleaning framing — no live element DIY |
| 246 | Water Heater Maintenance / Repair | Water Heater Preventive Maintenance | YELLOW | yellow | safety-only | — | none | TBD | required | required | required | External observation / cleaning framing — no live element DIY |
| 247 | Water Heater Maintenance / Repair | Emergency Water Heater Repair | RED | red | professional-recommended | — | none | TBD | required | required | required | Element/electrical/pressurized heater work — professional |
| 248 | Dishwasher Maintenance / Repair | Dishwasher Inspection | YELLOW | yellow | limited-troubleshooting | — | none | TBD | required | required | required | External dishwasher troubleshooting — stop for heating/electrical |
| 249 | Dishwasher Maintenance / Repair | Dishwasher Not Starting | YELLOW | yellow | limited-troubleshooting | — | none | TBD | required | required | required | External dishwasher troubleshooting — stop for heating/electrical |
| 250 | Dishwasher Maintenance / Repair | Dishwasher Not Cleaning Properly | YELLOW | yellow | limited-troubleshooting | — | none | TBD | required | required | required | External dishwasher troubleshooting — stop for heating/electrical |
| 251 | Dishwasher Maintenance / Repair | Dishwasher Water Filling Problem | YELLOW | yellow | limited-troubleshooting | — | none | TBD | required | required | required | External dishwasher troubleshooting — stop for heating/electrical |
| 252 | Dishwasher Maintenance / Repair | Dishwasher Drainage Problem | YELLOW | yellow | limited-troubleshooting | — | none | TBD | required | required | required | External dishwasher troubleshooting — stop for heating/electrical |
| 253 | Dishwasher Maintenance / Repair | Dishwasher Water Leakage | YELLOW | yellow | limited-troubleshooting | — | none | TBD | required | required | required | External dishwasher troubleshooting — stop for heating/electrical |
| 254 | Dishwasher Maintenance / Repair | Dishwasher Poor Drying | YELLOW | yellow | limited-troubleshooting | — | none | TBD | required | required | required | External dishwasher troubleshooting — stop for heating/electrical |
| 255 | Dishwasher Maintenance / Repair | Dishwasher Spray Arm Cleaning | GREEN | green | step-by-step | — | none | TBD | required | required | optional | User-accessible filter/spray-arm clean — GREEN after review |
| 256 | Dishwasher Maintenance / Repair | Dishwasher Filter Cleaning | GREEN | green | step-by-step | — | none | TBD | required | required | optional | User-accessible filter/spray-arm clean — GREEN after review |
| 257 | Dishwasher Maintenance / Repair | Dishwasher Pump Inspection | RED | red | professional-recommended | — | none | TBD | required | required | required | Heating/electrical/pump internals — professional |
| 258 | Dishwasher Maintenance / Repair | Dishwasher Door Seal Replacement | YELLOW | yellow | limited-troubleshooting | — | none | TBD | required | required | required | External dishwasher troubleshooting — stop for heating/electrical |
| 259 | Dishwasher Maintenance / Repair | Dishwasher Door Lock Repair | YELLOW | yellow | limited-troubleshooting | — | none | TBD | required | required | required | External dishwasher troubleshooting — stop for heating/electrical |
| 260 | Dishwasher Maintenance / Repair | Dishwasher Heating Problem | RED | red | professional-recommended | — | none | TBD | required | required | required | Heating/electrical/pump internals — professional |
| 261 | Dishwasher Maintenance / Repair | Dishwasher Control Panel Diagnosis | RED | red | professional-recommended | — | none | TBD | required | required | required | Heating/electrical/pump internals — professional |
| 262 | Dishwasher Maintenance / Repair | Dishwasher Preventive Maintenance | YELLOW | yellow | limited-troubleshooting | — | none | TBD | required | required | required | External dishwasher troubleshooting — stop for heating/electrical |
| 263 | Gym Cleaning & Maintenance | Gym Deep Cleaning | GREEN | green | step-by-step | — | none | TBD | required | required | optional | Gym surface cleaning — GREEN after chemical product review |
| 264 | Gym Cleaning & Maintenance | Gym Regular Cleaning | GREEN | green | step-by-step | — | none | TBD | required | required | optional | Gym surface cleaning — GREEN after chemical product review |
| 265 | Gym Cleaning & Maintenance | Gym Equipment Cleaning | GREEN | green | step-by-step | — | none | TBD | required | required | optional | Gym surface cleaning — GREEN after chemical product review |
| 266 | Gym Cleaning & Maintenance | Gym Floor Cleaning | GREEN | green | step-by-step | — | none | TBD | required | required | optional | Gym surface cleaning — GREEN after chemical product review |
| 267 | Gym Cleaning & Maintenance | Gym Glass Cleaning | GREEN | green | step-by-step | — | none | TBD | required | required | optional | Gym surface cleaning — GREEN after chemical product review |
| 268 | Gym Cleaning & Maintenance | Gym Sanitization | REVIEW_REQUIRED | review_required | review-required | — | none | TBD | required | required | required | Chemical protocol — REVIEW_REQUIRED |
| 269 | Gym Cleaning & Maintenance | Gym Disinfection | REVIEW_REQUIRED | review_required | review-required | — | none | TBD | required | required | required | Chemical protocol — REVIEW_REQUIRED |
| 270 | Gym Cleaning & Maintenance | Locker Cleaning | GREEN | green | step-by-step | — | none | TBD | required | required | optional | Gym surface cleaning — GREEN after chemical product review |
| 271 | Gym Cleaning & Maintenance | Shower & Changing Room Cleaning | GREEN | green | step-by-step | — | none | TBD | required | required | optional | Gym surface cleaning — GREEN after chemical product review |
| 272 | Gym Cleaning & Maintenance | Fitness Equipment Inspection | REVIEW_REQUIRED | review_required | review-required | — | none | TBD | required | required | required | Fitness equipment internals — inspection/report only until human class |
| 273 | Gym Cleaning & Maintenance | Treadmill Maintenance | REVIEW_REQUIRED | review_required | review-required | — | none | TBD | required | required | required | Fitness equipment internals — inspection/report only until human class |
| 274 | Gym Cleaning & Maintenance | Exercise Bike Maintenance | REVIEW_REQUIRED | review_required | review-required | — | none | TBD | required | required | required | Fitness equipment internals — inspection/report only until human class |
| 275 | Gym Cleaning & Maintenance | Cross-Trainer Maintenance | REVIEW_REQUIRED | review_required | review-required | — | none | TBD | required | required | required | Fitness equipment internals — inspection/report only until human class |
| 276 | Gym Cleaning & Maintenance | Weight Equipment Maintenance | REVIEW_REQUIRED | review_required | review-required | — | none | TBD | required | required | required | Fitness equipment internals — inspection/report only until human class |
| 277 | Gym Cleaning & Maintenance | Preventive Gym Maintenance | REVIEW_REQUIRED | review_required | review-required | — | none | TBD | required | required | required | Fitness equipment internals — inspection/report only until human class |
| 278 | Oven Maintenance / Repair | Oven Inspection | YELLOW | yellow | limited-troubleshooting | — | none | TBD | required | required | required | Door seal visual / inspection — limited; no live element DIY |
| 279 | Oven Maintenance / Repair | Oven Not Heating | RED | red | professional-recommended | — | none | TBD | required | required | required | Heating element / electrical / controls — professional |
| 280 | Oven Maintenance / Repair | Oven Uneven Heating | RED | red | professional-recommended | — | none | TBD | required | required | required | Heating element / electrical / controls — professional |
| 281 | Oven Maintenance / Repair | Oven Temperature Problem | RED | red | professional-recommended | — | none | TBD | required | required | required | Heating element / electrical / controls — professional |
| 282 | Oven Maintenance / Repair | Oven Heating Element Replacement | RED | red | professional-recommended | — | none | TBD | required | required | required | Heating element / electrical / controls — professional |
| 283 | Oven Maintenance / Repair | Oven Thermostat Repair | RED | red | professional-recommended | — | none | TBD | required | required | required | Heating element / electrical / controls — professional |
| 284 | Oven Maintenance / Repair | Oven Door Repair | YELLOW | yellow | limited-troubleshooting | — | none | TBD | required | required | required | Door seal visual / inspection — limited; no live element DIY |
| 285 | Oven Maintenance / Repair | Oven Door Seal Replacement | YELLOW | yellow | limited-troubleshooting | — | none | TBD | required | required | required | Door seal visual / inspection — limited; no live element DIY |
| 286 | Oven Maintenance / Repair | Oven Fan Repair | RED | red | professional-recommended | — | none | TBD | required | required | required | Heating element / electrical / controls — professional |
| 287 | Oven Maintenance / Repair | Oven Timer Problem | RED | red | professional-recommended | — | none | TBD | required | required | required | Heating element / electrical / controls — professional |
| 288 | Oven Maintenance / Repair | Oven Control Panel Problem | RED | red | professional-recommended | — | none | TBD | required | required | required | Heating element / electrical / controls — professional |
| 289 | Oven Maintenance / Repair | Oven Electrical Fault Diagnosis | RED | red | professional-recommended | — | none | TBD | required | required | required | Heating element / electrical / controls — professional |
| 290 | Oven Maintenance / Repair | Gas Oven Inspection | RED | red | professional-recommended | — | none | TBD | required | required | required | Gas oven — professional only |
| 291 | Oven Maintenance / Repair | Oven Cleaning | GREEN | green | step-by-step | — | none | TBD | required | required | optional | Cool oven cleaning — GREEN after review |
| 292 | Oven Maintenance / Repair | Oven Preventive Maintenance | YELLOW | yellow | limited-troubleshooting | — | none | TBD | required | required | required | Door seal visual / inspection — limited; no live element DIY |
| 293 | Burner / Cooker Maintenance / Repair | Gas Cooker Inspection | RED | red | professional-recommended | — | none | TBD | required | required | required | Gas leak/hose/valve/flame path — evacuate/pro; no DIY repair |
| 294 | Burner / Cooker Maintenance / Repair | Gas Burner Cleaning | YELLOW | yellow | limited-troubleshooting | — | none | TBD | required | required | required | Cool-surface cleaning / cosmetic knob — after review; stop if gas smell |
| 295 | Burner / Cooker Maintenance / Repair | Gas Burner Repair | RED | red | professional-recommended | — | none | TBD | required | required | required | Gas leak/hose/valve/flame path — evacuate/pro; no DIY repair |
| 296 | Burner / Cooker Maintenance / Repair | Gas Burner Replacement | RED | red | professional-recommended | — | none | TBD | required | required | required | Gas leak/hose/valve/flame path — evacuate/pro; no DIY repair |
| 297 | Burner / Cooker Maintenance / Repair | Gas Cooker Ignition Repair | RED | red | professional-recommended | — | none | TBD | required | required | required | Gas leak/hose/valve/flame path — evacuate/pro; no DIY repair |
| 298 | Burner / Cooker Maintenance / Repair | Gas Flame Problem Diagnosis | RED | red | professional-recommended | — | none | TBD | required | required | required | Gas leak/hose/valve/flame path — evacuate/pro; no DIY repair |
| 299 | Burner / Cooker Maintenance / Repair | Uneven Flame Diagnosis | RED | red | professional-recommended | — | none | TBD | required | required | required | Gas leak/hose/valve/flame path — evacuate/pro; no DIY repair |
| 300 | Burner / Cooker Maintenance / Repair | Gas Leakage Inspection | RED | red | professional-recommended | — | none | TBD | required | required | required | Gas leak/hose/valve/flame path — evacuate/pro; no DIY repair |
| 301 | Burner / Cooker Maintenance / Repair | Gas Hose Inspection | RED | red | professional-recommended | — | none | TBD | required | required | required | Gas leak/hose/valve/flame path — evacuate/pro; no DIY repair |
| 302 | Burner / Cooker Maintenance / Repair | Gas Hose Replacement | RED | red | professional-recommended | — | none | TBD | required | required | required | Gas leak/hose/valve/flame path — evacuate/pro; no DIY repair |
| 303 | Burner / Cooker Maintenance / Repair | Gas Valve Inspection | RED | red | professional-recommended | — | none | TBD | required | required | required | Gas leak/hose/valve/flame path — evacuate/pro; no DIY repair |
| 304 | Burner / Cooker Maintenance / Repair | Gas Valve Replacement | RED | red | professional-recommended | — | none | TBD | required | required | required | Gas leak/hose/valve/flame path — evacuate/pro; no DIY repair |
| 305 | Burner / Cooker Maintenance / Repair | Cooker Knob Replacement | YELLOW | yellow | limited-troubleshooting | — | none | TBD | required | required | required | Cool-surface cleaning / cosmetic knob — after review; stop if gas smell |
| 306 | Burner / Cooker Maintenance / Repair | Cooker Igniter Repair | RED | red | professional-recommended | — | none | TBD | required | required | required | Gas leak/hose/valve/flame path — evacuate/pro; no DIY repair |
| 307 | Burner / Cooker Maintenance / Repair | Gas Cooker Cleaning | YELLOW | yellow | limited-troubleshooting | — | none | TBD | required | required | required | Cool-surface cleaning / cosmetic knob — after review; stop if gas smell |
| 308 | Burner / Cooker Maintenance / Repair | Hob Cleaning | YELLOW | yellow | limited-troubleshooting | — | none | TBD | required | required | required | Cool-surface cleaning / cosmetic knob — after review; stop if gas smell |
| 309 | Burner / Cooker Maintenance / Repair | Glass Hob Maintenance | YELLOW | yellow | limited-troubleshooting | — | none | TBD | required | required | required | Cool-surface cleaning / cosmetic knob — after review; stop if gas smell |
| 310 | Burner / Cooker Maintenance / Repair | Electric Cooker Repair | REVIEW_REQUIRED | review_required | review-required | — | none | TBD | required | required | required | Electric/induction repair steps — REVIEW_REQUIRED (not gas RED but still hazardous) |
| 311 | Burner / Cooker Maintenance / Repair | Induction Cooker Inspection | REVIEW_REQUIRED | review_required | review-required | — | none | TBD | required | required | required | Electric/induction repair steps — REVIEW_REQUIRED (not gas RED but still hazardous) |

## STOP

Docs-only deliverable complete. No DIY articles, schema, seed, or app code changes.
