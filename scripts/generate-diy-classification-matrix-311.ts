/**
 * One-off / reusable: build docs/diy-classification-matrix-311.{md,json}
 * from catalog-a1 + classification rules. Does not touch schema/seed/app.
 *
 * Run: npx tsx scripts/generate-diy-classification-matrix-311.ts
 */
import fs from "node:fs";
import path from "node:path";
import {
  APPROVED_CATEGORIES,
  APPROVED_CHILDREN,
  ACTIVE_CATEGORY_ANCHORS,
  DRAFT_CATEGORY_ANCHORS,
  assertCatalogA1Counts,
  childSlug,
} from "../prisma/data/catalog-a1";
import { diyGuides } from "../prisma/data/diy";

type DiyStatus = "GREEN" | "YELLOW" | "RED" | "REVIEW_REQUIRED";
type GuidanceType =
  | "step-by-step"
  | "limited-troubleshooting"
  | "safety-only"
  | "professional-recommended"
  | "review-required";
type ReviewGate = "required" | "optional" | "review-required" | "not-required" | "none";

type Row = {
  n: number;
  parentCategory: string;
  parentSlug: string;
  serviceOffering: string;
  offeringSlug: string;
  kind: "parent" | "child";
  diyStatus: DiyStatus;
  riskLevel: "green" | "yellow" | "red" | "review_required";
  guidanceType: GuidanceType;
  existingGuide: string;
  existingGuideStatus: "published" | "draft" | "none";
  primaryGuideRecommendation: string;
  safetyReview: ReviewGate;
  arabicReview: ReviewGate;
  professionalFallback: "required" | "optional";
  reason: string;
  ambiguous: boolean;
};

type ClassResult = {
  diyStatus: DiyStatus;
  guidanceType: GuidanceType;
  reason: string;
  ambiguous?: boolean;
  primaryGuide?: string;
};

const catalogAssert = assertCatalogA1Counts();

const ANCHOR_BY_PARENT = new Map(
  [...ACTIVE_CATEGORY_ANCHORS, ...DRAFT_CATEGORY_ANCHORS].map((a) => [a.categorySlug, a]),
);

const GUIDE_BY_SLUG = new Map(diyGuides.map((g) => [g.slug, g]));

function riskFromStatus(s: DiyStatus): Row["riskLevel"] {
  if (s === "GREEN") return "green";
  if (s === "YELLOW") return "yellow";
  if (s === "RED") return "red";
  return "review_required";
}

function guidanceFor(s: DiyStatus, preferred?: GuidanceType): GuidanceType {
  if (preferred) return preferred;
  if (s === "GREEN") return "step-by-step";
  if (s === "YELLOW") return "limited-troubleshooting";
  if (s === "RED") return "professional-recommended";
  return "review-required";
}

function arabicFor(status: DiyStatus, parentSlug: string, hazardous: boolean): ReviewGate {
  // Parents with REVIEW_REQUIRED AR in catalog, all RED/RR, and technical trades need Arabic review
  const parentArRr = [
    "swimming-pool",
    "sauna",
    "water-tank",
    "refrigerator",
    "microwave",
    "washing-machine",
    "water-heater",
    "dishwasher",
    "gym",
    "oven",
    "burner-cooker",
  ].includes(parentSlug);
  if (status === "RED" || status === "REVIEW_REQUIRED" || hazardous || parentArRr) return "required";
  // Cleaning / simple GREEN/YELLOW: still need human AR before publish for tech copy — mark review-required workflow
  return "review-required";
}

