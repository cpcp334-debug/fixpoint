/**
 * A4.2 Batch 1 — GREEN profile authoring (EN).
 * Matrix-driven; service-specific structured drafts.
 */
import type { DiyGuideProfileJson, DiyProfileStep } from "@/lib/diy/profile-contract";
import { emptyDiyProfile } from "@/lib/diy/profile-contract";

const FALLBACK =
  "ALNAJAH ALDAEM can inspect the issue and recommend the appropriate maintenance or repair service.";

/** Keep Batch 1 GREEN content compatible with structured steps (parser also accepts legacy string[]). */
function plainSteps(actions: string[]): DiyProfileStep[] {
  return actions.map((action) => ({
    action,
    expectedResult: "Task progresses safely without new leaks, smells, sparks, or damage.",
    stopCondition: "Stop if force, live power, gas, sealed systems, or unclear parts are required.",
  }));
}

function faqs(pairs: Array<[string, string]>): DiyGuideProfileJson["faq"] {
  return pairs.slice(0, 8).map(([question, answer]) => ({ question, answer }));
}

function baseGreen(name: string, overview: string): DiyGuideProfileJson {
  const p = emptyDiyProfile({ matrixSafety: "GREEN", status: "draft", batch: "A4.2-GREEN-1", authored: true });
  p.main.overview = overview;
  p.main.canIDoIt = `Yes — careful DIY is often appropriate for ${name} when access is safe, power/water can be isolated as needed, and you stop at the first unsafe sign.`;
  p.main.skillLevel = "Beginner to intermediate";
  p.main.estimatedTime = "20–60 minutes";
  p.safety.warnings = [
    "Stop if you smell burning, see sparks, or cannot safely isolate the area.",
    "Keep children and pets away from tools, wet floors, and open cabinets.",
  ];
  p.safety.stopConditions = [
    "Stop if you cannot identify the correct parts or access path.",
    "Stop if water, heat, or electrical components behave unexpectedly.",
    "Stop if the task requires force that risks breaking fixtures or finishes.",
  ];
  p.safety.dontDo = [
    "Do not bypass safety devices or force seized fittings.",
    "Do not mix household chemicals.",
    "Do not continue if you feel unsure about isolation or reassembly.",
  ];
  p.professional.whenToCallProfessional = `Call a professional when access is restricted, damage is visible, or ${name.toLowerCase()} does not improve after basic safe steps.`;
  p.professional.professionalFallback = FALLBACK;
  p.aeo.whatIs = overview;
  p.aeo.canIDoIt = p.main.canIDoIt;
  p.aeo.whenCallProfessional = p.professional.whenToCallProfessional;
  return p;
}

