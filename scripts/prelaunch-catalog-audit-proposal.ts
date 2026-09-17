/**
 * PRE-LAUNCH CATALOG AUDIT ONLY — no DB/seed mutation.
 * Generates proposal reports under docs/.
 */
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  APPROVED_CATEGORIES,
  APPROVED_CHILDREN,
  assertCatalogA1Counts,
  childSlug,
  nameToSlug,
} from "../prisma/data/catalog-a1";

type Risk = "GREEN" | "YELLOW" | "RED" | "REVIEW_REQUIRED";
type Action = "KEEP" | "ADD" | "MERGE" | "RENAME" | "MOVE" | "DEPRECATE";

type ProposedService = {
  categorySlug: string;
  categoryName: string;
  nameEn: string;
  slug: string;
  kind: "parent" | "child";
  action: Action;
  oldName?: string;
  oldSlug?: string;
  riskLevel: Risk;
  diyAvailable: boolean;
  duplicateStatus: string;
  reason: string;
  electricalArea?: string;
};

function riskDiy(risk: Risk): boolean {
  return risk === "GREEN" || risk === "YELLOW";
}

const counts = assertCatalogA1Counts();
const parentBySlug = new Map(APPROVED_CATEGORIES.map((c) => [c.slug, c]));

const baselineChildren: ProposedService[] = APPROVED_CHILDREN.map((c) => {
  const cat = parentBySlug.get(c.categorySlug)!;
  const slug = childSlug(c);
  // Conservative baseline risks for proposal (matrix is SoT historically; proposal may refine)
  let risk: Risk = "YELLOW";
  if (/inspection|cleaning|filter|skimming|testing|touch-up|observation/i.test(c.nameEn)) risk = "YELLOW";
  if (/replacement|installation|wiring|compressor|gas recharge|structural|heater maintenance|control board|pcb|fuse|element/i.test(c.nameEn))
    risk = "RED";
  if (/leakage detection|diagnosis|fault finding|short-circuit|electrical fault/i.test(c.nameEn)) risk = "YELLOW";
  if (/gas leakage|gas hose|gas valve|refrigerant|compressor replacement|wiring replacement|distribution board/i.test(c.nameEn))
    risk = "REVIEW_REQUIRED";
  return {
    categorySlug: c.categorySlug,
    categoryName: cat.nameEn,
    nameEn: c.nameEn,
    slug,
    kind: "child" as const,
    action: "KEEP" as const,
    oldName: c.nameEn,
    oldSlug: slug,
    riskLevel: risk,
    diyAvailable: riskDiy(risk),
    duplicateStatus: "unique",
    reason: "Existing approved baseline service",
  };
});

const baselineParents: ProposedService[] = APPROVED_CATEGORIES.map((c) => ({
  categorySlug: c.slug,
  categoryName: c.nameEn,
  nameEn: c.nameEn,
  slug: c.slug === "electrical" ? "electrical-maintenance" : nameToSlug(c.nameEn).replace(/-services$/, "-services") || c.slug,
  kind: "parent" as const,
  action: "KEEP" as const,
  oldName: c.nameEn,
  oldSlug: c.slug,
  riskLevel: "YELLOW" as Risk,
  diyAvailable: false,
  duplicateStatus: "parent-hub",
  reason: "Existing approved parent category — keep; no split/merge without stronger reason",
}));

// Fix parent hub slugs to match existing anchors where known
const PARENT_ANCHOR: Record<string, string> = {
  cleaning: "cleaning-services",
  "general-maintenance": "building-maintenance",
  plumbing: "plumbing-maintenance",
  electrical: "electrical-maintenance",
  ac: "ac-maintenance",
  painting: "painting-services",
  walls: "wall-maintenance",
  "swimming-pool": "swimming-pool-maintenance",
  sauna: "sauna-maintenance",
  "water-tank": "water-tank-cleaning",
  refrigerator: "refrigerator",
  microwave: "microwave",
  "washing-machine": "washing-machine",
  "water-heater": "water-heater",
  dishwasher: "dishwasher",
  gym: "gym-cleaning-maintenance",
  oven: "oven",
  "burner-cooker": "burner-cooker",
};
for (const p of baselineParents) {
  p.slug = PARENT_ANCHOR[p.categorySlug] || p.slug;
}

