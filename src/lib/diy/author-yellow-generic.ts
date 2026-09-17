/**
 * Category-templated YELLOW limited-troubleshooting profiles for remaining offerings.
 * Safety: external observation / low-risk checks only — no live electrical work,
 * fuel-system repair, sealed cooling-system work, HV appliance internals, or structural repair.
 * Avoid naming blocked substances/procedures in instructional fields (steps/troubleshooting)
 * so safety validators do not false-positive on forbid-lists.
 */
import type { DiyGuideProfileJson, DiyProfileStep } from "@/lib/diy/profile-contract";
import { emptyDiyProfile } from "@/lib/diy/profile-contract";
import { YELLOW_REMAINING_BATCH } from "@/lib/diy/yellow-remaining";

const FALLBACK =
  "Al Najah Al Daem · Fixpoint can inspect the issue and recommend the appropriate maintenance or repair service.";

function faqs(pairs: Array<[string, string]>) {
  return pairs.slice(0, 8).map(([question, answer]) => ({ question, answer }));
}

function step(action: string, expectedResult: string, stopCondition: string): DiyProfileStep {
  return { action, expectedResult, stopCondition };
}

type CatTemplate = {
  focus: string;
  tools: string[];
  materials: string[];
  prerequisites: string[];
  safeChecks: string[];
  observations: string[];
  causes: string[];
  troubleshooting: string[];
  steps: DiyProfileStep[];
  checkFirst: string;
  usualCauses: string;
  dontDoExtra: string[];
  warningsExtra: string[];
};

function baseYellow(name: string, overview: string, symptoms: string): DiyGuideProfileJson {
  const p = emptyDiyProfile({
    matrixSafety: "YELLOW",
    status: "draft",
    batch: YELLOW_REMAINING_BATCH,
    authored: true,
  });
  p.main.overview = overview;
  p.main.symptoms = symptoms;
  p.main.canIDoIt = `Only limited, external troubleshooting is appropriate for ${name}. Stop as soon as the next step needs sealed panels, live power work, fuel-system work, sealed cooling-system work, or structural repair.`;
  p.main.skillLevel = "Careful homeowner / facility caretaker";
  p.main.estimatedTime = "15–45 minutes for safe checks only";
  p.safety.warnings = [
    "This is limited troubleshooting — not a full repair procedure.",
    "Stop immediately if you smell fuel gas, see sparks, hear arcing, or find active structural movement.",
  ];
  p.safety.stopConditions = [
    "Stop if access requires opening sealed panels, live electrics, or fuel-system components.",
    "Stop if water intrusion, burning smells, or unexplained heat appear.",
    "Stop if the issue is beyond basic external inspection.",
  ];
  p.safety.dontDo = [
    "Do not perform live electrical work or open distribution panels.",
    "Do not open sealed cooling circuits or high-energy appliance internals.",
    "Do not mix household chemicals or enter tanks or equipment pits.",
  ];
  p.professional.whenToCallProfessional = `Book a professional when ${name.toLowerCase()} symptoms persist after safe checks, access is restricted, or any stop condition appears.`;
  p.professional.professionalFallback = FALLBACK;
  p.aeo.whatIs = overview;
  p.aeo.canIDoIt = p.main.canIDoIt;
  p.aeo.whenCallProfessional = p.professional.whenToCallProfessional;
  return p;
}

