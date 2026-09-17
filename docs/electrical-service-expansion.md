# Electrical service expansion (proposal)

**Audit only — no DB/seed mutation.**

| Metric | Count |
|--------|------:|
| Old electrical children | 17 |
| Proposed electrical children | **121** |
| Newly added | **104** |
| Rejected as duplicate in proposal | 0 |

## Safety on proposed Electrical set

```json
{
  "RED": 61,
  "REVIEW_REQUIRED": 16,
  "YELLOW": 43,
  "GREEN": 1
}
```

## Existing 17 (kept; optional rename)

Fault finding may be renamed to **Electrical Fault Diagnosis** (see changes report).

## Added services (104)

1. **Electrical Safety Inspection** (`electrical-safety-inspection`) — YELLOW — inspection — Distinct safety-focused inspection vs general inspection
2. **Electrical Load Inspection** (`electrical-load-inspection`) — YELLOW — inspection — Load assessment intent distinct from fault finding
3. **Voltage Problem Diagnosis** (`voltage-problem-diagnosis`) — YELLOW — diagnosis — Customer voltage-fluctuation intent
4. **Power Failure Diagnosis** (`power-failure-diagnosis`) — YELLOW — diagnosis — Whole/partial outage triage
5. **Breaker Tripping Diagnosis** (`breaker-tripping-diagnosis`) — YELLOW — diagnosis — Distinct from short-circuit diagnosis
6. **No Power Diagnosis** (`no-power-diagnosis`) — YELLOW — diagnosis — Common booking intent phrase
7. **Partial Power Failure Diagnosis** (`partial-power-failure-diagnosis`) — YELLOW — diagnosis — Circuit-level outage vs total failure
8. **Ground Fault Diagnosis** (`ground-fault-diagnosis`) — YELLOW — diagnosis — Earth leakage / GF intent
9. **Burning Smell Electrical Investigation** (`burning-smell-electrical-investigation`) — RED — emergency — High-risk investigation; no DIY procedure
10. **Sparking Outlet Investigation** (`sparking-outlet-investigation`) — RED — emergency — Immediate hazard investigation
11. **Emergency Electrical Fault Repair** (`emergency-electrical-fault-repair`) — RED — emergency — Emergency response offering
12. **Earthing Inspection** (`earthing-inspection`) — YELLOW — earthing — Earthing health check
13. **Earthing Repair** (`earthing-repair`) — RED — earthing — Protective earth work requires qualified work
14. **Equipotential Bonding Inspection** (`equipotential-bonding-inspection`) — REVIEW_REQUIRED — earthing — Specialized bonding; regulated context possible
15. **Socket Installation** (`socket-installation`) — RED — sockets-switches — New point install ≠ replacement
16. **Weatherproof Socket Installation** (`weatherproof-socket-installation`) — RED — sockets-switches — Outdoor IP-rated socket work
17. **Socket Relocation** (`socket-relocation`) — RED — sockets-switches — Position change / circuit work
18. **Dimmer Switch Installation** (`dimmer-switch-installation`) — RED — sockets-switches — Distinct switch type install
19. **Dimmer Switch Repair** (`dimmer-switch-repair`) — YELLOW — sockets-switches — Dimmer-specific fault
20. **Two-Way Switch Installation** (`two-way-switch-installation`) — RED — sockets-switches — Multiway switching scope
21. **Isolator Switch Installation** (`isolator-switch-installation`) — RED — sockets-switches — Appliance isolator point
22. **Isolator Switch Replacement** (`isolator-switch-replacement`) — RED — sockets-switches — Isolator replacement
23. **Ceiling Light Installation** (`ceiling-light-installation`) — RED — lighting — Fixture-specific install
24. **Wall Light Installation** (`wall-light-installation`) — RED — lighting — Fixture-specific install
25. **Downlight Installation** (`downlight-installation`) — RED — lighting — Recessed lighting scope
26. **Downlight Replacement** (`downlight-replacement`) — YELLOW — lighting — Like-for-like recessed swap when safe
27. **Chandelier Installation** (`chandelier-installation`) — RED — lighting — Heavy fixture / structural fixings
28. **Outdoor Light Installation** (`outdoor-light-installation`) — RED — outdoor — Weather-exposed lighting
29. **Outdoor Light Repair** (`outdoor-light-repair`) — YELLOW — outdoor — Outdoor fixture repair
30. **Garden Light Installation** (`garden-light-installation`) — RED — outdoor — Landscape lighting install
31. **Emergency Light Inspection** (`emergency-light-inspection`) — YELLOW — lighting — Life-safety lighting check
32. **Emergency Light Repair** (`emergency-light-repair`) — RED — lighting — Emergency lighting repair
33. **Sensor Light Installation** (`sensor-light-installation`) — RED — smart-sensor — Sensor lighting install
34. **Motion Sensor Installation** (`motion-sensor-installation`) — RED — smart-sensor — Occupancy/motion control
35. **Light Timer Installation** (`light-timer-installation`) — RED — smart-sensor — Timer control install
36. **Track Lighting Installation** (`track-lighting-installation`) — RED — lighting — Track system install
37. **Staircase Lighting Repair** (`staircase-lighting-repair`) — YELLOW — building — Common-area stair lighting
38. **Lobby Lighting Maintenance** (`lobby-lighting-maintenance`) — YELLOW — building — Lobby lighting maintenance
39. **Cable Replacement** (`cable-replacement`) — RED — wiring — Cable run replacement
40. **Surface Wiring Installation** (`surface-wiring-installation`) — RED — wiring — Surface conduit/wiring
41. **Concealed Wiring Installation** (`concealed-wiring-installation`) — REVIEW_REQUIRED — wiring — In-wall works; higher risk/regulatory
42. **Dedicated Circuit Installation** (`dedicated-circuit-installation`) — RED — wiring — New circuit from DB
43. **Cable Tray Installation** (`cable-tray-installation`) — RED — commercial — Commercial containment
44. **Junction Box Repair** (`junction-box-repair`) — RED — wiring — Joint/enclosure repair
45. **Outdoor Junction Box Repair** (`outdoor-junction-box-repair`) — RED — outdoor — Weatherproof enclosure repair
46. **Distribution Board Installation** (`distribution-board-installation`) — REVIEW_REQUIRED — distribution — Major DB work; authorized contractors
47. **Distribution Board Upgrade** (`distribution-board-upgrade`) — REVIEW_REQUIRED — distribution — Capacity/upgrade scope
48. **Distribution Board Repair** (`distribution-board-repair`) — RED — distribution — DB corrective work
49. **MCB Installation** (`mcb-installation`) — RED — protection — MCB install distinct from inspection
50. **MCB Replacement** (`mcb-replacement`) — RED — protection — MCB like-for-like/upsize
51. **MCCB Inspection** (`mccb-inspection`) — YELLOW — protection — MCCB-focused inspection
52. **MCCB Replacement** (`mccb-replacement`) — REVIEW_REQUIRED — protection — Higher-capacity breaker work
53. **RCCB Installation** (`rccb-installation`) — RED — protection — Residual current device install
54. **RCCB Replacement** (`rccb-replacement`) — RED — protection — RCCB replacement
55. **RCBO Installation** (`rcbo-installation`) — RED — protection — Combined RCD/MCB device
56. **RCBO Replacement** (`rcbo-replacement`) — RED — protection — RCBO replacement
57. **Surge Protection Device Installation** (`surge-protection-device-installation`) — RED — protection — SPD install
58. **Neutral Link Replacement** (`neutral-link-replacement`) — RED — distribution — DB neutral hardware
59. **Ceiling Fan Installation** (`ceiling-fan-installation`) — RED — fans — Ceiling fan mount/electrical
60. **Ceiling Fan Repair** (`ceiling-fan-repair`) — YELLOW — fans — Fan repair intent
61. **Ceiling Fan Replacement** (`ceiling-fan-replacement`) — RED — fans — Full fan swap
62. **Exhaust Fan Installation** (`exhaust-fan-installation`) — RED — fans — Exhaust fan install
63. **Exhaust Fan Repair** (`exhaust-fan-repair`) — YELLOW — fans — Exhaust fan repair
64. **Exhaust Fan Replacement** (`exhaust-fan-replacement`) — RED — fans — Exhaust fan swap
65. **Wall Fan Installation** (`wall-fan-installation`) — RED — fans — Wall fan install
66. **Wall Fan Repair** (`wall-fan-repair`) — YELLOW — fans — Wall fan repair
67. **Water Pump Motor Electrical Repair** (`water-pump-motor-electrical-repair`) — RED — motors — Pump motor electrical — not appliance category
68. **Motor Starter Repair** (`motor-starter-repair`) — RED — motors — Starter gear repair
69. **Contactor Replacement** (`contactor-replacement`) — RED — controls — Control gear replacement
70. **Overload Relay Replacement** (`overload-relay-replacement`) — RED — controls — Motor protection relay
71. **Timer Switch Installation** (`timer-switch-installation`) — RED — controls — Electromechanical/digital timer
72. **Timer Switch Repair** (`timer-switch-repair`) — YELLOW — controls — Timer fault repair
73. **Electrical Control Panel Inspection** (`electrical-control-panel-inspection`) — YELLOW — controls — Panel inspection
74. **Electrical Control Panel Repair** (`electrical-control-panel-repair`) — REVIEW_REQUIRED — controls — Panel repair may be specialized
75. **Common Area Electrical Maintenance** (`common-area-electrical-maintenance`) — YELLOW — building — Shared-area electrical maintenance
76. **Parking Area Electrical Maintenance** (`parking-area-electrical-maintenance`) — YELLOW — building — Parking electrical maintenance
77. **Building Electrical Preventive Maintenance** (`building-electrical-preventive-maintenance`) — YELLOW — preventive — Scheduled building electrical PM
78. **Preventive Electrical Maintenance** (`preventive-electrical-maintenance`) — YELLOW — preventive — General preventive electrical
79. **Scheduled Electrical Inspection** (`scheduled-electrical-inspection`) — YELLOW — preventive — Recurring inspection contracts
80. **Commercial Electrical Maintenance** (`commercial-electrical-maintenance`) — YELLOW — commercial — Commercial property electrical
81. **Office Electrical Fault Diagnosis** (`office-electrical-fault-diagnosis`) — YELLOW — commercial — Office fault intent
82. **Shop Electrical Inspection** (`shop-electrical-inspection`) — YELLOW — commercial — Retail unit inspection
83. **Smart Switch Installation** (`smart-switch-installation`) — RED — smart-sensor — Smart switch install
84. **Smart Switch Replacement** (`smart-switch-replacement`) — RED — smart-sensor — Smart switch swap
85. **Smart Lighting Setup** (`smart-lighting-setup`) — YELLOW — smart-sensor — Commissioning/setup of smart lights
86. **Electrical Appliance Point Installation** (`electrical-appliance-point-installation`) — RED — connections — New appliance supply point
87. **AC Isolator Installation** (`ac-isolator-installation`) — RED — connections — AC isolator — building electrical
88. **Water Heater Electrical Connection** (`water-heater-electrical-connection`) — REVIEW_REQUIRED — connections — Fixed appliance connection; safety review
89. **Cooker Electrical Connection** (`cooker-electrical-connection`) — REVIEW_REQUIRED — connections — Cooker circuit connection; safety review
90. **Doorbell Installation** (`doorbell-installation`) — YELLOW — other — Low-voltage/doorbell install
91. **Doorbell Repair** (`doorbell-repair`) — GREEN — other — Often low-risk observation/simple repair path
92. **Intercom Power Supply Repair** (`intercom-power-supply-repair`) — YELLOW — other — Intercom PSU electrical
93. **Electric Gate Motor Electrical Diagnosis** (`electric-gate-motor-electrical-diagnosis`) — REVIEW_REQUIRED — other — Gate automation electrical; specialized
94. **Garden Electrical Fault Diagnosis** (`garden-electrical-fault-diagnosis`) — YELLOW — outdoor — Outdoor circuit faults
95. **Pool Area Electrical Inspection** (`pool-area-electrical-inspection`) — REVIEW_REQUIRED — outdoor — Wet-area electrical; heightened safety
96. **Backup Generator Changeover Inspection** (`backup-generator-changeover-inspection`) — REVIEW_REQUIRED — other — Generator ATS/changeover; specialized
97. **UPS Electrical Connection Inspection** (`ups-electrical-connection-inspection`) — REVIEW_REQUIRED — other — UPS integration inspection
98. **Three-Phase Supply Inspection** (`three-phase-supply-inspection`) — REVIEW_REQUIRED — commercial — Three-phase commercial inspection
99. **Phase Failure Diagnosis** (`phase-failure-diagnosis`) — YELLOW — commercial — Missing-phase / imbalance symptoms
100. **Neutral Fault Diagnosis** (`neutral-fault-diagnosis`) — RED — diagnosis — Dangerous neutral faults
101. **Electrical Overheating Investigation** (`electrical-overheating-investigation`) — RED — emergency — Thermal hazard investigation
102. **DB Labeling and Circuit Mapping** (`db-labeling-and-circuit-mapping`) — YELLOW — distribution — Documentation / identification service
103. **Temporary Power Setup** (`temporary-power-setup`) — REVIEW_REQUIRED — other — Temporary supply; controls needed
104. **Site Electrical Safety Check** (`site-electrical-safety-check`) — YELLOW — inspection — Pre-handover / site safety check

## Rejected

_None_

## Notes

- Quality determined count (not forced to 160).
- Appliance-specific electrical diagnosis remains under appliance parents (decision 4A).
- Building-side connections (AC isolator, cooker/WH connection) live under Electrical.
