/**
 * Deterministic canonical EN service content authoring.
 * Uses service identity + category + DIY matrix — no invented business claims.
 */
import { createHash } from "node:crypto";
import type { DiySafetyClass } from "@/lib/service-location/types";
import { getDiyMatrixClass } from "@/lib/service-location/diy-matrix";

export type CanonicalServiceInput = {
  slug: string;
  nameEn: string;
  categorySlug: string;
  categoryNameEn: string;
  riskLevel: "green" | "yellow" | "red";
  diyAvailable: boolean;
  bookingEnabled: boolean;
  amcAvailable: boolean;
  emergencyAvailable: boolean;
  inspectionRequired: boolean;
};

export type CanonicalServiceContent = {
  shortDescription: string;
  longDescription: string;
  whoItIsFor: string;
  whatWeDo: string;
  whenProfessional: string;
  process: string;
  pricingInfo: string;
  professionalFallback: string;
  safetyNotes: string;
  seoTitle: string;
  metaDescription: string;
  keywords: string;
  faq: string; // JSON array
  contentHash: string;
};

const CATEGORY_PROBLEMS: Record<string, string[]> = {
  cleaning: [
    "dust and surface buildup",
    "bathroom and kitchen hygiene issues",
    "post-move or renovation residue",
  ],
  "general-maintenance": [
    "minor fittings out of alignment",
    "wear-and-tear around doors and fixtures",
    "routine upkeep gaps in occupied properties",
  ],
  plumbing: [
    "drips and slow drains",
    "fixture leaks after use",
    "water pressure or seal concerns",
  ],
  electrical: [
    "non-working outlets or switches",
    "lighting circuit interruptions",
    "visible damage around fittings",
  ],
  ac: [
    "weak cooling or airflow",
    "filter-related dust and odor",
    "unit not starting after power events",
  ],
  painting: [
    "scuffs and touch-up needs",
    "uneven wall finish",
    "localized interior paint damage",
  ],
  walls: [
    "hairline surface cracks",
    "plaster chips",
    "localized wall surface defects",
  ],
  "swimming-pool": [
    "water clarity issues",
    "filter or pump performance concerns",
    "routine pool hygiene gaps",
  ],
  sauna: [
    "odor or surface residue",
    "heater performance concerns",
    "door seal and finish wear",
  ],
  "water-tank": [
    "tank hygiene concerns",
    "access and inspection needs",
    "scheduled maintenance gaps",
  ],
  refrigerator: [
    "cooling performance concerns",
    "unusual noise or frost patterns",
    "door seal and hygiene issues",
  ],
  microwave: [
    "heating performance concerns",
    "door latch or seal issues",
    "control panel faults",
  ],
  "washing-machine": [
    "incomplete cycles",
    "drainage or spin concerns",
    "unusual vibration or noise",
  ],
  "water-heater": [
    "no hot water or delayed heat",
    "leaks around connections",
    "thermostat or ignition concerns",
  ],
  dishwasher: [
    "poor cleaning results",
    "drainage or leak concerns",
    "incomplete wash cycles",
  ],
  gym: [
    "equipment hygiene gaps",
    "treadmill or bike maintenance needs",
    "routine facility upkeep",
  ],
  oven: [
    "uneven heating",
    "ignition or element concerns",
    "door seal wear",
  ],
  "burner-cooker": [
    "uneven flame or ignition issues",
    "knob or control faults",
    "surface and burner hygiene",
  ],
};

function matrixSafety(slug: string): DiySafetyClass {
  return getDiyMatrixClass(slug) ?? "REVIEW_REQUIRED";
}

function problemsFor(categorySlug: string, name: string): string[] {
  const base = CATEGORY_PROBLEMS[categorySlug] ?? [
    "performance concerns",
    "wear-and-tear symptoms",
    "routine maintenance gaps",
  ];
  return [
    `${name}-related ${base[0]}`,
    base[1] ?? "unexpected symptoms during normal use",
    base[2] ?? "situations that need professional assessment",
  ];
}

function faqsFor(input: CanonicalServiceInput, safety: DiySafetyClass) {
  const n = input.nameEn;
  const items = [
    {
      question: `What is ${n}?`,
      answer: `${n} is a maintenance offering under ${input.categoryNameEn}. It covers assessment and appropriate professional service for related issues in residential and commercial properties.`,
    },
    {
      question: `What problems does ${n} usually address?`,
      answer: problemsFor(input.categorySlug, n).join("; ") + ".",
    },
    {
      question: `Can I fix ${n} issues myself?`,
      answer:
        safety === "GREEN"
          ? `Limited DIY may be appropriate for low-risk checks when an approved guide exists. Stop and request a professional if anything seems unsafe.`
          : safety === "YELLOW"
            ? `Only limited safe checks are appropriate. Do not attempt live electrical, gas, sealed-system, or structural work.`
            : `Do-it-yourself repair is not recommended for this service class. Request a professional assessment.`,
    },
    {
      question: `When should I call ALNAJAH ALDAEM for ${n}?`,
      answer: `Call when symptoms persist, when access is unsafe, when specialized tools are required, or when you are unsure about the root cause.`,
    },
    {
      question: `Is booking available for ${n}?`,
      answer: input.bookingEnabled
        ? `You can submit a booking request. Confirmation and scheduling are handled by our team.`
        : `Booking is not enabled for this offering. You can request a quote for further guidance.`,
    },
    {
      question: `Is emergency service available?`,
      answer: input.emergencyAvailable
        ? `Emergency availability is enabled for this offering according to current service settings.`
        : `Emergency service is not confirmed for this offering in current service settings.`,
    },
    {
      question: `Is AMC available for ${n}?`,
      answer: input.amcAvailable
        ? `AMC may be available according to current service settings. Ask during quotation.`
        : `AMC is not enabled for this offering in current service settings.`,
    },
    {
      question: `How are prices set for ${n}?`,
      answer: input.inspectionRequired
        ? `Pricing typically depends on inspection findings, access, and scope. We do not publish invented fixed prices.`
        : `Pricing depends on scope and site conditions. Request a quote for your property.`,
    },
  ];
  return items.slice(0, 8);
}