function classifyParent(slug: string, nameEn: string): ClassResult {
  switch (slug) {
    case "cleaning":
      return {
        diyStatus: "GREEN",
        guidanceType: "step-by-step",
        reason: "Cleaning practical posture; existing bathroom draft is related — may need broader hub",
        ambiguous: true,
        primaryGuide: "how-to-clean-a-bathroom",
      };
    case "general-maintenance":
      return {
        diyStatus: "YELLOW",
        guidanceType: "limited-troubleshooting",
        reason: "Handyman hub — observation + stop for structural/electrical/gas/height",
      };
    case "plumbing":
      return {
        diyStatus: "YELLOW",
        guidanceType: "limited-troubleshooting",
        reason: "Parent hub; primary published faucet guide; unclog is related",
        primaryGuide: "how-to-fix-dripping-faucet",
      };
    case "electrical":
      return {
        diyStatus: "RED",
        guidanceType: "safety-only",
        reason: "Electrical default RED posture — observation/stop/CTA only",
      };
    case "ac":
      return {
        diyStatus: "YELLOW",
        guidanceType: "limited-troubleshooting",
        reason: "AC hub; primary published filter guide; refrigerant/electrical remain RED children",
        primaryGuide: "how-to-clean-ac-filter",
      };
    case "painting":
      return {
        diyStatus: "YELLOW",
        guidanceType: "limited-troubleshooting",
        reason: "Painting hub; draft touch-up guide as primary candidate",
        primaryGuide: "how-to-touch-up-interior-paint",
      };
    case "walls":
      return {
        diyStatus: "YELLOW",
        guidanceType: "limited-troubleshooting",
        reason: "Walls hub; draft crack-check observation guide",
        primaryGuide: "how-to-check-a-small-wall-crack",
      };
    case "swimming-pool":
      return {
        diyStatus: "YELLOW",
        guidanceType: "limited-troubleshooting",
        reason: "Pool hub — skimming/visual OK candidates; chemicals/equipment electrical RED/RR",
      };
    case "sauna":
      return {
        diyStatus: "YELLOW",
        guidanceType: "limited-troubleshooting",
        reason: "Sauna hub — cleaning GREEN candidates; heater electrical/gas RED",
      };
    case "water-tank":
      return {
        diyStatus: "YELLOW",
        guidanceType: "safety-only",
        reason: "Tank hub — exterior visual only; confined/chem RED/RR",
      };
    case "refrigerator":
      return {
        diyStatus: "YELLOW",
        guidanceType: "limited-troubleshooting",
        reason: "Appliance hub — filter/seal/cleaning GREEN; compressor RED",
      };
    case "microwave":
      return {
        diyStatus: "YELLOW",
        guidanceType: "safety-only",
        reason: "Microwave hub — cleaning GREEN; HV internals RED",
      };
    case "washing-machine":
      return {
        diyStatus: "YELLOW",
        guidanceType: "limited-troubleshooting",
        reason: "Washer hub — filter clean GREEN; motor/board RED",
      };
    case "water-heater":
      return {
        diyStatus: "YELLOW",
        guidanceType: "safety-only",
        reason: "Heater hub — cleaning/observation limited; element/electrical RED",
      };
    case "dishwasher":
      return {
        diyStatus: "YELLOW",
        guidanceType: "limited-troubleshooting",
        reason: "Dishwasher hub — filter/spray-arm GREEN; pump/heating RED",
      };
    case "gym":
      return {
        diyStatus: "YELLOW",
        guidanceType: "limited-troubleshooting",
        reason: "Gym hub — cleaning practical; equipment internals RR",
      };
    case "oven":
      return {
        diyStatus: "YELLOW",
        guidanceType: "limited-troubleshooting",
        reason: "Oven hub — cool cleaning GREEN; element/gas RED",
      };
    case "burner-cooker":
      return {
        diyStatus: "RED",
        guidanceType: "professional-recommended",
        reason: "Burner/cooker default RED for gas; cleaning children may be YELLOW",
      };
    default:
      return {
        diyStatus: "REVIEW_REQUIRED",
        guidanceType: "review-required",
        reason: `Unclassified parent ${nameEn}`,
        ambiguous: true,
      };
  }
}

