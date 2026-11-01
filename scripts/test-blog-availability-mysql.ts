import assert from 'node:assert/strict';
import { performance } from 'node:perf_hooks';
import { PrismaClient, Prisma } from '@prisma/client';
import { blogPageQueries, blogTranslationAvailabilitySql, isBlogTranslationAvailable } from '../src/lib/blog/translation-availability';
import { cleanPublicEditorialText } from '../src/lib/blog/public-editorial-copy';

// Writes only connection-local TEMPORARY tables in a dedicated local test DB.
// Never point this test at Hostinger or a production database.
const raw = process.env.MYSQL_TEST_URL;
if (!raw) throw new Error('MYSQL_TEST_URL is required for isolated database validation.');
const target = new URL(raw);
if (!['127.0.0.1', 'localhost', '[::1]'].includes(target.hostname) ||
    target.pathname !== '/fixpoint_validation') {
  throw new Error('Refusing any target except local /fixpoint_validation.');
}
const db = new PrismaClient({datasources: {db: {url: raw}}});
let checks = 0;
const check = (name: string, fn: () => void) => {fn(); checks++; console.log('PASS ' + name);};

async function main() {
  const version = await db.$queryRawUnsafe<Array<{version: string}>>('SELECT VERSION() AS version');
  console.log('Database: ' + version[0].version);
  await db.$transaction(async tx => {
    await tx.$executeRawUnsafe('CREATE TEMPORARY TABLE Article (id VARCHAR(64) PRIMARY KEY, slug VARCHAR(255) NOT NULL, status VARCHAR(30) NOT NULL, indexable BOOLEAN NOT NULL, categorySlugs TEXT NOT NULL, publishedAt DATETIME NULL, updatedAt DATETIME NOT NULL) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');
    await tx.$executeRawUnsafe('CREATE TEMPORARY TABLE ArticleI18n (articleId VARCHAR(64) NOT NULL, locale VARCHAR(5) NOT NULL, title TEXT NOT NULL, body LONGTEXT NOT NULL, excerpt TEXT NOT NULL, UNIQUE KEY article_locale(articleId,locale), KEY locale_idx(locale)) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');
    const bodies = [
      '', ' \t\r\n', '\u00a0', '\ufeff', '\u3000', 'REVIEW_REQUIRED',
      'Pending review_required copy', 'Useful electrical content.', 'معلومات الأعمال الكهربائية.',
      'Unique editorial markers: internal.', 'UNIQUE EDITORIAL MARKERS: internal',
      'علامات تحريرية فريدة: داخلي.', 'علامات تحريرية فريدة: داخلي。',
      '\r\nUnique editorial markers: one.\r\n\r\nUnique editorial markers: two.',
      '\rUnique editorial markers: one.\rUseful content.',
      'Useful evidence.\n\nUnique editorial markers: internal.',
      'Unique editorial markers: one. Useful content.',
      'Unique editorial markers: one\nUseful content.',
      '\u0085Unique editorial markers: one.', '\ufeffUnique editorial markers: one.',
      'Unique editorial markers: a.\n\nعلامات تحريرية فريدة: ب.',
      'علامات تحريرية فريدة: Unique editorial markers: nested.',
      'Useful prefix. علامات تحريرية فريدة: داخلي.',
      'Réview_required is not the literal review placeholder.',
      'ReViEw_ReQuIrEd',
    ];
    const fixtures = bodies.map((body,i)=>({id:'fixture-'+String(i).padStart(3,'0'), title:'Electrical guide',body,locale:'en'}));
    fixtures.push({id:'empty-title',title:' ',body:'Useful content',locale:'en'});
    fixtures.push({id:'placeholder-title',title:'review_required',body:'Useful content',locale:'en'});
    const addArticle = (id:string,slug:string,category='["electrical"]') => tx.$executeRawUnsafe(
      "INSERT INTO Article VALUES (?,?,'published',true,?,'2026-11-01 00:00:00','2026-11-01 00:00:00')", id,slug,category);
    const addTranslation = (id:string,locale:string,title:string,body:string) => tx.$executeRawUnsafe(
      'INSERT INTO ArticleI18n VALUES (?,?,?,?,?)',id,locale,title,body,'Electrical evidence');
    for(const f of fixtures) {await addArticle(f.id,f.id);await addTranslation(f.id,f.locale,f.title,f.body);}
    const results = await tx.$queryRaw<Array<{articleId:string;available:number|bigint}>>(Prisma.sql(
      ['SELECT t.articleId, (', ') AS available FROM ArticleI18n t'],blogTranslationAvailabilitySql()));
    check('SQL and rendered-content availability agree for every fixture',()=>{
      for(const f of fixtures){
        const row=results.find(r=>r.articleId===f.id);
        assert.ok(row);assert.equal(Boolean(Number(row.available)),isBlogTranslationAvailable(f),f.id);
        if(isBlogTranslationAvailable(f)) assert.ok(cleanPublicEditorialText(f.body).trim().length);
      }
    });
    const expected=fixtures.filter(isBlogTranslationAvailable).map(f=>f.id).sort().reverse();
    const all=blogPageQueries('en',{skip:0,take:100});
    const ids=await tx.$queryRaw<Array<{id:string}>>(all.ids);
    const totals=await tx.$queryRaw<Array<{total:bigint}>>(all.count);
    check('real parameterized page and count queries agree',()=>{
      assert.equal(Number(totals[0].total),expected.length);assert.deepEqual(ids.map(r=>r.id),expected);
    });
    const page=blogPageQueries('en',{skip:1,take:2,category:'electrical',q:'Electrical'});
    const pageIds=await tx.$queryRaw<Array<{id:string}>>(page.ids);
    const pageTotal=await tx.$queryRaw<Array<{total:bigint}>>(page.count);
    check('filters and offset apply before pagination',()=>{
      assert.deepEqual(pageIds.map(r=>r.id),expected.slice(1,3));assert.equal(Number(pageTotal[0].total),expected.length);
    });
    const hostile=blogPageQueries('en',{skip:0,take:12,q:"x' OR 1=1 --"});
    const hostileIds=await tx.$queryRaw<Array<{id:string}>>(hostile.ids);
    check('search text cannot become SQL',()=>assert.equal(hostileIds.length,0));
    await addTranslation('fixture-007','ar','عنوان','');
    let ar=blogPageQueries('ar',{skip:0,take:12});
    const absent=await tx.$queryRaw<Array<{id:string}>>(ar.ids);
    check('empty Arabic locale is unavailable',()=>assert.equal(absent.length,0));
    await tx.$executeRawUnsafe("UPDATE ArticleI18n SET body=? WHERE articleId=? AND locale='ar'",'شرح أعمال الكهرباء','fixture-007');
    ar=blogPageQueries('ar',{skip:0,take:12});
    const present=await tx.$queryRaw<Array<{id:string}>>(ar.ids);
    check('completed Arabic becomes available',()=>assert.deepEqual(present.map(x=>x.id),['fixture-007']));
    const predicate=await tx.$queryRaw<Array<{locale:string}>>(Prisma.sql(
      ["SELECT t.locale FROM ArticleI18n t WHERE t.articleId='fixture-007' AND ", ''],blogTranslationAvailabilitySql()));
    check('sitemap predicate returns both usable locales',()=>assert.deepEqual(predicate.map(x=>x.locale).sort(),['ar','en']));
    const excluded=['faq-example','__restore_faq_example','__restore_blog_example','أسئلة-مثال','legacy-عربي','service-faq-example'];
    for(let i=0;i<excluded.length;i++){
      const id='excluded-'+i;
      await addArticle(id,excluded[i],i===5?'["service-faq"]':'[]');await addTranslation(id,'en','Excluded','Useful text');
    }
    const afterExclusions=await tx.$queryRaw<Array<{total:bigint}>>(all.count);
    check('existing legacy exclusions remain effective',()=>assert.equal(Number(afterExclusions[0].total),expected.length));
    const start=performance.now();
    const plan=await tx.$queryRaw(Prisma.sql(['EXPLAIN ', ''],all.ids));
    await tx.$queryRaw(all.count);
    console.log(JSON.stringify({fixtureCount:fixtures.length,explain:plan,fixtureCountQueryMs:Math.round(performance.now()-start)},(_k,v)=>typeof v==='bigint'?Number(v):v));
  },{timeout:120000,maxWait:10000});
  console.log(checks+' database checks passed. Fixture timing does not establish production-catalog performance.');
}
main().catch(error=>{console.error(error instanceof Error?error.message:'Database validation failed');process.exitCode=1;}).finally(()=>db.$disconnect());