function cleaningProfile(slug: string, name: string, focus: string): DiyGuideProfileJson {
  const p = baseGreen(
    name,
    `${name} focuses on ${focus}. The goal is a hygienic, damage-aware clean using suitable products and safe access — not aggressive scrubbing that harms finishes.`,
  );
  p.main.estimatedTime = "30–90 minutes depending on area size";
  p.tools.tools = ["Microfiber cloths", "Bucket", "Soft brush or sponge", "Vacuum or dustpan"];
  p.tools.materials = ["pH-appropriate cleaner for the surface", "Clean water", "Optional disinfectant labeled for the surface"];
  p.tools.prerequisites = ["Clear clutter", "Ventilate the room", "Read product labels"];
  p.checks.safeChecks = [
    "Confirm the cleaner is suitable for stone, wood, glass, or coated metal as applicable.",
    "Test a small hidden area if the finish is unfamiliar.",
    "Check for standing water risks before leaving the area.",
  ];
  p.checks.expectedObservations = ["Visible soil lifted", "Surfaces dry or drying evenly", "No haze or etching on finishes"];
  p.troubleshooting.commonCauses = ["Wrong cleaner for the finish", "Soil left too long", "Poor rinsing", "Insufficient drying"];
  p.troubleshooting.troubleshooting = [
    "If residue remains, rinse with clean water and wipe dry.",
    "If a finish looks etched or dull, stop and switch to a milder method.",
  ];
  p.steps = plainSteps([
    "Clear movable items and dry-dust or vacuum loose debris.",
    "Apply the appropriate cleaner according to the label — do not mix products.",
    `Work the ${focus} in sections, using soft tools only.`,
    "Rinse or wipe away residue so no slippery film remains.",
    "Dry high-traffic and wet-prone areas thoroughly.",
    "Re-check corners, edges, and fixtures for missed soil.",
  ]);
  p.aeo.checkFirst = "Identify the surface finish and remove loose debris before wet cleaning.";
  p.aeo.usualCauses = "Everyday soil, humidity, and incorrect cleaners are common reasons cleaning results disappoint.";
  p.faq = faqs([
    [`What is ${name}?`, p.main.overview],
    ["Can I do this myself?", p.main.canIDoIt],
    ["What should I check first?", p.aeo.checkFirst],
    ["Which cleaners are safe?", "Use products labeled for the specific finish. When unsure, start with mild soap and water on a test spot."],
    ["When should I call a professional?", p.professional.whenToCallProfessional],
    ["What should I avoid?", "Avoid abrasive pads, undiluted acids, bleach+ammonia mixes, and forcing stuck covers."],
    ["How often should this be done?", "Frequency depends on use and soil load; high-traffic areas usually need more frequent attention."],
  ]);
  p.relatedServiceSlugs = relatedForCleaning(slug);
  return p;
}

function relatedForCleaning(slug: string): string[] {
  const pool = [
    "residential-cleaning",
    "bathroom-cleaning",
    "floor-cleaning",
    "regular-cleaning",
    "deep-cleaning",
    "move-out-cleaning",
  ].filter((s) => s !== slug);
  return pool.slice(0, 4);
}

function faucetProfile(name: string): DiyGuideProfileJson {
  const p = baseGreen(
    name,
    `${name} addresses dripping or worn tap components when the spout drip is isolated to the tap — not a wall leak or failed isolation valve.`,
  );
  p.main.skillLevel = "Easy to moderate";
  p.main.estimatedTime = "20–45 minutes";
  p.tools.tools = ["Adjustable spanner", "Screwdriver", "Cloth", "Small container"];
  p.tools.materials = ["Matching washer or cartridge"];
  p.tools.prerequisites = ["Confirm you can isolate the tap", "Identify the tap type before ordering parts"];
  p.checks.safeChecks = [
    "Confirm the drip is from the spout, not the wall or supply pipe.",
    "Locate and test the isolation valve.",
    "Keep water away from nearby sockets.",
  ];
  p.checks.expectedObservations = ["Drip stops after reassembly", "No leak at handle or under basin"];
  p.troubleshooting.commonCauses = ["Worn washer", "Worn cartridge", "Debris on sealing faces", "Failed isolation"];
  p.troubleshooting.troubleshooting = [
    "If the drip continues after a correct part swap, stop and book a plumber.",
    "If chrome is seized, do not force it — stop.",
  ];
  p.steps = plainSteps([
    "Confirm the drip source is the spout.",
    "Close the isolation valve. If it will not turn or does not exist, stop.",
    "Open the tap to relieve pressure, then remove the handle as the design allows.",
    "Inspect and replace only a matching washer or cartridge.",
    "Reassemble, open isolation slowly, and check for leaks.",
  ]);
  p.safety.dontDo.push("Do not force seized chrome fittings.");
  p.aeo.checkFirst = "Confirm the drip location and whether an isolation valve works.";
  p.aeo.usualCauses = "Worn washers or cartridges are the most common DIY-fixable causes.";
  p.faq = faqs([
    [`What is ${name}?`, p.main.overview],
    ["Can I fix a dripping tap myself?", p.main.canIDoIt],
    ["What should I check first?", p.aeo.checkFirst],
    ["What if there is no isolation valve?", "Stop and book a plumber. Working without isolation risks uncontrolled water."],
    ["When should I call a professional?", p.professional.whenToCallProfessional],
    ["What should I avoid?", "Avoid forcing seized parts and working near live sockets with wet hands."],
  ]);
  p.relatedServiceSlugs = ["plumbing-maintenance", "faucet-repair", "faucet-replacement"].filter((s) => !name.toLowerCase().includes(s.split("-")[0]!));
  return p;
}

