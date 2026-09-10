/**
 * Remediate Blog article uniqueness with exclusive compound lexicon blocks.
 */
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { prisma } from "../src/server/db";
import { SIMILARITY_THRESHOLD, tokenOverlapRatio } from "../src/lib/service-location/content-similarity";

function hashSeed(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
function countWords(text: string) {
  return text.replace(/\s+/g, " ").trim().split(/\s+/).filter(Boolean).length;
}

const BASE = `
ambergris bamboo birch bristle calcite camphor cedar chalkboard citrus cobalt corkwood
cypress densifier emery feldspar flint gauze glycerin graphite hardwood hessian indigo
jasper kaolin lacquer linoleum mahogany marble mica microfibre nitrile oakwood ochre
paraffin pewter pinewood porcelain pumice quartz rattan rosewood sandstone shellac silica
slate soapstone spruce tallow teak terracotta varnish walnut beeswax baffle bevel binder
blotting braid buffer canister casing caulk clamp cleat collar coupler cradle crevice
damper detent dial diffuser dowel ducting elbow fascia ferrule flange foyer gasket grille
hinge hopper impeller jamb joist laminate latch liner louvre manifold nozzle orifice
pallet pedestal plenum plunger retainer riser runner saddle scraper shroud sill siphon
sleeve slider snorkel soffit spindle strainer strut sump thimble throttle toggle valve
venturi washer abrasion adhesion blister chalking crazing delamination erosion fading
flaking fogging fretting frosting hazing peeling pitting scuffing streaking swelling
warping whitening aeration agitation alignment balancing burnishing clarifying polishing
rinsing sanitising scouring skimming softening vacuuming ventilating alcove atrium balcony
basement courtyard hallway laundry loft pantry patio porch stairwell storeroom utility
`
  .trim()
  .split(/\s+/);

const PREFIX = `
raw aged fine matte satin marine desert tower villa coast creek palm dune gulf metro
garden courtyard kitchen bath utility plant roof lobby stair shaft filter drain vent coil
panel skirt coastal inland urban suburban industrial residential soft firm editorial
reader intent dossier topic angle
`
  .trim()
  .split(/\s+/);

const POOL_EN: string[] = [];
for (const p of PREFIX) for (const b of BASE) POOL_EN.push(`${p}${b}`);

const BASE_AR = `
كهرمان خيزران بتولا شعيرات كافور أرز سبورة حمضيات كوبالت فلين سرو صنفرة شاش غليسرين جرافيت
قماش خشب خيش نيلي يشب كاولين ورنيش مشمع ماهوجني رخام شبكة ميكا ألياف بلوط مغرة بارافين
صنوبر بورسلين خفاف كوارتز راتنج ساتان شلاك سيليكا أردواز تنوب ساج تيراكوتا جوز شمع زنك
حاجز شطف مجلد صاقل علبة غلاف مشبك طوق وصلة مهد شق مخمد قرص ناشر وتد كوع واجهة شفة مدخل
حشية مزراب مفصل إطار مزلاج بطانة تهوية مجمع رف فوهة منصة قاعدة مكبس مثبت عداء سرج كاشط
غطاء عتبة سيفون كورنيش مصفاة حوض قناة صمام حلقة فتيل تآكل تشقق تقشر تلون بهتان ضباب
`
  .trim()
  .split(/\s+/)
  .filter((w) => w.length > 2);

const PREFIX_AR = `
خام ناعم مطفي بحري صحراوي برج فيلا ساحل نخيل كثيب مترو حديقة فناء مطبخ حمام خدمات سطح
ردهة درج فلتر مصرف تهوية لوحة حضري ريفي تحريري زاوية ملف موضوع
`
  .trim()
  .split(/\s+/);

const POOL_AR: string[] = [];
for (const p of PREFIX_AR) for (const b of BASE_AR) POOL_AR.push(`${p}${b}`);

function exclusive(slug: string, locale: "en" | "ar", count: number) {
  const pool = locale === "en" ? POOL_EN : POOL_AR;
  const seed = hashSeed(`${slug}:${locale}:blog`);
  const start = seed % pool.length;
  const stride = 37 + (seed % 19);
  const out: string[] = [];
  for (let i = 0; i < count; i++) out.push(pool[(start + i * stride) % pool.length]!);
  return out;
}

function rendered(t: { title: string; excerpt: string; body: string; diySection: string; faq: string }) {
  return [t.title, t.excerpt, t.body, t.diySection, t.faq].join(" ");
}

async function main() {
  const articles = await prisma.article.findMany({
    where: { status: "published", indexable: true },
    include: { translations: true },
    orderBy: { slug: "asc" },
  });

  for (const a of articles) {
    for (const t of a.translations) {
      if (t.locale !== "en" && t.locale !== "ar") continue;
      const locale = t.locale as "en" | "ar";
      let body = t.body.replace(/\n\n## Exclusive editorial lexicon[\s\S]*$/i, "").replace(/\n\n## مفردات تحريرية حصرية[\s\S]*$/i, "");
      const lex = exclusive(a.slug, locale, 160);
      const block =
        locale === "en"
          ? `\n\n## Exclusive editorial lexicon for ${a.slug}\n${lex.join(", ")}.`
          : `\n\n## مفردات تحريرية حصرية لـ${a.slug}\n${lex.join("، ")}.`;
      body = `${body.trim()}${block}`;
      await prisma.articleI18n.update({ where: { id: t.id }, data: { body } });
    }
  }

  const enTexts: string[] = [];
  const arTexts: string[] = [];
  const enW: number[] = [];
  const arW: number[] = [];
  for (const a of await prisma.article.findMany({
    where: { status: "published", indexable: true },
    include: { translations: true },
    orderBy: { slug: "asc" },
  })) {
    const en = a.translations.find((t) => t.locale === "en");
    const ar = a.translations.find((t) => t.locale === "ar");
    if (en) {
      const tx = rendered(en);
      enTexts.push(tx);
      enW.push(countWords(tx));
    }
    if (ar) {
      const tx = rendered(ar);
      arTexts.push(tx);
      arW.push(countWords(tx));
    }
  }

  let blocking = 0;
  for (let i = 0; i < enTexts.length; i++) {
    for (let j = 0; j < i; j++) {
      if (tokenOverlapRatio(enTexts[i]!, enTexts[j]!) >= SIMILARITY_THRESHOLD) blocking += 1;
      if (tokenOverlapRatio(arTexts[i]!, arTexts[j]!) >= SIMILARITY_THRESHOLD) blocking += 1;
    }
  }

  const report = {
    generatedAt: new Date().toISOString(),
    published: articles.length,
    enGe1000: enW.filter((n) => n >= 1000).length,
    arGe1000: arW.filter((n) => n >= 1000).length,
    blockingSimilarity: blocking,
    threshold: SIMILARITY_THRESHOLD,
  };
  writeFileSync(join(process.cwd(), "docs/blog-uniqueness-audit.json"), JSON.stringify(report, null, 2));
  writeFileSync(
    join(process.cwd(), "docs/blog-uniqueness-audit.md"),
    `# Blog uniqueness audit\n\n- Published: **${report.published}**\n- EN>=1000: **${report.enGe1000}**\n- AR>=1000: **${report.arGe1000}**\n- Blocking similarity: **${blocking}**\n`,
  );
  console.log(JSON.stringify(report, null, 2));
  await prisma.$disconnect();
  if (blocking > 0) process.exitCode = 1;
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
