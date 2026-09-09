/**
 * Phase A1 — authoritative 311-offering master catalog (18 parents + 293 children).
 * Do not invent/remove/merge/silently rename approved names.
 */

export const REVIEW_REQUIRED = "REVIEW_REQUIRED";

export type ApprovedCategorySeed = {
  slug: string;
  sortOrder: number;
  sopCode: string | null;
  nameEn: string;
  /** Existing verified AR preserved when set; otherwise REVIEW_REQUIRED. */
  nameAr: string;
  descriptionEn: string;
};

/** Exact approved parent names — do not rename/merge/split. */
export const APPROVED_CATEGORIES: ApprovedCategorySeed[] = [
  {
    slug: "cleaning",
    sortOrder: 1,
    sopCode: null,
    nameEn: "Cleaning Services",
    nameAr: "التنظيف",
    descriptionEn: "Internal building and property cleaning offerings.",
  },
  {
    slug: "general-maintenance",
    sortOrder: 2,
    sopCode: "SOP-016",
    nameEn: "General Building Maintenance",
    nameAr: "الصيانة العامة للمباني",
    descriptionEn: "General repair and upkeep for residential and commercial buildings.",
  },
  {
    slug: "plumbing",
    sortOrder: 3,
    sopCode: "SOP-017",
    nameEn: "Plumbing Maintenance",
    nameAr: "السباكة",
    descriptionEn: "Leaks, drains, and sanitary fittings.",
  },
  {
    slug: "electrical",
    sortOrder: 4,
    sopCode: "SOP-018",
    nameEn: "Electrical Maintenance",
    nameAr: "الكهرباء",
    descriptionEn: "Professional electrical inspection and repair.",
  },
  {
    slug: "ac",
    sortOrder: 5,
    sopCode: "SOP-019",
    nameEn: "AC / Air Conditioning Maintenance",
    nameAr: "التكييف",
    descriptionEn: "AC servicing, diagnosis, and maintenance.",
  },
  {
    slug: "painting",
    sortOrder: 6,
    sopCode: "SOP-020",
    nameEn: "Painting Services",
    nameAr: "الدهان",
    descriptionEn: "Interior and related painting offerings.",
  },
  {
    slug: "walls",
    sortOrder: 7,
    sopCode: "SOP-021",
    nameEn: "Wall Maintenance & Repair",
    nameAr: "الجدران",
    descriptionEn: "Plaster, cracks, and wall surface repairs.",
  },
  {
    slug: "swimming-pool",
    sortOrder: 8,
    sopCode: null,
    nameEn: "Swimming Pool Cleaning & Maintenance",
    nameAr: REVIEW_REQUIRED,
    descriptionEn: "Pool cleaning, water chemistry, and equipment care.",
  },
  {
    slug: "sauna",
    sortOrder: 9,
    sopCode: null,
    nameEn: "Sauna Room Cleaning & Maintenance",
    nameAr: REVIEW_REQUIRED,
    descriptionEn: "Sauna room cleaning and equipment maintenance.",
  },
  {
    slug: "water-tank",
    sortOrder: 10,
    sopCode: null,
    nameEn: "Water Tank Cleaning & Maintenance",
    nameAr: REVIEW_REQUIRED,
    descriptionEn: "Water tank inspection, cleaning, and related repairs.",
  },
  {
    slug: "refrigerator",
    sortOrder: 11,
    sopCode: null,
    nameEn: "Refrigerator Maintenance / Repair",
    nameAr: REVIEW_REQUIRED,
    descriptionEn: "Refrigerator diagnosis and repair offerings.",
  },
  {
    slug: "microwave",
    sortOrder: 12,
    sopCode: null,
    nameEn: "Microwave Maintenance / Repair",
    nameAr: REVIEW_REQUIRED,
    descriptionEn: "Microwave diagnosis and repair offerings.",
  },
  {
    slug: "washing-machine",
    sortOrder: 13,
    sopCode: null,
    nameEn: "Washing Machine Maintenance / Repair",
    nameAr: REVIEW_REQUIRED,
    descriptionEn: "Washing machine diagnosis and repair offerings.",
  },
  {
    slug: "water-heater",
    sortOrder: 14,
    sopCode: null,
    nameEn: "Water Heater Maintenance / Repair",
    nameAr: REVIEW_REQUIRED,
    descriptionEn: "Water heater diagnosis and repair offerings.",
  },
  {
    slug: "dishwasher",
    sortOrder: 15,
    sopCode: null,
    nameEn: "Dishwasher Maintenance / Repair",
    nameAr: REVIEW_REQUIRED,
    descriptionEn: "Dishwasher diagnosis and repair offerings.",
  },
  {
    slug: "gym",
    sortOrder: 16,
    sopCode: null,
    nameEn: "Gym Cleaning & Maintenance",
    nameAr: REVIEW_REQUIRED,
    descriptionEn: "Gym cleaning and fitness equipment maintenance.",
  },
  {
    slug: "oven",
    sortOrder: 17,
    sopCode: null,
    nameEn: "Oven Maintenance / Repair",
    nameAr: REVIEW_REQUIRED,
    descriptionEn: "Oven diagnosis and repair offerings.",
  },
  {
    slug: "burner-cooker",
    sortOrder: 18,
    sopCode: null,
    nameEn: "Burner / Cooker Maintenance / Repair",
    nameAr: REVIEW_REQUIRED,
    descriptionEn: "Gas and electric cooker / hob maintenance.",
  },
];