/** Quality-first Electrical additions — distinct intents only. */
const ELECTRICAL_ADDITIONS: Array<{
  nameEn: string;
  area: string;
  risk: Risk;
  reason: string;
}> = [
  // Inspection / diagnosis
  { nameEn: "Electrical Safety Inspection", area: "inspection", risk: "YELLOW", reason: "Distinct safety-focused inspection vs general inspection" },
  { nameEn: "Electrical Load Inspection", area: "inspection", risk: "YELLOW", reason: "Load assessment intent distinct from fault finding" },
  { nameEn: "Voltage Problem Diagnosis", area: "diagnosis", risk: "YELLOW", reason: "Customer voltage-fluctuation intent" },
  { nameEn: "Power Failure Diagnosis", area: "diagnosis", risk: "YELLOW", reason: "Whole/partial outage triage" },
  { nameEn: "Breaker Tripping Diagnosis", area: "diagnosis", risk: "YELLOW", reason: "Distinct from short-circuit diagnosis" },
  { nameEn: "No Power Diagnosis", area: "diagnosis", risk: "YELLOW", reason: "Common booking intent phrase" },
  { nameEn: "Partial Power Failure Diagnosis", area: "diagnosis", risk: "YELLOW", reason: "Circuit-level outage vs total failure" },
  { nameEn: "Ground Fault Diagnosis", area: "diagnosis", risk: "YELLOW", reason: "Earth leakage / GF intent" },
  { nameEn: "Burning Smell Electrical Investigation", area: "emergency", risk: "RED", reason: "High-risk investigation; no DIY procedure" },
  { nameEn: "Sparking Outlet Investigation", area: "emergency", risk: "RED", reason: "Immediate hazard investigation" },
  { nameEn: "Emergency Electrical Fault Repair", area: "emergency", risk: "RED", reason: "Emergency response offering" },

  // Earthing
  { nameEn: "Earthing Inspection", area: "earthing", risk: "YELLOW", reason: "Earthing health check" },
  { nameEn: "Earthing Repair", area: "earthing", risk: "RED", reason: "Protective earth work requires qualified work" },
  { nameEn: "Equipotential Bonding Inspection", area: "earthing", risk: "REVIEW_REQUIRED", reason: "Specialized bonding; regulated context possible" },

  // Sockets / switches
  { nameEn: "Socket Installation", area: "sockets-switches", risk: "RED", reason: "New point install ≠ replacement" },
  { nameEn: "Weatherproof Socket Installation", area: "sockets-switches", risk: "RED", reason: "Outdoor IP-rated socket work" },
  { nameEn: "Socket Relocation", area: "sockets-switches", risk: "RED", reason: "Position change / circuit work" },
  { nameEn: "Dimmer Switch Installation", area: "sockets-switches", risk: "RED", reason: "Distinct switch type install" },
  { nameEn: "Dimmer Switch Repair", area: "sockets-switches", risk: "YELLOW", reason: "Dimmer-specific fault" },
  { nameEn: "Two-Way Switch Installation", area: "sockets-switches", risk: "RED", reason: "Multiway switching scope" },
  { nameEn: "Isolator Switch Installation", area: "sockets-switches", risk: "RED", reason: "Appliance isolator point" },
  { nameEn: "Isolator Switch Replacement", area: "sockets-switches", risk: "RED", reason: "Isolator replacement" },

  // Lighting
  { nameEn: "Ceiling Light Installation", area: "lighting", risk: "RED", reason: "Fixture-specific install" },
  { nameEn: "Wall Light Installation", area: "lighting", risk: "RED", reason: "Fixture-specific install" },
  { nameEn: "Downlight Installation", area: "lighting", risk: "RED", reason: "Recessed lighting scope" },
  { nameEn: "Downlight Replacement", area: "lighting", risk: "YELLOW", reason: "Like-for-like recessed swap when safe" },
  { nameEn: "Chandelier Installation", area: "lighting", risk: "RED", reason: "Heavy fixture / structural fixings" },
  { nameEn: "Outdoor Light Installation", area: "outdoor", risk: "RED", reason: "Weather-exposed lighting" },
  { nameEn: "Outdoor Light Repair", area: "outdoor", risk: "YELLOW", reason: "Outdoor fixture repair" },
  { nameEn: "Garden Light Installation", area: "outdoor", risk: "RED", reason: "Landscape lighting install" },
  { nameEn: "Emergency Light Inspection", area: "lighting", risk: "YELLOW", reason: "Life-safety lighting check" },
  { nameEn: "Emergency Light Repair", area: "lighting", risk: "RED", reason: "Emergency lighting repair" },
  { nameEn: "Sensor Light Installation", area: "smart-sensor", risk: "RED", reason: "Sensor lighting install" },
  { nameEn: "Motion Sensor Installation", area: "smart-sensor", risk: "RED", reason: "Occupancy/motion control" },
  { nameEn: "Light Timer Installation", area: "smart-sensor", risk: "RED", reason: "Timer control install" },
  { nameEn: "Track Lighting Installation", area: "lighting", risk: "RED", reason: "Track system install" },
  { nameEn: "Staircase Lighting Repair", area: "building", risk: "YELLOW", reason: "Common-area stair lighting" },
  { nameEn: "Lobby Lighting Maintenance", area: "building", risk: "YELLOW", reason: "Lobby lighting maintenance" },

  // Wiring / circuits
  { nameEn: "Cable Replacement", area: "wiring", risk: "RED", reason: "Cable run replacement" },
  { nameEn: "Surface Wiring Installation", area: "wiring", risk: "RED", reason: "Surface conduit/wiring" },
  { nameEn: "Concealed Wiring Installation", area: "wiring", risk: "REVIEW_REQUIRED", reason: "In-wall works; higher risk/regulatory" },
  { nameEn: "Dedicated Circuit Installation", area: "wiring", risk: "RED", reason: "New circuit from DB" },
  { nameEn: "Cable Tray Installation", area: "commercial", risk: "RED", reason: "Commercial containment" },
  { nameEn: "Junction Box Repair", area: "wiring", risk: "RED", reason: "Joint/enclosure repair" },
  { nameEn: "Outdoor Junction Box Repair", area: "outdoor", risk: "RED", reason: "Weatherproof enclosure repair" },

  // Distribution / protection
  { nameEn: "Distribution Board Installation", area: "distribution", risk: "REVIEW_REQUIRED", reason: "Major DB work; authorized contractors" },
  { nameEn: "Distribution Board Upgrade", area: "distribution", risk: "REVIEW_REQUIRED", reason: "Capacity/upgrade scope" },
  { nameEn: "Distribution Board Repair", area: "distribution", risk: "RED", reason: "DB corrective work" },
  { nameEn: "MCB Installation", area: "protection", risk: "RED", reason: "MCB install distinct from inspection" },
  { nameEn: "MCB Replacement", area: "protection", risk: "RED", reason: "MCB like-for-like/upsize" },
  { nameEn: "MCCB Inspection", area: "protection", risk: "YELLOW", reason: "MCCB-focused inspection" },
  { nameEn: "MCCB Replacement", area: "protection", risk: "REVIEW_REQUIRED", reason: "Higher-capacity breaker work" },
  { nameEn: "RCCB Installation", area: "protection", risk: "RED", reason: "Residual current device install" },
  { nameEn: "RCCB Replacement", area: "protection", risk: "RED", reason: "RCCB replacement" },
  { nameEn: "RCBO Installation", area: "protection", risk: "RED", reason: "Combined RCD/MCB device" },
  { nameEn: "RCBO Replacement", area: "protection", risk: "RED", reason: "RCBO replacement" },
  { nameEn: "Surge Protection Device Installation", area: "protection", risk: "RED", reason: "SPD install" },
  { nameEn: "Neutral Link Replacement", area: "distribution", risk: "RED", reason: "DB neutral hardware" },

  // Fans
  { nameEn: "Ceiling Fan Installation", area: "fans", risk: "RED", reason: "Ceiling fan mount/electrical" },
  { nameEn: "Ceiling Fan Repair", area: "fans", risk: "YELLOW", reason: "Fan repair intent" },
  { nameEn: "Ceiling Fan Replacement", area: "fans", risk: "RED", reason: "Full fan swap" },
  { nameEn: "Exhaust Fan Installation", area: "fans", risk: "RED", reason: "Exhaust fan install" },
  { nameEn: "Exhaust Fan Repair", area: "fans", risk: "YELLOW", reason: "Exhaust fan repair" },
  { nameEn: "Exhaust Fan Replacement", area: "fans", risk: "RED", reason: "Exhaust fan swap" },
  { nameEn: "Wall Fan Installation", area: "fans", risk: "RED", reason: "Wall fan install" },
  { nameEn: "Wall Fan Repair", area: "fans", risk: "YELLOW", reason: "Wall fan repair" },

  // Motors / controls (building)
  { nameEn: "Water Pump Motor Electrical Repair", area: "motors", risk: "RED", reason: "Pump motor electrical — not appliance category" },
  { nameEn: "Motor Starter Repair", area: "motors", risk: "RED", reason: "Starter gear repair" },
  { nameEn: "Contactor Replacement", area: "controls", risk: "RED", reason: "Control gear replacement" },
  { nameEn: "Overload Relay Replacement", area: "controls", risk: "RED", reason: "Motor protection relay" },
  { nameEn: "Timer Switch Installation", area: "controls", risk: "RED", reason: "Electromechanical/digital timer" },
  { nameEn: "Timer Switch Repair", area: "controls", risk: "YELLOW", reason: "Timer fault repair" },
  { nameEn: "Electrical Control Panel Inspection", area: "controls", risk: "YELLOW", reason: "Panel inspection" },
  { nameEn: "Electrical Control Panel Repair", area: "controls", risk: "REVIEW_REQUIRED", reason: "Panel repair may be specialized" },

  // Building / commercial / preventive
  { nameEn: "Common Area Electrical Maintenance", area: "building", risk: "YELLOW", reason: "Shared-area electrical maintenance" },
  { nameEn: "Parking Area Electrical Maintenance", area: "building", risk: "YELLOW", reason: "Parking electrical maintenance" },
  { nameEn: "Building Electrical Preventive Maintenance", area: "preventive", risk: "YELLOW", reason: "Scheduled building electrical PM" },
  { nameEn: "Preventive Electrical Maintenance", area: "preventive", risk: "YELLOW", reason: "General preventive electrical" },
  { nameEn: "Scheduled Electrical Inspection", area: "preventive", risk: "YELLOW", reason: "Recurring inspection contracts" },
  { nameEn: "Commercial Electrical Maintenance", area: "commercial", risk: "YELLOW", reason: "Commercial property electrical" },
  { nameEn: "Office Electrical Fault Diagnosis", area: "commercial", risk: "YELLOW", reason: "Office fault intent" },
  { nameEn: "Shop Electrical Inspection", area: "commercial", risk: "YELLOW", reason: "Retail unit inspection" },

  // Smart
  { nameEn: "Smart Switch Installation", area: "smart-sensor", risk: "RED", reason: "Smart switch install" },
  { nameEn: "Smart Switch Replacement", area: "smart-sensor", risk: "RED", reason: "Smart switch swap" },
  { nameEn: "Smart Lighting Setup", area: "smart-sensor", risk: "YELLOW", reason: "Commissioning/setup of smart lights" },

  // Appliance connections (building-side; appliance diagnosis stays under appliances)
  { nameEn: "Electrical Appliance Point Installation", area: "connections", risk: "RED", reason: "New appliance supply point" },
  { nameEn: "AC Isolator Installation", area: "connections", risk: "RED", reason: "AC isolator — building electrical" },
  { nameEn: "Water Heater Electrical Connection", area: "connections", risk: "REVIEW_REQUIRED", reason: "Fixed appliance connection; safety review" },
  { nameEn: "Cooker Electrical Connection", area: "connections", risk: "REVIEW_REQUIRED", reason: "Cooker circuit connection; safety review" },

  // Other legitimate
  { nameEn: "Doorbell Installation", area: "other", risk: "YELLOW", reason: "Low-voltage/doorbell install" },
  { nameEn: "Doorbell Repair", area: "other", risk: "GREEN", reason: "Often low-risk observation/simple repair path" },
  { nameEn: "Intercom Power Supply Repair", area: "other", risk: "YELLOW", reason: "Intercom PSU electrical" },
  { nameEn: "Electric Gate Motor Electrical Diagnosis", area: "other", risk: "REVIEW_REQUIRED", reason: "Gate automation electrical; specialized" },
  { nameEn: "Garden Electrical Fault Diagnosis", area: "outdoor", risk: "YELLOW", reason: "Outdoor circuit faults" },
  { nameEn: "Pool Area Electrical Inspection", area: "outdoor", risk: "REVIEW_REQUIRED", reason: "Wet-area electrical; heightened safety" },
  { nameEn: "Backup Generator Changeover Inspection", area: "other", risk: "REVIEW_REQUIRED", reason: "Generator ATS/changeover; specialized" },
  { nameEn: "UPS Electrical Connection Inspection", area: "other", risk: "REVIEW_REQUIRED", reason: "UPS integration inspection" },
  { nameEn: "Three-Phase Supply Inspection", area: "commercial", risk: "REVIEW_REQUIRED", reason: "Three-phase commercial inspection" },
  { nameEn: "Phase Failure Diagnosis", area: "commercial", risk: "YELLOW", reason: "Missing-phase / imbalance symptoms" },
  { nameEn: "Neutral Fault Diagnosis", area: "diagnosis", risk: "RED", reason: "Dangerous neutral faults" },
  { nameEn: "Electrical Overheating Investigation", area: "emergency", risk: "RED", reason: "Thermal hazard investigation" },
  { nameEn: "DB Labeling and Circuit Mapping", area: "distribution", risk: "YELLOW", reason: "Documentation / identification service" },
  { nameEn: "Temporary Power Setup", area: "other", risk: "REVIEW_REQUIRED", reason: "Temporary supply; controls needed" },
  { nameEn: "Site Electrical Safety Check", area: "inspection", risk: "YELLOW", reason: "Pre-handover / site safety check" },
];