function classifyChild(categorySlug: string, nameEn: string): ClassResult {
  const n = nameEn.toLowerCase();

  // --- Cleaning ---
  if (categorySlug === "cleaning") {
    if (n === "bathroom cleaning") {
      return {
        diyStatus: "GREEN",
        guidanceType: "step-by-step",
        reason: "Maps to existing bathroom cleaning draft guide",
        primaryGuide: "how-to-clean-a-bathroom",
      };
    }
    if (
      n.includes("window") ||
      n.includes("glass")
    ) {
      return {
        diyStatus: "YELLOW",
        guidanceType: "safety-only",
        reason: "Height/glass risk — household glass OK after review; high exterior = pro",
      };
    }
    if (
      n.includes("post-construction") ||
      n.includes("post-renovation") ||
      n.includes("carpet") ||
      n.includes("upholstery") ||
      n.includes("mattress") ||
      n.includes("common area")
    ) {
      return {
        diyStatus: "YELLOW",
        guidanceType: "limited-troubleshooting",
        reason: "Specialist cleaning / dust / textiles — limited DIY; chemical safety review",
      };
    }
    if (n.includes("deep") || n.includes("kitchen")) {
      return {
        diyStatus: "YELLOW",
        guidanceType: "step-by-step",
        reason: "Practical cleaning with chemical/ventilation caution",
      };
    }
    return {
      diyStatus: "GREEN",
      guidanceType: "step-by-step",
      reason: "Routine surface cleaning — GREEN candidate after human safety review",
    };
  }

  // --- General maintenance ---
  if (categorySlug === "general-maintenance") {
    if (n === "property inspection") {
      return {
        diyStatus: "GREEN",
        guidanceType: "limited-troubleshooting",
        reason: "Observation/report checklist only",
      };
    }
    if (
      n.includes("common area") ||
      n.includes("fixture replacement") ||
      n.includes("minor civil")
    ) {
      return {
        diyStatus: "REVIEW_REQUIRED",
        guidanceType: "review-required",
        reason: "RED-adjacent civil/common-area — insufficient to invent class",
        ambiguous: true,
      };
    }
    if (
      n.includes("door") ||
      n.includes("lock") ||
      n.includes("cabinet") ||
      n.includes("hardware")
    ) {
      return {
        diyStatus: "YELLOW",
        guidanceType: "limited-troubleshooting",
        reason: "Fixture/hardware — limited DIY after review",
      };
    }
    return {
      diyStatus: "YELLOW",
      guidanceType: "limited-troubleshooting",
      reason: "Building maintenance — caution; stop for specialist trades",
    };
  }

  // --- Plumbing ---
  if (categorySlug === "plumbing") {
    if (n.includes("faucet")) {
      return {
        diyStatus: "GREEN",
        guidanceType: "step-by-step",
        reason: "Fixture-level faucet — reuse published dripping-faucet guide",
        primaryGuide: "how-to-fix-dripping-faucet",
      };
    }
    if (
      n.includes("drain") ||
      n === "sink repair" ||
      n.includes("floor drain")
    ) {
      return {
        diyStatus: "YELLOW",
        guidanceType: "limited-troubleshooting",
        reason: "Drain/sink — draft unclog guide; no chemical recipes until reviewed",
        primaryGuide: "how-to-unclog-a-sink-safely",
      };
    }
    if (
      n.includes("installation") ||
      n.includes("pipe") ||
      n.includes("supply line") ||
      n.includes("leakage repair") ||
      n.includes("mixer replacement")
    ) {
      return {
        diyStatus: "RED",
        guidanceType: "professional-recommended",
        reason: "In-wall / pressurized / installation plumbing — professional",
      };
    }
    if (
      n.includes("inspection") ||
      n.includes("detection") ||
      n.includes("diagnosis") ||
      n.includes("toilet repair") ||
      n.includes("running toilet") ||
      n.includes("shower repair")
    ) {
      return {
        diyStatus: "YELLOW",
        guidanceType: "limited-troubleshooting",
        reason: n.includes("inspection") || n.includes("detection") || n.includes("diagnosis")
          ? "Diagnosis/observation — stop if wall/ceiling wet"
          : "Fixture repair possible with isolation; sewage/concealed = stop",
      };
    }
    return {
      diyStatus: "YELLOW",
      guidanceType: "limited-troubleshooting",
      reason: "Plumbing troubleshooting — isolation first; stop if valve fails",
    };
  }

  // --- Electrical (strict RED) ---
  if (categorySlug === "electrical") {
    if (n.includes("inspection")) {
      return {
        diyStatus: "RED",
        guidanceType: "safety-only",
        reason: "Electrical default RED posture — observation/stop/CTA only",
      };
    }
    return {
      diyStatus: "RED",
      guidanceType: "professional-recommended",
      reason: "Live/internal electrical work — no repair DIY steps",
    };
  }

  // --- AC ---
  if (categorySlug === "ac") {
    if (n === "ac filter cleaning") {
      return {
        diyStatus: "GREEN",
        guidanceType: "step-by-step",
        reason: "Exact match to published AC filter guide",
        primaryGuide: "how-to-clean-ac-filter",
      };
    }
    if (n.includes("gas") || n.includes("installation") || n.includes("replacement")) {
      return {
        diyStatus: "RED",
        guidanceType: "professional-recommended",
        reason: n.includes("gas")
          ? "Refrigerant / AC gas — sealed system; no DIY charging"
          : "Installation / refrigerant / complex system — professional",
      };
    }
    if (
      n.includes("central") ||
      n.includes("ducted") ||
      n.includes("package") ||
      n.includes("drain pipe") ||
      n.includes("water leakage repair")
    ) {
      return {
        diyStatus: "RED",
        guidanceType: "professional-recommended",
        reason: "Installation / refrigerant / complex system — professional",
      };
    }
    if (n === "ac cleaning") {
      return {
        diyStatus: "YELLOW",
        guidanceType: "limited-troubleshooting",
        reason: "User-accessible cleaning/servicing framing; no sealed-system steps",
        primaryGuide: "how-to-clean-ac-filter",
      };
    }
    if (
      n.includes("servicing") ||
      n.includes("split") ||
      n.includes("preventive")
    ) {
      return {
        diyStatus: "YELLOW",
        guidanceType: "limited-troubleshooting",
        reason: "User-accessible cleaning/servicing framing; no sealed-system steps",
        primaryGuide: "how-to-clean-ac-filter",
      };
    }
    if (n.includes("diagnosis") || n.includes("drain cleaning") || n.includes("inspection")) {
      return {
        diyStatus: "YELLOW",
        guidanceType: "limited-troubleshooting",
        reason: "Diagnosis framing without opening sealed systems",
      };
    }
    return {
      diyStatus: "YELLOW",
      guidanceType: "limited-troubleshooting",
      reason: "User-accessible cleaning/servicing framing; no sealed-system steps",
    };
  }

  // --- Painting ---
  if (categorySlug === "painting") {
    if (n.includes("touch-up")) {
      return {
        diyStatus: "GREEN",
        guidanceType: "step-by-step",
        reason: "Small interior touch-up — draft guide primary after safety+AR review",
        primaryGuide: "how-to-touch-up-interior-paint",
      };
    }
    if (n.includes("exterior") || n.includes("ceiling") || n.includes("commercial") || n.includes("villa") || n.includes("office") || n.includes("texture") || n.includes("decorative") || n.includes("metal")) {
      return {
        diyStatus: "YELLOW",
        guidanceType: "limited-troubleshooting",
        reason: "Height/exterior/large-area caution — stop for damp/mould/unknown coatings",
      };
    }
    if (
      n.includes("interior") ||
      n.includes("residential") ||
      n.includes("apartment") ||
      n.includes("wall painting") ||
      n.includes("door") ||
      n.includes("wood") ||
      n.includes("repainting")
    ) {
      return {
        diyStatus: "YELLOW",
        guidanceType: "limited-troubleshooting",
        reason: "Interior painting — share touch-up draft as related; height/damp stop",
        primaryGuide: "how-to-touch-up-interior-paint",
      };
    }
    return {
      diyStatus: "YELLOW",
      guidanceType: "limited-troubleshooting",
      reason: "Painting practical with height/chemical caution",
    };
  }

  // --- Walls ---
  if (categorySlug === "walls") {
    if (n.includes("structural crack")) {
      return {
        diyStatus: "RED",
        guidanceType: "professional-recommended",
        reason: "Structural crack — professional only; no fill/chase DIY",
      };
    }
    if (
      n.includes("damp") ||
      n.includes("moisture") ||
      n.includes("mold") ||
      n.includes("partition")
    ) {
      return {
        diyStatus: "RED",
        guidanceType: "professional-recommended",
        reason: "Moisture/mold/partition — professional until reviewed methods",
      };
    }
    if (n.includes("crack") || n.includes("inspection")) {
      return {
        diyStatus: "YELLOW",
        guidanceType: "limited-troubleshooting",
        reason: "Observation-only crack check — draft guide; no structural repair",
        primaryGuide: "how-to-check-a-small-wall-crack",
      };
    }
    if (
      n.includes("plaster") ||
      n.includes("hole") ||
      n.includes("patch") ||
      n.includes("skim") ||
      n.includes("surface") ||
      n.includes("peeling") ||
      n.includes("gypsum") ||
      n.includes("damage")
    ) {
      return {
        diyStatus: "YELLOW",
        guidanceType: "limited-troubleshooting",
        reason: "Cosmetic wall repair — limited DIY; stop if structural/damp",
      };
    }
    return {
      diyStatus: "YELLOW",
      guidanceType: "limited-troubleshooting",
      reason: "Cosmetic wall work — observation and limited patch after review",
    };
  }

  // --- Pool ---
  if (categorySlug === "swimming-pool") {
    if (
      n.includes("chemical") ||
      n.includes("water testing") ||
      n.includes("filter cleaning") ||
      n.includes("filter maintenance") ||
      n.includes("drain cleaning")
    ) {
      return {
        diyStatus: "REVIEW_REQUIRED",
        guidanceType: "review-required",
        reason: n.includes("chemical")
          ? "Hazardous chemical dosing — do not invent doses; human safety+AR review"
          : "Chemistry/filter dosing or method insufficient without human review",
        ambiguous: true,
      };
    }
    if (n.includes("pump") || n.includes("leak") || n.includes("equipment")) {
      return {
        diyStatus: "RED",
        guidanceType: "professional-recommended",
        reason: "Pool pump electrical / leak under structure / equipment — professional",
      };
    }
    if (
      n.includes("skimming") ||
      n.includes("vacuum") ||
      n.includes("tile cleaning") ||
      n === "swimming pool cleaning" ||
      n.includes("inspection")
    ) {
      return {
        diyStatus: "GREEN",
        guidanceType: "step-by-step",
        reason: "Surface cleaning / visual inspection — GREEN candidate after review",
      };
    }
    return {
      diyStatus: "YELLOW",
      guidanceType: "limited-troubleshooting",
      reason: "Pool maintenance — limited DIY; chemicals/electrical = stop",
    };
  }

  // --- Sauna ---
  if (categorySlug === "sauna") {
    if (n.includes("heater")) {
      return {
        diyStatus: "RED",
        guidanceType: "professional-recommended",
        reason: "Sauna heater electrical/gas — professional only",
      };
    }
    if (n.includes("ventilation")) {
      return {
        diyStatus: "RED",
        guidanceType: "professional-recommended",
        reason: "Ventilation alterations — professional",
      };
    }
    if (n.includes("disinfection") || n.includes("wood treatment") || n.includes("equipment inspection")) {
      return {
        diyStatus: "REVIEW_REQUIRED",
        guidanceType: "review-required",
        reason: n.includes("disinfection")
          ? "Disinfection chemistry — no invented doses"
          : "Treatment method needs human review",
        ambiguous: true,
      };
    }
    if (n.includes("cleaning") || n.includes("bench") || n.includes("floor") || n.includes("wall") || n.includes("glass") || n.includes("door")) {
      return {
        diyStatus: "GREEN",
        guidanceType: "step-by-step",
        reason: "Sauna surface cleaning — GREEN candidate after product review",
      };
    }
    if (n.includes("inspection")) {
      return {
        diyStatus: "YELLOW",
        guidanceType: "limited-troubleshooting",
        reason: "Visual inspection only — stop for heater/electrical",
      };
    }
    return {
      diyStatus: "YELLOW",
      guidanceType: "limited-troubleshooting",
      reason: "Sauna maintenance — cleaning OK; heater = pro",
    };
  }

  // --- Water tank ---
  if (categorySlug === "water-tank") {
    if (n.includes("underground")) {
      return {
        diyStatus: "RED",
        guidanceType: "professional-recommended",
        reason: "Underground / confined-space tank — professional protocol only",
      };
    }
    if (n.includes("disinfection") || n.includes("sanitization")) {
      return {
        diyStatus: "REVIEW_REQUIRED",
        guidanceType: "review-required",
        reason: "Hazardous chemical dosing — do not invent doses; human safety+AR review",
        ambiguous: true,
      };
    }
    if (
      n.includes("cleaning") ||
      n.includes("leak") ||
      n.includes("valve") ||
      n.includes("pipe") ||
      n.includes("overflow") ||
      n.includes("float") ||
      n.includes("cover repair") ||
      n.includes("scheduled")
    ) {
      // External cleaning of rooftop may be YELLOW; entry/cleaning internals RED
      if (n.includes("rooftop") || n.includes("cover") || n.includes("inspection")) {
        return {
          diyStatus: "YELLOW",
          guidanceType: "safety-only",
          reason: "External visual / lid check — limited; no confined entry",
        };
      }
      return {
        diyStatus: "RED",
        guidanceType: "professional-recommended",
        reason: "Tank entry / disinfection / plumbing connections — professional",
      };
    }
    if (n.includes("inspection")) {
      return {
        diyStatus: "YELLOW",
        guidanceType: "safety-only",
        reason: "External visual inspection only",
      };
    }
    return {
      diyStatus: "RED",
      guidanceType: "professional-recommended",
      reason: "Water tank work — default professional for entry/chem/pressure",
    };
  }

  // --- Refrigerator ---
  if (categorySlug === "refrigerator") {
    if (n.includes("compressor") || n.includes("electrical fault")) {
      return {
        diyStatus: "RED",
        guidanceType: "professional-recommended",
        reason: "Compressor / sealed system / electrical — professional",
      };
    }
    if (n.includes("fan motor") || n.includes("thermostat") || n.includes("temperature control")) {
      return {
        diyStatus: "RED",
        guidanceType: "professional-recommended",
        reason: "Internal sealed/control repair — professional",
      };
    }
    if (n.includes("cleaning") || n.includes("door seal") || n.includes("door hinge")) {
      return {
        diyStatus: "GREEN",
        guidanceType: "step-by-step",
        reason: "External cleaning / seal visual — GREEN after review",
      };
    }
    if (
      n.includes("cooling") ||
      n.includes("freezing") ||
      n.includes("ice") ||
      n.includes("water leakage") ||
      n.includes("drain") ||
      n.includes("inspection")
    ) {
      return {
        diyStatus: "YELLOW",
        guidanceType: "limited-troubleshooting",
        reason: "External symptom troubleshooting — stop before sealed system",
      };
    }
    return {
      diyStatus: "YELLOW",
      guidanceType: "limited-troubleshooting",
      reason: "External refrigerator troubleshooting — compressor/sealed = RED",
    };
  }

  // --- Microwave ---
  if (categorySlug === "microwave") {
    if (n.includes("internal cleaning") || (n.includes("cleaning") && !n.includes("electrical"))) {
      return {
        diyStatus: "GREEN",
        guidanceType: "step-by-step",
        reason: "Cool interior wipe — GREEN; never open HV cavity",
      };
    }
    if (n.includes("turntable") || n === "microwave door problem") {
      return {
        diyStatus: "REVIEW_REQUIRED",
        guidanceType: "review-required",
        reason: "May be cosmetic or interlock-related — human confirm (HV risk)",
        ambiguous: true,
      };
    }
    if (n.includes("inspection") && !n.includes("electrical")) {
      return {
        diyStatus: "YELLOW",
        guidanceType: "safety-only",
        reason: "External observation only — no panel open",
      };
    }
    return {
      diyStatus: "RED",
      guidanceType: "professional-recommended",
      reason: "Microwave HV/magnetron-adjacent — specialist; no DIY repair steps",
    };
  }

  // --- Washing machine ---
  if (categorySlug === "washing-machine") {
    if (n.includes("motor") || n.includes("control board") || n.includes("belt") || n.includes("pump repair") || n.includes("drum")) {
      return {
        diyStatus: "RED",
        guidanceType: "professional-recommended",
        reason: "Motor/board/drum/pump internals — professional",
      };
    }
    if (n.includes("filter cleaning")) {
      return {
        diyStatus: "GREEN",
        guidanceType: "step-by-step",
        reason: "User-accessible filter clean — GREEN after review",
      };
    }
    return {
      diyStatus: "YELLOW",
      guidanceType: "limited-troubleshooting",
      reason: "External washer troubleshooting — stop for motor/board",
    };
  }

  // --- Water heater ---
  if (categorySlug === "water-heater") {
    if (
      n.includes("element") ||
      n.includes("electrical") ||
      n.includes("thermostat") ||
      n.includes("emergency") ||
      n.includes("valve replacement") ||
      n.includes("pressure") ||
      n.includes("no hot water") ||
      n.includes("slow heating") ||
      n.includes("temperature problem") ||
      n.includes("leakage repair")
    ) {
      return {
        diyStatus: "RED",
        guidanceType: "professional-recommended",
        reason: "Element/electrical/pressurized heater work — professional",
      };
    }
    if (n.includes("cleaning") || n.includes("scale") || n.includes("inspection") || n.includes("tank inspection") || n.includes("preventive")) {
      return {
        diyStatus: "YELLOW",
        guidanceType: "safety-only",
        reason: "External observation / cleaning framing — no live element DIY",
      };
    }
    return {
      diyStatus: "RED",
      guidanceType: "professional-recommended",
      reason: "Water heater default professional for electrical/pressure",
    };
  }

  // --- Dishwasher ---
  if (categorySlug === "dishwasher") {
    if (
      n.includes("heating") ||
      n.includes("control panel") ||
      n.includes("pump inspection") ||
      n.includes("electrical")
    ) {
      return {
        diyStatus: "RED",
        guidanceType: "professional-recommended",
        reason: "Heating/electrical/pump internals — professional",
      };
    }
    if (n.includes("filter cleaning") || n.includes("spray arm")) {
      return {
        diyStatus: "GREEN",
        guidanceType: "step-by-step",
        reason: "User-accessible filter/spray-arm clean — GREEN after review",
      };
    }
    return {
      diyStatus: "YELLOW",
      guidanceType: "limited-troubleshooting",
      reason: "External dishwasher troubleshooting — stop for heating/electrical",
    };
  }

  // --- Gym ---
  if (categorySlug === "gym") {
    if (
      n.includes("sanitization") ||
      n.includes("disinfection") ||
      n.includes("treadmill") ||
      n.includes("exercise bike") ||
      n.includes("cross-trainer") ||
      n.includes("weight equipment") ||
      n.includes("fitness equipment") ||
      n.includes("preventive gym")
    ) {
      return {
        diyStatus: "REVIEW_REQUIRED",
        guidanceType: "review-required",
        reason: n.includes("sanit") || n.includes("disinfect")
          ? "Chemical protocol — REVIEW_REQUIRED"
          : "Fitness equipment internals — inspection/report only until human class",
        ambiguous: true,
      };
    }
    if (n.includes("cleaning") || n.includes("locker") || n.includes("shower") || n.includes("glass") || n.includes("floor")) {
      return {
        diyStatus: "GREEN",
        guidanceType: "step-by-step",
        reason: "Gym surface cleaning — GREEN after chemical product review",
      };
    }
    return {
      diyStatus: "YELLOW",
      guidanceType: "limited-troubleshooting",
      reason: "Gym maintenance — cleaning OK; equipment mech = review",
    };
  }

  // --- Oven ---
  if (categorySlug === "oven") {
    if (n.includes("gas")) {
      return {
        diyStatus: "RED",
        guidanceType: "professional-recommended",
        reason: "Gas oven — professional only",
      };
    }
    if (
      n.includes("element") ||
      n.includes("electrical") ||
      n.includes("thermostat") ||
      n.includes("not heating") ||
      n.includes("uneven") ||
      n.includes("temperature") ||
      n.includes("fan repair") ||
      n.includes("control panel") ||
      n.includes("timer")
    ) {
      return {
        diyStatus: "RED",
        guidanceType: "professional-recommended",
        reason: "Heating element / electrical / controls — professional",
      };
    }
    if (n.includes("cleaning")) {
      return {
        diyStatus: "GREEN",
        guidanceType: "step-by-step",
        reason: "Cool oven cleaning — GREEN after review",
      };
    }
    if (n.includes("door") || n.includes("seal") || n.includes("inspection") || n.includes("preventive")) {
      return {
        diyStatus: "YELLOW",
        guidanceType: "limited-troubleshooting",
        reason: "Door seal visual / inspection — limited; no live element DIY",
      };
    }
    return {
      diyStatus: "YELLOW",
      guidanceType: "limited-troubleshooting",
      reason: "Oven external checks — element/gas = RED",
    };
  }

  // --- Burner / cooker ---
  if (categorySlug === "burner-cooker") {
    if (n.includes("electric cooker") || n.includes("induction")) {
      return {
        diyStatus: "REVIEW_REQUIRED",
        guidanceType: "review-required",
        reason: "Electric/induction repair steps — REVIEW_REQUIRED (not gas RED but still hazardous)",
        ambiguous: true,
      };
    }
    if (
      n.includes("leak") ||
      n.includes("hose") ||
      n.includes("valve") ||
      n.includes("burner repair") ||
      n.includes("burner replacement") ||
      n.includes("ignition") ||
      n.includes("flame") ||
      n.includes("igniter") ||
      (n.includes("inspection") && n.includes("gas"))
    ) {
      return {
        diyStatus: "RED",
        guidanceType: "professional-recommended",
        reason: "Gas leak/hose/valve/flame path — evacuate/pro; no DIY repair",
      };
    }
    if (n.includes("cleaning") || n.includes("hob") || n.includes("knob")) {
      return {
        diyStatus: "YELLOW",
        guidanceType: "limited-troubleshooting",
        reason: "Cool-surface cleaning / cosmetic knob — after review; stop if gas smell",
      };
    }
    return {
      diyStatus: "RED",
      guidanceType: "professional-recommended",
      reason: "Gas cooker default RED for gas path work",
    };
  }

  return {
    diyStatus: "REVIEW_REQUIRED",
    guidanceType: "review-required",
    reason: `Insufficient basis to invent DIY class for ${nameEn}`,
    ambiguous: true,
  };
}

