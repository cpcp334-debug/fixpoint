/**
 * A4.2 Batch 2 — YELLOW limited-troubleshooting EN profiles.
 * Matrix order selection (skip hubs + painting-services) lives in yellow-batch.ts.
 */
import type { DiyGuideProfileJson, DiyProfileStep } from "@/lib/diy/profile-contract";
import { emptyDiyProfile } from "@/lib/diy/profile-contract";

const FALLBACK =
  "ALNAJAH ALDAEM can inspect the issue and recommend the appropriate maintenance or repair service.";

function faqs(pairs: Array<[string, string]>) {
  return pairs.slice(0, 8).map(([question, answer]) => ({ question, answer }));
}

function step(action: string, expectedResult: string, stopCondition: string): DiyProfileStep {
  return { action, expectedResult, stopCondition };
}

function baseYellow(name: string, overview: string, symptoms: string): DiyGuideProfileJson {
  const p = emptyDiyProfile({
    matrixSafety: "YELLOW",
    status: "draft",
    batch: "A4.2-YELLOW-1",
    authored: true,
  });
  p.main.overview = overview;
  p.main.symptoms = symptoms;
  p.main.canIDoIt = `Only limited, external troubleshooting is appropriate for ${name}. Stop as soon as the next step needs tools beyond user access, live power work, gas work, or sealed systems.`;
  p.main.skillLevel = "Careful homeowner / facility caretaker";
  p.main.estimatedTime = "15–45 minutes for safe checks only";
  p.safety.warnings = [
    "This is limited troubleshooting — not a full repair procedure.",
    "Stop immediately if you smell gas, see sparks, hear arcing, or find active structural movement.",
  ];
  p.safety.stopConditions = [
    "Stop if access requires opening sealed panels, live electrics, or gas components.",
    "Stop if water intrusion, burning smells, or unexplained heat appear.",
    "Stop if the issue is beyond basic external inspection.",
  ];
  p.safety.dontDo = [
    "Do not perform live electrical work or open distribution panels.",
    "Do not adjust gas valves, refrigerant circuits, or high-energy appliance internals.",
    "Do not mix household chemicals or enter confined tanks/pits.",
  ];
  p.professional.whenToCallProfessional = `Book a professional when ${name.toLowerCase()} symptoms persist after safe checks, access is restricted, or any stop condition appears.`;
  p.professional.professionalFallback = FALLBACK;
  p.aeo.whatIs = overview;
  p.aeo.canIDoIt = p.main.canIDoIt;
  p.aeo.whenCallProfessional = p.professional.whenToCallProfessional;
  return p;
}

function yellowCleaningLimited(
  name: string,
  overview: string,
  symptoms: string,
  focus: string,
  related: string[],
): DiyGuideProfileJson {
  const p = baseYellow(name, overview, symptoms);
  p.tools.tools = ["Microfiber cloths", "Soft brush", "Vacuum with soft head", "Bucket"];
  p.tools.materials = ["Finish-safe cleaner labeled for the surface", "Clean water"];
  p.tools.prerequisites = [
    "Identify the surface finish",
    "Ventilate the area",
    "Keep walkways dry to prevent slips",
  ];
  p.checks.safeChecks = [
    `Confirm soil is limited to accessible ${focus}.`,
    "Test cleaner on a hidden spot if the finish is unfamiliar.",
    "Check for cracked glass, loose fixtures, or active leaks before wet work.",
  ];
  p.checks.expectedObservations = [
    "Soil lifts without etching or color transfer",
    "No new damage to finishes",
    "Floors are left non-slippery",
  ];
  p.troubleshooting.commonCauses = [
    "Wrong cleaner for the finish",
    "Soil left too long",
    "Dust redistribution from dry wiping only",
    "Residue from over-application",
  ];
  p.troubleshooting.troubleshooting = [
    "Switch to a milder, finish-labeled product if haze or etching appears — then stop if damage continues.",
    "Vacuum first, then damp-clean in sections.",
    "If fixtures are loose or glass is cracked, stop cleaning and book maintenance.",
  ];
  p.steps = [
    step(
      `Clear clutter and dry-remove loose debris from the ${focus}.`,
      "Loose dust and grit are gone before wet cleaning.",
      "Stop if glass is cracked, fixtures are loose, or height access is unsafe.",
    ),
    step(
      "Apply a finish-appropriate cleaner per the label — do not mix products.",
      "Soil begins to loosen without discoloration.",
      "Stop if the finish dulls, etches, or bleeds color.",
    ),
    step(
      "Wipe or rinse residue and dry walkways thoroughly.",
      "Surfaces look cleaner and are safe to walk on.",
      "Stop if moisture reaches electrics or creates a slip hazard you cannot control.",
    ),
  ];
  p.aeo.checkFirst = `Confirm the surface type for the ${focus} and remove loose debris first.`;
  p.aeo.usualCauses = "Everyday soil, humidity, and incorrect cleaners commonly reduce cleaning results.";
  p.faq = faqs([
    [`What is ${name}?`, overview],
    ["Can I do this myself?", p.main.canIDoIt],
    ["What should I check first?", p.aeo.checkFirst],
    ["When should I call a professional?", p.professional.whenToCallProfessional],
    ["What cleaners are safe?", "Use products labeled for the specific finish; start mild if unsure."],
    ["What should I avoid?", "Avoid abrasives, chemical mixes, and continuing after finish damage appears."],
  ]);
  p.relatedServiceSlugs = related;
  return p;
}

