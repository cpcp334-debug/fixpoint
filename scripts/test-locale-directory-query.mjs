import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";

const load = (path, mocks = {}) => {
  const exports = {};
  const code = ts.transpileModule(readFileSync(new URL(path, import.meta.url), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  new Function("require", "exports", code)((name) => {
    if (name in mocks) return mocks[name];
    if (name.startsWith(".")) return load(new URL(`${name}.ts`, new URL(path, import.meta.url)).href);
    throw new Error(`Unexpected import ${name}`);
  }, exports);
  return exports;
};
const helper = load("../src/lib/slug/locale-directory-query.ts");
const catalog = load("../prisma/data/catalog-a1.ts");
let checks = 0;
const eq = (a, b) => { assert.deepEqual(a, b); checks++; };
eq([...helper.DIRECTORY_CATEGORY_SLUGS], catalog.APPROVED_CATEGORIES.map(x => x.slug));
for (const [path, target, query, expected] of [
  ["/faq", "/faq", "category=ac&page=2", "/faq?category=ac&page=2"],
  ["/faq", "/faq", "category=ac&q=drain&page=3", "/faq?category=ac&q=drain&page=3"],
  ["/services/painting", "/services/painting", "q=wood&page=2", "/services/painting?q=wood&page=2"],
  ["/faq/", "/faq/", "category=painting&page=1", "/faq/?category=painting"],
  ["/faq", "/faq", "q=a%26b+%D9%85%D8%A7%D8%A1", "/faq?q=a%26b+%D9%85%D8%A7%D8%A1"],
  ["/faq", "/faq", "q=%20%20&page=2", "/faq?page=2"],
  ["/faq", "/faq", "category=bogus&page=3", "/faq"],
  ["/faq", "/faq", "category=ac&category=painting&page=2", "/faq"],
  ["/faq", "/faq", "q=a&q=b&page=2&category=ac", "/faq?category=ac"],
  ["/faq", "/faq", "page=2&page=3", "/faq"],
  ["/faq", "/faq", "redirect=https://example.com&token=secret&q=wood", "/faq?q=wood"],
  ["/services/painting", "/services/painting", "category=ac&q=metal", "/services/painting?q=metal"],
  ["/services/made-up", "/services/made-up", "q=wood&page=2", "/services/made-up"],
  ["/faq/item", "/faq/localized", "q=wood&page=2", "/faq/localized"],
  ["/blog/item", "/blog", "q=wood&page=2", "/blog"],
  ["/faq", "/blog", "q=wood&page=2", "/blog"],
  ["/get-a-quote", "/get-a-quote", "service=wood-painting", "/get-a-quote"],
  ["/", "/", "q=wood", "/"],
  ["/faq", "/faq", "", "/faq"],
]) eq(helper.localeDirectoryHref(path, target, query), expected);
for (const page of ["0", "-1", "1", "1.5", "NaN", "Infinity", "1e2", "9007199254740992", "", " 2"])
  eq(helper.localeDirectoryHref("/faq", "/faq", `category=ac&page=${encodeURIComponent(page)}`), "/faq?category=ac");
eq(helper.localeDirectoryHref("/faq", "/faq", "page=999999"), "/faq?page=999999");
for (const slug of helper.DIRECTORY_CATEGORY_SLUGS)
  eq(helper.localeDirectoryHref(`/services/${slug}`, `/services/${slug}`, "q=term&page=2"), `/services/${slug}?q=term&page=2`);

const Link = () => null, Suspense = () => null;
let pathname = "/faq", search = "category=ac&page=2", stored = null, effectDeps, cleanup;
const pending = [];
const oldFetch = globalThis.fetch;
globalThis.fetch = (url) => new Promise(resolve => pending.push({ url, resolve }));
const runtime = { jsx: (type, props) => ({ type, props }), jsxs: (type, props) => ({ type, props }) };
try {
  const component = load("../src/components/layout/LocaleSwitcher.tsx", {
    react: { Suspense, useState: () => [stored, (value) => { stored = value; }], useEffect: (effect, deps) => {
      if (JSON.stringify(deps) !== JSON.stringify(effectDeps)) { cleanup?.(); cleanup = effect(); effectDeps = deps; }
    } },
    "react/jsx-runtime": runtime,
    "next/navigation": { useSearchParams: () => new URLSearchParams(search) },
    "@/i18n/routing": { Link, usePathname: () => pathname },
    "@/lib/slug/locale-directory-query": helper,
  });
  let closed = 0;
  const onNavigate = () => { closed++; };
  const render = (locale = "en") => {
    const shell = component.LocaleSwitcher({ locale, className: "switch", onNavigate });
    eq(shell.type, Suspense);
    const fallback = shell.props.fallback.type(shell.props.fallback.props);
    eq(fallback.type, Link); eq(fallback.props.onClick, onNavigate);
    return { fallback, link: shell.props.children.type(shell.props.children.props) };
  };
  let state = render();
  eq(state.fallback.props.href, "/faq");
  eq(state.link.props.href, "/faq?category=ac&page=2");
  eq(pending[0].url, "/api/locale-path?path=%2Ffaq&locale=ar");
  search = "category=painting&page=3";
  state = render(); eq(state.link.props.href, "/faq?category=painting&page=3"); eq(pending.length, 1);
  pathname = "/services/painting"; search = "q=wood";
  state = render(); eq(state.link.props.href, "/services/painting?q=wood");
  pending[0].resolve({ ok: true, json: async () => ({ href: "/wrong-stale-path" }) });
  await new Promise(resolve => setImmediate(resolve));
  state = render(); eq(state.link.props.href, "/services/painting?q=wood");
  pending[1].resolve({ ok: true, json: async () => ({ href: "/services/painting" }) });
  await new Promise(resolve => setImmediate(resolve));
  state = render("ar"); eq(state.link.props.locale, "en"); eq(state.link.props.href, "/services/painting?q=wood");
  state.link.props.onClick(); eq(closed, 1); eq(state.link.props.className, "switch");
  pathname = "/reviews"; search = "service=ac-cleaning&location=dubai&stars=4&verified=1";
  for (const locale of ["en", "ar"]) {
    state = render(locale);
    eq(state.link.props.locale, locale === "en" ? "ar" : "en");
    eq(state.link.props.href, "/reviews?service=ac-cleaning&location=dubai&stars=4&verified=1");
    eq(state.fallback.props.href, "/reviews");
  }
  pathname = "/blog/missing"; search = "q=wood&page=2";
  state = render(); eq(state.link.props.href, "/blog"); eq(state.link.props.children, "المدونة بالعربية");
  eq(state.fallback.props.href, "/blog"); eq(state.fallback.props.children, "المدونة بالعربية");
  pending.at(-1).resolve({ ok: true, json: async () => ({ href: "/blog/missing", available: false }) });
  await new Promise(resolve => setImmediate(resolve));
  state = render(); eq(state.link.props.href, "/blog");
  pathname = "/ac-cleaning"; search = "q=wood&page=2";
  state = render(); eq(state.link.props.href, "/ac-cleaning");
  pending.at(-1).resolve({ ok: true, json: async () => ({ href: "/localized-ac-cleaning" }) });
  await new Promise(resolve => setImmediate(resolve));
  state = render(); eq(state.link.props.href, "/localized-ac-cleaning");
} finally { cleanup?.(); globalThis.fetch = oldFetch; }
console.log(`${checks} directory query and switcher assertions passed`);

// Reviews uses master catalogue slugs in both languages. Membership stays server-side.
const allReviewFilters = "service=ac-cleaning&location=dubai&stars=4&verified=1";
for (const [query, expected] of [
  [allReviewFilters, `/reviews?${allReviewFilters}`],
  ["verified=1&stars=4&location=dubai&service=ac-cleaning&q=ignored&page=2&utm_source=test", `/reviews?${allReviewFilters}`],
  ["service=ac%2Dcleaning&location=%64ubai&stars=%34&verified=%31", `/reviews?${allReviewFilters}`],
  ["service=ac-cleaning", "/reviews?service=ac-cleaning"],
  ["location=dubai", "/reviews?location=dubai"],
  ["stars=4", "/reviews?stars=4"],
  ["verified=1", "/reviews?verified=1"],
  ["verified=0", "/reviews"],
  ["", "/reviews"],
  ["q=wood&page=2&category=ac&redirect=https://example.com", "/reviews"],
]) eq(helper.localeDirectoryHref("/reviews", "/reviews", query), expected);
for (const stars of [1, 2, 3, 4, 5])
  eq(helper.localeDirectoryHref("/reviews", "/reviews", `stars=${stars}`), `/reviews?stars=${stars}`);
for (const location of ["dubai", "abu-dhabi", "sharjah", "ajman", "umm-al-quwain", "ras-al-khaimah", "fujairah"])
  eq(helper.localeDirectoryHref("/reviews", "/reviews", `location=${location}`), `/reviews?location=${location}`);
for (const [key, invalids] of Object.entries({
  service: ["", "AC-cleaning", "ac--cleaning", "-ac", "ac-", "ac_cleaning", "ac/cleaning", " ac-cleaning", "تنظيف-التكييف", "a".repeat(161)],
  location: ["", "Dubai", "deira", "dubai ", "unknown"],
  stars: ["", "0", "6", "04", "4.0", "4+", " 4", "NaN"],
  verified: ["", "0", "true", "yes", " 1", "2"],
})) {
  for (const value of invalids) {
    const params = new URLSearchParams(allReviewFilters);
    params.set(key, value);
    const expected = new URLSearchParams(allReviewFilters);
    expected.delete(key);
    eq(helper.localeDirectoryHref("/reviews", "/reviews", params.toString()), `/reviews?${expected}`);
  }
  for (const extra of [new URLSearchParams(allReviewFilters).get(key), ""]) {
    const params = new URLSearchParams(allReviewFilters);
    params.append(key, extra);
    const expected = new URLSearchParams(allReviewFilters);
    expected.delete(key);
    eq(helper.localeDirectoryHref("/reviews", "/reviews", params.toString()), `/reviews?${expected}`);
  }
}
eq(helper.localeDirectoryHref("/reviews", "/reviews", `service=${"a".repeat(160)}`), `/reviews?service=${"a".repeat(160)}`);
eq(helper.localeDirectoryHref("/reviews/", "/reviews/", allReviewFilters), `/reviews/?${allReviewFilters}`);
for (const [path, target] of [["/reviews", "/"], ["/reviews/detail", "/reviews"], ["/contact", "/contact"], ["/services", "/services"]])
  eq(helper.localeDirectoryHref(path, target, allReviewFilters), target);

// Exercise the actual route without a database or a production review submission.
const routeTokens = new Map();
const routeComponents = new Proxy({}, { get: (_, name) => {
  if (!routeTokens.has(name)) routeTokens.set(name, () => null);
  return routeTokens.get(name);
} });
let catalogueLocale, reviewLookups;
const quotationCopy = load("../src/lib/catalog/service-quotation-copy.ts");
const reviewsRoute = load("../src/app/[locale]/reviews/page.tsx", {
  "react/jsx-runtime": runtime,
  "@/config/site": { brandName: () => "Fixpoint" },
  "@/lib/catalog/service-quotation-copy": quotationCopy,
  "next-intl/server": { setRequestLocale: () => {}, getTranslations: async () => key => key },
  "@/lib/catalog": {
    getActiveServices: async locale => { catalogueLocale = locale; return [{ id: "service-id", slug: "ac-cleaning", t: { name: "AC" } }]; },
    getActiveEmirates: async () => [{ id: "location-id", slug: "dubai", t: { name: "Dubai" } }],
  },
  "@/lib/reviews": {
    summarizeApprovedServiceReviews: async filters => { reviewLookups.push({ summary: filters }); return { count: 0, average: null }; },
    getApprovedServiceReviews: async filters => { reviewLookups.push({ reviews: filters }); return []; },
    toPublicReview: () => { throw new Error("Empty fixtures must not fabricate reviews"); },
  },
  "@/lib/seo": { breadcrumbJsonLd: () => ({ "@type": "BreadcrumbList" }), reviewAggregateJsonLd: () => null },
  ...Object.fromEntries([
    ["seo/JsonLd", "JsonLd"], ["seo/Breadcrumbs", "Breadcrumbs"], ["trust/ReviewForm", "ReviewForm"],
    ["trust/ReviewList", "ReviewList"], ["trust/ReviewSummary", "ReviewSummary"], ["ui/Button", "Button"],
    ["ui/Section", "Section"], ["public/PageShell", "PageShell"], ["public/PublicHero", "PublicHero"],
    ["public/CtaBand", "CtaBand"],
  ].map(([path, name]) => [`@/components/${path}`, { [name]: routeComponents[name] }])),
  "@/components/public/FormShell": { fieldControlClass: "control", fieldLabelClass: "label" },
});
const reviewNodes = node => Array.isArray(node) ? node.flatMap(reviewNodes) : node && typeof node === "object" ? [node, ...reviewNodes(node.props?.children)] : [];
for (const locale of ["en", "ar"]) {
  for (const query of [allReviewFilters, "", "service=unknown&location=unknown&stars=4&verified=1"]) {
    const preserved = helper.localeDirectoryHref("/reviews", "/reviews", query);
    const filters = Object.fromEntries(new URL(preserved, "https://fixpoint.ae").searchParams);
    reviewLookups = [];
    const tree = reviewNodes(await reviewsRoute.default({ params: Promise.resolve({ locale }), searchParams: Promise.resolve(filters) }));
    const hasContext = query === allReviewFilters;
    const form = tree.find(node => node.type === routeTokens.get("ReviewForm"));
    eq([form.props.locale, form.props.type, form.props.serviceSlug, form.props.locationSlug], [locale, "service", hasContext ? "ac-cleaning" : undefined, hasContext ? "dubai" : undefined]);
    const band = tree.find(node => node.type === routeTokens.get("CtaBand"));
    const expectedCopy = quotationCopy.relatedServiceQuotationCopy(null, locale);
    eq([band.props.title, band.props.body, band.props.quote], [expectedCopy.title, expectedCopy.body, expectedCopy.quote]);
    eq([band.props.ai, band.props.whatsapp, band.props.aiHref], ["ctaAi", "whatsapp", `/${locale}#alnajah-ai`]);
    eq([band.props.quoteHref, band.props.whatsappText], [undefined, undefined]);
    eq(catalogueLocale, locale);
    eq(reviewLookups, [
      { summary: { serviceId: hasContext ? "service-id" : undefined, locationId: hasContext ? "location-id" : undefined } },
      { reviews: { serviceId: hasContext ? "service-id" : undefined, locationId: hasContext ? "location-id" : undefined, minStars: query ? 4 : undefined, verifiedOnly: !!query } },
    ]);
    eq(tree.find(node => node.type === routeTokens.get("ReviewList")).props.reviews, []);
    eq(tree.find(node => node.type === routeTokens.get("ReviewSummary")).props.count, 0);
    eq(tree.filter(node => node.type === routeTokens.get("JsonLd")).map(node => node.props.data), [null, { "@type": "BreadcrumbList" }]);
  }
}
console.log(`${checks} total directory query, switcher and Reviews route assertions passed`);