function attachGuide(row: Omit<Row, "existingGuide" | "existingGuideStatus" | "primaryGuideRecommendation"> & { primaryGuide?: string }): Row {
  const slug = row.primaryGuide ?? "TBD";
  const guide = slug !== "TBD" ? GUIDE_BY_SLUG.get(slug) : undefined;
  return {
    ...row,
    existingGuide: guide ? guide.slug : "none",
    existingGuideStatus: guide ? guide.status : "none",
    primaryGuideRecommendation: guide ? guide.slug : "TBD — new dedicated guide required",
  };
}

function buildRows(): Row[] {
  const rows: Row[] = [];
  let n = 0;

  for (const cat of APPROVED_CATEGORIES) {
    n += 1;
    const cls = classifyParent(cat.slug, cat.nameEn);
    const anchor = ANCHOR_BY_PARENT.get(cat.slug);
    const offeringSlug = anchor?.slug ?? cat.slug;
    const diyStatus = cls.diyStatus;
    const hazardous = diyStatus === "RED" || diyStatus === "REVIEW_REQUIRED" || cat.slug === "electrical" || cat.slug === "burner-cooker";
    rows.push(
      attachGuide({
        n,
        parentCategory: cat.nameEn,
        parentSlug: cat.slug,
        serviceOffering: cat.nameEn,
        offeringSlug,
        kind: "parent",
        diyStatus,
        riskLevel: riskFromStatus(diyStatus),
        guidanceType: guidanceFor(diyStatus, cls.guidanceType),
        safetyReview: "required",
        arabicReview: arabicFor(diyStatus, cat.slug, hazardous),
        professionalFallback: diyStatus === "GREEN" ? "optional" : "required",
        reason: cls.reason,
        ambiguous: Boolean(cls.ambiguous),
        primaryGuide: cls.primaryGuide,
      }),
    );
  }

  for (const child of APPROVED_CHILDREN) {
    n += 1;
    const parent = APPROVED_CATEGORIES.find((c) => c.slug === child.categorySlug)!;
    const cls = classifyChild(child.categorySlug, child.nameEn);
    const diyStatus = cls.diyStatus;
    const hazardous =
      diyStatus === "RED" ||
      diyStatus === "REVIEW_REQUIRED" ||
      child.categorySlug === "electrical" ||
      child.categorySlug === "burner-cooker" ||
      child.categorySlug === "plumbing" ||
      child.categorySlug === "walls" ||
      child.categorySlug === "water-heater" ||
      child.categorySlug === "microwave";
    rows.push(
      attachGuide({
        n,
        parentCategory: parent.nameEn,
        parentSlug: child.categorySlug,
        serviceOffering: child.nameEn,
        offeringSlug: childSlug(child),
        kind: "child",
        diyStatus,
        riskLevel: riskFromStatus(diyStatus),
        guidanceType: guidanceFor(diyStatus, cls.guidanceType),
        safetyReview: "required",
        arabicReview: arabicFor(diyStatus, child.categorySlug, hazardous),
        professionalFallback:
          diyStatus === "GREEN" && !hazardous ? "optional" : diyStatus === "GREEN" ? "optional" : "required",
        reason: cls.reason,
        ambiguous: Boolean(cls.ambiguous),
        primaryGuide: cls.primaryGuide,
      }),
    );
  }

  if (rows.length !== 311) {
    throw new Error(`Expected 311 rows, got ${rows.length}`);
  }
  return rows;
}