const existingElectricalSlugs = new Set(
  baselineChildren.filter((c) => c.categorySlug === "electrical").map((c) => c.slug),
);
const existingElectricalNames = new Set(
  baselineChildren.filter((c) => c.categorySlug === "electrical").map((c) => c.nameEn.toLowerCase()),
);

const electricalAdds: ProposedService[] = [];
const rejectedElectrical: Array<{ nameEn: string; reason: string }> = [];

for (const item of ELECTRICAL_ADDITIONS) {
  const slug = nameToSlug(item.nameEn);
  if (existingElectricalSlugs.has(slug) || existingElectricalNames.has(item.nameEn.toLowerCase())) {
    rejectedElectrical.push({ nameEn: item.nameEn, reason: "Duplicates existing electrical service" });
    continue;
  }
  if (electricalAdds.some((a) => a.slug === slug || a.nameEn.toLowerCase() === item.nameEn.toLowerCase())) {
    rejectedElectrical.push({ nameEn: item.nameEn, reason: "Duplicate within proposal list" });
    continue;
  }
  electricalAdds.push({
    categorySlug: "electrical",
    categoryName: "Electrical Maintenance",
    nameEn: item.nameEn,
    slug,
    kind: "child",
    action: "ADD",
    riskLevel: item.risk,
    diyAvailable: riskDiy(item.risk),
    duplicateStatus: "unique",
    reason: item.reason,
    electricalArea: item.area,
  });
}

