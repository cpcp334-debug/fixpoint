import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import { createRequire } from "node:module";
const loadModule = createRequire(import.meta.url);
const { faqPathSlug, faqLookupCandidates, toMasterFaqSlug } = loadModule('../src/lib/slug/faq-slug-map.ts');
const { buildMetadata } = loadModule('../src/lib/seo.ts');
const { getSiteUrl } = loadModule('../src/config/site.ts');

function load(path, bindings, declarationName) {
  const text = fs.readFileSync(path, 'utf8');
  const src = ts.createSourceFile(path, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const nodes = src.statements.filter(n => declarationName
    ? ts.isFunctionDeclaration(n) && n.name?.text === declarationName
    : !ts.isImportDeclaration(n));
  const exports = {};
  vm.runInNewContext(ts.transpileModule(nodes.map(n => n.getText(src)).join('\n'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText, { ...bindings, exports });
  return exports;
}

async function main() {
  let row = null;
  const queries = [];
  const { getServiceFaqBySlug } = load('src/lib/faq/pages.ts', {
    cache: f => f,
    prisma: { article: { findFirst: async q => { queries.push(q); return row; } } },
    parseJson: (s, fallback) => { try { return JSON.parse(s); } catch { return fallback; } },
    parseFaqJson: s => JSON.parse(s), SERVICE_FAQ_CATEGORY: 'service-faq',
    faqPathSlug, faqLookupCandidates, toMasterFaqSlug,
  });
  const { publicCanonical } = load('src/components/public/PublicHero.tsx', { getSiteUrl }, 'publicCanonical');
  const { generateMetadata } = load('src/app/[locale]/faq/[slug]/page.tsx', {
    getServiceFaqBySlug, buildMetadata, publicCanonical, faqPathSlug,
  }, 'generateMetadata');
  const translation = locale => ({ locale, title: locale + ' title', excerpt: 'Excerpt', body: 'Body', faq: '[]', seoTitle: locale + ' SEO', metaDescription: locale + ' description' });
  const fixture = locales => ({ slug: 'faq-cleaning-services', categorySlugs: '["service-faq","cleaning"]', relatedServiceSlugs: '["cleaning-services"]', relatedDiySlugs: '[]', translations: locales.map(translation) });
  let cases = 0;
  for (const locales of [['en', 'ar'], ['en'], ['ar']]) {
    row = fixture(locales);
    for (const locale of ['en', 'ar']) for (const slug of ['faq-cleaning-services', decodeURIComponent(faqPathSlug('ar', row.slug)), faqPathSlug('ar', row.slug)]) {
      const result = await generateMetadata({ params: Promise.resolve({ locale, slug }) });
      if (!locales.includes(locale) && !locales.includes('en')) { assert.equal(JSON.stringify(result), '{}'); cases++; continue; }
      const expected = Object.fromEntries(locales.map(l => [l, `${getSiteUrl()}/${l}/faq/${faqPathSlug(l, row.slug)}`]));
      if (locales.includes('en')) expected['x-default'] = expected.en;
      assert.deepEqual(result.alternates.languages, expected);
      assert.equal(result.alternates.canonical, `${getSiteUrl()}/${locale}/faq/${faqPathSlug(locale, row.slug)}`);
      const selected = locales.includes(locale) ? locale : 'en';
      assert.equal(result.title, selected + ' SEO');
      assert.equal(result.description, selected + ' description');
      assert.deepEqual(result.robots, { index: true, follow: true });
      cases++;
    }
  }
  row = fixture(['en', 'ar']);
  row.slug = decodeURIComponent(faqPathSlug('ar', row.slug));
  const legacy = await getServiceFaqBySlug(row.slug, 'ar');
  assert.equal(legacy.masterSlug, 'faq-cleaning-services'); cases++;
  for (const invalid of [null, fixture([]), { ...fixture(['en']), categorySlugs: '["cleaning"]' }, { ...fixture(['en']), slug: '__restore_faq_hidden' }]) {
    row = invalid;
    assert.equal(await getServiceFaqBySlug('faq-cleaning-services', 'en'), null); cases++;
  }
  for (const q of queries) {
    assert.equal(q.where.status, 'published'); assert.equal(q.where.indexable, true);
    assert.equal(q.where.categorySlugs.contains, 'service-faq'); assert.equal(q.include.translations, true);
    assert(q.where.slug.in.every(s => !s.startsWith('__restore_faq_')));
  }
  assert.equal(queries.length, cases);
  console.log(`${cases} FAQ loader/metadata cases passed; one unchanged query per call.`);
}
main().catch(error => { console.error(error); process.exitCode = 1; });
