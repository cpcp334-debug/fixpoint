/**
 * RED DIY profiles — safety / observation only. NO procedural repair steps.
 */
import type { DiyGuideProfileJson } from "@/lib/diy/profile-contract";
import { emptyDiyProfile } from "@/lib/diy/profile-contract";

export const RED_BATCH = "A4.2-RED-1" as const;

const FALLBACK =
  "Al Najah Al Daem · Fixpoint can inspect the issue safely and perform the appropriate licensed repair. Do not attempt sealed-system, live electrical, gas, or structural work yourself.";

function faqs(name: string, overview: string): DiyGuideProfileJson["faq"] {
  return [
    { question: `What is ${name}?`, answer: overview },
    {
      question: "Can I repair this myself?",
      answer:
        "No. This classification is RED — do not attempt procedural repair. Only safe external observation and isolation of hazards (where unquestionably safe) are appropriate before calling a professional.",
    },
    {
      question: "What should I check first?",
      answer:
        "From a safe distance, note smells, sounds, water, heat, or visible damage. Do not open sealed panels, live covers, gas assemblies, or load-bearing structures.",
    },
    {
      question: "When should I call a professional?",
      answer: `Call immediately for ${name.toLowerCase()} when there is gas smell, sparks, flooding, structural movement, smoke, or any doubt about safety. Otherwise book as soon as practical — do not DIY repair.`,
    },
    {
      question: "Is emergency help available?",
      answer:
        "If there is immediate danger (gas, fire, flooding, collapse risk), leave the area and use emergency services first. Then contact Al Najah Al Daem · Fixpoint for follow-up repair where appropriate.",
    },
    {
      question: "What must I never do?",
      answer:
        "Never perform live electrical work, gas valve manipulation, refrigerant handling, high-voltage appliance internals, confined-space entry, or structural cutting.",
    },
  ];
}

export function authorRedSafetyProfile(slug: string, serviceName: string, parentSlug: string): DiyGuideProfileJson {
  const overview = `${serviceName} is classified RED for DIY. This page explains risks and safe observation only — it does not provide repair procedures. Professional service is required for diagnosis and repair.`;
  const p = emptyDiyProfile({
    matrixSafety: "RED",
    status: "draft",
    batch: RED_BATCH,
    authored: true,
  });
  p.main.overview = overview;
  p.main.symptoms = `Warning signs related to ${serviceName.toLowerCase()} may include unusual smells, heat, noise, leaks, smoke, or loss of normal function. Treat these as professional-only.`;
  p.main.canIDoIt =
    "No procedural DIY repair. You may only perform safe external observation and leave the area if danger is present.";
  p.main.skillLevel = "Observation only — not a DIY repair skill level";
  p.main.estimatedTime = "Observation only; book professional service";
  p.tools.tools = ["Flashlight (for external viewing)", "Phone for photos and booking"];
  p.tools.materials = [];
  p.tools.prerequisites = [
    "Keep clear of live panels, gas equipment, and unstable structures",
    "Have a way to leave the area if conditions worsen",
  ];
  p.checks.safeChecks = [
    "From a safe distance, note smells (gas/burning), sounds, heat, water, or visible damage.",
    "Confirm whether occupants should leave if danger is present.",
    "Photograph only from a safe stance — do not dismantle anything.",
  ];
  p.checks.expectedObservations = [
    "Hazard clues documented without opening sealed systems",
    "Area remains safe for occupants or is evacuated",
  ];
  p.troubleshooting.commonCauses = [
    "Equipment failure requiring professional diagnosis",
    "Unsafe energy sources (electricity, gas, refrigerant, heat)",
    "Hidden damage not visible without invasive access",
  ];
  p.troubleshooting.troubleshooting = [
    "Do not open covers or attempt repair sequences.",
    "Isolate only if a clearly labeled user shutoff exists and is unquestionably safe to use — otherwise leave and call for help.",
    "Book professional inspection with your photos and notes.",
  ];
  // RED: no procedural steps
  p.steps = [];
  p.safety.warnings = [
    "RED classification: procedural repair instructions are intentionally withheld.",
    "Gas, live electricity, refrigerant, high voltage, and structural work can cause severe injury or death.",
  ];
  p.safety.stopConditions = [
    "Stop all DIY immediately — this is not a repair guide.",
    "Leave the area for gas smell, smoke, sparks, flooding, or structural movement.",
    "Stop if you would need to open sealed panels or use specialist tools.",
  ];
  p.safety.dontDo = [
    "Do not perform live electrical repair or open distribution panels.",
    "Do not adjust gas valves, hoses, or burners beyond normal appliance knob use.",
    "Do not handle refrigerant, compressors, magnetrons, or high-voltage capacitors.",
    "Do not enter confined tanks/pits or cut load-bearing structures.",
  ];
  p.professional.whenToCallProfessional = `Always engage a professional for ${serviceName.toLowerCase()}. DIY repair is not appropriate under RED classification.`;
  p.professional.professionalFallback = FALLBACK;
  p.aeo.whatIs = overview;
  p.aeo.canIDoIt = p.main.canIDoIt;
  p.aeo.checkFirst =
    "Observe from a safe distance and evacuate if there is immediate danger; do not open sealed systems.";
  p.aeo.usualCauses = "Faults in this category typically require trained diagnosis rather than homeowner repair.";
  p.aeo.whenCallProfessional = p.professional.whenToCallProfessional;
  p.faq = faqs(serviceName, overview);
  p.relatedServiceSlugs = [slug];
  void parentSlug;
  return p;
}