/** Non-electrical category proposals */
const otherAdds: ProposedService[] = [
  // Cleaning
  { categorySlug: "cleaning", categoryName: "Cleaning Services", nameEn: "Curtain & Blind Cleaning", slug: "curtain-and-blind-cleaning", kind: "child", action: "ADD", riskLevel: "GREEN", diyAvailable: true, duplicateStatus: "unique", reason: "Common UAE soft-furnishing cleaning intent" },
  { categorySlug: "cleaning", categoryName: "Cleaning Services", nameEn: "Balcony Cleaning", slug: "balcony-cleaning", kind: "child", action: "ADD", riskLevel: "GREEN", diyAvailable: true, duplicateStatus: "unique", reason: "Distinct outdoor living-area cleaning" },
  { categorySlug: "cleaning", categoryName: "Cleaning Services", nameEn: "Staircase Cleaning", slug: "staircase-cleaning", kind: "child", action: "ADD", riskLevel: "GREEN", diyAvailable: true, duplicateStatus: "unique", reason: "Common-area stair cleaning" },
  // General
  { categorySlug: "general-maintenance", categoryName: "General Building Maintenance", nameEn: "Gate Repair", slug: "gate-repair", kind: "child", action: "ADD", riskLevel: "YELLOW", diyAvailable: true, duplicateStatus: "unique", reason: "Mechanical gate repair (non-electrical)" },
  { categorySlug: "general-maintenance", categoryName: "General Building Maintenance", nameEn: "False Ceiling Repair", slug: "false-ceiling-repair", kind: "child", action: "ADD", riskLevel: "YELLOW", diyAvailable: true, duplicateStatus: "unique", reason: "Gypsum/false ceiling corrective work" },
  { categorySlug: "general-maintenance", categoryName: "General Building Maintenance", nameEn: "Tile Repair", slug: "tile-repair", kind: "child", action: "ADD", riskLevel: "YELLOW", diyAvailable: true, duplicateStatus: "unique", reason: "Loose/broken tile repair" },
  { categorySlug: "general-maintenance", categoryName: "General Building Maintenance", nameEn: "Handrail Repair", slug: "handrail-repair", kind: "child", action: "ADD", riskLevel: "YELLOW", diyAvailable: true, duplicateStatus: "unique", reason: "Stair/balcony handrail repair" },
  // Plumbing
  { categorySlug: "plumbing", categoryName: "Plumbing Maintenance", nameEn: "Grease Trap Cleaning", slug: "grease-trap-cleaning", kind: "child", action: "ADD", riskLevel: "YELLOW", diyAvailable: false, duplicateStatus: "unique", reason: "Kitchen grease trap service" },
  { categorySlug: "plumbing", categoryName: "Plumbing Maintenance", nameEn: "Mixer Tap Replacement", slug: "mixer-tap-replacement", kind: "child", action: "ADD", riskLevel: "YELLOW", diyAvailable: true, duplicateStatus: "unique", reason: "Distinct from faucet repair/replacement wording used for mixers" },
  { categorySlug: "plumbing", categoryName: "Plumbing Maintenance", nameEn: "Sump Pump Inspection", slug: "sump-pump-inspection", kind: "child", action: "ADD", riskLevel: "YELLOW", diyAvailable: true, duplicateStatus: "unique", reason: "Drainage sump inspection" },
  { categorySlug: "plumbing", categoryName: "Plumbing Maintenance", nameEn: "Hot Water Line Repair", slug: "hot-water-line-repair", kind: "child", action: "ADD", riskLevel: "RED", diyAvailable: false, duplicateStatus: "unique", reason: "Hot line repair distinct from general pipe repair" },
  { categorySlug: "plumbing", categoryName: "Plumbing Maintenance", nameEn: "Bidet Installation", slug: "bidet-installation", kind: "child", action: "ADD", riskLevel: "YELLOW", diyAvailable: false, duplicateStatus: "unique", reason: "Common UAE bathroom fixture install" },
  // AC
  { categorySlug: "ac", categoryName: "AC / Air Conditioning Maintenance", nameEn: "Cassette AC Maintenance", slug: "cassette-ac-maintenance", kind: "child", action: "ADD", riskLevel: "YELLOW", diyAvailable: true, duplicateStatus: "unique", reason: "Cassette form-factor maintenance" },
  { categorySlug: "ac", categoryName: "AC / Air Conditioning Maintenance", nameEn: "Window AC Maintenance", slug: "window-ac-maintenance", kind: "child", action: "ADD", riskLevel: "YELLOW", diyAvailable: true, duplicateStatus: "unique", reason: "Window unit maintenance" },
  { categorySlug: "ac", categoryName: "AC / Air Conditioning Maintenance", nameEn: "AC Thermostat Repair", slug: "ac-thermostat-repair", kind: "child", action: "ADD", riskLevel: "YELLOW", diyAvailable: true, duplicateStatus: "unique", reason: "Control/thermostat intent" },
  { categorySlug: "ac", categoryName: "AC / Air Conditioning Maintenance", nameEn: "AC Capacitor Replacement", slug: "ac-capacitor-replacement", kind: "child", action: "ADD", riskLevel: "RED", diyAvailable: false, duplicateStatus: "unique", reason: "Live capacitor work — RED" },
  { categorySlug: "ac", categoryName: "AC / Air Conditioning Maintenance", nameEn: "AC PCB Diagnosis", slug: "ac-pcb-diagnosis", kind: "child", action: "ADD", riskLevel: "RED", diyAvailable: false, duplicateStatus: "unique", reason: "Board-level diagnosis" },
  // Painting
  { categorySlug: "painting", categoryName: "Painting Services", nameEn: "Anti-Fungal Painting", slug: "anti-fungal-painting", kind: "child", action: "ADD", riskLevel: "YELLOW", diyAvailable: true, duplicateStatus: "unique", reason: "Humidity-driven coating intent" },
  { categorySlug: "painting", categoryName: "Painting Services", nameEn: "Bathroom Moisture-Resistant Painting", slug: "bathroom-moisture-resistant-painting", kind: "child", action: "ADD", riskLevel: "YELLOW", diyAvailable: true, duplicateStatus: "unique", reason: "Wet-area paint system" },
  { categorySlug: "painting", categoryName: "Painting Services", nameEn: "Gate Painting", slug: "gate-painting", kind: "child", action: "ADD", riskLevel: "YELLOW", diyAvailable: true, duplicateStatus: "unique", reason: "Metal gate coating" },
  { categorySlug: "painting", categoryName: "Painting Services", nameEn: "Parking Floor Painting", slug: "parking-floor-painting", kind: "child", action: "ADD", riskLevel: "YELLOW", diyAvailable: false, duplicateStatus: "unique", reason: "Floor marking/coating" },
  // Walls
  { categorySlug: "walls", categoryName: "Wall Maintenance & Repair", nameEn: "Skirting Repair", slug: "skirting-repair", kind: "child", action: "ADD", riskLevel: "YELLOW", diyAvailable: true, duplicateStatus: "unique", reason: "Skirting/baseboard repair" },
  { categorySlug: "walls", categoryName: "Wall Maintenance & Repair", nameEn: "Cornice Repair", slug: "cornice-repair", kind: "child", action: "ADD", riskLevel: "YELLOW", diyAvailable: true, duplicateStatus: "unique", reason: "Cornice/coving repair" },
  { categorySlug: "walls", categoryName: "Wall Maintenance & Repair", nameEn: "Wallpaper Removal", slug: "wallpaper-removal", kind: "child", action: "ADD", riskLevel: "YELLOW", diyAvailable: true, duplicateStatus: "unique", reason: "Surface prep adjacent to walls" },
  // Pool
  { categorySlug: "swimming-pool", categoryName: "Swimming Pool Cleaning & Maintenance", nameEn: "Commercial Pool Maintenance", slug: "commercial-pool-maintenance", kind: "child", action: "ADD", riskLevel: "YELLOW", diyAvailable: false, duplicateStatus: "unique", reason: "Commercial vs residential pool" },
  { categorySlug: "swimming-pool", categoryName: "Swimming Pool Cleaning & Maintenance", nameEn: "Pool Cover Repair", slug: "pool-cover-repair", kind: "child", action: "ADD", riskLevel: "YELLOW", diyAvailable: true, duplicateStatus: "unique", reason: "Cover hardware/material repair" },
  { categorySlug: "swimming-pool", categoryName: "Swimming Pool Cleaning & Maintenance", nameEn: "Pool Lighting Repair", slug: "pool-lighting-repair", kind: "child", action: "ADD", riskLevel: "REVIEW_REQUIRED", diyAvailable: false, duplicateStatus: "unique", reason: "Wet-niche lighting — safety review; stays under pool for customer intent" },
  // Sauna
  { categorySlug: "sauna", categoryName: "Sauna Room Cleaning & Maintenance", nameEn: "Sauna Preventive Maintenance", slug: "sauna-preventive-maintenance", kind: "child", action: "ADD", riskLevel: "YELLOW", diyAvailable: true, duplicateStatus: "unique", reason: "Scheduled sauna PM offering" },
  // Water tank
  { categorySlug: "water-tank", categoryName: "Water Tank Cleaning & Maintenance", nameEn: "Water Tank Pump Inspection", slug: "water-tank-pump-inspection", kind: "child", action: "ADD", riskLevel: "YELLOW", diyAvailable: true, duplicateStatus: "unique", reason: "Associated booster/pump check" },
  // Refrigerator / microwave etc — keep electrical diagnosis under appliances (4A); light gap fills only
  { categorySlug: "refrigerator", categoryName: "Refrigerator Maintenance / Repair", nameEn: "Refrigerator Preventive Maintenance", slug: "refrigerator-preventive-maintenance", kind: "child", action: "ADD", riskLevel: "YELLOW", diyAvailable: true, duplicateStatus: "unique", reason: "PM offering gap" },
  { categorySlug: "microwave", categoryName: "Microwave Maintenance / Repair", nameEn: "Microwave Preventive Maintenance", slug: "microwave-preventive-maintenance", kind: "child", action: "ADD", riskLevel: "YELLOW", diyAvailable: true, duplicateStatus: "unique", reason: "PM offering gap" },
  { categorySlug: "dishwasher", categoryName: "Dishwasher Maintenance / Repair", nameEn: "Dishwasher Installation", slug: "dishwasher-installation", kind: "child", action: "ADD", riskLevel: "RED", diyAvailable: false, duplicateStatus: "unique", reason: "Install intent missing" },
  { categorySlug: "washing-machine", categoryName: "Washing Machine Maintenance / Repair", nameEn: "Washing Machine Installation", slug: "washing-machine-installation", kind: "child", action: "ADD", riskLevel: "RED", diyAvailable: false, duplicateStatus: "unique", reason: "Install intent missing" },
  { categorySlug: "water-heater", categoryName: "Water Heater Maintenance / Repair", nameEn: "Water Heater Installation", slug: "water-heater-installation", kind: "child", action: "ADD", riskLevel: "REVIEW_REQUIRED", diyAvailable: false, duplicateStatus: "unique", reason: "Install/fix appliance; RR" },
  { categorySlug: "oven", categoryName: "Oven Maintenance / Repair", nameEn: "Oven Installation", slug: "oven-installation", kind: "child", action: "ADD", riskLevel: "REVIEW_REQUIRED", diyAvailable: false, duplicateStatus: "unique", reason: "Built-in oven install; RR" },
  { categorySlug: "gym", categoryName: "Gym Cleaning & Maintenance", nameEn: "Gym Mirror Cleaning", slug: "gym-mirror-cleaning", kind: "child", action: "ADD", riskLevel: "GREEN", diyAvailable: true, duplicateStatus: "unique", reason: "Distinct from glass cleaning in gym context" },
  { categorySlug: "burner-cooker", categoryName: "Burner / Cooker Maintenance / Repair", nameEn: "Gas Cooker Installation", slug: "gas-cooker-installation", kind: "child", action: "ADD", riskLevel: "REVIEW_REQUIRED", diyAvailable: false, duplicateStatus: "unique", reason: "Gas appliance install; RR" },
];