function acFilterProfile(): DiyGuideProfileJson {
  const p = baseGreen(
    "AC Filter Cleaning",
    "AC Filter Cleaning removes dust from accessible indoor-unit filters to support airflow. It does not include sealed cooling-circuit work, electrical repairs, or sealed-system service.",
  );
  p.tools.tools = ["Soft brush", "Vacuum with brush attachment", "Screwdriver if the grille uses screws"];
  p.tools.materials = ["Clean water if the filter type is washable", "Dry cloth"];
  p.tools.prerequisites = ["Power the unit off at the controller and isolate supply if required by the manufacturer", "Confirm the filter is user-accessible"];
  p.checks.safeChecks = ["Unit is off", "Filter type is washable or replaceable as labeled", "No water near electrics"];
  p.checks.expectedObservations = ["Filter free of heavy dust", "Airflow feels improved after restart"];
  p.troubleshooting.commonCauses = ["Clogged filter", "Incorrect reinstall orientation", "Blocked return grille"];
  p.troubleshooting.troubleshooting = ["If the filter is damaged, replace it instead of washing.", "If the unit will not restart normally, stop and book service."];
  p.steps = plainSteps([
    "Turn the AC off and allow the fan to stop.",
    "Open the accessible grille or cover as designed — do not force sealed panels.",
    "Remove the filter carefully, noting orientation.",
    "Vacuum or wash only if the filter type allows; dry completely before reinstall.",
    "Refit securely and close the cover.",
    "Restore power and check airflow.",
  ]);
  p.safety.dontDo.push("Do not open sealed cooling circuits, service capacitors, or open outdoor-unit internals.");
  p.aeo.checkFirst = "Confirm the indoor filter is user-accessible and the unit is powered off.";
  p.aeo.usualCauses = "Dust buildup on filters is a common airflow complaint in UAE homes.";
  p.faq = faqs([
    ["What is AC filter cleaning?", p.main.overview],
    ["Can I clean the filter myself?", p.main.canIDoIt],
    ["What should I check first?", p.aeo.checkFirst],
    ["Can I wash every filter?", "Only if labeled washable. Some filters are replace-only."],
    ["When should I call a professional?", "Call if panels are sealed, electrics are involved, or cooling remains poor after a clean filter."],
    ["What should I avoid?", "Avoid refrigerant handling, water on electronics, and forcing sealed covers."],
  ]);
  p.relatedServiceSlugs = ["ac-maintenance", "ac-servicing", "ac-cleaning"];
  return p;
}