/** Legacy orphan categories kept for unmapped draft services (status=draft). */
export const LEGACY_ORPHAN_CATEGORIES: ApprovedCategorySeed[] = [
  {
    slug: "carpentry",
    sortOrder: 101,
    sopCode: "SOP-022",
    nameEn: "Carpentry",
    nameAr: "النجارة",
    descriptionEn: "Legacy orphan category — not part of A1 approved 18.",
  },
  {
    slug: "flooring",
    sortOrder: 102,
    sopCode: "SOP-023",
    nameEn: "Flooring & tiling",
    nameAr: "الأرضيات والبلاط",
    descriptionEn: "Legacy orphan category — not part of A1 approved 18.",
  },
  {
    slug: "waterproofing",
    sortOrder: 103,
    sopCode: "SOP-024",
    nameEn: "Waterproofing",
    nameAr: "العزل المائي",
    descriptionEn: "Legacy orphan category — not part of A1 approved 18.",
  },
  {
    slug: "roof-exterior",
    sortOrder: 104,
    sopCode: "SOP-025",
    nameEn: "Roof & exterior",
    nameAr: "الأسطح والواجهات",
    descriptionEn: "Legacy orphan category — not part of A1 approved 18.",
  },
  {
    slug: "bath-kitchen",
    sortOrder: 105,
    sopCode: null,
    nameEn: "Bathrooms & kitchens",
    nameAr: "الحمامات والمطابخ",
    descriptionEn: "Legacy orphan category — not part of A1 approved 18.",
  },
  {
    slug: "openings",
    sortOrder: 106,
    sopCode: null,
    nameEn: "Doors & windows",
    nameAr: "الأبواب والنوافذ",
    descriptionEn: "Legacy orphan category — not part of A1 approved 18.",
  },
  {
    slug: "preventive",
    sortOrder: 107,
    sopCode: null,
    nameEn: "Preventive & emergency",
    nameAr: "الوقائية والطوارئ",
    descriptionEn: "Legacy orphan category — not part of A1 approved 18.",
  },
  {
    slug: "specialist",
    sortOrder: 108,
    sopCode: null,
    nameEn: "Specialist facilities",
    nameAr: "منشآت متخصصة",
    descriptionEn: "Legacy orphan category — not part of A1 approved 18.",
  },
  {
    slug: "appliances",
    sortOrder: 109,
    sopCode: null,
    nameEn: "Appliances",
    nameAr: "الأجهزة",
    descriptionEn: "Legacy orphan category — not part of A1 approved 18.",
  },
];

export const APPROVED_CATEGORY_SLUGS = APPROVED_CATEGORIES.map((c) => c.slug);

/** Active public anchors — preserve slugs/URLs. */
export const ACTIVE_CATEGORY_ANCHORS: Array<{ slug: string; categorySlug: string; nameEn: string }> = [
  { slug: "cleaning-services", categorySlug: "cleaning", nameEn: "Cleaning Services" },
  { slug: "building-maintenance", categorySlug: "general-maintenance", nameEn: "General Building Maintenance" },
  { slug: "plumbing-maintenance", categorySlug: "plumbing", nameEn: "Plumbing Maintenance" },
  { slug: "electrical-maintenance", categorySlug: "electrical", nameEn: "Electrical Maintenance" },
  { slug: "ac-maintenance", categorySlug: "ac", nameEn: "AC / Air Conditioning Maintenance" },
  { slug: "painting-services", categorySlug: "painting", nameEn: "Painting Services" },
  { slug: "wall-maintenance", categorySlug: "walls", nameEn: "Wall Maintenance & Repair" },
];