const AUTHORS: Record<string, (name: string) => DiyGuideProfileJson> = {
  "building-maintenance": (name) => {
    const p = baseYellow(
      name,
      "General Building Maintenance covers routine visual checks and low-risk upkeep of common building elements — doors, accessible hardware, drainage observations, and finish wear — not structural repair or live electrical work.",
      "Use when you notice sticking doors, minor drip stains, loose accessible handles, clogged accessible drains, or general wear that needs triage before calling specialists.",
    );
    p.tools.tools = ["Torch", "Notebook or phone camera", "Screwdriver for accessible user screws only", "Cloth"];
    p.tools.materials = [];
    p.tools.prerequisites = ["Daylight or adequate lighting", "Safe footing", "Permission to access common areas"];
    p.checks.safeChecks = [
      "Walk accessible corridors and wet rooms looking for leaks, stains, and trip hazards.",
      "Confirm doors latch and hardware is finger-tight only — do not force seized locks.",
      "Note any buzzing panels, burning smells, or gas odours without opening equipment.",
    ];
    p.checks.expectedObservations = ["Photo log of issues", "Clear list of items needing specialist follow-up"];
    p.troubleshooting.commonCauses = ["Deferred hardware tightening", "Seasonal humidity staining", "Drain debris", "Worn door seals"];
    p.troubleshooting.troubleshooting = [
      "Retighten only clearly user-accessible screws that are loose by hand.",
      "Clear surface debris from accessible floor drains with a cup — not chemical openers in confined pits.",
      "If cracks look structural, widen, or doors suddenly bind across a building, stop and book inspection.",
    ];
    p.steps = [
      step(
        "Walk a systematic route: entries, corridors, wet rooms, plant-room doors (exterior only).",
        "You have a written list of visible defects.",
        "Stop if roof edges, live panels, or confined plant rooms must be entered.",
      ),
      step(
        "Photograph stains, loose accessible hardware, and trip hazards.",
        "Evidence is clear enough for a quote or work order.",
        "Stop if active flooding or electrical smell is present — evacuate the immediate area and call professionals.",
      ),
      step(
        "Perform only finger-tightening on accessible loose screws and clear surface drain debris.",
        "Minor rattles improve or drains flow better without tools beyond a cup/cloth.",
        "Stop if force is needed or water returns into walls/ceilings.",
      ),
    ];
    p.aeo.checkFirst = "Plan a safe visual route and keep inspections non-invasive.";
    p.aeo.usualCauses = "Wear-and-tear, humidity, and deferred minor fixes are common.";
    p.faq = faqs([
      [`What is ${name}?`, p.main.overview],
      ["Can I do building maintenance myself?", p.main.canIDoIt],
      ["What should I check first?", p.aeo.checkFirst],
      ["When should I call a professional?", p.professional.whenToCallProfessional],
      ["Is structural crack repair DIY?", "No. Structural or widening cracks need professional assessment."],
      ["What about electrical buzzing?", "Do not open panels. Isolate if you know the correct switch and call an electrician."],
    ]);
    p.relatedServiceSlugs = ["residential-building-maintenance", "commercial-building-maintenance", "plumbing-maintenance"];
    return p;
  },

  "plumbing-maintenance": (name) => {
    const p = baseYellow(
      name,
      "Plumbing Maintenance (limited DIY) means spotting drips, checking isolation valves turn, and reviewing accessible traps — not concealed pipe repairs, mixer rebuilds you cannot identify, or wall-chase work.",
      "Use for intermittent drips, slow basins after hair buildup, isolation valves that still turn, or staining under accessible sinks.",
    );
    p.tools.tools = ["Torch", "Bucket", "Cloth", "Cup or plunger for accessible basins only"];
    p.tools.materials = [];
    p.tools.prerequisites = ["Know where isolation valves are", "Keep water away from sockets"];
    p.checks.safeChecks = [
      "Confirm drip source: spout vs wall vs supply joint.",
      "Test whether the local isolation valve turns without force.",
      "Look under basins for moisture without dismantling concealed valves.",
    ];
    p.checks.expectedObservations = ["Drip source identified", "Isolation works or clearly fails", "No wall wetness expanding"];
    p.troubleshooting.commonCauses = ["Worn tap washer/cartridge", "Hair in accessible trap", "Debris in aerator", "Failed isolation"];
    p.troubleshooting.troubleshooting = [
      "If isolation will not turn, stop — do not force chrome.",
      "For slow basins, remove only an accessible trap cup if designed for user service.",
      "Refer dripping-tap DIY only when isolation works; otherwise book a plumber.",
    ];
    p.steps = [
      step(
        "Identify whether water is from the spout, a joint, or the wall.",
        "Source location is clear.",
        "Stop if water is inside the wall or ceiling.",
      ),
      step(
        "Try the isolation valve gently.",
        "Valve turns and drip slows, or failure is confirmed.",
        "Stop if the valve is seized or missing.",
      ),
      step(
        "For accessible basin traps only, place a bucket and open the user cup to clear hair/debris, then refit.",
        "Flow improves without new leaks.",
        "Stop if the trap is glued, concealed, or leaks after refit.",
      ),
    ];
    p.aeo.checkFirst = "Find the drip source and test isolation before any parts work.";
    p.aeo.usualCauses = "Washers, aerators, and hair in traps cause many accessible issues.";
    p.faq = faqs([
      [`What is ${name}?`, p.main.overview],
      ["Can I maintain plumbing myself?", p.main.canIDoIt],
      ["What should I check first?", p.aeo.checkFirst],
      ["When should I call a professional?", p.professional.whenToCallProfessional],
      ["Related guide?", "A separate dripping-faucet guide may help only when isolation works."],
      ["What about chemical drain openers?", "Avoid harsh chemicals in unknown pipes; prefer mechanical clearing of accessible traps or book service."],
    ]);
    p.relatedServiceSlugs = ["faucet-repair", "faucet-replacement", "drain-cleaning"];
    p.relatedGuideSlugs = ["how-to-fix-dripping-faucet", "how-to-unclog-a-sink-safely"];
    return p;
  },

  "ac-maintenance": (name) => {
    const p = baseYellow(
      name,
      "AC Maintenance (limited DIY) covers user-accessible filter checks, remote/settings confirmation, and noting odd noises — not sealed cooling-circuit service, electrical repairs, or outdoor-unit internal work.",
      "Use when airflow feels weak, dust is visible on the indoor grille, or cooling seems reduced after long runtime.",
    );
    p.tools.tools = ["Soft brush", "Vacuum with brush head", "Dry cloth"];
    p.tools.materials = ["Clean water only if the filter is labeled washable"];
    p.tools.prerequisites = ["Turn the unit off", "Stable footing for wall units at reachable height only"];
    p.checks.safeChecks = [
      "Confirm the indoor filter is user-accessible without forcing sealed panels.",
      "Check remote mode, setpoint, and timer settings.",
      "Look for ice on accessible indoor surfaces with the unit off.",
    ];
    p.checks.expectedObservations = ["Filter dust reduced", "Settings confirmed", "No ice after a pause, or ice noted for service"];
    p.troubleshooting.commonCauses = ["Dirty filter", "Wrong mode/setpoint", "Blocked return grille", "Fault beyond DIY"];
    p.troubleshooting.troubleshooting = [
      "Clean or replace only user filters.",
      "If ice is present, leave the unit off and book service — do not chip ice.",
      "If panels are sealed or cooling stays poor after a clean filter, stop.",
    ];
    p.steps = [
      step(
        "Power the AC off and confirm the filter access method from the user manual.",
        "You know the safe access path.",
        "Stop if access requires opening sealed electrics or climbing unsafely.",
      ),
      step(
        "Remove, clean or replace the user filter, and refit in the correct orientation.",
        "Filter is clear and seated.",
        "Stop if the filter is damaged or access exposes coils/wiring you must not touch.",
      ),
      step(
        "Restore power and check airflow; note remaining faults for professionals.",
        "Airflow improves or the residual issue is documented.",
        "Stop if burning smells, sparks, or water near electrics appear.",
      ),
    ];
    p.aeo.checkFirst = "Power off and confirm the filter is user-accessible.";
    p.aeo.usualCauses = "Dirty filters and incorrect settings are common first checks.";
    p.faq = faqs([
      [`What is ${name}?`, p.main.overview],
      ["Can I maintain the AC myself?", p.main.canIDoIt],
      ["What should I check first?", p.aeo.checkFirst],
      ["When should I call a professional?", p.professional.whenToCallProfessional],
      ["Is sealed cooling-circuit work DIY?", "No. Sealed cooling-circuit and gas-charge work is professional only."],
      ["Related guide?", "A filter-cleaning guide may help for accessible indoor filters."],
    ]);
    p.relatedServiceSlugs = ["ac-filter-cleaning", "ac-servicing", "ac-cleaning"];
    p.relatedGuideSlugs = ["how-to-clean-ac-filter"];
    return p;
  },

  "wall-maintenance": (name) => {
    const p = baseYellow(
      name,
      "Wall Maintenance & Repair (limited DIY) means observing hairline surface marks, checking for damp clues, and planning cosmetic follow-up — not structural stitching, load-bearing repair, or chasing live services.",
      "Use for small surface scratches, hairline finish cracks that are not widening, or isolated paint flakes without active damp.",
    );
    p.tools.tools = ["Torch", "Tape measure", "Pencil for marking ends of cracks", "Camera"];
    p.tools.materials = [];
    p.tools.prerequisites = ["Dry weather observation if exterior-facing", "Safe indoor access only"];
    p.checks.safeChecks = [
      "Measure and photograph crack length/width.",
      "Check for damp, mould, or soft plaster.",
      "See whether the crack crosses corners, beams, or door heads (higher concern).",
    ];
    p.checks.expectedObservations = ["Stable hairline vs concerning pattern documented"];
    p.troubleshooting.commonCauses = ["Settlement hairlines", "Impact marks", "Humidity", "Hidden leaks"];
    p.troubleshooting.troubleshooting = [
      "Mark crack ends and re-check in a few days for movement.",
      "If damp is present, find the moisture source before any filler.",
      "Do not chip into unknown walls that may hide services.",
    ];
    p.steps = [
      step(
        "Photograph and measure the mark or crack.",
        "Baseline record exists.",
        "Stop if the crack is wide, stepped, or suddenly growing.",
      ),
      step(
        "Check for moisture with sight/touch only.",
        "Dry vs damp is clear.",
        "Stop if soft plaster, mould bloom, or active seepage is found — book inspection.",
      ),
      step(
        "For dry cosmetic flakes only, plan a later touch-up; do not chase structural cracks.",
        "Cosmetic path is separated from structural concern.",
        "Stop if unsure whether the wall is load-bearing or cracked through tile beds.",
      ),
    ];
    p.aeo.checkFirst = "Measure, photograph, and check for damp before any repair materials.";
    p.aeo.usualCauses = "Hairline finish movement and impact marks are common; structural patterns are not DIY.";
    p.faq = faqs([
      [`What is ${name}?`, p.main.overview],
      ["Can I repair walls myself?", p.main.canIDoIt],
      ["What should I check first?", p.aeo.checkFirst],
      ["When should I call a professional?", p.professional.whenToCallProfessional],
      ["Related guide?", "A small surface-crack check guide may help for observation only."],
      ["Can I open the wall?", "No — opening walls risks services and structure."],
    ]);
    p.relatedServiceSlugs = ["wall-inspection", "wall-crack-repair", "touch-up-painting"];
    p.relatedGuideSlugs = ["how-to-check-a-small-wall-crack"];
    return p;
  },

  "swimming-pool-maintenance": (name) => {
    const p = baseYellow(
      name,
      "Swimming Pool Cleaning & Maintenance (limited DIY) covers skimming, noting water clarity, and tidy surrounds — not plant-room electrics, gas chlorination repairs, or confined pit entry.",
      "Use for floating debris, light waterline film, or routine visual checks between professional visits.",
    );
    p.tools.tools = ["Skimmer net", "Telescopic pole", "Pool brush for accessible waterline"];
    p.tools.materials = [];
    p.tools.prerequisites = ["Stable deck footing", "Children supervised away from the edge"];
    p.checks.safeChecks = [
      "Check water clarity and obvious debris.",
      "Confirm equipment alarms or unusual pump sounds from outside the plant room only.",
      "Inspect surround for slip hazards.",
    ];
    p.checks.expectedObservations = ["Surface debris reduced", "Clarity noted", "Any plant-room concern logged for pros"];
    p.troubleshooting.commonCauses = ["Wind debris", "Infrequent skimming", "Chemistry imbalance (professional)"];
    p.troubleshooting.troubleshooting = [
      "Skim and brush accessible waterline only.",
      "If water is cloudy, green, or smells strongly chemical, stop DIY dosing guesses and book pool service.",
      "Never enter pump pits or service live pool electrics.",
    ];
    p.steps = [
      step(
        "Clear deck paths and skim floating debris.",
        "Surface debris is reduced.",
        "Stop if footing is unsafe or weather is hazardous.",
      ),
      step(
        "Brush accessible waterline soil gently.",
        "Light film reduces.",
        "Stop if tiles are loose or sharp edges appear.",
      ),
      step(
        "Note clarity/odour and any equipment alarms for professional follow-up.",
        "A clear handover list exists.",
        "Stop DIY chemistry or electrical work entirely.",
      ),
    ];
    p.aeo.checkFirst = "Ensure stable footing and limit work to surface tools.";
    p.aeo.usualCauses = "Debris and light soil accumulate quickly outdoors.";
    p.faq = faqs([
      [`What is ${name}?`, p.main.overview],
      ["Can I maintain the pool myself?", p.main.canIDoIt],
      ["What should I check first?", p.aeo.checkFirst],
      ["When should I call a professional?", p.professional.whenToCallProfessional],
      ["Can I fix the pump?", "No — pump/electrical and chemistry design are professional."],
      ["What about green water?", "Book pool service; do not invent chemical doses."],
    ]);
    p.relatedServiceSlugs = ["swimming-pool-cleaning", "pool-skimming", "swimming-pool-inspection"];
    return p;
  },

  "sauna-maintenance": (name) => {
    const p = baseYellow(
      name,
      "Sauna Room Cleaning & Maintenance (limited DIY) means cleaning cool benches/floors/glass and checking door action — not heater elements, steam generators, or electrical controls.",
      "Use when the sauna is cool, powered down, and needs routine hygiene between professional services.",
    );
    p.tools.tools = ["Microfiber cloths", "Soft brush", "Bucket"];
    p.tools.materials = ["Mild cleaner suitable for wood/glass as applicable"];
    p.tools.prerequisites = ["Heater fully cool", "Powered down", "Good ventilation after cleaning"];
    p.checks.safeChecks = [
      "Confirm the heater area stays closed.",
      "Check benches for splinters and standing moisture.",
      "See that the door closes freely without forcing hinges.",
    ];
    p.checks.expectedObservations = ["Surfaces clean", "No heater access required", "Door moves smoothly"];
    p.troubleshooting.commonCauses = ["Sweat salts on benches", "Humidity film on glass", "Deferred wipe-downs"];
    p.troubleshooting.troubleshooting = [
      "Clean only cool, accessible surfaces.",
      "If the heater faults or wiring is exposed, stop.",
      "Do not pour liquids into heater rocks beyond manufacturer user guidance — when unsure, stop.",
    ];
    p.steps = [
      step(
        "Verify the sauna is cool and powered down.",
        "Surfaces are safe to touch.",
        "Stop if the heater is warm or error lights are on.",
      ),
      step(
        "Clean benches, floor, and glass with mild products.",
        "Soil is reduced without finish damage.",
        "Stop if wood fibers raise or sealers dissolve.",
      ),
      step(
        "Check door swing; leave the room ventilated to dry.",
        "Door operates; moisture is drying.",
        "Stop if hinges bind or glass cracks.",
      ),
    ];
    p.aeo.checkFirst = "Confirm cool-down and keep the heater enclosure closed.";
    p.aeo.usualCauses = "Sweat salts and humidity film are routine.";
    p.faq = faqs([
      [`What is ${name}?`, p.main.overview],
      ["Can I maintain the sauna myself?", p.main.canIDoIt],
      ["What should I check first?", p.aeo.checkFirst],
      ["When should I call a professional?", p.professional.whenToCallProfessional],
      ["Can I service the heater?", "No — heater and electrical work are professional."],
      ["What should I avoid?", "Avoid liquids into unknown heater designs and any panel opening."],
    ]);
    p.relatedServiceSlugs = ["sauna-regular-cleaning", "sauna-deep-cleaning", "sauna-door-maintenance"];
    return p;
  },

  "water-tank-cleaning": (name) => {
    const p = baseYellow(
      name,
      "Water Tank Cleaning & Maintenance (limited DIY) means external inspection, noting overflows/leaks, and arranging professional internal cleaning — not confined-space entry or internal tank work.",
      "Use when you see external staining, suspect stagnant taste/odour in supply, or need to schedule compliant tank cleaning.",
    );
    p.tools.tools = ["Torch", "Camera", "Notebook"];
    p.tools.materials = [];
    p.tools.prerequisites = ["Stay outside the tank", "Secure lids you did not open for entry"];
    p.checks.safeChecks = [
      "Inspect tank exterior for leaks, rust, and insecure lids from a safe platform only.",
      "Note overflow or unusual sounds without entering.",
      "Confirm whether internal cleaning is overdue per building practice — schedule pros.",
    ];
    p.checks.expectedObservations = ["External condition logged", "No DIY internal entry"];
    p.troubleshooting.commonCauses = ["Sediment (professional clean)", "Loose lid", "External condensation staining"];
    p.troubleshooting.troubleshooting = [
      "Do not enter the tank.",
      "If a lid is ajar and reachable without unsafe climbing, reseat only if designed for user close — otherwise book service.",
      "Taste/odour issues after external checks → professional flush/clean.",
    ];
    p.steps = [
      step(
        "Photograph the tank exterior and lid condition from safe footing.",
        "External condition is documented.",
        "Stop if access requires unsafe height or confined entry.",
      ),
      step(
        "Check for visible leaks at joints and supports without dismantling.",
        "Leak clues are noted.",
        "Stop if structure looks unstable.",
      ),
      step(
        "Arrange professional internal cleaning; do not enter.",
        "A service request is ready.",
        "Stop any impulse to climb inside or chemical-dose blindly.",
      ),
    ];
    p.aeo.checkFirst = "Keep the inspection external and refuse confined-space entry.";
    p.aeo.usualCauses = "Sediment and lid security issues are common reasons tanks need professional cleaning.";
    p.faq = faqs([
      [`What is ${name}?`, p.main.overview],
      ["Can I clean the tank myself?", p.main.canIDoIt],
      ["What should I check first?", p.aeo.checkFirst],
      ["When should I call a professional?", "Always for internal cleaning, confined access, or structural concerns."],
      ["Why no entry?", "Tanks are confined spaces with serious safety risks."],
      ["What about chemicals?", "Do not invent dosing — use professional tank cleaning services."],
    ]);
    p.relatedServiceSlugs = ["water-tank-cleaning-service", "plumbing-maintenance"];
    return p;
  },

  "gym-cleaning-maintenance": (name) => {
    return yellowCleaningLimited(
      name,
      "Gym Cleaning & Maintenance (limited DIY) covers wipe-downs of cool equipment frames, floors, and touchpoints — not machine electrical repairs or cable/stack mechanics.",
      "Use after workouts for sweat on frames, dusty floors, and glass smudges when equipment is powered down as required.",
      "gym floors and equipment contact surfaces",
      ["gym-regular-cleaning", "gym-equipment-cleaning", "gym-floor-cleaning"],
    );
  },

  "building-common-area-cleaning": (name) =>
    yellowCleaningLimited(
      name,
      "Building Common Area Cleaning focuses on lobbies, corridors, and shared touchpoints with finish-safe methods — not façade height work or plant-room deep cleans.",
      "Use for dusty corridors, fingerprint-heavy doors, and routine lobby soil between contracted cleans.",
      "common corridors and lobby surfaces",
      ["residential-cleaning", "deep-cleaning", "floor-cleaning"],
    ),

  "deep-cleaning": (name) =>
    yellowCleaningLimited(
      name,
      "Deep Cleaning means a more thorough pass on accessible interiors — corners, skirting, and build-up zones — still without unsafe heights or aggressive chemicals that damage finishes.",
      "Use when regular cleaning left sticky residue, dusty edges, or kitchen/bath film that needs extra time.",
      "build-up zones in kitchens, baths, and edges",
      ["regular-cleaning", "kitchen-cleaning", "bathroom-cleaning"],
    ),

  "post-construction-cleaning": (name) => {
    const p = yellowCleaningLimited(
      name,
      "Post-Construction Cleaning removes construction dust and light debris from accessible finished surfaces after works — not façade abseil, live temporary electrics, or hazardous material handling.",
      "Use after renovations when dust sits on floors, sills, and fixtures but major works are complete.",
      "post-build dust on floors and fixtures",
      ["post-renovation-cleaning", "deep-cleaning", "floor-cleaning"],
    );
    p.safety.dontDo.push("Do not wet-sand unknown dusts that may be hazardous without assessment.");
    p.safety.warnings.push("Construction dust can be heavy — use masks appropriate to the dust type if you already have them; stop if unsure.");
    p.troubleshooting.troubleshooting.push("If sharp debris or chemical residues remain, stop and use professionals.");
    return p;
  },

  "post-renovation-cleaning": (name) => {
    const p = yellowCleaningLimited(
      name,
      "Post-Renovation Cleaning targets adhesive marks, fine dust, and splash residues on finished interiors after decorating — without solvent abuse that damages new finishes.",
      "Use when paint flecks, dust, or film remain after renovations.",
      "renovation residues on finished surfaces",
      ["post-construction-cleaning", "touch-up-painting", "deep-cleaning"],
    );
    p.safety.dontDo.push("Do not use aggressive solvents on fresh paint or stone without a test spot.");
    return p;
  },

  "kitchen-cleaning": (name) =>
    yellowCleaningLimited(
      name,
      "Kitchen Cleaning covers counters, splashbacks, fronts, and floors with finish-safe products — not gas-hob internal repairs or oven electrical service.",
      "Use for grease film, crumbs, and daily kitchen soil when appliances are cool.",
      "kitchen counters, fronts, and floors",
      ["deep-cleaning", "oven-cleaning", "regular-cleaning"],
    ),

  "window-cleaning": (name) => {
    const p = yellowCleaningLimited(
      name,
      "Window Cleaning (limited DIY) means reachable interior glass and ground-level exterior panes you can access safely — not high-rise exterior work without proper systems.",
      "Use for fingerprints and dust on reachable windows.",
      "reachable window glass",
      ["glass-cleaning", "building-common-area-cleaning"],
    );
    p.safety.dontDo.push("Do not lean out of upper-floor windows or climb without proper access equipment.");
    p.safety.stopConditions.push("Stop if the pane is above safe reach from inside stable flooring.");
    return p;
  },

  "glass-cleaning": (name) =>
    yellowCleaningLimited(
      name,
      "Glass Cleaning covers mirrors, partitions, and reachable glass with non-abrasive methods — not cracked tempered glass replacement.",
      "Use for smudges on mirrors and partitions when glass is intact.",
      "mirrors and glass partitions",
      ["window-cleaning", "gym-glass-cleaning"],
    ),

  "carpet-cleaning": (name) => {
    const p = baseYellow(
      name,
      "Carpet Cleaning (limited DIY) means vacuuming and spot-treating with carpet-safe products — not flood extraction on unknown underlays or bleach on unknown fibres.",
      "Use for surface soil and small spots on known carpet types.",
    );
    p.tools.tools = ["Vacuum", "Clean white cloths", "Soft brush"];
    p.tools.materials = ["Carpet-spotter labeled for the fibre", "Clean water"];
    p.tools.prerequisites = ["Identify fibre if possible", "Test spot in a corner"];
    p.checks.safeChecks = [
      "Confirm the spotter is safe for the carpet type.",
      "Check for colour bleed on a test area.",
      "Look for moisture under the carpet that suggests leaks.",
    ];
    p.checks.expectedObservations = ["Spot lightens", "No dye bleed", "Carpet drying evenly"];
    p.troubleshooting.commonCauses = ["Tracked soil", "Food spills", "Wrong chemistry"];
    p.troubleshooting.troubleshooting = [
      "Blot — do not scrub aggressively.",
      "If dye lifts onto the cloth, stop and book pros.",
      "Large wet areas after leaks are professional scope.",
    ];
    p.steps = [
      step(
        "Vacuum thoroughly and test the spotter in a hidden area.",
        "No dye bleed on the test.",
        "Stop if colour transfers or the fibre melts/stiffens.",
      ),
      step(
        "Blot the spot with the labeled product; rinse blot with clean water.",
        "Spot lightens without rings expanding.",
        "Stop if the wet area grows or odour suggests sewage/leak.",
      ),
      step(
        "Dry with airflow; vacuum again when dry.",
        "Carpet feels dry and appearance improves.",
        "Stop if underlay stays wet — book drying professionals.",
      ),
    ];
    p.aeo.checkFirst = "Vacuum and test chemistry on a hidden corner first.";
    p.aeo.usualCauses = "Spills and tracked soil are typical.";
    p.faq = faqs([
      [`What is ${name}?`, p.main.overview],
      ["Can I clean carpets myself?", p.main.canIDoIt],
      ["What should I check first?", p.aeo.checkFirst],
      ["When should I call a professional?", p.professional.whenToCallProfessional],
      ["Can I use bleach?", "No — bleach often damages dyes and fibres."],
      ["What about floods?", "Water extraction after leaks is professional."],
    ]);
    p.relatedServiceSlugs = ["sofa-and-upholstery-cleaning", "mattress-cleaning", "deep-cleaning"];
    return p;
  },

  "sofa-and-upholstery-cleaning": (name) => {
    const p = baseYellow(
      name,
      "Sofa & Upholstery Cleaning (limited DIY) covers vacuuming and careful spot treatment per fabric codes — not full wet cleaning of unknown foams or leather refinishing.",
      "Use for crumbs, dust, and small spots when the fabric care code allows.",
    );
    p.tools.tools = ["Vacuum with upholstery tool", "Clean cloths"];
    p.tools.materials = ["Product matching the fabric care code"];
    p.tools.prerequisites = ["Find the care tag", "Test a hidden area"];
    p.checks.safeChecks = [
      "Read W/S/X care codes if present.",
      "Test for colour transfer.",
      "Check seams and foam for existing damage.",
    ];
    p.checks.expectedObservations = ["Soil reduced", "No dye bleed", "Fabric not oversaturated"];
    p.troubleshooting.commonCauses = ["Food crumbs", "Body oils", "Wrong wet methods on dry-clean-only fabric"];
    p.troubleshooting.troubleshooting = [
      "If the code is X (vacuum only), do not wet clean.",
      "Blot spots; avoid soaking cushions.",
      "Leather/specialty covers → professional.",
    ];
    p.steps = [
      step(
        "Vacuum crevices and read the care tag.",
        "Loose soil is gone; method is chosen.",
        "Stop if no tag and fabric looks delicate — book pros.",
      ),
      step(
        "Spot-treat only as the code allows after a hidden test.",
        "Spot improves without rings.",
        "Stop if dye bleeds or fabric darkens unevenly.",
      ),
      step(
        "Air-dry fully before use.",
        "Cushions are dry to the touch.",
        "Stop if foam stays wet or smells musty — professional drying needed.",
      ),
    ];
    p.aeo.checkFirst = "Find the care code and vacuum before any liquid.";
    p.aeo.usualCauses = "Crumbs and body oils are common.";
    p.faq = faqs([
      [`What is ${name}?`, p.main.overview],
      ["Can I clean upholstery myself?", p.main.canIDoIt],
      ["What should I check first?", p.aeo.checkFirst],
      ["When should I call a professional?", p.professional.whenToCallProfessional],
      ["What does code X mean?", "Usually vacuum only — no water methods."],
      ["Leather?", "Use professionals for leather refinishing."],
    ]);
    p.relatedServiceSlugs = ["carpet-cleaning", "mattress-cleaning"];
    return p;
  },

  "mattress-cleaning": (name) => {
    const p = baseYellow(
      name,
      "Mattress Cleaning (limited DIY) means vacuuming surfaces and light spot care — not deep flooding, ozone gimmicks, or stripping covers that void warranties when unsure.",
      "Use for dust and small surface spots on intact mattresses.",
    );
    p.tools.tools = ["Vacuum with upholstery tool", "Clean cloths"];
    p.tools.materials = ["Mild mattress-safe spotter if labeled"];
    p.tools.prerequisites = ["Strip bedding", "Good airflow"];
    p.checks.safeChecks = [
      "Inspect for tears, mould, or heavy staining.",
      "Confirm the mattress type before wetting.",
      "Check warranty guidance if available.",
    ];
    p.checks.expectedObservations = ["Surface dust reduced", "Spot lighter", "Mattress drying"];
    p.troubleshooting.commonCauses = ["Dust mites debris", "Sweat spots", "Spill stains"];
    p.troubleshooting.troubleshooting = [
      "Vacuum both sides if design allows without forcing.",
      "Avoid soaking memory foam.",
      "Mould or heavy odour → professional or replacement advice.",
    ];
    p.steps = [
      step(
        "Strip bedding and vacuum the surface thoroughly.",
        "Loose debris is removed.",
        "Stop if the cover tears or mould is visible.",
      ),
      step(
        "Blot small spots lightly; do not flood the core.",
        "Spot improves; core stays mostly dry.",
        "Stop if liquid sinks deep or odour worsens.",
      ),
      step(
        "Air-dry completely before remaking the bed.",
        "Surface is dry.",
        "Stop if dampness remains — extend drying or book help.",
      ),
    ];
    p.aeo.checkFirst = "Vacuum first and avoid soaking foam cores.";
    p.aeo.usualCauses = "Dust and light sweat spots are typical.";
    p.faq = faqs([
      [`What is ${name}?`, p.main.overview],
      ["Can I clean a mattress myself?", p.main.canIDoIt],
      ["What should I check first?", p.aeo.checkFirst],
      ["When should I call a professional?", p.professional.whenToCallProfessional],
      ["Can I use bleach on a mattress?", "No — bleach can damage fabrics and leave residues that are hard to remove."],
      ["What if I see mould?", "Do not scrub mould deeply into foam — stop and get a professional assessment."],
    ]);
    p.relatedServiceSlugs = ["sofa-and-upholstery-cleaning", "carpet-cleaning"];
    return p;
  },

  "residential-building-maintenance": (name) => {
    const p = AUTHORS["building-maintenance"]!(name);
    p.main.overview =
      "Residential Building Maintenance covers routine visual checks and low-risk upkeep in homes and residential blocks — doors, accessible hardware, and damp clues — not structural or live electrical repair.";
    p.aeo.whatIs = p.main.overview;
    p.relatedServiceSlugs = ["building-maintenance", "commercial-building-maintenance", "plumbing-maintenance"];
    return p;
  },

  "commercial-building-maintenance": (name) => {
    const p = AUTHORS["building-maintenance"]!(name);
    p.main.overview =
      "Commercial Building Maintenance covers triage of common-area wear, accessible hardware, and safety observations during approved access hours — not after-hours electrical/gas plant work.";
    p.main.symptoms =
      "Use for sticking fire-door latches that still move freely, corridor trip hazards, or minor drip stains needing logging for facilities teams.";
    p.aeo.whatIs = p.main.overview;
    p.tools.prerequisites.push("Follow site access and permit rules");
    p.relatedServiceSlugs = ["building-maintenance", "residential-building-maintenance", "building-common-area-cleaning"];
    return p;
  },
};

export function authorYellowProfile(
  slug: string,
  serviceName: string,
  parentSlug?: string,
): DiyGuideProfileJson {
  const fn = AUTHORS[slug];
  if (fn) return fn(serviceName);
  if (!parentSlug) {
    throw new Error(`No YELLOW author for ${slug} (parentSlug required for generic template)`);
  }
  // Lazy import avoided — callers of remaining batches use authorYellowProfileByCategory directly.
  throw new Error(`No hand-authored YELLOW profile for ${slug}; use authorYellowProfileByCategory`);
}

export function yellowPrimaryGuideSlug(serviceSlug: string): string {
  return `diy-${serviceSlug}`;
}
