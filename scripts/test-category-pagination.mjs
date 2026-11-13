import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";

const tokens = new Map();
const token = (name) => { if (!tokens.has(name)) tokens.set(name, () => null); return tokens.get(name); };
const components = new Proxy({}, { get: (_, name) => token(name) });
const runtime = { jsx: (type, props) => ({ type, props }), jsxs: (type, props) => ({ type, props }) };
let lookups = 0, count = 160, checks = 0;
const config = { getSiteUrl: () => "https://fixpoint.ae", brandName: () => "Fixpoint" };
const load = (path, overrides = {}) => {
  const exports = {};
  const code = ts.transpileModule(readFileSync(new URL(path, import.meta.url), "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  new Function("require", "exports", code)((name) => overrides[name] ?? (name === "react/jsx-runtime" ? runtime : components), exports);
  return exports;
};
const pagination = load("../src/lib/catalog/category-pagination.ts");
const seo = load("../src/lib/seo.ts", { "@/config/site": config });
const pager = load("../src/components/ui/PrevNextPagination.tsx");
const route = load("../src/app/[locale]/services/[category]/page.tsx", {
  "@/lib/catalog/category-pagination": pagination,
  "@/lib/seo": seo,
  "@/config/site": config,
  "@/components/ui/PrevNextPagination": pager,
  "next-intl/server": { setRequestLocale: () => {}, getTranslations: async () => (key) => key },
  "@/lib/catalog/approved-nav": {
    getNavCategory: (slug) => ({ slug, children: Array.from({ length: count }, (_, i) => ({ slug: `item-${i}`, nameEn: `Item ${i}` })), isCategoryOnlyHub: true }),
    getNavCategoryLocalized: () => ({ name: "Electrical", description: "Description" }),
  },
  "@/lib/catalog": { getApprovedCatalogServiceBySlug: async (slug) => { lookups++; return { slug, t: { name: `Item ${slug.slice(5)}`, shortDescription: "Description" } }; } },
  "@/lib/catalog/category-child-copy": { categoryChildCopy: (_cat, _locale, _slug, copy) => copy },
  "@/lib/slug/locale-slug": { serviceHref: (_locale, slug) => `/${slug}` },
  "../../../../../prisma/data/electrical-service-copy": { TOP_ELECTRICAL_SLUGS: [] },
});
const eq = (a, b) => { assert.deepEqual(a, b); checks++; };
const nodes = (node) => Array.isArray(node) ? node.flatMap(nodes) : node && typeof node === "object" ? [node, ...nodes(node.props?.children)] : [];
for (const value of [undefined, "", "0", "-1", "NaN", "Infinity", "1.5", "9007199254740992", ["bad", "2"]]) eq(pagination.categoryPagination(value, 160), { page: 1, totalPages: 7 });
eq(pagination.categoryPagination(["2", "3"], 160).page, 2);
eq(pagination.categoryPagination("999", 19), { page: 1, totalPages: 1 });
eq(pagination.categoryPagination("2", 0), { page: 1, totalPages: 1 });
for (const locale of ["en", "ar"]) {
  for (const [value, expected] of [[undefined, 1], ["2", 2], ["7", 7], ["999", 7], ["1.5", 1], [["2", "3"], 2]]) {
    const args = { params: Promise.resolve({ locale, category: "electrical" }), searchParams: Promise.resolve({ page: value }) };
    lookups = 0;
    const meta = await route.generateMetadata(args);
    eq(lookups, 0);
    const suffix = expected > 1 ? `?page=${expected}` : "";
    eq(meta.alternates.canonical, `https://fixpoint.ae/${locale}/services/electrical${suffix}`);
    eq(meta.openGraph.url, meta.alternates.canonical);
    eq(meta.alternates.languages, { en: `https://fixpoint.ae/en/services/electrical${suffix}`, ar: `https://fixpoint.ae/ar/services/electrical${suffix}`, "x-default": `https://fixpoint.ae/en/services/electrical${suffix}` });
    const tree = nodes(await route.default(args));
    const grid = tree.find(x => x.type === tokens.get("CategoryChildGrid"));
    eq(grid.props.items[0].slug, `item-${(expected - 1) * 24}`);
    eq(grid.props.items.length, expected === 7 ? 16 : 24);
    eq(tree.filter(x => x.type === pager.PrevNextPagination).map(x => x.props.currentPage), [expected, expected]);
    eq(lookups, 160);
  }
  const args = { params: Promise.resolve({ locale, category: "electrical" }), searchParams: Promise.resolve({ page: "2", q: "   " }) };
  eq((await route.generateMetadata(args)).alternates.canonical, `https://fixpoint.ae/${locale}/services/electrical?page=2`);
  args.searchParams = Promise.resolve({ page: "2", q: ["Item 1", "ignored"] });
  const filtered = await route.generateMetadata(args);
  eq(filtered.alternates.canonical, `https://fixpoint.ae/${locale}/services/electrical`);
  eq(filtered.robots, { index: true, follow: true });
  const grid = nodes(await route.default(args)).find(x => x.type === tokens.get("CategoryChildGrid"));
  eq(grid.props.query, "Item 1");
  eq(grid.props.items.every(x => x.name.includes("Item 1")), true);
  count = 19;
  args.params = Promise.resolve({ locale, category: "plumbing" }); args.searchParams = Promise.resolve({ page: "2" });
  eq((await route.generateMetadata(args)).alternates.canonical, `https://fixpoint.ae/${locale}/services/plumbing`);
  eq(nodes(await route.default(args)).find(x => x.type === tokens.get("CategoryChildGrid")).props.items.length, 19);
  count = 160;
}
// Empty search results should offer relevant guidance, without changing service matching.
for (const [locale, query, href] of [
  ["en", "DB Installation", "/blog/distribution-board-installation-planning"],
  ["en", "panel installation", "/blog/distribution-board-installation-planning"],
  ["ar", "تركيب لوحة التوزيع", "/blog/distribution-board-installation-planning"],
  ["en", "cable   tray", "/blog/cable-tray-conduit-coordination"],
  ["en", "conduit", "/blog/cable-tray-conduit-coordination"],
  ["ar", "حوامل الكابلات", "/blog/cable-tray-conduit-coordination"],
  ["ar", "مسارات الكابلات", "/blog/cable-tray-conduit-coordination"],
  ["ar", "مواسير الكهرباء", "/blog/cable-tray-conduit-coordination"],
]) {
  const args={params:Promise.resolve({locale,category:"electrical"}),searchParams:Promise.resolve({q:query})};
  const tree=nodes(await route.default(args));
  eq(tree.filter(n=>n.type===tokens.get("Link")&&n.props.href===href).length,1);
  eq(tree.find(n=>n.type===tokens.get("CategoryChildGrid")).props.items.length,0);
  args.params=Promise.resolve({locale,category:"plumbing"});
  eq(nodes(await route.default(args)).filter(n=>n.type===tokens.get("Link")&&n.props.href===href).length,0);
}
// Buyer answers must stay visible and identical to schema in both languages,
// without leaking electrical package copy into other category FAQs.
for (const locale of ["en", "ar"]) {
  for (const category of ["electrical", "plumbing"]) {
    const tree = nodes(await route.default({ params: Promise.resolve({ locale, category }), searchParams: Promise.resolve({}) }));
    const faq = tree.find(n => n.props?.data?.["@type"] === "FAQPage").props.data.mainEntity;
    eq(faq.length, category === "electrical" ? 6 : 3);
    const visible = tree.filter(n => n.type === "article");
    for (const item of faq) {
      eq(visible.some(n => nodes(n).some(x => x.type === "h3" && x.props.children === item.name)
        && nodes(n).some(x => x.type === "p" && x.props.children === item.acceptedAnswer.text)), true);
    }
  }
}
console.log(`${checks} category metadata and rendering assertions passed`);