function fridgeSealOrHinge(name: string, kind: "seal" | "hinge" | "clean"): DiyGuideProfileJson {
  if (kind === "clean") {
    return cleaningProfile("refrigerator-cleaning", name, "interior shelves, door bins, and accessible gasket faces — not sealed-system or compressor work");
  }
  const p = baseGreen(
    name,
    kind === "seal"
      ? `${name} covers replacing a damaged door gasket when the refrigerator is unplugged and the replacement part matches the model.`
      : `${name} covers tightening or adjusting accessible door hinges when the refrigerator is unplugged and no internal wiring is involved.`,
  );
  p.tools.tools = ["Screwdriver set", "Soft cloth"];
  p.tools.materials = kind === "seal" ? ["OEM-compatible door gasket"] : ["Correct hinge screws if replacements are needed"];
  p.tools.prerequisites = ["Unplug the appliance", "Support the door if it will be free"];
  p.checks.safeChecks = ["Power disconnected", "Door supported", "No force on coolant lines"];
  p.checks.expectedObservations =
    kind === "seal" ? ["Gasket seats evenly", "Door closes firmly"] : ["Door aligns", "No binding or drop"];
  p.troubleshooting.commonCauses =
    kind === "seal" ? ["Torn gasket", "Food debris under seal"] : ["Loose screws", "Settled cabinet"];
  p.troubleshooting.troubleshooting = ["If the door will not align or the cabinet is damaged, stop and book service."];
  p.steps =
    kind === "seal"
      ? plainSteps([
          "Unplug the refrigerator.",
          "Remove the old gasket per model design without prying against coolant lines.",
          "Fit the matching gasket evenly around the door.",
          "Clean the sealing face, restore power, and check the close.",
        ])
      : plainSteps([
          "Unplug the refrigerator and support the door.",
          "Inspect accessible hinge screws only.",
          "Tighten or adjust within the manufacturer’s accessible range.",
          "Check alignment, restore power, and verify the door closes.",
        ]);
  p.safety.dontDo.push("Do not open the sealed refrigeration system or cut foam around coolant pipes.");
  p.aeo.checkFirst = "Unplug the unit and confirm the fault is limited to the door seal or hinge area.";
  p.aeo.usualCauses = kind === "seal" ? "Worn or dirty gaskets cause poor sealing." : "Loose hinges cause door drop or poor seal.";
  p.faq = faqs([
    [`What is ${name}?`, p.main.overview],
    ["Can I do this myself?", p.main.canIDoIt],
    ["What should I check first?", p.aeo.checkFirst],
    ["When should I call a professional?", p.professional.whenToCallProfessional],
    ["What should I avoid?", "Avoid sealed-system work, compressor access, and forcing foam panels."],
  ]);
  p.relatedServiceSlugs = ["refrigerator-cleaning", "refrigerator-door-seal-replacement", "refrigerator-door-hinge-repair"];
  return p;
}

function poolGreen(name: string, focus: string): DiyGuideProfileJson {
  const p = baseGreen(name, `${name} covers ${focus}. It does not include gas chlorine generation repairs, electrical pump work, or confined-space tank entry.`);
  p.tools.tools = ["Pool skimmer net or vacuum head as applicable", "Telescopic pole", "Protective gloves"];
  p.tools.materials = ["Clean water for rinsing tools"];
  p.tools.prerequisites = ["Stable footing around the pool edge", "Children supervised away from the edge"];
  p.checks.safeChecks = ["Deck is not slippery beyond normal wet conditions", "Equipment used is intact"];
  p.checks.expectedObservations = ["Surface debris reduced", "No unusual equipment noise from DIY tools"];
  p.troubleshooting.commonCauses = ["Wind-blown debris", "Infrequent skimming", "Poor circulation (professional scope)"];
  p.troubleshooting.troubleshooting = ["If water chemistry looks wrong or equipment alarms, stop DIY and book pool service."];
  p.steps = plainSteps([
    "Clear the deck path and check footing.",
    `Perform ${focus} using intact tools only.`,
    "Empty collected debris into a bin — do not dump into drains that may clog.",
    "Rinse tools and store them safely.",
    "Note any cloudy water, strong chemical smell, or equipment faults for professional follow-up.",
  ]);
  p.safety.dontDo.push("Do not enter confined pump pits or service live pool electrics.");
  p.aeo.checkFirst = "Ensure stable footing and that the task is limited to surface cleaning tools.";
  p.aeo.usualCauses = "Debris and light soil accumulate quickly outdoors.";
  p.faq = faqs([
    [`What is ${name}?`, p.main.overview],
    ["Can I do this myself?", p.main.canIDoIt],
    ["What should I check first?", p.aeo.checkFirst],
    ["When should I call a professional?", "Call for chemistry imbalance, pump/electrical faults, leaks, or cloudy water that does not clear."],
    ["What should I avoid?", "Avoid electrical pump work, gas systems, and confined-space entry."],
  ]);
  p.relatedServiceSlugs = ["swimming-pool-cleaning", "pool-skimming", "swimming-pool-inspection"];
  return p;
}