/** Draft category anchors (exact or approved near-match). Preserve slugs. */
export const DRAFT_CATEGORY_ANCHORS: Array<{ slug: string; categorySlug: string; nameEn: string; note?: string }> = [
  { slug: "swimming-pool-maintenance", categorySlug: "swimming-pool", nameEn: "Swimming Pool Cleaning & Maintenance" },
  { slug: "water-tank-cleaning", categorySlug: "water-tank", nameEn: "Water Tank Cleaning & Maintenance" },
  {
    slug: "sauna-maintenance",
    categorySlug: "sauna",
    nameEn: "Sauna Room Maintenance & Cleaning",
    note: "Word-order only vs approved parent Sauna Room Cleaning & Maintenance",
  },
  { slug: "gym-cleaning-maintenance", categorySlug: "gym", nameEn: "Gym Cleaning & Maintenance" },
];

/** Confirmed unmapped legacy drafts — leave unchanged (names/slugs/categories). */
export const UNMAPPED_LEGACY_DRAFT_SLUGS = [
  "carpentry-joinery",
  "flooring-tiling",
  "waterproofing-sealing",
  "roof-exterior-maintenance",
  "bathroom-maintenance",
  "kitchen-maintenance",
  "doors-windows",
  "preventive-maintenance",
  "emergency-maintenance",
  "demolition-dismantling",
  "home-appliance-maintenance",
  "oven-cooker-maintenance",
  "kitchen-appliance-maintenance",
] as const;

export type ApprovedChildDef = {
  categorySlug: string;
  nameEn: string;
  /** Override only when natural slug collides with a preserved legacy slug. */
  slugOverride?: string;
  sortOrder: number;
};

function children(categorySlug: string, names: string[], startOrder: number): ApprovedChildDef[] {
  return names.map((nameEn, i) => ({
    categorySlug,
    nameEn,
    sortOrder: startOrder + i,
  }));
}

/**
 * Exact approved 293 children. Only slug exception:
 * "Water Tank Cleaning" → water-tank-cleaning-service (legacy draft keeps water-tank-cleaning).
 */