function counts(rows: Row[]) {
  const byStatus = { GREEN: 0, YELLOW: 0, RED: 0, REVIEW_REQUIRED: 0 };
  let existingGuidesMapped = 0;
  let newGuidesRequired = 0;
  let safetyReviewRequired = 0;
  let arabicReviewRequired = 0;
  let arabicReviewReviewRequired = 0;
  let ambiguous = 0;

  for (const r of rows) {
    byStatus[r.diyStatus] += 1;
    if (r.existingGuide !== "none") existingGuidesMapped += 1;
    if (r.primaryGuideRecommendation.startsWith("TBD")) newGuidesRequired += 1;
    if (r.safetyReview === "required") safetyReviewRequired += 1;
    if (r.arabicReview === "required") arabicReviewRequired += 1;
    if (r.arabicReview === "review-required") arabicReviewReviewRequired += 1;
    if (r.ambiguous) ambiguous += 1;
  }

  return {
    parents: 18,
    children: 293,
    total: 311,
    ...byStatus,
    existingGuidesMapped,
    newGuidesRequired,
    safetyReviewRequired,
    arabicReviewRequired,
    arabicReviewReviewRequired,
    ambiguous,
  };
}

function escapeMdCell(s: string): string {
  return s.replace(/\|/g, "\\|").replace(/\n/g, " ");
}

