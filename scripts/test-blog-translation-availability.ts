import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { isBlogTranslationAvailable as ready, blogPageQueries, BLOG_NON_WHITESPACE } from '../src/lib/blog/translation-availability';
import * as availability from '../src/lib/blog/translation-availability';

async function main() {
  let checks = 0;
  const check = (name: string, fn: () => void) => { fn(); checks++; console.log(`PASS ${name}`); };
  const en = {locale:'en',title:'Test guide',body:'Useful records',excerpt:'Records',imageAlt:'Illustration'};
  const ar = {...en,locale:'ar',title:'دليل الفحص',body:'سجلات الفحص'};
  for (const value of ['', ' \t\r\n', '\u00a0', '\ufeff', '\u3000', 'REVIEW_REQUIRED', 'Pending review_required copy']) {
    check(`reject empty/placeholder ${JSON.stringify(value)}`, () => {
      assert.equal(ready({...en,title:value}),false); assert.equal(ready({...en,body:value}),false);
    });
  }
  check('missing translation',()=>assert.equal(ready(undefined),false));
  for (const body of ['Unique editorial markers: internal.', 'UNIQUE EDITORIAL MARKERS: internal', 'علامات تحريرية فريدة: داخلي.', '\r\nUnique editorial markers: one.\r\n\r\nUnique editorial markers: two.']) {
    check('reject body empty after presentation cleanup', () => assert.equal(ready({...en, body}), false));
  }
  check('retain useful text beside an internal marker', () => assert.equal(ready({...en, body: 'Useful evidence.\n\nUnique editorial markers: internal.'}), true));
  check('both content languages accepted',()=>{assert.equal(ready(en),true);assert.equal(ready(ar),true);});
  const hostile = "x' OR 1=1 --";
  const queries = blogPageQueries('ar',{skip:12,take:12,category:hostile,q:hostile});
  const idSql = queries.ids.sql;
  const countSql = queries.count.sql;
  check('count and pagination share exact predicate',()=>{
    assert.equal(idSql.slice(idSql.indexOf('FROM'),idSql.indexOf(' ORDER BY')),countSql.slice(countSql.indexOf('FROM')));
    assert.deepEqual(queries.ids.values.slice(0,-2),queries.count.values);
    assert.ok(idSql.includes('REGEXP_REPLACE'));
    assert.ok(idSql.indexOf('REGEXP_REPLACE') < idSql.indexOf(' LIMIT'));
  });
  check('filters and pagination are bound parameters',()=>{
    assert.ok(!idSql.includes(hostile));assert.ok(queries.ids.values.includes(`%${hostile}%`));
    assert.deepEqual(queries.ids.values.slice(-2),[12,12]);assert.ok(queries.ids.values.includes(BLOG_NON_WHITESPACE));
  });
  check('legacy exclusions are retained',()=>{
    for(const marker of ['faq-','__restore_faq_','__restore_blog_','service-faq']) assert.ok(idSql.includes(marker));
  });

  // Exercise the actual catalog module with database responses mocked. No live DB.
  let translations = [en,{...ar,title:'',body:''}];
  const row = {id:'article-1',slug:'example',status:'published',indexable:true,categorySlugs:'[]',relatedServiceSlugs:'[]',relatedDiySlugs:'[]',heroImage:null,publishedAt:null,updatedAt:new Date(), get translations(){return translations;}};
  let findManyCalls = 0;
  const db = {
    article:{findFirst:async()=>row,findMany:async()=>{findManyCalls++;return [row];}},
    service:{findFirst:async()=>null,findMany:async()=>[]},
    $queryRaw:async(query:{sql:string})=>query.sql.startsWith('SELECT COUNT')?[{total:1n}]:[{id:row.id}],
  };
  const testModule = {exports:{} as Record<string, (...args:unknown[])=>Promise<unknown>>};
  const imports: Record<string,unknown> = {
    react:{cache:(fn:unknown)=>fn}, '@/server/db':{prisma:db},
    '@/lib/blog/translation-availability':availability,
    '@/lib/utils':{parseJson:(s:string)=>JSON.parse(s)},'@/lib/faq':{parseFaqJson:()=>[]},
    '@/lib/blog/categories':{isPublicBlogCategorySlug:()=>true,blogCategoryLabel:(s:string)=>s},
    '@/lib/slug/blog-slug-map':{blogLookupCandidates:(s:string)=>[s],blogPathSlug:(_:string,s:string)=>s},
    '@/lib/slug/route-slug':{normalizeRouteSlug:(s:string)=>s},
    '@/lib/catalog/public-i18n':{isReviewRequiredText:()=>false},
    '@/lib/slug/service-slug-map':{toMasterServiceSlug:(s:string)=>s},
    '@/lib/catalog/editorial-images':{editorialImage:()=>null,editorialImageAlt:()=>''},
    '@/lib/blog/public-editorial-copy':{cleanPublicEditorialText:(s:string)=>s},
  };
  const source = fs.readFileSync('src/lib/blog/catalog.ts','utf8');
  const js = ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText;
  vm.runInNewContext(js,{module:testModule,exports:testModule.exports,require:(name:string)=>{
    assert.ok(name in imports,`Unmocked import ${name}`); return imports[name];
  }});
  const get = testModule.exports.getBlogArticleBySlug;
  const missing = await get('example','ar');
  check('empty Arabic lookup returns unavailable',()=>assert.equal(missing,null));
  const result = await get('example','en') as {availableLocales:string[]};
  check('English lookup exposes only available locales',()=>assert.equal(result.availableLocales.join(','),'en'));
  translations=[en,ar];
  const bilingual=await get('example','ar') as {availableLocales:string[]};
  check('completed Arabic becomes available',()=>assert.equal(bilingual.availableLocales.join(','),'en,ar'));
  const page=await testModule.exports.getPublishedBlogArticlesPage('en',{skip:0,take:12}) as {items:unknown[];total:number};
  check('catalog consumes query count and rows',()=>{assert.equal(page.total,1);assert.equal(page.items.length,1);assert.equal(findManyCalls,1);});
  console.log(`${checks} checks passed. MySQL execution and full framework integration remain untested.`);
}
main().catch(error=>{console.error(error);process.exitCode=1;});
