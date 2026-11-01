import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { Prisma } from '@prisma/client';
import * as availability from '../src/lib/blog/translation-availability';

function load(path: string, imports: Record<string, unknown>) {
  const testModule = {exports: {} as Record<string, any>}; // eslint-disable-line @typescript-eslint/no-explicit-any
  const js = ts.transpileModule(fs.readFileSync(path, 'utf8'), {
    compilerOptions: {module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX},
  }).outputText;
  vm.runInNewContext(js, {module: testModule, exports: testModule.exports, URL, URLSearchParams,
    console, setTimeout, ...imports.globals as object,
    require: (name: string) => {assert.ok(name in imports, `Unmocked import ${name}`);return imports[name];}});
  return testModule.exports;
}

async function main() {
  let checks = 0;
  const check = (name: string, fn: () => void) => {fn(); checks++; console.log(`PASS ${name}`);};
  let article: {slug: string} | null = null;
  let lookups = 0;
  const api = load('src/app/api/locale-path/route.ts', {
    'next/server': {NextResponse: {json: (data: unknown, init?: {status: number}) => ({data, status: init?.status ?? 200})}},
    '@/lib/slug/remap-public-path': {remapPublicPathForLocale: (path: string) => path},
    '@/lib/blog/catalog': {getBlogArticleBySlug: async () => {lookups++; return article;}},
  });
  const request = (path: string) => api.GET({url: `https://fixpoint.ae/api/locale-path?locale=ar&path=${encodeURIComponent(path)}`});
  const missing = await request('/blog/example');
  check('unavailable blog resolves to index with explicit availability', () => {
    assert.equal(missing.data.href, '/blog'); assert.equal(missing.data.available, false);
  });
  article = {slug: 'mapped-public-slug'};
  const present = await request('/blog/example/');
  check('available blog uses catalog public slug', () => {
    assert.equal(present.data.href, '/blog/mapped-public-slug'); assert.equal(present.data.available, true);
  });
  const before = lookups;
  const other = await request('/services');
  const invalid = await request('https://example.com');
  check('non-blog and invalid routes do not trigger blog lookup', () => {
    assert.equal(lookups, before); assert.equal(other.data.href, '/services'); assert.equal(invalid.status, 400);
  });

  let pathname = '/blog/example';
  let state: unknown = null;
  let effect: () => (() => void) | void = () => {};
  let fetchResponse: unknown = {href: '/blog', available: false};
  let fail = false;
  const switcher = load('src/components/layout/LocaleSwitcher.tsx', {
    react: {useState: () => [state, (value: unknown) => {state = value;}], useEffect: (fn: typeof effect) => {effect = fn;}},
    'react/jsx-runtime': {jsx: (type: unknown, props: unknown) => ({type, props})},
    '@/i18n/routing': {Link: 'Link', usePathname: () => pathname},
    globals: {fetch: async () => {if (fail) throw Error('offline'); return {ok: true, json: async () => fetchResponse};}},
  });
  const render = () => switcher.LocaleSwitcher({locale: 'en'}).props;
  const settle = async () => {effect(); await new Promise(resolve => setTimeout(resolve, 0));};
  check('initial blog switch links to clearly labelled index', () => {
    const props = render(); assert.equal(props.href, '/blog'); assert.equal(props.children, 'المدونة بالعربية');
  });
  await settle();
  check('unavailable response keeps blog index', () => assert.equal(render().href, '/blog'));
  fetchResponse = {href: '/blog/translated', available: true};
  await settle();
  check('available response enables translation link', () => assert.equal(render().href, '/blog/translated'));
  pathname = '/blog/another';
  check('route change never reuses preceding article target', () => assert.equal(render().href, '/blog'));
  fail = true; await settle();
  check('network failure keeps index fallback', () => assert.equal(render().href, '/blog'));

  const epoch = new Date('2026-11-01T00:00:00Z');
  let rows: Array<{id: string; slug: string; updatedAt: Date; publishedAt: Date | null}> = [];
  const sqlCalls: Prisma.Sql[] = [];
  const findCalls: Array<{take: number; select: Record<string, unknown>}> = [];
  const sitemap = load('src/app/sitemap.ts', {
    '@prisma/client': {Prisma}, '@/lib/blog/translation-availability': availability,
    'next/cache': {unstable_cache: (fn: unknown) => fn}, '@/config/site': {getSiteUrl: () => 'https://fixpoint.ae'},
    '@/lib/catalog': {publicServiceLocationWhere: {}},
    '@/server/db': {prisma: {
      article: {findMany: async (args: typeof findCalls[number]) => {findCalls.push(args); return rows;}},
      serviceLocation: {findMany: async () => []},
      $queryRaw: async (query: Prisma.Sql) => {sqlCalls.push(query); return [{articleId: 'one', locale: 'en'}];},
    }},
    '@/lib/slug/locale-slug': {}, '@/lib/slug/diy-slug-map': {},
    '@/lib/slug/blog-slug-map': {blogPathSlug: (_locale: string, slug: string) => slug},
    '@/lib/slug/faq-slug-map': {faqPathSlug: (_locale: string, slug: string) => slug},
  });
  const shard = sitemap.articleShardId('example');
  assert.notEqual(shard, 0, 'fixture avoids static catalog');
  let faqSlug = 'faq-example';
  for (let i = 0; sitemap.articleShardId(faqSlug) !== shard; i++) faqSlug = `faq-example-${i}`;
  rows = [{id:'one',slug:'example',updatedAt:epoch,publishedAt:null},
    {id:'faq',slug:faqSlug,updatedAt:epoch,publishedAt:null},
    {id:'off-shard',slug:'not-the-same-shard',updatedAt:epoch,publishedAt:null}];
  assert.notEqual(sitemap.articleShardId(rows[2].slug), shard);
  const entries = await sitemap.default({id:String(shard)});
  check('sitemap emits English blog and omits unavailable Arabic', () => {
    assert.ok(entries.some((entry: {url: string}) => entry.url === 'https://fixpoint.ae/en/blog/example'));
    assert.ok(!entries.some((entry: {url: string}) => entry.url === 'https://fixpoint.ae/ar/blog/example'));
  });
  check('FAQ locales and shard boundaries are preserved', () => {
    assert.equal(entries.length, 3);
    assert.equal(entries.filter((entry: {url:string}) => entry.url.includes('/faq/')).length, 2);
  });
  check('sitemap availability reads are bounded to current shard IDs', () => {
    assert.equal(findCalls[0].take,1500); assert.ok(!('translations' in findCalls[0].select));
    assert.equal(sqlCalls.length,1); assert.ok(sqlCalls[0].values.includes('one'));
    assert.ok(!sqlCalls[0].values.includes('faq')); assert.ok(!sqlCalls[0].values.includes('off-shard'));
    assert.ok(sqlCalls[0].sql.includes(availability.blogTranslationAvailabilitySql().sql));
  });
  console.log(`${checks} consumer checks passed. Database execution and browser rendering remain untested.`);
}
main().catch(error => {console.error(error); process.exitCode = 1;});