function buildMd(rows: Row[], c: ReturnType<typeof counts>): string {
  const guideMap = diyGuides.map((g) => {
    const mapped = rows.filter((r) => r.existingGuide === g.slug);
    const canPrimary = mapped.some((r) => r.primaryGuideRecommendation === g.slug);
    return {
      slug: g.slug,
      service: g.serviceSlug,
      status: g.status,
      canPrimary,
      mappedCount: mapped.length,
      offerings: mapped.map((r) => r.offeringSlug).slice(0, 12),
    };
  });

  const ambiguousRows = rows.filter((r) => r.ambiguous || r.diyStatus === "REVIEW_REQUIRED");

  const lines: string[] = [];
  lines.push("# DIY Classification Matrix — 311 offerings");
  lines.push("");
  lines.push("> Classification worksheet only. No DIY articles authored. No schema/seed/app changes.");
  lines.push(`> Sources: \`prisma/data/catalog-a1.ts\`, \`prisma/data/diy.ts\`, \`docs/diy-service-profile-architecture.md\``);
  lines.push(`> Machine-readable: \`docs/diy-classification-matrix-311.json\``);
  lines.push(`> Generated: 2026-09-09 · Catalog assert: parents=${catalogAssert.parents}, children=${catalogAssert.children}, offerings=${catalogAssert.offerings}`);
  lines.push("");
  lines.push("## Legend");
  lines.push("");
  lines.push("| Field | Values |");
  lines.push("|-------|--------|");
  lines.push("| DIY Status | GREEN \\| YELLOW \\| RED \\| REVIEW_REQUIRED |");
  lines.push("| Risk Level | green \\| yellow \\| red \\| review_required (workflow; Prisma enum is green\\|yellow\\|red) |");
  lines.push("| DIY Guidance Type | step-by-step \\| limited-troubleshooting \\| safety-only \\| professional-recommended \\| review-required |");
  lines.push("| Safety / Arabic Review | required \\| review-required \\| optional \\| not-required |");
  lines.push("| Professional Fallback | required \\| optional |");
  lines.push("");
  lines.push("## Existing DiyGuide → offering map (6 rows)");
  lines.push("");
  lines.push("| Guide slug | Service (seed) | Status | Can be primary? | Mapped offerings (sample) |");
  lines.push("|------------|----------------|--------|-----------------|---------------------------|");
  for (const g of guideMap) {
    lines.push(
      `| \`${g.slug}\` | \`${g.service}\` | ${g.status} | ${g.canPrimary ? "yes" : "no"} | ${g.mappedCount}: ${g.offerings.map((o) => `\`${o}\``).join(", ")}${g.mappedCount > 12 ? ", …" : ""} |`,
    );
  }
  lines.push("");
  lines.push("### Guide mapping detail");
  lines.push("");
  lines.push("| Guide slug | → service | published/draft | can be primary? |");
  lines.push("|------------|-----------|-----------------|-----------------|");
  for (const g of diyGuides) {
    const can = rows.some((r) => r.primaryGuideRecommendation === g.slug);
    lines.push(`| \`${g.slug}\` | \`${g.serviceSlug}\` | ${g.status} | ${can ? "yes" : "partial/no"} |`);
  }
  lines.push("");
  lines.push("## Final counts");
  lines.push("");
  lines.push("| Metric | Count |");
  lines.push("|--------|------:|");
  lines.push(`| Parent categories | ${c.parents} |`);
  lines.push(`| Child offerings | ${c.children} |`);
  lines.push(`| **Total** | **${c.total}** |`);
  lines.push(`| GREEN | ${c.GREEN} |`);
  lines.push(`| YELLOW | ${c.YELLOW} |`);
  lines.push(`| RED | ${c.RED} |`);
  lines.push(`| REVIEW_REQUIRED | ${c.REVIEW_REQUIRED} |`);
  lines.push(`| Existing guides mapped (rows with a seed guide) | ${c.existingGuidesMapped} |`);
  lines.push(`| New guides required (primary TBD) | ${c.newGuidesRequired} |`);
  lines.push(`| Safety review required | ${c.safetyReviewRequired} |`);
  lines.push(`| Arabic review required | ${c.arabicReviewRequired} |`);
  lines.push(`| Arabic review = review-required (workflow) | ${c.arabicReviewReviewRequired} |`);
  lines.push(`| Ambiguous services | ${c.ambiguous} |`);
  lines.push("");
  lines.push("## Ambiguous / REVIEW_REQUIRED offerings");
  lines.push("");
  lines.push("| # | Parent Category | Service Offering | DIY Status | Reason |");
  lines.push("|---|-----------------|------------------|------------|--------|");
  for (const r of ambiguousRows) {
    lines.push(
      `| ${r.n} | ${escapeMdCell(r.parentCategory)} | ${escapeMdCell(r.serviceOffering)} | ${r.diyStatus} | ${escapeMdCell(r.reason)} |`,
    );
  }
  lines.push("");
  lines.push("## Full matrix (311 rows)");
  lines.push("");
  lines.push(
    "| # | Parent Category | Service Offering | DIY Status | Risk Level | DIY Guidance Type | Existing Guide | Existing Guide Status | Primary Guide Recommendation | Safety Review | Arabic Review | Professional Fallback | Reason |",
  );
  lines.push(
    "|---:|-----------------|------------------|------------|------------|-------------------|----------------|----------------------|------------------------------|---------------|---------------|----------------------|--------|",
  );
  for (const r of rows) {
    lines.push(
      `| ${r.n} | ${escapeMdCell(r.parentCategory)} | ${escapeMdCell(r.serviceOffering)}${r.kind === "parent" ? " *(parent)*" : ""} | ${r.diyStatus} | ${r.riskLevel} | ${r.guidanceType} | ${r.existingGuide === "none" ? "—" : `\`${r.existingGuide}\``} | ${r.existingGuideStatus} | ${r.primaryGuideRecommendation.startsWith("TBD") ? "TBD" : `\`${r.primaryGuideRecommendation}\``} | ${r.safetyReview} | ${r.arabicReview} | ${r.professionalFallback} | ${escapeMdCell(r.reason)} |`,
    );
  }
  lines.push("");
  lines.push("## STOP");
  lines.push("");
  lines.push("Docs-only deliverable complete. No DIY articles, schema, seed, or app code changes.");
  lines.push("");
  return lines.join("\n");
}

function main() {
  const rows = buildRows();
  const c = counts(rows);
  const outDir = path.join(process.cwd(), "docs");

  const json = {
    meta: {
      phase: "A1",
      generated: "2026-09-09",
      status: "classification-worksheet-only",
      sources: [
        "prisma/data/catalog-a1.ts",
        "prisma/data/diy.ts",
        "docs/diy-service-profile-architecture.md",
      ],
      catalogAssert,
      counts: c,
      existingGuides: diyGuides.map((g) => ({
        slug: g.slug,
        serviceSlug: g.serviceSlug,
        status: g.status,
        guideRiskLevel: g.riskLevel,
        canBePrimary: rows.some((r) => r.primaryGuideRecommendation === g.slug),
        mappedOfferingSlugs: rows.filter((r) => r.existingGuide === g.slug).map((r) => r.offeringSlug),
      })),
    },
    rows: rows.map((r) => ({
      n: r.n,
      parentCategory: r.parentCategory,
      parentSlug: r.parentSlug,
      serviceOffering: r.serviceOffering,
      offeringSlug: r.offeringSlug,
      kind: r.kind,
      diyStatus: r.diyStatus,
      riskLevel: r.riskLevel,
      diyGuidanceType: r.guidanceType,
      existingGuide: r.existingGuide === "none" ? null : r.existingGuide,
      existingGuideStatus: r.existingGuideStatus === "none" ? null : r.existingGuideStatus,
      primaryGuideRecommendation: r.primaryGuideRecommendation,
      safetyReview: r.safetyReview,
      arabicReview: r.arabicReview,
      professionalFallback: r.professionalFallback,
      reason: r.reason,
      ambiguous: r.ambiguous,
    })),
  };

  fs.writeFileSync(path.join(outDir, "diy-classification-matrix-311.json"), JSON.stringify(json, null, 2) + "\n", "utf8");
  fs.writeFileSync(path.join(outDir, "diy-classification-matrix-311.md"), buildMd(rows, c), "utf8");

  console.log(JSON.stringify({ wrote: ["docs/diy-classification-matrix-311.md", "docs/diy-classification-matrix-311.json"], counts: c }, null, 2));
}

main();