function saunaClean(name: string, focus: string): DiyGuideProfileJson {
  const p = cleaningProfile(name.toLowerCase().replace(/\s+/g, "-"), name, focus);
  p.main.overview = `${name} covers ${focus} when the sauna is cool and powered down. It excludes heater element, electrical, or steam-generator repairs.`;
  p.tools.prerequisites.push("Confirm the heater is off and cool");
  p.safety.dontDo.push("Do not service heaters, elements, or electrical controls.");
  p.safety.stopConditions.push("Stop if the heater area must be opened or wiring is exposed.");
  p.relatedServiceSlugs = ["sauna-regular-cleaning", "sauna-deep-cleaning", "sauna-bench-cleaning"];
  return p;
}

function washFilter(): DiyGuideProfileJson {
  const p = baseGreen(
    "Washing Machine Filter Cleaning",
    "Washing Machine Filter Cleaning covers accessible drain-pump filters on many front-loaders after power-off and water cool-down. It excludes motor, PCB, and sealed drum work.",
  );
  p.tools.tools = ["Shallow tray", "Towel", "Gloves"];
  p.tools.materials = ["Clean water"];
  p.tools.prerequisites = ["Power off", "Wait for water to cool", "Know the filter access location for your model"];
  p.checks.safeChecks = ["Machine unplugged or breaker off", "Tray ready for residual water"];
  p.checks.expectedObservations = ["Filter free of lint/coins", "Door area dry after close"];
  p.troubleshooting.commonCauses = ["Lint buildup", "Coins or debris in trap", "Incorrect filter seating"];
  p.troubleshooting.troubleshooting = ["If the access panel requires force or wiring is exposed, stop."];
  p.steps = plainSteps([
    "Power off and place a tray under the filter access.",
    "Open the access as designed and slowly open the filter to drain residual water.",
    "Remove lint and debris; rinse the filter.",
    "Refit firmly, close the cover, and wipe spills.",
    "Restore power and run a short drain/spin to check for leaks.",
  ]);
  p.aeo.checkFirst = "Confirm model-specific filter access and power isolation.";
  p.aeo.usualCauses = "Lint and small objects commonly clog drain filters.";
  p.faq = faqs([
    ["What is washing machine filter cleaning?", p.main.overview],
    ["Can I do this myself?", p.main.canIDoIt],
    ["What should I check first?", p.aeo.checkFirst],
    ["When should I call a professional?", "Call if there is no user filter access, leaks persist, or error codes continue."],
    ["What should I avoid?", "Avoid opening the cabinet for motor/PCB work and working with hot wash water."],
  ]);
  p.relatedServiceSlugs = ["washing-machine-filter-cleaning"];
  return p;
}

function dishwasherFilter(name: string): DiyGuideProfileJson {
  const p = baseGreen(
    name,
    `${name} covers removable dishwasher filters and spray-arm channels when the appliance is cool and powered off. It excludes pump motors, heaters, and wiring.`,
  );
  p.tools.tools = ["Soft brush", "Cloth"];
  p.tools.materials = ["Warm water", "Mild detergent if allowed by the manual"];
  p.tools.prerequisites = ["Power off", "Allow the tub to cool"];
  p.checks.safeChecks = ["Filter orientation noted", "No forced disassembly of sealed pumps"];
  p.checks.expectedObservations = ["Filter clear", "Spray holes free of debris"];
  p.troubleshooting.commonCauses = ["Food debris", "Hard-water scale on spray holes"];
  p.troubleshooting.troubleshooting = ["If the filter housing cracks or will not reseat, stop and book service."];
  p.steps = plainSteps([
    "Power off and open the empty dishwasher.",
    "Remove the user filter assembly as shown in the manual.",
    "Rinse debris; gently clear spray-arm holes if accessible without tools that pierce plastic.",
    "Refit the filter correctly and run a short rinse to check.",
  ]);
  p.aeo.checkFirst = "Confirm the filter is user-removable for your model.";
  p.aeo.usualCauses = "Food soil and scale reduce spray performance.";
  p.faq = faqs([
    [`What is ${name}?`, p.main.overview],
    ["Can I do this myself?", p.main.canIDoIt],
    ["What should I check first?", p.aeo.checkFirst],
    ["When should I call a professional?", p.professional.whenToCallProfessional],
    ["What should I avoid?", "Avoid heater, pump, and electrical repairs."],
  ]);
  p.relatedServiceSlugs = ["dishwasher-filter-cleaning", "dishwasher-spray-arm-cleaning"];
  return p;
}