export function buildCanonicalServiceEn(input: CanonicalServiceInput): CanonicalServiceContent {
  const safety = matrixSafety(input.slug);
  const problems = problemsFor(input.categorySlug, input.nameEn);
  const shortDescription = `${input.nameEn} helps property owners address ${problems[0]} with professional assessment and the right maintenance response.`;
  const longDescription = [
    `${input.nameEn} sits under ${input.categoryNameEn} in the ALNAJAH ALDAEM catalog.`,
    `It is intended for situations involving ${problems.join(", ")}.`,
    `Our team focuses on clear diagnosis, safe work practices, and a practical recommendation — without inventing coverage, prices, or certifications.`,
    safety === "RED" || safety === "REVIEW_REQUIRED"
      ? `Because of the safety class for this offering, DIY repair instructions are not provided; professional handling is recommended.`
      : safety === "YELLOW"
        ? `Limited DIY troubleshooting may be available for safe external checks only.`
        : `Where an approved DIY guide exists, limited self-help checks may be available.`,
  ].join(" ");

  const whoItIsFor = `Homeowners, tenants (with permission), facility supervisors, and commercial property teams dealing with ${input.nameEn.toLowerCase()} needs in the UAE.`;
  const whatWeDo = [
    `Review the reported symptoms for ${input.nameEn}.`,
    `Advise whether photos or a site inspection are needed.`,
    `Recommend the appropriate maintenance or repair path.`,
    `Provide a human-prepared quotation when scope is clear.`,
  ].join(" ");

  const whenProfessional = `Request a professional when symptoms continue, when access is restricted or unsafe, when specialized tools are required, or when DIY guidance says to stop.`;
  const process = [
    `1) Share the problem, property type, and location.`,
    `2) Add photos when it is safe to do so.`,
    `3) We confirm whether inspection is required.`,
    `4) A person prepares the quotation and next steps.`,
    `5) Approved work proceeds according to the agreed scope.`,
  ].join(" ");

  const pricingInfo = input.inspectionRequired
    ? `Quotation depends on inspection, access, and scope. No invented fixed prices.`
    : `Quotation depends on scope and site conditions. Request a quote for details.`;

  const professionalFallback = `Need help with ${input.nameEn}? ALNAJAH ALDAEM can inspect the issue and recommend the appropriate maintenance or repair service.`;

  const safetyNotes = [
    `Follow stop conditions in any approved DIY guidance.`,
    `Do not attempt live electrical work, gas-system repair, refrigerant handling, or structural interventions yourself.`,
    safety === "RED" || safety === "REVIEW_REQUIRED"
      ? `This offering is treated as professional-only for repair procedures.`
      : `Stop immediately if you smell gas, see sparks, flooding, or structural movement.`,
  ].join(" ");

  const seoTitle = `Professional ${input.nameEn} | ALNAJAH ALDAEM`;
  const metaDescription = `${input.nameEn} under ${input.categoryNameEn}. Request assessment and quotation from ALNAJAH ALDAEM — no invented prices or fake claims.`;
  const keywords = [input.nameEn, input.categoryNameEn, "UAE maintenance", "ALNAJAH ALDAEM"].join(", ");
  const faqItems = faqsFor(input, safety);
  const faq = JSON.stringify(faqItems);

  const contentHash = createHash("sha256")
    .update(
      JSON.stringify({
        v: 1,
        slug: input.slug,
        shortDescription,
        longDescription,
        whatWeDo,
        process,
        faq,
        safety,
      }),
    )
    .digest("hex");

  return {
    shortDescription,
    longDescription,
    whoItIsFor,
    whatWeDo,
    whenProfessional,
    process,
    pricingInfo,
    professionalFallback,
    safetyNotes,
    seoTitle,
    metaDescription,
    keywords,
    faq,
    contentHash,
  };
}

export function isPhaseA1Stub(longDescription: string | null | undefined): boolean {
  const t = (longDescription || "").toLowerCase();
  return t.includes("phase a1 master catalog") || t.includes("not publicly offered yet");
}