const TEMPLATES: Record<string, CatTemplate> = {
  "general-maintenance": {
    focus: "accessible fixtures and common-area wear",
    tools: ["Flashlight", "Screwdriver set", "Cloth", "Notepad"],
    materials: ["Spare screws matching existing hardware (optional)"],
    prerequisites: ["Confirm you have permission to access the area", "Keep walkways clear"],
    safeChecks: [
      "Look for loose accessible hardware that still moves freely.",
      "Note damp stains, trip hazards, or sticking doors without forcing them.",
      "Check whether the issue is cosmetic versus load-bearing or electrical.",
    ],
    observations: ["Hardware sits flush", "No new cracks after gentle checks", "Notes are clear for a technician"],
    causes: ["Settling wear", "Loose screws", "Misaligned latches", "Deferred minor upkeep"],
    troubleshooting: [
      "Tighten only accessible screws that were already designed to be user-serviced.",
      "Log stuck doors/windows without forcing frames.",
      "Photograph damp clues before wiping for documentation.",
    ],
    steps: [
      step(
        "Walk the accessible area and list symptoms without removing fixed panels.",
        "A clear symptom list exists.",
        "Stop if you need to open electrical boxes or cut finishes.",
      ),
      step(
        "Secure only obviously loose user-accessible hardware with matching fasteners.",
        "Hardware feels snug without stripping.",
        "Stop if screws spin freely, wood splits, or the part is structural.",
      ),
      step(
        "Photograph remaining issues and request a professional visit for anything unresolved.",
        "Evidence is ready for booking.",
        "Stop and evacuate if you smell gas or see sparks.",
      ),
    ],
    checkFirst: "Confirm safe access and whether the fault is cosmetic, mechanical, or electrical.",
    usualCauses: "Loose hardware and deferred minor wear are common.",
    dontDoExtra: ["Do not cut, jack, or shore structural members."],
    warningsExtra: ["Do not treat this as structural diagnosis."],
  },
  plumbing: {
    focus: "visible fixtures and drains",
    tools: ["Bucket", "Cloths", "Plunger (cup type)", "Flashlight"],
    materials: ["Mild detergent", "Clean water"],
    prerequisites: ["Know where the local isolation valve is", "Protect floors from splash"],
    safeChecks: [
      "Confirm the leak or blockage is at an accessible fixture, not inside the wall.",
      "Check the isolation valve turns freely without forcing.",
      "Look under the fixture for damp, mould, or active drip.",
    ],
    observations: ["Drip slows or stops after isolation", "Drain flow improves slightly", "No wall wetness spreads"],
    causes: ["Debris in trap", "Worn washer", "Partial blockage", "Loose accessible connection"],
    troubleshooting: [
      "Isolate the fixture if dripping continues.",
      "Use a cup plunger only on appropriate drains — never chemical mixes.",
      "Hand-tighten only accessible slip nuts that were already user-serviceable.",
    ],
    steps: [
      step(
        "Identify whether the issue is a drip, slow drain, or visible damp under an accessible fixture.",
        "Symptom type is clear.",
        "Stop if water is coming from the ceiling/wall cavity.",
      ),
      step(
        "Close the local isolation valve if present and place a bucket under the drip.",
        "Water flow is controlled.",
        "Stop if the valve will not turn or the body cracks.",
      ),
      step(
        "Attempt only non-chemical clearing (cup plunger) or wipe/document the damp area, then book help if unresolved.",
        "Either flow improves or you have clear photos for booking.",
        "Stop if chemicals, snakes, or pipe cutting would be next.",
      ),
    ],
    checkFirst: "Find the isolation valve and confirm the leak is not inside the wall.",
    usualCauses: "Debris and worn washers are common at fixtures.",
    dontDoExtra: ["Do not pour mixed drain chemicals.", "Do not cut or solder pipes."],
    warningsExtra: ["Hidden leaks can damage structure — do not delay professional help."],
  },
  ac: {
    focus: "external unit access and filter/drain visibility",
    tools: ["Flashlight", "Soft brush", "Cloth", "Vacuum with soft brush (optional)"],
    materials: ["Clean water for rinse of removable filters only"],
    prerequisites: ["Power off at the unit controller before opening user filter doors", "Stable footing"],
    safeChecks: [
      "Confirm the indoor filter door is a user-access panel per the manual.",
      "Look for ice on accessible coils without scraping.",
      "Check condensate drain outlet for obvious external blockage.",
    ],
    observations: ["Filter dust reduced", "Drain outlet freer", "No unusual burning smell"],
    causes: ["Dirty filter", "Blocked external drain mouth", "Restricted airflow", "Outdoor debris near grille"],
    troubleshooting: [
      "Clean only removable filters designed for user service.",
      "Clear leaves from outdoor grille without bending fins aggressively.",
      "Do not open sealed cooling sections or service ports.",
    ],
    steps: [
      step(
        "Turn the unit off at the controller and open only the labeled user filter door.",
        "Filter is accessible without forcing sealed covers.",
        "Stop if screws secure a sealed electrical or sealed cooling compartment.",
      ),
      step(
        "Remove and gently clean the filter; let it dry fully before reinstall.",
        "Filter looks clear and dry.",
        "Stop if the filter frame cracks or mould coats the coil deeply.",
      ),
      step(
        "Check the external drain outlet for visible debris only, then restart and note cooling behaviour.",
        "You have notes for a technician if cooling is still poor.",
        "Stop if ice, burning smell, or water floods indoors.",
      ),
    ],
    checkFirst: "Use only user-filter access; never open sealed cooling or live compartments.",
    usualCauses: "Dirty filters and blocked drain mouths are common.",
    dontDoExtra: ["Do not pierce coils or open sealed cooling circuits.", "Do not spray water into electrical sections."],
    warningsExtra: ["Sealed cooling systems and live electrics are professional-only."],
  },
  painting: {
    focus: "small interior touch-up readiness",
    tools: ["Drop cloth", "Painter tape", "Fine sandpaper", "Small brush or roller"],
    materials: ["Matching interior paint if already known", "Mild cleaner"],
    prerequisites: ["Confirm the wall is dry and free of active damp", "Ventilate"],
    safeChecks: [
      "Confirm the damage is cosmetic and within safe reach.",
      "Check for mould, damp, or peeling over a large area.",
      "Test paint colour on a hidden spot if matching is uncertain.",
    ],
    observations: ["Surface is clean and dry", "Touch-up blends reasonably", "No fumes overwhelm ventilation"],
    causes: ["Scuffs", "Faded patches", "Minor chips", "Previous poor prep"],
    troubleshooting: [
      "Clean before painting.",
      "Sand lightly only on loose edges of small chips.",
      "Large exterior or damp areas need professionals.",
    ],
    steps: [
      step(
        "Protect floors and confirm the patch is dry, mould-free, and within safe reach.",
        "Work area is prepared.",
        "Stop for damp, mould, or work above a safe reach.",
      ),
      step(
        "Clean and lightly feather only small loose edges; do not sand lead-suspect old coatings without testing.",
        "Surface is dull and clean.",
        "Stop if coating flakes extensively or may be hazardous.",
      ),
      step(
        "Apply a small matching interior touch-up and ventilate while drying.",
        "Patch looks acceptable or you decide to book full painting.",
        "Stop if fumes are strong, finish fails, or area expands beyond a touch-up.",
      ),
    ],
    checkFirst: "Confirm dry, mould-free, reachable interior surface before any paint.",
    usualCauses: "Scuffs and small chips are typical.",
    dontDoExtra: ["Do not paint over active damp or exterior high work without proper access equipment."],
    warningsExtra: ["Unknown old coatings may contain hazards — prefer professional assessment when unsure."],
  },
  walls: {
    focus: "surface cracks and cosmetic wall defects",
    tools: ["Flashlight", "Cloth", "Flexible putty knife (cosmetic only)", "Notepad"],
    materials: ["None required for inspection-only checks"],
    prerequisites: ["Good lighting", "Do not disturb suspected structural cracks"],
    safeChecks: [
      "Photograph crack length and width with a coin for scale.",
      "Note whether the crack is hairline cosmetic or wide/stepped.",
      "Check for accompanying damp or door/window binding.",
    ],
    observations: ["Crack documented", "No sudden widening during observation", "Damp clues noted"],
    causes: ["Settlement hairlines", "Impact holes", "Moisture", "Poor previous patch"],
    troubleshooting: [
      "Monitor hairline cracks over days before filling.",
      "Do not chisel into load-bearing elements.",
      "Wide, stepped, or damp cracks need professionals.",
    ],
    steps: [
      step(
        "Document the crack or hole with photos and approximate measurements.",
        "Clear evidence exists.",
        "Stop if the crack is wide, stepped, or accompanied by movement.",
      ),
      step(
        "Wipe dust from the surface only; do not dig into the substrate.",
        "Surface is clean for assessment.",
        "Stop if soft crumbling or active damp appears.",
      ),
      step(
        "For tiny cosmetic chips only, a shallow filler may be considered later; otherwise book wall repair.",
        "You either schedule help or plan a tiny cosmetic fill.",
        "Stop for structural concern, damp, or large damaged areas.",
      ),
    ],
    checkFirst: "Photograph and classify cosmetic vs concerning cracks before any filling.",
    usualCauses: "Hairline settlement and impact chips are common.",
    dontDoExtra: ["Do not cut reinforcement or chase deep channels."],
    warningsExtra: ["Structural assessment is professional-only."],
  },
  "swimming-pool": {
    focus: "pool water clarity and accessible deck hygiene",
    tools: ["Pool net", "Test strips (if already owned)", "Brush for accessible tiles"],
    materials: ["Manufacturer-approved chemicals only if you already know dosing — otherwise skip"],
    prerequisites: ["Never enter pump pits or equipment vaults", "Keep children/pets clear"],
    safeChecks: [
      "Observe water clarity and skimmer basket fullness.",
      "Check for obvious deck trip hazards.",
      "Listen for unusual pump noise without opening sealed electrics.",
    ],
    observations: ["Debris reduced", "Water clarity notes taken", "No chemical smell extremes"],
    causes: ["Surface debris", "Infrequent skimming", "Filter neglect", "Chemistry imbalance"],
    troubleshooting: [
      "Net surface debris.",
      "Empty a user-accessible skimmer basket.",
      "Do not open electrical pump housings.",
    ],
    steps: [
      step(
        "Net floating debris and empty the accessible skimmer basket.",
        "Surface debris is reduced.",
        "Stop if you must enter a pit or open electrical covers.",
      ),
      step(
        "If you already own test strips, record readings without adding unknown chemicals.",
        "Readings are noted for a technician.",
        "Stop if you would be guessing chemical doses.",
      ),
      step(
        "Brush accessible tile ring lightly and book professional pool service if water stays cloudy.",
        "Deck and water notes are ready.",
        "Stop for green water, strong chemical burns, or pump electrical faults.",
      ),
    ],
    checkFirst: "Clear debris first; do not open pump electrics.",
    usualCauses: "Surface debris and neglected baskets are common.",
    dontDoExtra: ["Do not enter equipment pits or vaults.", "Do not improvise chemical cocktails."],
    warningsExtra: ["Pool plant electrics and dosing mistakes are hazardous."],
  },
  sauna: {
    focus: "cool-room cleaning and visual checks",
    tools: ["Cloths", "Soft brush", "Mild cleaner labeled for wood/sauna use"],
    materials: ["Clean water"],
    prerequisites: ["Sauna fully cool and powered down", "Ventilate"],
    safeChecks: [
      "Confirm heater is cold and isolated at the controller.",
      "Look for cracked benches or damaged wiring visibly without opening panels.",
      "Check for mould in corners.",
    ],
    observations: ["Surfaces wiped", "No active heater heat", "Odours reduced"],
    causes: ["Sweat residue", "Poor drying", "Dust", "Infrequent wiping"],
    troubleshooting: [
      "Wipe benches when cool.",
      "Do not pour water on electrical heaters beyond manufacturer guidance.",
      "Damaged heaters need professionals.",
    ],
    steps: [
      step(
        "Ensure the sauna is cold and switched off before entering for cleaning.",
        "Room is safe to wipe.",
        "Stop if the heater is warm or controls behave oddly.",
      ),
      step(
        "Wipe benches and floors with mild appropriate cleaner; avoid soaking electrics.",
        "Surfaces look clean.",
        "Stop if mould is heavy or wood is rotting.",
      ),
      step(
        "Leave doors open to dry and book maintenance if heaters or sensors look damaged.",
        "Room is drying; notes ready if needed.",
        "Stop and isolate power if you smell burning.",
      ),
    ],
    checkFirst: "Only clean when fully cool with power off.",
    usualCauses: "Sweat residue and poor drying are typical.",
    dontDoExtra: ["Do not open heater electrical compartments."],
    warningsExtra: ["Hot surfaces and heater electrics can burn or shock."],
  },
  "water-tank": {
    focus: "external tank observation and lid checks",
    tools: ["Flashlight", "Camera", "Cloth"],
    materials: ["None for inspection-only"],
    prerequisites: ["Safe roof/access permission", "Never enter tanks"],
    safeChecks: [
      "Inspect lids, overflows, and obvious external leaks from a safe stance.",
      "Note insect entry or cracked covers.",
      "Do not climb unsafe edges.",
    ],
    observations: ["Lid seated", "No active external drip", "Photos captured"],
    causes: ["Loose cover", "Debris at overflow", "Age-related seepage", "Poor previous sealing"],
    troubleshooting: [
      "Reseat a lightweight accessible lid if designed for user access.",
      "Photograph leaks for professionals.",
      "Never enter the tank.",
    ],
    steps: [
      step(
        "From a safe position, photograph the tank exterior, lid, and any damp trails.",
        "Evidence is recorded.",
        "Stop if access requires unsafe height work without proper equipment.",
      ),
      step(
        "If the lid is a lightweight user cover, reseat it; otherwise leave it for professionals.",
        "Cover is better seated or left alone.",
        "Stop if the cover is heavy concrete or sealed.",
      ),
      step(
        "Book tank cleaning/repair — do not climb inside or dose unknown chemicals.",
        "Professional visit is arranged if needed.",
        "Stop if you would need to enter the tank.",
      ),
    ],
    checkFirst: "External photos only — never enter the tank.",
    usualCauses: "Loose covers and overflow debris are common.",
    dontDoExtra: ["Do not enter tanks or pits.", "Do not improvise chlorine dosing without guidance."],
    warningsExtra: ["Entering tanks or pits can be fatal."],
  },
  refrigerator: {
    focus: "external coils/vents and door seal checks",
    tools: ["Vacuum with brush", "Cloth", "Flashlight"],
    materials: ["Mild exterior cleaner"],
    prerequisites: ["Unplug only if the manual allows safe user cleaning access", "Keep food safe"],
    safeChecks: [
      "Feel door seals for gaps.",
      "Check that vents are not blocked by bags.",
      "Listen for unusual continuous noise without opening sealed systems.",
    ],
    observations: ["Seals cleaner", "Vents clearer", "Temperature notes taken"],
    causes: ["Dirty exterior vents", "Worn door seal", "Overpacked shelves", "Blocked airflow"],
    troubleshooting: [
      "Clear items blocking vents.",
      "Wipe door seals.",
      "Do not open sealed cooling or compressor sections.",
    ],
    steps: [
      step(
        "Note current temperatures and clear items blocking exterior vents.",
        "Airflow paths look clearer.",
        "Stop if you smell burning or see sparks.",
      ),
      step(
        "Wipe door seals and check for visible tears.",
        "Seals are clean; tears are noted.",
        "Stop if seal replacement needs adhesive tools you lack — book help.",
      ),
      step(
        "Vacuum dust from accessible exterior grille areas only, then monitor cooling for a day.",
        "You have a cooling log for booking if still poor.",
        "Stop before any sealed-system or electrical board work.",
      ),
    ],
    checkFirst: "Clear vents and inspect seals — never open sealed cooling systems.",
    usualCauses: "Blocked vents and dirty seals are common.",
    dontDoExtra: ["Do not puncture sealed cooling lines.", "Do not open high-energy electrical sections."],
    warningsExtra: ["Sealed cooling systems are professional-only."],
  },
  microwave: {
    focus: "cavity cleaning and door-close checks",
    tools: ["Cloths", "Microwave-safe bowl", "Mild cleaner"],
    materials: ["Water", "Lemon optional for steam soften"],
    prerequisites: ["Unplug if wiping near the door switch area", "Never run empty"],
    safeChecks: [
      "Confirm the door closes firmly and the seal looks intact.",
      "Look for arcing marks inside the cavity.",
      "Check the turntable sits correctly.",
    ],
    observations: ["Cavity cleaner", "Door latches", "No spark marks growing"],
    causes: ["Food soil", "Mis-seated turntable", "Dirty door film", "Worn latch feel"],
    troubleshooting: [
      "Steam-soften soil then wipe.",
      "Reseat turntable.",
      "Sparks or door faults → stop and book repair.",
    ],
    steps: [
      step(
        "Unplug if practical, then inspect door close and cavity for soil or spark marks.",
        "Condition is documented.",
        "Stop immediately if the door does not latch firmly.",
      ),
      step(
        "Steam-soften soil with a microwave-safe bowl of water if the unit still heats safely, then wipe the cavity.",
        "Soil is reduced.",
        "Stop if sparks, smoke, or unusual sounds appear.",
      ),
      step(
        "Reseat the turntable and test a short water heat only if the door is sound; otherwise book repair.",
        "Either a short test works or you book help.",
        "Stop before opening the outer cabinet or internal power sections.",
      ),
    ],
    checkFirst: "Door latch integrity first — never open the outer cabinet internals.",
    usualCauses: "Food soil and mis-seated turntables are common.",
    dontDoExtra: ["Do not open the outer cabinet for internal power-section work."],
    warningsExtra: ["Microwave internals can store dangerous energy even when unplugged."],
  },
  "washing-machine": {
    focus: "filters, hoses visible sections, and level checks",
    tools: ["Flashlight", "Cloths", "Shallow tray", "Screwdriver for user-filter cover only"],
    materials: ["Clean water"],
    prerequisites: ["Turn off and unplug if the manual requires for filter access", "Protect floors"],
    safeChecks: [
      "Confirm the machine is cool and idle.",
      "Locate the user drain-filter access if present.",
      "Check inlet hoses for visible kinks without disconnecting water under pressure carelessly.",
    ],
    observations: ["Filter debris removed", "No active floor flood", "Machine sits level"],
    causes: ["Blocked drain filter", "Unbalanced load", "Kinked hose", "Foreign objects"],
    troubleshooting: [
      "Clean user drain filter over a tray.",
      "Redistribute load.",
      "Do not open motor or control-board housings.",
    ],
    steps: [
      step(
        "Power off and place a tray under the user drain-filter door if the model has one.",
        "Ready for controlled water release.",
        "Stop if you cannot find a labeled user filter.",
      ),
      step(
        "Open the user filter slowly, catch water, remove lint/coins, and refit firmly.",
        "Filter is clean and closed.",
        "Stop if the housing cracks or water floods uncontrollably.",
      ),
      step(
        "Check the machine is roughly level and run a short rinse if safe; book help for leaks or no-spin issues that remain.",
        "Either behaviour improves or you book service.",
        "Stop before motor, belt, or board repairs.",
      ),
    ],
    checkFirst: "Use only labeled user filters; protect floors from water.",
    usualCauses: "Lint and coins in drain filters are common.",
    dontDoExtra: ["Do not open motor or PCB compartments."],
    warningsExtra: ["Live electrics and flooded floors are hazardous."],
  },
  "water-heater": {
    focus: "external observation and temperature-dial checks within user range",
    tools: ["Flashlight", "Cloth", "Camera"],
    materials: ["None for inspection-only"],
    prerequisites: ["Do not drain tanks without guidance", "Keep clear of hot pipes"],
    safeChecks: [
      "Look for external drips at visible fittings.",
      "Note if the user temperature dial is at an extreme.",
      "Listen for unusual noises without opening covers.",
    ],
    observations: ["No active floor puddle", "Dial position noted", "Photos of fittings taken"],
    causes: ["Dial set too high", "Sediment (professional flush)", "Loose visible drip at fitting", "Age"],
    troubleshooting: [
      "Return an accessible user dial toward a moderate setting if labeled for user adjustment.",
      "Photograph drips.",
      "Do not replace elements or open live covers.",
    ],
    steps: [
      step(
        "Photograph the heater exterior and any damp at accessible fittings from a safe distance.",
        "Evidence is recorded.",
        "Stop if the area is flooded or steaming heavily.",
      ),
      step(
        "If a clearly labeled user temperature dial exists, move it one step toward a moderate setting — do not open electrical covers.",
        "Dial is moderated or left alone if unlabeled.",
        "Stop if covers must be removed or wiring is exposed.",
      ),
      step(
        "Book professional heater service for no-hot-water, leaks, or scale — do not drain the tank or open wiring covers yourself.",
        "Professional visit is arranged.",
        "Stop before element, thermostat, or valve replacement DIY.",
      ),
    ],
    checkFirst: "External photos and labeled dial only — no cover removal.",
    usualCauses: "Extreme dial settings and ageing fittings are common clues.",
    dontDoExtra: ["Do not replace heating elements.", "Do not open live terminal covers."],
    warningsExtra: ["Stored hot water and live heaters can scald or shock."],
  },
  dishwasher: {
    focus: "filters, spray arms, and door seal wipe-downs",
    tools: ["Cloths", "Soft brush", "Toothpick for spray holes (gentle)"],
    materials: ["Mild dishwasher-safe cleaner if labeled"],
    prerequisites: ["Cool machine", "Remove lower rack for filter access if designed"],
    safeChecks: [
      "Locate the user filter assembly.",
      "Check spray arm holes for food grit.",
      "Inspect door seal for trapped debris.",
    ],
    observations: ["Filter clean", "Spray holes clearer", "Seal wiped"],
    causes: ["Dirty filter", "Blocked spray jets", "Hard-water film", "Overloaded racks"],
    troubleshooting: [
      "Clean user filters.",
      "Rinse spray arms if user-removable.",
      "Do not open pumps or heaters.",
    ],
    steps: [
      step(
        "Remove and rinse the user filter assembly over a sink.",
        "Filter debris is gone.",
        "Stop if parts crack or will not reseat.",
      ),
      step(
        "Check spray-arm holes for grit; rinse if the arm lifts off by design.",
        "Jets look clearer.",
        "Stop if forced disassembly of pumps would be next.",
      ),
      step(
        "Wipe the door seal, reload loosely, and run a short rinse; book help if leaks or poor wash remain.",
        "Either results improve or you book service.",
        "Stop before pump, heater, or PCB work.",
      ),
    ],
    checkFirst: "Clean user filters and spray jets before assuming a major fault.",
    usualCauses: "Dirty filters and blocked jets are common.",
    dontDoExtra: ["Do not dismantle the wash pump or heater."],
    warningsExtra: ["Water and electricity together require care."],
  },
  oven: {
    focus: "cool cavity cleaning and door-seal observation",
    tools: ["Cloths", "Plastic scraper", "Oven-safe cleaner labeled for your enamel"],
    materials: ["Clean water"],
    prerequisites: ["Oven fully cold", "Gloves if using strong cleaners"],
    safeChecks: [
      "Confirm the oven is cold.",
      "Inspect door glass and seal for damage.",
      "Note whether soil is burnt-on versus light.",
    ],
    observations: ["Soil reduced", "Seal intact", "No damaged wiring visible at hinge voids"],
    causes: ["Spill residue", "Infrequent wiping", "Wrong cleaner etching", "Door seal wear"],
    troubleshooting: [
      "Wipe after cool-down.",
      "Avoid steel wool on enamel.",
      "Element or thermostat faults need professionals.",
    ],
    steps: [
      step(
        "Ensure the oven is completely cold, then remove racks if designed for user removal.",
        "Cavity is accessible.",
        "Stop if heating elements look broken or wiring is exposed.",
      ),
      step(
        "Apply only a cleaner labeled safe for your oven surface; wipe soil without flooding door vents.",
        "Soil is reduced.",
        "Stop if the cleaner etches or fumes overwhelm ventilation.",
      ),
      step(
        "Dry thoroughly, reseat racks, and book repair for heating faults — do not replace elements yourself.",
        "Oven is clean or service is booked.",
        "Stop before any electrical element or gas conversion work.",
      ),
    ],
    checkFirst: "Clean only when fully cold; never service live elements.",
    usualCauses: "Spill residue after roasting is common.",
    dontDoExtra: ["Do not replace heating elements or open rear electrical covers."],
    warningsExtra: ["Gas ovens and live elements are professional domains."],
  },
  "burner-cooker": {
    focus: "cool hob surface and removable grate cleaning",
    tools: ["Cloths", "Soft brush", "Plastic scraper"],
    materials: ["Mild degreaser labeled for hob use", "Clean water"],
    prerequisites: ["All burners cold", "Gas supply left alone — do not turn valves beyond normal knob use"],
    safeChecks: [
      "Confirm every burner is cold.",
      "Look for cracked glass on ceramic/induction tops.",
      "Note uneven flame later only during normal cooking observation — do not dismantle injectors.",
    ],
    observations: ["Grates cleaner", "Spillage trays wiped", "Knobs turn freely without forcing"],
    causes: ["Food spill", "Grease film", "Clogged cap ports (professional)", "Mis-seated pan supports"],
    troubleshooting: [
      "Clean cold removable grates and caps if designed to lift off.",
      "Wipe spills promptly when cool.",
      "Gas smell or valve work → evacuate and call professionals.",
    ],
    steps: [
      step(
        "Ensure the hob is cold, then remove only lift-off grates/caps designed for user cleaning.",
        "Parts are free for washing.",
        "Stop if parts are screwed into gas assemblies.",
      ),
      step(
        "Wash grates/caps with mild cleaner; dry fully before reseating.",
        "Parts are clean and dry.",
        "Stop if you smell gas or find damaged seals.",
      ),
      step(
        "Reseat parts squarely and wipe the hob surface; book service for ignition or fuel-supply issues — do not open supply fittings.",
        "Hob looks clean or service is booked.",
        "Stop before any supply-fitting, hose, or injector work.",
      ),
    ],
    checkFirst: "Cold cleaning of lift-off parts only — never open fuel-supply fittings.",
    usualCauses: "Grease and food spills are common.",
    dontDoExtra: [
      "Do not open fuel-supply fittings or replace hoses yourself.",
      "If you smell fuel gas, leave the area and get professional help.",
    ],
    warningsExtra: ["Fuel-gas appliances can leak — cleaning is not fuel-system repair."],
  },
};