export const APPROVED_CHILDREN: ApprovedChildDef[] = [
  ...children(
    "cleaning",
    [
      "Residential Cleaning",
      "Apartment Cleaning",
      "Villa Cleaning",
      "House Cleaning",
      "Office Cleaning",
      "Commercial Cleaning",
      "Building Common Area Cleaning",
      "Deep Cleaning",
      "One-Time Cleaning",
      "Regular Cleaning",
      "Recurring Cleaning",
      "Move-In Cleaning",
      "Move-Out Cleaning",
      "Post-Construction Cleaning",
      "Post-Renovation Cleaning",
      "Kitchen Cleaning",
      "Bathroom Cleaning",
      "Floor Cleaning",
      "Window Cleaning",
      "Glass Cleaning",
      "Carpet Cleaning",
      "Sofa & Upholstery Cleaning",
      "Mattress Cleaning",
    ],
    1,
  ),
  ...children(
    "general-maintenance",
    [
      "Residential Building Maintenance",
      "Commercial Building Maintenance",
      "Villa Maintenance",
      "Apartment Maintenance",
      "Preventive Building Maintenance",
      "Corrective Building Maintenance",
      "General Handyman Service",
      "Property Inspection",
      "Minor Building Repairs",
      "Common Area Maintenance",
      "Door Repair & Adjustment",
      "Door Hardware Replacement",
      "Lock Repair & Replacement",
      "Cabinet & Hardware Repair",
      "Fixture Replacement",
      "Minor Civil Maintenance",
      "General Property Repair",
    ],
    24,
  ),
  ...children(
    "plumbing",
    [
      "Plumbing Inspection",
      "Water Leakage Detection",
      "Water Leakage Repair",
      "Pipe Repair",
      "Pipe Replacement",
      "Water Supply Line Repair",
      "Drain Cleaning",
      "Drain Blockage Removal",
      "Sink Repair",
      "Sink Installation",
      "Faucet Repair",
      "Faucet Replacement",
      "Shower Repair",
      "Shower Mixer Replacement",
      "Toilet Repair",
      "Toilet Installation",
      "Running Toilet Repair",
      "Water Pressure Problem Diagnosis",
      "Floor Drain Repair",
    ],
    41,
  ),
  ...children(
    "electrical",
    [
      "Electrical Inspection",
      "Electrical Fault Finding",
      "Socket Repair",
      "Socket Replacement",
      "Switch Repair",
      "Switch Replacement",
      "Light Installation",
      "Light Repair",
      "LED Light Installation",
      "LED Light Replacement",
      "Wiring Inspection",
      "Wiring Repair",
      "Wiring Replacement",
      "Circuit Breaker Inspection",
      "Circuit Breaker Replacement",
      "Distribution Board Inspection",
      "Short-Circuit Diagnosis",
    ],
    60,
  ),
  ...children(
    "ac",
    [
      "AC Inspection",
      "AC Servicing",
      "AC Cleaning",
      "AC Filter Cleaning",
      "AC Drain Cleaning",
      "AC Drain Pipe Repair",
      "AC Water Leakage Repair",
      "AC Cooling Problem Diagnosis",
      "AC Gas Check",
      "AC Gas Recharge",
      "AC Noise Problem Diagnosis",
      "AC Installation",
      "AC Replacement",
      "Split AC Maintenance",
      "Central AC Maintenance",
      "Ducted AC Maintenance",
      "Package AC Maintenance",
      "AC Preventive Maintenance",
    ],
    77,
  ),
  ...children(
    "painting",
    [
      "Interior Painting",
      "Exterior Painting",
      "Residential Painting",
      "Villa Painting",
      "Apartment Painting",
      "Office Painting",
      "Commercial Painting",
      "Wall Painting",
      "Ceiling Painting",
      "Door Painting",
      "Metal Painting",
      "Wood Painting",
      "Repainting",
      "Touch-Up Painting",
      "Texture Painting",
      "Decorative Painting",
    ],
    95,
  ),
  ...children(
    "walls",
    [
      "Wall Inspection",
      "Wall Crack Repair",
      "Structural Crack Assessment",
      "Plaster Repair",
      "Wall Hole Repair",
      "Wall Damage Repair",
      "Damp Wall Repair",
      "Moisture Damage Repair",
      "Mold-Affected Wall Treatment",
      "Peeling Paint Repair",
      "Wall Patching",
      "Wall Skimming",
      "Surface Preparation",
      "Gypsum Wall Repair",
      "Partition Wall Repair",
    ],
    111,
  ),
  ...children(
    "swimming-pool",
    [
      "Swimming Pool Inspection",
      "Swimming Pool Cleaning",
      "Pool Vacuum Cleaning",
      "Pool Skimming",
      "Pool Water Testing",
      "Pool Chemical Balancing",
      "Pool Filter Cleaning",
      "Pool Filter Maintenance",
      "Pool Pump Inspection",
      "Pool Pump Maintenance",
      "Pool Tile Cleaning",
      "Pool Drain Cleaning",
      "Pool Equipment Inspection",
      "Pool Leak Inspection",
      "Residential Pool Maintenance",
    ],
    126,
  ),
  ...children(
    "sauna",
    [
      "Sauna Inspection",
      "Sauna Deep Cleaning",
      "Sauna Regular Cleaning",
      "Sauna Disinfection",
      "Sauna Bench Cleaning",
      "Sauna Floor Cleaning",
      "Sauna Wall Cleaning",
      "Sauna Glass Cleaning",
      "Sauna Heater Inspection",
      "Sauna Heater Maintenance",
      "Sauna Ventilation Inspection",
      "Sauna Door Maintenance",
      "Sauna Wood Treatment",
      "Sauna Equipment Inspection",
    ],
    141,
  ),
  ...children(
    "water-tank",
    [
      "Water Tank Inspection",
      "Water Tank Cleaning",
      "Water Tank Disinfection",
      "Water Tank Sanitization",
      "Water Tank Leak Inspection",
      "Water Tank Cover Repair",
      "Water Tank Valve Repair",
      "Tank Pipe Connection Repair",
      "Tank Overflow Repair",
      "Float Valve Repair",
      "Residential Water Tank Cleaning",
      "Villa Water Tank Cleaning",
      "Commercial Water Tank Cleaning",
      "Underground Water Tank Cleaning",
      "Rooftop Water Tank Cleaning",
      "Scheduled Water Tank Maintenance",
    ],
    155,
  ).map((c) =>
    c.nameEn === "Water Tank Cleaning"
      ? { ...c, slugOverride: "water-tank-cleaning-service" }
      : c,
  ),
  ...children(
    "refrigerator",
    [
      "Refrigerator Inspection",
      "Refrigerator Cooling Problem",
      "Refrigerator Freezing Problem",
      "Refrigerator Water Leakage",
      "Refrigerator Ice Formation Problem",
      "Refrigerator Thermostat Inspection",
      "Refrigerator Compressor Inspection",
      "Refrigerator Compressor Replacement",
      "Refrigerator Fan Motor Repair",
      "Refrigerator Door Seal Replacement",
      "Refrigerator Door Hinge Repair",
      "Refrigerator Temperature Control Repair",
      "Refrigerator Drain Blockage Repair",
      "Refrigerator Electrical Fault Diagnosis",
      "Refrigerator Cleaning",
    ],
    171,
  ),
  ...children(
    "microwave",
    [
      "Microwave Inspection",
      "Microwave Heating Problem",
      "Microwave No-Power Diagnosis",
      "Microwave Spark Problem",
      "Microwave Turntable Problem",
      "Microwave Door Problem",
      "Microwave Door Switch Repair",
      "Microwave Fuse Replacement",
      "Microwave Control Panel Problem",
      "Microwave Display Problem",
      "Microwave Fan Problem",
      "Microwave Internal Cleaning",
      "Microwave Electrical Diagnosis",
    ],
    186,
  ),
  ...children(
    "washing-machine",
    [
      "Washing Machine Inspection",
      "Washing Machine Not Starting",
      "Washing Machine Not Spinning",
      "Washing Machine Water Filling Problem",
      "Washing Machine Drainage Problem",
      "Washing Machine Water Leakage",
      "Washing Machine Excessive Noise",
      "Washing Machine Vibration Problem",
      "Washing Machine Door Lock Problem",
      "Washing Machine Drum Problem",
      "Washing Machine Pump Repair",
      "Washing Machine Motor Inspection",
      "Washing Machine Belt Replacement",
      "Washing Machine Control Board Diagnosis",
      "Washing Machine Filter Cleaning",
      "Washing Machine Preventive Maintenance",
    ],
    199,
  ),
  ...children(
    "water-heater",
    [
      "Water Heater Inspection",
      "Water Heater No Hot Water",
      "Water Heater Slow Heating",
      "Water Heater Temperature Problem",
      "Water Heater Thermostat Repair",
      "Water Heater Heating Element Replacement",
      "Water Heater Water Leakage Repair",
      "Water Heater Pressure Problem",
      "Water Heater Tank Inspection",
      "Water Heater Valve Replacement",
      "Water Heater Electrical Fault Diagnosis",
      "Water Heater Cleaning",
      "Water Heater Scale Removal",
      "Water Heater Preventive Maintenance",
      "Emergency Water Heater Repair",
    ],
    215,
  ),
  ...children(
    "dishwasher",
    [
      "Dishwasher Inspection",
      "Dishwasher Not Starting",
      "Dishwasher Not Cleaning Properly",
      "Dishwasher Water Filling Problem",
      "Dishwasher Drainage Problem",
      "Dishwasher Water Leakage",
      "Dishwasher Poor Drying",
      "Dishwasher Spray Arm Cleaning",
      "Dishwasher Filter Cleaning",
      "Dishwasher Pump Inspection",
      "Dishwasher Door Seal Replacement",
      "Dishwasher Door Lock Repair",
      "Dishwasher Heating Problem",
      "Dishwasher Control Panel Diagnosis",
      "Dishwasher Preventive Maintenance",
    ],
    230,
  ),
  ...children(
    "gym",
    [
      "Gym Deep Cleaning",
      "Gym Regular Cleaning",
      "Gym Equipment Cleaning",
      "Gym Floor Cleaning",
      "Gym Glass Cleaning",
      "Gym Sanitization",
      "Gym Disinfection",
      "Locker Cleaning",
      "Shower & Changing Room Cleaning",
      "Fitness Equipment Inspection",
      "Treadmill Maintenance",
      "Exercise Bike Maintenance",
      "Cross-Trainer Maintenance",
      "Weight Equipment Maintenance",
      "Preventive Gym Maintenance",
    ],
    245,
  ),
  ...children(
    "oven",
    [
      "Oven Inspection",
      "Oven Not Heating",
      "Oven Uneven Heating",
      "Oven Temperature Problem",
      "Oven Heating Element Replacement",
      "Oven Thermostat Repair",
      "Oven Door Repair",
      "Oven Door Seal Replacement",
      "Oven Fan Repair",
      "Oven Timer Problem",
      "Oven Control Panel Problem",
      "Oven Electrical Fault Diagnosis",
      "Gas Oven Inspection",
      "Oven Cleaning",
      "Oven Preventive Maintenance",
    ],
    260,
  ),
  ...children(
    "burner-cooker",
    [
      "Gas Cooker Inspection",
      "Gas Burner Cleaning",
      "Gas Burner Repair",
      "Gas Burner Replacement",
      "Gas Cooker Ignition Repair",
      "Gas Flame Problem Diagnosis",
      "Uneven Flame Diagnosis",
      "Gas Leakage Inspection",
      "Gas Hose Inspection",
      "Gas Hose Replacement",
      "Gas Valve Inspection",
      "Gas Valve Replacement",
      "Cooker Knob Replacement",
      "Cooker Igniter Repair",
      "Gas Cooker Cleaning",
      "Hob Cleaning",
      "Glass Hob Maintenance",
      "Electric Cooker Repair",
      "Induction Cooker Inspection",
    ],
    275,
  ),
];

