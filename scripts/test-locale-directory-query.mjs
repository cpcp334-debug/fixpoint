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