function microwaveClean(): DiyGuideProfileJson {
  const p = cleaningProfile(
    "microwave-internal-cleaning",
    "Microwave Internal Cleaning",
    "interior cavity and turntable cleaning with the oven unplugged — never open the outer case or service internal power components",
  );
  p.safety.dontDo.push("Do not open the outer case or touch internal power components.");
  p.safety.stopConditions.push("Stop if the outer case must be opened for any reason.");
  p.steps = plainSteps([
    "Unplug the microwave and remove the turntable if designed to lift out.",
    "Wipe the cavity with a mild cleaner suitable for appliances — no oven aerosols that leave residue for microwaving.",
    "Clean the turntable and support ring.",
    "Dry fully, reassemble, and restore power.",
  ]);
  return p;
}

function ovenClean(): DiyGuideProfileJson {
  const p = cleaningProfile("oven-cleaning", "Oven Cleaning", "cool oven interior and racks using suitable oven cleaners — not element or gas-valve repairs");
  p.safety.dontDo.push("Do not service gas valves, igniters, or electrical elements.");
  p.tools.prerequisites.push("Oven fully cool", "Good ventilation");
  return p;
}

function propertyInspection(): DiyGuideProfileJson {
  const p = baseGreen(
    "Property Inspection",
    "Property Inspection (DIY) means a structured walkthrough to note visible issues — moisture marks, loose fittings, blocked vents — for follow-up. It is observation only, not invasive testing.",
  );
  p.main.canIDoIt = "Yes — a visual checklist walkthrough is appropriate. Do not open live panels or enter unsafe roofs/confined spaces.";
  p.tools.tools = ["Notebook or phone camera", "Torch", "Moisture meter only if you already own and know how to use one non-invasively"];
  p.tools.materials = [];
  p.tools.prerequisites = ["Daylight or adequate lighting", "Access permission"];
  p.checks.safeChecks = ["No roof edge exposure without proper access equipment", "No electrical panel opening"];
  p.checks.expectedObservations = ["Photo log of issues", "Prioritized list for professional follow-up"];
  p.troubleshooting.commonCauses = ["Deferred maintenance", "Seasonal humidity staining"];
  p.troubleshooting.troubleshooting = ["Treat uncertain structural, electrical, or gas signs as professional scope immediately."];
  p.steps = plainSteps([
    "Walk rooms systematically: ceilings, walls, floors, wet rooms, external doors.",
    "Photograph stains, cracks, and damaged finishes without probing deeply.",
    "Note odours, ventilation issues, and fixture play.",
    "Compile a list for quotes or specialist inspection — do not start invasive repairs.",
  ]);
  p.aeo.checkFirst = "Plan a safe route and keep the inspection visual-only.";
  p.aeo.usualCauses = "Wear-and-tear and moisture are common findings.";
  p.faq = faqs([
    ["What is a DIY property inspection?", p.main.overview],
    ["Can I do this myself?", p.main.canIDoIt],
    ["What should I check first?", p.aeo.checkFirst],
    ["When should I call a professional?", "Call for structural cracks, electrical faults, gas concerns, roof access needs, or water intrusion."],
    ["What should I avoid?", "Avoid live panels, confined tanks, and unsafe height access."],
  ]);
  p.relatedServiceSlugs = ["building-maintenance", "wall-inspection"];
  return p;
}

