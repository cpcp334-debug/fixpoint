import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import { buildMetadata } from "../src/lib/seo";
import { getSiteUrl } from "../src/config/site";
import { servicePathSlug } from "../src/lib/slug/locale-slug";

function loadFunction(path: string, name: string, bindings: Record<string, unknown>) {
  const text = readFileSync(path, "utf8");
  const source = ts.createSourceFile(path, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const declaration = source.statements.find((node) => ts.isFunctionDeclaration(node) && node.name?.text === name);
  assert(declaration, `Missing ${name}`);
  const code = ts.transpileModule(declaration.getText(source), {
    compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS },
  }).outputText;
  const exports: Record<string, unknown> = {};
  vm.runInNewContext(code, { ...bindings, exports });
  return exports[name];
}

async function main() {
  const publicCanonical = loadFunction("src/components/public/PublicHero.tsx", "publicCanonical", { getSiteUrl });
  let row: Record<string, unknown> | null = null;
  let lookups = 0;
  const generate = loadFunction("src/app/[locale]/[service]/page.tsx", "generateMetadata", {
    publicCanonical, servicePathSlug, buildMetadata,
    isReservedSlug: (slug: string) => slug === "admin",
    getServiceBySlug: async () => { lookups++; return row; },
    getApprovedCatalogServiceBySlug: async () => row,
  }) as (input: { params: Promise<{ locale: string; service: string }> }) => Promise<ReturnType<typeof buildMetadata>>;
  let cases = 0;
  for (const [slug, arabic] of [["circuit-installation", "تركيب-الدائرة"], ["commercial-painting", "التجاري-الدهان"]]) {
    const expected = { en: `${getSiteUrl()}/en/${slug}`, ar: `${getSiteUrl()}/ar/${encodeURIComponent(arabic)}`, "x-default": `${getSiteUrl()}/en/${slug}` };
    row = { slug, translations: [{ locale: "en" }, { locale: "ar" }], publicIndexable: true, t: { seoTitle: "Reviewed title", metaDescription: "Reviewed description" } };
    for (const locale of ["en", "ar"]) {
      for (const service of [slug, arabic, encodeURIComponent(arabic)]) {
        const result = await generate({ params: Promise.resolve({ locale, service }) });
        assert.deepEqual(result.alternates?.languages, expected);
        assert.equal(result.alternates?.canonical, expected[locale as "en" | "ar"]);
        assert.equal(result.title, "Reviewed title");
        assert.equal(result.description, "Reviewed description");
        assert.deepEqual(result.robots, { index: true, follow: true });
        cases++;
      }
    }
  }
  for (const language of ["en", "ar"]) {
    row = { ...row, translations: [{ locale: language }] };
    const result = await generate({ params: Promise.resolve({ locale: language, service: "commercial-painting" }) });
    const languages = result.alternates?.languages || {};
    assert(language in languages);
    assert(!((language === "en" ? "ar" : "en") in languages));
    assert.equal("x-default" in languages, language === "en");
    cases++;
  }
  row = { ...row, publicIndexable: false };
  const noindex = await generate({ params: Promise.resolve({ locale: "ar", service: "commercial-painting" }) });
  assert.deepEqual(noindex.robots, { index: false, follow: false });
  cases++;
  row = null;
  assert.equal(JSON.stringify(await generate({ params: Promise.resolve({ locale: "en", service: "missing" }) })), "{}");
  cases++;
  const prior = lookups;
  assert.equal(JSON.stringify(await generate({ params: Promise.resolve({ locale: "en", service: "admin" }) })), "{}");
  assert.equal(lookups, prior);
  console.log(`${cases + 1} service metadata cases passed: canonical locale paths, reciprocal sets, aliases, missing translations, metadata/robots and missing/reserved records.`);
}

void main();