function applyTemplate(name: string, parentSlug: string, slug: string): DiyGuideProfileJson {
  const tpl = TEMPLATES[parentSlug] ?? TEMPLATES["general-maintenance"]!;
  const overview = `${name} (limited DIY) means safe external checks and low-risk upkeep focused on ${tpl.focus}. It is not a full professional repair procedure.`;
  const symptoms = `Use this guide when early symptoms related to ${name.toLowerCase()} appear and you can still access the area safely without tools beyond basic household items.`;
  const p = baseYellow(name, overview, symptoms);
  p.tools.tools = [...tpl.tools];
  p.tools.materials = [...tpl.materials];
  p.tools.prerequisites = [...tpl.prerequisites];
  p.checks.safeChecks = [...tpl.safeChecks];
  p.checks.expectedObservations = [...tpl.observations];
  p.troubleshooting.commonCauses = [...tpl.causes];
  p.troubleshooting.troubleshooting = [...tpl.troubleshooting];
  p.steps = tpl.steps.map((s) => ({ ...s }));
  p.aeo.checkFirst = tpl.checkFirst;
  p.aeo.usualCauses = tpl.usualCauses;
  p.safety.dontDo = [...p.safety.dontDo, ...tpl.dontDoExtra];
  p.safety.warnings = [...p.safety.warnings, ...tpl.warningsExtra];
  p.faq = faqs([
    [`What is ${name}?`, p.main.overview],
    [`Can I handle ${name.toLowerCase()} myself?`, p.main.canIDoIt],
    ["What should I check first?", p.aeo.checkFirst],
    ["When should I call a professional?", p.professional.whenToCallProfessional],
    ["What tools might I need for safe checks?", `Typically: ${tpl.tools.slice(0, 3).join(", ")}.`],
    ["What must I never do?", p.safety.dontDo[0] ?? "Do not attempt sealed-system or live electrical work."],
  ]);
  p.relatedServiceSlugs = [slug];
  return p;
}

export function authorYellowProfileByCategory(
  slug: string,
  serviceName: string,
  parentSlug: string,
): DiyGuideProfileJson {
  return applyTemplate(serviceName, parentSlug, slug);
}