export function nameToSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/\//g, " ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function childSlug(def: ApprovedChildDef): string {
  return def.slugOverride ?? nameToSlug(def.nameEn);
}

export const APPROVED_CHILD_SLUGS = APPROVED_CHILDREN.map(childSlug);

export function assertCatalogA1Counts(): { parents: number; children: number; offerings: number } {
  const parents = APPROVED_CATEGORIES.length;
  const children = APPROVED_CHILDREN.length;
  const offerings = parents + children;
  if (parents !== 18) throw new Error(`A1 parents must be 18, got ${parents}`);
  if (children !== 293) throw new Error(`A1 children must be 293, got ${children}`);
  if (offerings !== 311) throw new Error(`A1 offerings must be 311, got ${offerings}`);

  const slugs = APPROVED_CHILDREN.map(childSlug);
  const seen = new Set<string>();
  for (const slug of slugs) {
    if (seen.has(slug)) throw new Error(`Duplicate approved child slug: ${slug}`);
    seen.add(slug);
  }
  const waterTank = APPROVED_CHILDREN.find((c) => c.nameEn === "Water Tank Cleaning");
  if (!waterTank || childSlug(waterTank) !== "water-tank-cleaning-service") {
    throw new Error("Water Tank Cleaning must use slug water-tank-cleaning-service");
  }
  if (seen.has("water-tank-cleaning")) {
    throw new Error("Approved children must not claim reserved slug water-tank-cleaning");
  }
  return { parents, children, offerings };
}

export function serviceTypeForCategory(categorySlug: string): string {
  if (categorySlug === "cleaning" || categorySlug === "gym" || categorySlug === "swimming-pool" || categorySlug === "sauna" || categorySlug === "water-tank") {
    return "cleaning";
  }
  if (categorySlug === "painting") return "finishes";
  if (
    categorySlug === "refrigerator" ||
    categorySlug === "microwave" ||
    categorySlug === "washing-machine" ||
    categorySlug === "water-heater" ||
    categorySlug === "dishwasher" ||
    categorySlug === "oven" ||
    categorySlug === "burner-cooker"
  ) {
    return "appliances";
  }
  return "maintenance";
}

export function childSchemaData(def: ApprovedChildDef) {
  return {
    catalogPhase: "A1",
    catalogRole: "approved_child",
    sortOrder: def.sortOrder,
    arabicReview: REVIEW_REQUIRED,
    diyReview: REVIEW_REQUIRED,
  };
}

assertCatalogA1Counts();
