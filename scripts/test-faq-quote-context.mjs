import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";

const tokens = new Map();
const components = new Proxy({}, { get: (_, name) => {
  if (!tokens.has(name)) tokens.set(name, () => null);
  return tokens.get(name);
} });
const runtime = { jsx: (type, props) => ({ type, props }), jsxs: (type, props) => ({ type, props }) };
const load = (path, mocks = {}) => {
  const exports = {};
  const code = ts.transpileModule(readFileSync(new URL(path, import.meta.url), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  new Function("require", "exports", code)((name) => mocks[name] ?? (name === "react/jsx-runtime" ? runtime : components), exports);
  return exports;
};
const cta = load("../src/components/public/CtaBand.tsx", { "@/config/site": { whatsappUrl: () => "https://wa.me/test" } });
let relation, resolved, lookups;
const route = load("../src/app/[locale]/faq/[slug]/page.tsx", {
  "next-intl/server": { setRequestLocale: () => {}, getTranslations: async () => (key) => key },
  "@/lib/faq/pages": { getServiceFaqBySlug: async () => ({
    slug: "localized-faq", relatedServiceSlugs: relation ? [relation] : [], relatedDiySlugs: ["guide"],
    t: { title: "FAQ", excerpt: "Excerpt", body: "## Heading\n\nBody", faq: [{ q: "Question", a: "Answer" }] },
  }) },
  "@/lib/catalog": { getServiceBySlug: async (slug, locale) => { lookups.push({ slug, locale }); return resolved; } },
  "@/lib/catalog/service-quotation-copy": { relatedServiceQuotationCopy: () => ({ title: "Title", body: "Body", quote: "Quote" }) },
  "@/lib/slug/locale-slug": { serviceHref: (_locale, slug) => `/${slug}` },
});
const nodes = (node) => Array.isArray(node) ? node.flatMap(nodes) : node && typeof node === "object" ? [node, ...nodes(node.props?.children)] : [];
let checks = 0;
const eq = (a, b) => { assert.deepEqual(a, b); checks++; };
for (const locale of ["en", "ar"]) {
  for (const [requested, service, expected] of [
    ["ac-cleaning", { slug: "ac-cleaning" }, "/get-a-quote?service=ac-cleaning"],
    ["localized-alias", { slug: "ac-drain-cleaning" }, "/get-a-quote?service=ac-drain-cleaning"],
    ["alias", { slug: "a&b / العربية" }, "/get-a-quote?service=a%26b%20%2F%20%D8%A7%D9%84%D8%B9%D8%B1%D8%A8%D9%8A%D8%A9"],
    ["unresolved", null, "/get-a-quote"],
    [undefined, null, "/get-a-quote"],
    ["empty-slug", { slug: "" }, "/get-a-quote"],
  ]) {
    relation = requested; resolved = service; lookups = [];
    const tree = nodes(await route.default({ params: Promise.resolve({ locale, slug: "localized-faq" }) }));
    const band = tree.find(x => x.type === tokens.get("CtaBand"));
    eq(nodes(cta.CtaBand(band.props)).find(x => x.type === tokens.get("ButtonLink")).props.href, expected);
    eq(lookups, requested ? [{ slug: requested, locale }] : []);
    eq([band.props.title, band.props.body, band.props.quote, band.props.ai, band.props.whatsapp], ["Title", "Body", "Quote", "ctaAi", "whatsapp"]);
    eq(band.props.whatsappText, undefined);
    eq(tree.find(x => x.type === tokens.get("FaqList")).props.items, [{ q: "Question", a: "Answer" }]);
    eq(tree.filter(x => x.type === tokens.get("Link")).map(x => x.props.href), requested ? [`/${requested}`, "/diy/guide"] : ["/diy/guide"]);
  }
}
console.log(`${checks} FAQ quotation context and preservation assertions passed`);