export function authorReviewRequiredProfile(
  slug: string,
  serviceName: string,
  parentSlug: string,
): DiyGuideProfileJson {
  const overview = `${serviceName} requires human safety review before any DIY guidance can be approved. Until review completes, treat this as professional-only.`;
  const p = emptyDiyProfile({
    matrixSafety: "REVIEW_REQUIRED",
    status: "safety_review",
    batch: "A4.2-RR-1",
    authored: true,
  });
  p.metadata.status = "safety_review";
  p.main.overview = overview;
  p.main.symptoms = `Symptoms related to ${serviceName.toLowerCase()} should be documented for a professional. No DIY procedure is approved yet.`;
  p.main.canIDoIt =
    "Not yet. REVIEW_REQUIRED means no publishable procedural DIY until a human safety review approves guidance.";
  p.main.skillLevel = "Review pending — not approved for DIY";
  p.main.estimatedTime = "Do not DIY; await review or book a professional";
  p.tools.tools = ["Phone for booking and photos"];
  p.tools.materials = [];
  p.tools.prerequisites = ["Do not attempt invasive checks"];
  p.checks.safeChecks = [
    "Note symptoms from a safe distance.",
    "Avoid opening panels or using specialist tools.",
  ];
  p.checks.expectedObservations = ["Symptom notes ready for a technician"];
  p.troubleshooting.commonCauses = ["Unclassified risk — professional assessment required"];
  p.troubleshooting.troubleshooting = [
    "Do not invent a repair sequence.",
    "Book professional help and provide photos if safe.",
  ];
  p.steps = [];
  p.safety.warnings = [
    "REVIEW_REQUIRED: no approved DIY procedure.",
    "Conservative stance — treat as professional-only until review completes.",
  ];
  p.safety.stopConditions = [
    "Do not start DIY repair steps.",
    "Stop if any hazard cue appears and leave if needed.",
  ];
  p.safety.dontDo = [
    "Do not follow unofficial repair videos for this offering.",
    "Do not open sealed, live, gas, or structural systems.",
  ];
  p.professional.whenToCallProfessional = `Book a professional for ${serviceName.toLowerCase()} until DIY guidance is explicitly approved.`;
  p.professional.professionalFallback = FALLBACK;
  p.aeo.whatIs = overview;
  p.aeo.canIDoIt = p.main.canIDoIt;
  p.aeo.checkFirst = "Document symptoms safely and contact a professional — no DIY procedure is approved.";
  p.aeo.usualCauses = "Cause analysis awaits professional inspection and safety review.";
  p.aeo.whenCallProfessional = p.professional.whenToCallProfessional;
  p.faq = [
    { question: `What is ${serviceName}?`, answer: overview },
    { question: "Can I DIY this?", answer: p.main.canIDoIt },
    { question: "What should I check first?", answer: p.aeo.checkFirst },
    { question: "When should I call a professional?", answer: p.professional.whenToCallProfessional },
    {
      question: "Why is this REVIEW_REQUIRED?",
      answer:
        "The safety classification needs human review before any procedural DIY can be authorized for this offering.",
    },
  ];
  p.relatedServiceSlugs = [slug];
  void parentSlug;
  return p;
}