const mergeProposals = [
  {
    keep: "Recurring Cleaning",
    keepSlug: "recurring-cleaning",
    mergeAway: "Regular Cleaning",
    mergeAwaySlug: "regular-cleaning",
    category: "cleaning",
    reason: "Near-identical booking intent (scheduled/recurring). Keep Recurring Cleaning as canonical.",
  },
  {
    keep: "Water Tank Disinfection",
    keepSlug: "water-tank-disinfection",
    mergeAway: "Water Tank Sanitization",
    mergeAwaySlug: "water-tank-sanitization",
    category: "water-tank",
    reason: "Substantially identical chemical sanitation intent. Keep Disinfection as canonical.",
  },
  {
    keep: "Damp Wall Repair",
    keepSlug: "damp-wall-repair",
    mergeAway: "Moisture Damage Repair",
    mergeAwaySlug: "moisture-damage-repair",
    category: "walls",
    reason: "High overlap; damp/moisture wall corrective work. Keep Damp Wall Repair; redirect moisture naming.",
  },
  {
    keep: "Minor Building Repairs",
    keepSlug: "minor-building-repairs",
    mergeAway: "General Property Repair",
    mergeAwaySlug: "general-property-repair",
    category: "general-maintenance",
    reason: "Broad catch-all overlap. Prefer Minor Building Repairs; handyman remains separate.",
  },
];