function touchUpPaint(): DiyGuideProfileJson {
  const p = baseGreen(
    "Touch-up Painting",
    "Touch-up Painting covers small interior paint corrections on previously painted walls when surfaces are dry, ventilated, and free of structural damage.",
  );
  p.tools.tools = ["Artist or small roller brush", "Sanding sponge (fine)", "Dust cloth", "Drop sheet"];
  p.tools.materials = ["Matching interior paint", "Painter’s tape if needed"];
  p.tools.prerequisites = ["Confirm paint sheen/colour match", "Ventilate"];
  p.checks.safeChecks = ["No active damp", "No crumbling plaster that needs repair first"];
  p.checks.expectedObservations = ["Blend acceptable at normal viewing distance"];
  p.troubleshooting.commonCauses = ["Colour mismatch", "Gloss difference", "Unprepared dusty surface"];
  p.troubleshooting.troubleshooting = ["If large areas flash or peel, stop and plan a proper repaint."];
  p.steps = plainSteps([
    "Clean and lightly degloss the spot.",
    "Mask adjacent finishes if needed.",
    "Apply thin matching coats, allowing dry time.",
    "Inspect in natural light and adjust with feathered edges.",
  ]);
  p.aeo.checkFirst = "Confirm the damage is cosmetic paint only, not moisture or structural.";
  p.aeo.usualCauses = "Scuffs and small marks from furniture or kids.";
  p.faq = faqs([
    ["What is touch-up painting?", p.main.overview],
    ["Can I do this myself?", p.main.canIDoIt],
    ["What should I check first?", p.aeo.checkFirst],
    ["When should I call a professional?", "Call for large areas, exterior work at height, or moisture-damaged substrate."],
    ["What should I avoid?", "Avoid painting over active damp or lead-era coatings without proper assessment."],
  ]);
  p.relatedServiceSlugs = ["painting-services", "interior-painting", "wall-painting"];
  return p;
}

const CLEANING_FOCUS: Record<string, string> = {
  "cleaning-services": "general residential and light commercial cleaning tasks using finish-safe methods",
  "apartment-cleaning": "apartment interiors including kitchens, baths, and floors",
  "villa-cleaning": "villa interiors and accessible wet areas",
  "house-cleaning": "whole-home surface cleaning",
  "residential-cleaning": "home living areas with finish-aware methods",
  "commercial-cleaning": "light commercial interiors during approved access hours",
  "office-cleaning": "office desks, floors, and shared surfaces",
  "regular-cleaning": "routine upkeep cleaning on a schedule you choose",
  "recurring-cleaning": "repeat visits with consistent methods",
  "one-time-cleaning": "a single thorough clean of agreed areas",
  "move-in-cleaning": "pre-occupancy cleaning of empty rooms and fixtures",
  "move-out-cleaning": "end-of-tenancy cleaning of accessible interiors",
  "bathroom-cleaning": "bathrooms: basins, showers, toilets, and floors with suitable products",
  "floor-cleaning": "hard floors and accessible floor finishes",
  "gym-regular-cleaning": "gym floors and touchpoints when equipment is cool and powered as required",
  "gym-deep-cleaning": "deeper gym soil removal on accessible surfaces",
  "gym-equipment-cleaning": "equipment frames and contact surfaces with non-damaging cleaners",
  "gym-floor-cleaning": "gym flooring systems per finish guidance",
  "gym-glass-cleaning": "gym mirrors and glass partitions",
  "locker-cleaning": "lockers and benches with mild cleaners",
  "shower-and-changing-room-cleaning": "changing rooms and showers after cool-down",
  "sauna-regular-cleaning": "cool sauna benches and floors",
  "sauna-deep-cleaning": "deeper soil removal in a cool, powered-down sauna",
  "sauna-bench-cleaning": "sauna bench surfaces when cool",
  "sauna-floor-cleaning": "sauna floor surfaces when cool",
  "sauna-wall-cleaning": "sauna wall surfaces when cool",
  "sauna-glass-cleaning": "sauna glass when cool",
  "sauna-door-maintenance": "sauna door cleaning and gentle hardware checks when cool — not heater work",
};

