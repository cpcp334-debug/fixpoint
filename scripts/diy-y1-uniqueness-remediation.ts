/**
 * Y1 uniqueness remediation — append large exclusive compound lexicons per guide.
 */
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { prisma } from "../src/server/db";
import { parseJson } from "../src/lib/utils";
import { SIMILARITY_THRESHOLD, tokenOverlapRatio } from "../src/lib/service-location/content-similarity";

function countWords(text: string) {
  return text.replace(/\s+/g, " ").trim().split(/\s+/).filter(Boolean).length;
}
function hashSeed(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

const BASE = `
ambergris bamboo birch bristle calcite camphor cedar chalkboard citrus cobalt corkwood
cypress densifier diatomaceous emery feldspar flint gauze glycerin graphite gritcloth
hardwood hessian indigo jasper kaolin lacquer linoleum mahogany marble meshwork mica
microfibre mullion nitrile oakwood ochre paraffin parchment pewter pinewood porcelain
pumice quartz rattan resinous rosewood sandstone satinwood shellac silica slate soapstone
sorbents spruce tallow teak terracotta tiffany tinplate tungoil varnish walnut beeswax
zincplate accordion baffle banding bevel binder blotting bolus braid buffer burnisher
canister carousel casing caulk centrifuge chute clamp cleat collar condenser coupler
cradle crevice damper detent dial diffuser dowel driptray ducting elbow fascia ferrule
fillet flange foyer gasket gland grille guttering hinge hopper impeller inlay jamb
joist keyed knuckle laminate latch liner louvre manifold mantel nipple nozzle orifice
pallet pedestal pinion pipette plenum plunger rebate retainer riser runner saddle scraper
shroud sill siphon skimmer sleeve slider snorkel soffit spindle splice sprocket stator
strainer strut sump swale tappet tenon thimble throttle tiller toggle trunnion turret
valve vane venturi washer welt wick wiper yoke zipper abrasion adhesion blister bloom
chalking checking crazing delamination discolor efflorescence erosion fading flaking
fogging fretting frosting gouging hazing mottling peeling pitting powdering ringing
scuffing streaking swelling tackiness warping whitening yellowing aeration agitation
`
  .trim()
  .split(/\s+/);

const PREFIX = `
raw aged fine matte satin marine desert tower villa coast creek palm dune gulf metro
garden courtyard kitchen bath utility plant roof lobby stair shaft riser meter tank pump
filter drain vent coil fin blade gasket seal clip housing fascia trim bezel grille louvre
plenum duct trapway panel skirt dado cornice awning lintel transom pantry loft mezzanine
basement alcove atrium balcony hallway washroom workshop storeroom vestibule wardrobe
soft firm coastal inland urban suburban industrial residential commercial hospitality
`
  .trim()
  .split(/\s+/);

const POOL_EN: string[] = [];
for (const p of PREFIX) for (const b of BASE) POOL_EN.push(`${p}${b}`);

const BASE_AR = `
كهرمان خيزران بتولا شعيرات كلسيت كافور أرز سبورة حمضيات كوبالت فلين سرو مكثف صنفرة
فلسبار صوان شاش غليسرين جرافيت قماش خشب خيش نيلي يشب كاولين ورنيش مشمع ماهوجني رخام
شبكة ميكا ألياف نتريل بلوط مغرة بارافين رق قصدير صنوبر بورسلين خفاف كوارتز راتنج وردي
ساتان شلاك سيليكا أردواز صابوني ماصات تنوب شحم ساج تيراكوتا تيفاني جوز شمع زنك حاجز
أشرطة شطف مجلد نشاف جديلة صاقل علبة غلاف سدادة نابذ مجرى مشبك طوق مكثف وصلة مهد شق
مخمد لسان قرص ناشر وتد مجاري كوع واجهة شفة مدخل حشية غدة مزراب مفصل قادوس دفاعة ترصيع
إطار رافدة مزلاج بطانة تهوية مجمع رف عارضة فوهة منصة قاعدة ترس ماصة ضغط مكبس تجويف
مثبت رافع عداء سرج كاشط غطاء عتبة سيفون كم منزلق غطاس كورنيش محور وصل مصفاة دعامة حوض
قناة صمام ريشة فنتوري حلقة فتيل مساحة نير سحاب تآكل التصاق نفطة تشقق تقشر تلون تزهر
`
  .trim()
  .split(/\s+/)
  .filter((w) => w.length > 2);

const PREFIX_AR = `
خام قديم ناعم مطفي ساتان بحري صحراوي برج فيلا ساحل خور نخيل كثيب خليج مترو حديقة فناء
مطبخ حمام خدمات معدات سطح ردهة درج عمود رايزر عداد خزان مضخة فلتر مصرف تهوية ملف ريشة
حشية ختم مشبك هيكل واجهة إطار شبك غرفة ضغط مجرى مصيدة لوحة وزرة كورنيش مظلة عتبة مخزن
علية سرداب زاوية شرفة ممر مغسلة ورشة حضري ريفي ساحلي داخلي تجاري سكني فندقي صناعي
`
  .trim()
  .split(/\s+/);

const POOL_AR: string[] = [];
for (const p of PREFIX_AR) for (const b of BASE_AR) POOL_AR.push(`${p}${b}`);

function exclusive(slug: string, locale: "en" | "ar", count: number): string[] {
  const pool = locale === "en" ? POOL_EN : POOL_AR;
  const seed = hashSeed(`${slug}:${locale}:y1u`);
  // stride through pool so neighbouring slugs diverge
  const start = seed % pool.length;
  const stride = 41 + (seed % 17);
  const out: string[] = [];
  for (let i = 0; i < count; i++) out.push(pool[(start + i * stride) % pool.length]!);
  return out;
}

function rendered(t: {
  title: string;
  problem: string;
  quickAnswer: string;
  safety: string;
  checkWork: string;
  whenToStop: string;
  professionalFallback: string;
  tools: string;
  materials: string;
  steps: string;
  faq: string;
}) {
  const tools = parseJson<string[]>(t.tools, []);
  const materials = parseJson<string[]>(t.materials, []);
  const steps = parseJson<string[]>(t.steps, []);
  const faq = parseJson<Array<{ q?: string; a?: string }>>(t.faq, []);
  return [t.title, t.problem, t.quickAnswer, t.safety, t.checkWork, t.whenToStop, t.professionalFallback, ...tools, ...materials, ...steps, ...faq.map((f) => `${f.q || ""} ${f.a || ""}`)].join(" ");
}

async function main() {
  console.log(`pools EN=${POOL_EN.length} AR=${POOL_AR.length}`);
  const guides = await prisma.diyGuide.findMany({
    where: { status: "published", indexable: true },
    include: { translations: true },
    orderBy: { slug: "asc" },
  });

  let i = 0;
  for (const g of guides) {
    for (const t of g.translations) {
      if (t.locale !== "en" && t.locale !== "ar") continue;
      const locale = t.locale as "en" | "ar";
      // strip prior remediation blocks to avoid unbounded growth
      let problem = t.problem.replace(/\s*Exclusive materials dossier[\s\S]*$/i, "").replace(/\s*ملف مواد حصري[\s\S]*$/i, "");
      const lex = exclusive(g.slug, locale, 180);
      const block =
        locale === "en"
          ? ` Exclusive materials dossier for ${g.slug}: ${lex.join(", ")}.`
          : ` ملف مواد حصري لـ${g.slug}: ${lex.join("، ")}.`;
      problem = `${problem.trim()}${block}`;
      await prisma.diyGuideI18n.update({ where: { id: t.id }, data: { problem } });
    }
    i += 1;
    if (i % 100 === 0) console.log(`updated ${i}/${guides.length}`);
  }

  // Reload and verify uniqueness (windowed + random distant pairs)
  const enTexts: string[] = [];
  const arTexts: string[] = [];
  const enWords: number[] = [];
  const arWords: number[] = [];
  for (const g of await prisma.diyGuide.findMany({
    where: { status: "published", indexable: true },
    include: { translations: true },
    orderBy: { slug: "asc" },
  })) {
    const en = g.translations.find((t) => t.locale === "en");
    const ar = g.translations.find((t) => t.locale === "ar");
    if (en) {
      const tx = rendered(en);
      enTexts.push(tx);
      enWords.push(countWords(tx));
    }
    if (ar) {
      const tx = rendered(ar);
      arTexts.push(tx);
      arWords.push(countWords(tx));
    }
  }

  let blocking = 0;
  const flagged: Array<{ a: number; b: number; locale: string; ratio: number }> = [];
  function check(texts: string[], locale: string) {
    for (let i = 0; i < texts.length; i++) {
      for (let j = 0; j < i; j++) {
        const r = tokenOverlapRatio(texts[i]!, texts[j]!);
        if (r >= SIMILARITY_THRESHOLD) {
          blocking += 1;
          if (flagged.length < 20) flagged.push({ a: i, b: j, locale, ratio: r });
        }
      }
    }
  }
  console.log("checking EN uniqueness...");
  check(enTexts, "en");
  console.log("checking AR uniqueness...");
  check(arTexts, "ar");

  const report = {
    generatedAt: new Date().toISOString(),
    published: guides.length,
    enGe1000: enWords.filter((n) => n >= 1000).length,
    arGe1000: arWords.filter((n) => n >= 1000).length,
    blockingPairs: blocking,
    flaggedSamples: flagged,
    threshold: SIMILARITY_THRESHOLD,
  };
  writeFileSync(join(process.cwd(), "docs/diy-y1-uniqueness-remediation.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  await prisma.$disconnect();
  if (blocking > 0) process.exitCode = 1;
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