const renameProposals = [
  {
    oldName: "Electrical Fault Finding",
    oldSlug: "electrical-fault-finding",
    newName: "Electrical Fault Diagnosis",
    newSlug: "electrical-fault-diagnosis",
    reason: "Aligns terminology with other diagnosis offerings; clearer customer language. Pre-launch OK to change.",
  },
];

const nearDuplicateNotes = [
  { pair: ["House Cleaning", "Residential Cleaning"], action: "KEEP_BOTH", note: "House vs residential class still useful for UAE villa/apartment marketing; monitor overlap." },
  { pair: ["Window Cleaning", "Glass Cleaning"], action: "KEEP_BOTH", note: "Window assemblies vs general glass/partitions." },
  { pair: ["One-Time Cleaning", "Deep Cleaning"], action: "KEEP_BOTH", note: "Visit pattern vs intensity." },
  { pair: ["Interior Painting", "Wall Painting"], action: "KEEP_BOTH", note: "Scope (interior suite) vs surface (walls)." },
  { pair: ["Residential Painting", "Villa Painting", "Apartment Painting"], action: "KEEP_ALL", note: "Property-type intents remain commercially useful." },
  { pair: ["AC Gas Check", "AC Gas Recharge"], action: "KEEP_BOTH", note: "Diagnosis/check vs refrigerant work." },
  { pair: ["Gym Sanitization", "Gym Disinfection"], action: "KEEP_BOTH_FOR_NOW", note: "Similar; future merge candidate if content converges." },
  { pair: ["Light Installation", "LED Light Installation"], action: "KEEP_BOTH", note: "General vs LED-specific customer search." },
  { pair: ["Light Repair", "LED Light Replacement"], action: "KEEP_BOTH", note: "Repair vs replace LED emitters/fixtures." },
  { pair: ["Preventive Electrical Maintenance", "Building Electrical Preventive Maintenance"], action: "KEEP_BOTH", note: "Unit/home PM vs building-wide PM contracts." },
];

// Apply merges as DEPRECATE on mergeAway in final set
const deprecatedSlugs = new Set(mergeProposals.map((m) => m.mergeAwaySlug));
const renameMap = new Map(renameProposals.map((r) => [r.oldSlug, r]));

const adjustedBaseline = baselineChildren
  .filter((c) => !deprecatedSlugs.has(c.slug))
  .map((c) => {
    const ren = renameMap.get(c.slug);
    if (!ren) return c;
    return {
      ...c,
      action: "RENAME" as Action,
      nameEn: ren.newName,
      slug: ren.newSlug,
      oldName: ren.oldName,
      oldSlug: ren.oldSlug,
      reason: ren.reason,
    };
  });

const deprecatedRows: ProposedService[] = mergeProposals.map((m) => {
  const old = baselineChildren.find((c) => c.slug === m.mergeAwaySlug)!;
  return {
    ...old,
    action: "DEPRECATE",
    duplicateStatus: `merge-into:${m.keepSlug}`,
    reason: m.reason,
  };
});

// Assemble final proposed children
const finalChildrenMap = new Map<string, ProposedService>();
for (const c of adjustedBaseline) finalChildrenMap.set(c.slug, c);
for (const c of electricalAdds) finalChildrenMap.set(c.slug, c);
for (const c of otherAdds) {
  if (finalChildrenMap.has(c.slug)) continue;
  finalChildrenMap.set(c.slug, c);
}

const finalChildren = [...finalChildrenMap.values()].sort((a, b) =>
  a.categorySlug === b.categorySlug ? a.nameEn.localeCompare(b.nameEn) : a.categorySlug.localeCompare(b.categorySlug),
);

const finalParents = baselineParents;
const finalTotal = finalParents.length + finalChildren.length;

const byCat: Record<string, number> = {};
for (const c of finalChildren) byCat[c.categorySlug] = (byCat[c.categorySlug] || 0) + 1;

const electricalFinal = finalChildren.filter((c) => c.categorySlug === "electrical");
const riskCounts = { GREEN: 0, YELLOW: 0, RED: 0, REVIEW_REQUIRED: 0 };
for (const c of finalChildren) riskCounts[c.riskLevel] += 1;

const slugSet = new Set(finalChildren.map((c) => c.slug));
const nameSet = new Set(finalChildren.map((c) => c.nameEn.toLowerCase()));
const dupSlugs = finalChildren.length - slugSet.size;
const dupNames = finalChildren.length - nameSet.size;

const docs = join(process.cwd(), "docs");

const summary = {
  phase: "PRE-LAUNCH_CATALOG_AUDIT_ONLY",
  generatedAt: new Date().toISOString(),
  mutations: {
    database: false,
    seed: false,
    publicContent: false,
    serviceLocation: false,
    arabic: false,
    blog: false,
    sitemapIndexing: false,
  },
  decisions: { mode: "1A", electrical: "2C", categories: "3B", applianceElectrical: "4A" },
  old: { parents: counts.parents, children: counts.children, total: counts.offerings, electricalChildren: 17 },
  proposed: {
    parents: finalParents.length,
    children: finalChildren.length,
    total: finalTotal,
    electricalChildren: electricalFinal.length,
    electricalAdded: electricalAdds.length,
    otherAdded: otherAdds.length,
    mergedAway: mergeProposals.length,
    renamed: renameProposals.length,
    childrenByCategory: byCat,
    riskCounts,
    duplicateSlugs: dupSlugs,
    duplicateNames: dupNames,
  },
  rejectedElectrical,
  mergeProposals,
  renameProposals,
  nearDuplicateNotes,
  parentArchitecture: finalParents.map((p) => ({
    action: "KEEP",
    slug: p.slug,
    categorySlug: p.categorySlug,
    name: p.nameEn,
    reason: p.reason,
  })),
};