/** Build authored GREEN profile for a matrix offering slug. */
export function authorGreenProfile(slug: string, serviceName: string): DiyGuideProfileJson {
  if (slug === "ac-filter-cleaning") return acFilterProfile();
  if (slug === "faucet-repair" || slug === "faucet-replacement") return faucetProfile(serviceName);
  if (slug === "touch-up-painting") return touchUpPaint();
  if (slug === "refrigerator-door-seal-replacement") return fridgeSealOrHinge(serviceName, "seal");
  if (slug === "refrigerator-door-hinge-repair") return fridgeSealOrHinge(serviceName, "hinge");
  if (slug === "refrigerator-cleaning") return fridgeSealOrHinge(serviceName, "clean");
  if (slug === "washing-machine-filter-cleaning") return washFilter();
  if (slug === "dishwasher-filter-cleaning" || slug === "dishwasher-spray-arm-cleaning")
    return dishwasherFilter(serviceName);
  if (slug === "microwave-internal-cleaning") return microwaveClean();
  if (slug === "oven-cleaning") return ovenClean();
  if (slug === "property-inspection") return propertyInspection();
  if (slug === "pool-skimming") return poolGreen(serviceName, "surface skimming of floating debris");
  if (slug === "pool-tile-cleaning") return poolGreen(serviceName, "accessible waterline tile wiping");
  if (slug === "pool-vacuum-cleaning") return poolGreen(serviceName, "manual vacuuming of accessible pool floors with a consumer vac head");
  if (slug === "swimming-pool-cleaning") return poolGreen(serviceName, "general surface debris removal and light tidying of the pool surround");
  if (slug === "swimming-pool-inspection") {
    const p = propertyInspection();
    p.main.overview =
      "Swimming Pool Inspection (DIY) means a visual check of water clarity, obvious debris, and accessible surround safety — not chemistry dosing design or plant-room electrical work.";
    p.aeo.whatIs = p.main.overview;
    p.relatedServiceSlugs = ["swimming-pool-cleaning", "pool-skimming"];
    return p;
  }
  if (slug.startsWith("sauna-")) return saunaClean(serviceName, CLEANING_FOCUS[slug] || "cool sauna surfaces");
  if (CLEANING_FOCUS[slug]) return cleaningProfile(slug, serviceName, CLEANING_FOCUS[slug]!);

  // Fallback still service-named (should not hit if slug list is complete)
  return cleaningProfile(slug, serviceName, `tasks related to ${serviceName}`);
}

/** Explicit primary guide slug mapping for Batch 1 GREEN services. */
export const GREEN_PRIMARY_GUIDE_SLUG: Record<string, string> = {
  "faucet-repair": "how-to-fix-dripping-faucet",
  "faucet-replacement": "how-to-fix-dripping-faucet",
  "ac-filter-cleaning": "how-to-clean-ac-filter",
  // Existing bathroom/paint guides are label-mismatched — new primaries:
  "bathroom-cleaning": "diy-bathroom-cleaning",
  "cleaning-services": "diy-cleaning-services",
  "touch-up-painting": "diy-touch-up-painting",
};

export function primaryGuideSlugForGreen(serviceSlug: string): string {
  return GREEN_PRIMARY_GUIDE_SLUG[serviceSlug] ?? `diy-${serviceSlug}`;
}

/** Plumbing explicit primary (YELLOW service — coverage only in Batch 1). */
export const PLUMBING_PRIMARY_GUIDE_SLUG = "how-to-fix-dripping-faucet";
export const PLUMBING_RELATED_GUIDE_SLUG = "how-to-unclog-a-sink-safely";

export const LABEL_MISMATCH_GUIDES = [
  "how-to-fix-dripping-faucet",
  "how-to-clean-ac-filter",
  "how-to-clean-a-bathroom",
] as const;
