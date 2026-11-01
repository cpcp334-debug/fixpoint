import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import * as slugMap from '../src/lib/slug/blog-slug-map';
import type { Metadata } from 'next';

// Execute the actual route and metadata builder. Mock only catalog responses,
// site configuration, framework interrupts and unused render dependencies.
function loadModule(path: string, imports: Record<string, unknown>) {
  const testModule = { exports: {} as Record<string, unknown> };
  const js = ts.transpileModule(fs.readFileSync(path, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  vm.runInNewContext(js, { module: testModule, exports: testModule.exports, require: (name: string) => {
    assert.ok(name in imports, `Unmocked import ${name}`);
    return imports[name];
  }});
  return testModule.exports;
}

async function main() {
  const site = 'https://fixpoint.ae';
  const config = { getSiteUrl: () => site, brandName: () => 'Fixpoint', siteConfig: {} };
  const seo = loadModule('src/lib/seo.ts', { '@/config/site': config });
  const notFoundError = new Error('TEST_NOT_FOUND');
  let availableLocales = ['en'];
  let missing = false;
  const imports: Record<string, unknown> = {
    '@/lib/slug/blog-slug-map': slugMap, '@/config/site': config, '@/lib/seo': seo,
    'next/navigation': { notFound: () => { throw notFoundError; } },
    '@/lib/blog/catalog': { getBlogArticleBySlug: async (slug: string, locale: string) =>
      missing ? null : {
        slug: slugMap.blogPathSlug(locale, slug), availableLocales,
        t: { seoTitle: 'Electrical handover guide', metaDescription: 'Records for MEP teams.' },
        heroImage: '/media/test-illustration.webp',
      } },
  };
  for (const name of ['react/jsx-runtime', 'next-intl/server', '@/i18n/routing',
    '@/components/seo/JsonLd', '@/components/seo/Breadcrumbs', '@/components/ui/Blocks',
    '@/components/ui/Section', '@/components/public/PageShell', '@/components/public/PublicHero',
    '@/components/public/ArPublicSlugNormalize', '@/components/public/CtaRow',
    '@/components/public/CtaBand', '@/server/db', '@/lib/catalog']) imports[name] = {};
  const page = loadModule('src/app/[locale]/blog/[slug]/page.tsx', imports);
  const generate = page.generateMetadata as (props: {params: Promise<{locale: string; slug: string}>}) => Promise<Metadata>;
  const get = (locale: string, slug = 'electrical-testing-commissioning-readiness') =>
    generate({params: Promise.resolve({locale, slug})});
  let checks = 0;
  const check = (name: string, fn: () => void) => { fn(); checks++; console.log(`PASS ${name}`); };
  const english = await get('en');
  check('English-only article omits Arabic and retains English x-default', () => {
    const languages = english.alternates?.languages;
    assert.equal(Object.keys(languages ?? {}).sort().join(','), 'en,x-default');
    assert.equal(languages?.en, `${site}/en/blog/electrical-testing-commissioning-readiness`);
    assert.equal(languages?.['x-default'], languages?.en);
  });
  check('canonical, title, description, robots and image are preserved', () => {
    assert.equal(english.alternates?.canonical, `${site}/en/blog/electrical-testing-commissioning-readiness`);
    assert.equal(english.title, 'Electrical handover guide');
    assert.equal(english.description, 'Records for MEP teams.');
    assert.equal(JSON.stringify(english.robots), JSON.stringify({index: true, follow: true}));
    assert.equal(JSON.stringify(english.twitter?.images), JSON.stringify([`${site}/media/test-illustration.webp`]));
  });
  availableLocales = ['en', 'ar'];
  const master = 'compare-electrical-repair-quotes-dubai';
  const publicArabic = slugMap.blogPathSlug('ar', master);
  assert.notEqual(publicArabic, master, 'fixture must have a mapped Arabic slug');
  for (const locale of ['en', 'ar']) {
    const result = await get(locale, locale === 'ar' ? publicArabic : master);
    check(`bilingual ${locale} metadata preserves reciprocal mapped URLs`, () => {
      assert.equal(result.alternates?.languages?.en, `${site}/en/blog/${master}`);
      assert.equal(result.alternates?.languages?.ar, `${site}/ar/blog/${publicArabic}`);
      assert.equal(result.alternates?.languages?.['x-default'], `${site}/en/blog/${master}`);
      assert.equal(result.alternates?.canonical, `${site}/${locale}/blog/${locale === 'ar' ? publicArabic : master}`);
    });
  }
  availableLocales = ['ar'];
  const arabic = await get('ar', publicArabic);
  check('Arabic-only metadata invents neither English nor x-default', () => {
    assert.equal(Object.keys(arabic.alternates?.languages ?? {}).join(','), 'ar');
    assert.equal(arabic.alternates?.languages?.ar, `${site}/ar/blog/${publicArabic}`);
  });
  missing = true;
  await assert.rejects(() => get('ar'), error => error === notFoundError);
  checks++; console.log('PASS unavailable article invokes framework notFound');
  console.log(`${checks} metadata checks passed. HTML rendering and HTTP status remain untested.`);
}
main().catch(error => { console.error(error); process.exitCode = 1; });