writeFileSync(join(docs, "final-service-catalog.json"), JSON.stringify({ summary, parents: finalParents, children: finalChildren, deprecated: deprecatedRows }, null, 2));

function csvEscape(s: string) {
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

const csvHeader =
  "serviceId,oldName,newName,oldSlug,newSlug,oldCategory,newCategory,action,reason,riskLevel,diyAvailable,duplicateStatus,legacyStatus,seoStatus,finalStatus,kind,electricalArea\n";
const allForCsv = [...finalParents, ...finalChildren, ...deprecatedRows];
const csvBody = allForCsv
  .map((r, i) =>
    [
      `prop-${i + 1}`,
      r.oldName || "",
      r.nameEn,
      r.oldSlug || "",
      r.slug,
      r.categorySlug,
      r.categorySlug,
      r.action,
      r.reason,
      r.riskLevel,
      r.diyAvailable,
      r.duplicateStatus,
      "n/a-audit",
      "proposed",
      r.action === "DEPRECATE" ? "deprecated-proposal" : "proposed-approved",
      r.kind,
      r.electricalArea || "",
    ]
      .map((x) => csvEscape(String(x)))
      .join(","),
  )
  .join("\n");
writeFileSync(join(docs, "final-service-catalog.csv"), csvHeader + csvBody + "\n");

const changes = {
  generatedAt: summary.generatedAt,
  oldTotal: 311,
  proposedTotal: finalTotal,
  electricalOld: 17,
  electricalNew: electricalFinal.length,
  electricalAdded: electricalAdds.length,
  otherAdded: otherAdds.length,
  merges: mergeProposals,
  renames: renameProposals,
  deprecated: deprecatedRows.map((d) => ({ name: d.nameEn, slug: d.slug, reason: d.reason })),
  addedElectrical: electricalAdds,
  addedOther: otherAdds,
  nearDuplicates: nearDuplicateNotes,
  rejectedElectrical,
};
writeFileSync(join(docs, "final-service-changes.json"), JSON.stringify(changes, null, 2));

writeFileSync(
  join(docs, "electrical-service-expansion.json"),
  JSON.stringify(
    {
      oldCount: 17,
      newCount: electricalFinal.length,
      addedCount: electricalAdds.length,
      keptExisting: 17 - (renameProposals.some((r) => r.oldSlug === "electrical-fault-finding") ? 0 : 0),
      // existing keep 17 with optional rename of fault finding
      existingKept: electricalFinal.filter((c) => c.action === "KEEP" || c.action === "RENAME").length,
      added: electricalAdds,
      rejected: rejectedElectrical,
      byArea: electricalAdds.reduce((acc: Record<string, number>, s) => {
        const a = s.electricalArea || "other";
        acc[a] = (acc[a] || 0) + 1;
        return acc;
      }, {}),
      riskOnElectrical: electricalFinal.reduce((acc: Record<string, number>, s) => {
        acc[s.riskLevel] = (acc[s.riskLevel] || 0) + 1;
        return acc;
      }, {}),
    },
    null,
    2,
  ),
);

const elecCsv =
  "name,slug,area,action,riskLevel,diyAvailable,duplicateCheck,regulatoryReview,reason\n" +
  electricalFinal
    .map((s) =>
      [s.nameEn, s.slug, s.electricalArea || "existing", s.action, s.riskLevel, s.diyAvailable, s.duplicateStatus, s.riskLevel === "REVIEW_REQUIRED" ? "required" : "standard", s.reason]
        .map((x) => csvEscape(String(x)))
        .join(","),
    )
    .join("\n") +
  "\n";
writeFileSync(join(docs, "electrical-service-expansion.csv"), elecCsv);

const elecMd = `# Electrical service expansion (proposal)

**Audit only — no DB/seed mutation.**

| Metric | Count |
|--------|------:|
| Old electrical children | 17 |
| Proposed electrical children | **${electricalFinal.length}** |
| Newly added | **${electricalAdds.length}** |
| Rejected as duplicate in proposal | ${rejectedElectrical.length} |

## Safety on proposed Electrical set

\`\`\`json
${JSON.stringify(
  electricalFinal.reduce((acc: Record<string, number>, s) => {
    acc[s.riskLevel] = (acc[s.riskLevel] || 0) + 1;
    return acc;
  }, {}),
  null,
  2,
)}
\`\`\`

## Existing 17 (kept; optional rename)

Fault finding may be renamed to **Electrical Fault Diagnosis** (see changes report).

## Added services (${electricalAdds.length})

${electricalAdds.map((s, i) => `${i + 1}. **${s.nameEn}** (\`${s.slug}\`) — ${s.riskLevel} — ${s.electricalArea} — ${s.reason}`).join("\n")}

## Rejected

${rejectedElectrical.length ? rejectedElectrical.map((r) => `- ${r.nameEn}: ${r.reason}`).join("\n") : "_None_"}

## Notes

- Quality determined count (not forced to 160).
- Appliance-specific electrical diagnosis remains under appliance parents (decision 4A).
- Building-side connections (AC isolator, cooker/WH connection) live under Electrical.
`;
writeFileSync(join(docs, "electrical-service-expansion.md"), elecMd);

const auditMd = `# Final service catalog audit (PRE-LAUNCH PROPOSAL)

**Status:** Audit + proposal only.  
**No** database mutation · **No** seed mutation · **No** public content · **No** ServiceLocation expansion · **No** Arabic/Blog/sitemap indexing changes.

## Locked decisions

- **1A** Audit/proposal only  
- **2C** Electrical count from audit quality  
- **3B** Full 18-category audit  
- **4A** Appliance electrical diagnosis stays under appliances  

## Baseline → Proposed

| | OLD | PROPOSED |
|--|----:|---------:|
| Parents | 18 | **${finalParents.length}** |
| Children | 293 | **${finalChildren.length}** |
| Total offerings | 311 | **${finalTotal}** |
| Electrical children | 17 | **${electricalFinal.length}** |

### Deltas

| Change | Count |
|--------|------:|
| Electrical added | ${electricalAdds.length} |
| Other categories added | ${otherAdds.length} |
| Merged away (deprecate) | ${mergeProposals.length} |
| Renamed | ${renameProposals.length} |

Net children math check: 293 + ${electricalAdds.length} + ${otherAdds.length} - ${mergeProposals.length} = **${293 + electricalAdds.length + otherAdds.length - mergeProposals.length}** (must equal ${finalChildren.length})

## Parents (18) — KEEP all

No parent split/merge recommended in this audit. Hubs remain commercially clear.

${finalParents.map((p, i) => `${i + 1}. ${p.nameEn} (\`${p.categorySlug}\` / anchor \`${p.slug}\`) — KEEP`).join("\n")}

## Children by category (proposed)

${Object.entries(byCat)
  .sort((a, b) => a[0].localeCompare(b[0]))
  .map(([k, v]) => `- **${k}**: ${v}`)
  .join("\n")}

## Safety totals (proposed children)

| Risk | Count |
|------|------:|
| GREEN | ${riskCounts.GREEN} |
| YELLOW | ${riskCounts.YELLOW} |
| RED | ${riskCounts.RED} |
| REVIEW_REQUIRED | ${riskCounts.REVIEW_REQUIRED} |

> Baseline risk values for existing services are **proposal heuristics** for planning. Historical DIY matrix (\`diy-classification-matrix-311.json\`) remains the audit history SoT until a future apply phase rebuilds \`diy-classification-matrix-FINAL.*\`.

## Merges proposed

${mergeProposals.map((m) => `- MERGE \`${m.mergeAwaySlug}\` → \`${m.keepSlug}\` — ${m.reason}`).join("\n")}

## Renames proposed

${renameProposals.map((r) => `- \`${r.oldSlug}\` → \`${r.newSlug}\` (${r.oldName} → ${r.newName}) — ${r.reason}`).join("\n")}

## Near-duplicates kept (with rationale)

${nearDuplicateNotes.map((n) => `- ${n.pair.join(" / ")} — **${n.action}** — ${n.note}`).join("\n")}

## Appliance electrical (4A)

Kept under appliance categories (not moved to Electrical):

- Refrigerator Electrical Fault Diagnosis  
- Microwave Electrical Diagnosis  
- Water Heater Electrical Fault Diagnosis  
- Oven Electrical Fault Diagnosis  

Building-side connection work proposed under Electrical instead (e.g. AC Isolator Installation, Cooker Electrical Connection).

## Validation (proposal)

| Check | Result |
|-------|--------|
| Duplicate child slugs | **${dupSlugs}** |
| Duplicate child names | **${dupNames}** |
| Parents | ${finalParents.length} |
| Children | ${finalChildren.length} |
| Total | ${finalTotal} |
| Forced 311? | No |
| Forced 454? | No |
| Forced Electrical 160? | No (landed **${electricalFinal.length}**) |

## STOP

This phase stops at audit + proposal artifacts:

- \`docs/final-service-catalog-audit.md\`
- \`docs/final-service-catalog.json\`
- \`docs/final-service-catalog.csv\`
- \`docs/final-service-changes.md\`
- \`docs/final-service-changes.json\`
- \`docs/electrical-service-expansion.md\`
- \`docs/electrical-service-expansion.json\`
- \`docs/electrical-service-expansion.csv\`

**Next (requires explicit approval):** apply phase to seed/DB + DIY matrix FINAL — not started.
`;

writeFileSync(join(docs, "final-service-catalog-audit.md"), auditMd);

const changesMd = `# Final service changes (proposal)

Old total **311** → Proposed total **${finalTotal}**  
Electrical **17** → **${electricalFinal.length}** (+${electricalAdds.length})

## Merges
${mergeProposals.map((m) => `- ${m.mergeAway} → ${m.keep}`).join("\n")}

## Renames
${renameProposals.map((r) => `- ${r.oldName} → ${r.newName}`).join("\n")}

## Electrical additions
${electricalAdds.map((s) => `- ${s.nameEn} (${s.riskLevel})`).join("\n")}

## Other additions
${otherAdds.map((s) => `- [${s.categorySlug}] ${s.nameEn} (${s.riskLevel})`).join("\n")}
`;
writeFileSync(join(docs, "final-service-changes.md"), changesMd);

// Proposed DIY matrix FINAL as proposal file (not replacing 311)
const matrixProposal = {
  meta: {
    phase: "PROPOSAL_ONLY",
    basedOn: "diy-classification-matrix-311.json + pre-launch audit",
    note: "Not authoritative until apply phase. Historical 311 matrix preserved.",
    parents: finalParents.length,
    children: finalChildren.length,
    total: finalTotal,
    riskCounts,
  },
  rows: [
    ...finalParents.map((p, i) => ({
      n: i + 1,
      parentCategory: p.nameEn,
      parentSlug: p.categorySlug,
      serviceOffering: p.nameEn,
      offeringSlug: p.slug,
      kind: "parent",
      diyStatus: p.riskLevel,
      riskLevel: p.riskLevel.toLowerCase(),
      action: p.action,
    })),
    ...finalChildren.map((c, i) => ({
      n: finalParents.length + i + 1,
      parentCategory: c.categoryName,
      parentSlug: c.categorySlug,
      serviceOffering: c.nameEn,
      offeringSlug: c.slug,
      kind: "child",
      diyStatus: c.riskLevel,
      riskLevel: c.riskLevel.toLowerCase(),
      diyAvailable: c.diyAvailable,
      action: c.action,
      electricalArea: c.electricalArea || null,
      reason: c.reason,
    })),
  ],
};
writeFileSync(join(docs, "diy-classification-matrix-FINAL.proposal.json"), JSON.stringify(matrixProposal, null, 2));

console.log(
  JSON.stringify(
    {
      old: summary.old,
      proposed: summary.proposed,
      mathCheck: 293 + electricalAdds.length + otherAdds.length - mergeProposals.length,
      filesWritten: [
        "docs/final-service-catalog-audit.md",
        "docs/final-service-catalog.json",
        "docs/final-service-catalog.csv",
        "docs/final-service-changes.md",
        "docs/final-service-changes.json",
        "docs/electrical-service-expansion.md",
        "docs/electrical-service-expansion.json",
        "docs/electrical-service-expansion.csv",
        "docs/diy-classification-matrix-FINAL.proposal.json",
      ],
    },
    null,
    2,
  ),
);
