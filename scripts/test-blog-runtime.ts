import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { PrismaClient } from '@prisma/client';

const url=new URL(process.env.DATABASE_URL??'');
if(process.env.CI!=='true'||!['localhost','127.0.0.1'].includes(url.hostname)||url.pathname!=='/fixpoint_validation')throw Error('Isolated CI database required');
const db=new PrismaClient();
const slug='validation-electrical-language';
async function seed(){
 // More than one page is required to test pagination without page-number clamping.
 for(let n=0;n<13;n++)await db.article.create({data:{id:'pagination-'+n,slug:'pagination-electrical-'+n,status:'published',indexable:true,publishedAt:new Date(),categorySlugs:'["electrical"]',translations:{create:[{locale:'en',title:'Electrical pagination '+n,body:'Useful electrical scope and handover planning.',seoTitle:'Electrical pagination '+n,metaDescription:'Pagination fixture.'},{locale:'ar',title:'دليل كهربائي '+n,body:'محتوى كهربائي للمراجعة والتسليم.',seoTitle:'دليل كهربائي '+n,metaDescription:'وصف دليل كهربائي.'}]}}});
 await db.article.create({data:{id:slug,slug,status:'published',indexable:true,publishedAt:new Date(),categorySlugs:'["electrical"]',
 translations:{create:[
 {locale:'en',title:'Electrical validation article',body:'A complete electrical scope needs drawings and an agreed handover plan.',seoTitle:'Electrical validation article',metaDescription:'Isolated test of English article availability.'},
 {locale:'ar',title:'',body:'',seoTitle:'',metaDescription:''}
 ]}}});
}
async function smoke(){
 const server=spawn(process.execPath,['node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port','3100'],{stdio:'inherit',env:process.env});
 const base='http://127.0.0.1:3100';
 const get=async(path:string,bot=false)=>{
  const r=await fetch(base+path,{signal:AbortSignal.timeout(30000),headers:bot?{'User-Agent':'Googlebot'}:{}});
  return {status:r.status,html:await r.text()};
 };
 try{
  let ready=false;
  for(let attempt=0;attempt<60;attempt++){
   try{await get('/api/locale-path?path=/&locale=en');ready=true;break;}catch{await new Promise(r=>setTimeout(r,500));}
  }
  assert.ok(ready,'Next production server must start');
  const english=await get('/en/blog/'+slug);
  assert.equal(english.status,200);assert.match(english.html,/<h1[^>]*>Electrical validation article<\/h1>/);
  const languageLinks=english.html.match(/<link[^>]*hrefLang[^>]*>/gi)||[];
  assert.ok(languageLinks.some(tag=>/hrefLang="en"/i.test(tag)));
  assert.ok(!languageLinks.some(tag=>/hrefLang="ar"/i.test(tag)));
  console.log('PASS production English rendering and available-language metadata');
  for(const bot of [false,true]){
   const arabic=await get('/ar/blog/'+slug,bot);
   assert.ok([200,404].includes(arabic.status),'Unavailable page must not fail with 500');
   assert.match(arabic.html,/<meta[^>]*name="robots"[^>]*content="[^"]*noindex/i);
   assert.ok(!arabic.html.includes('class="prose-article"'));
   console.log(JSON.stringify({check:'unavailable Arabic response',bot,status:arabic.status,noindex:true}));
  }
  const api=await get('/api/locale-path?path=%2Fblog%2F'+slug+'&locale=ar');
  assert.deepEqual(JSON.parse(api.html),{href:'/blog',available:false});
  console.log('PASS production locale API excludes unavailable Arabic');
  const availableApi=await get('/api/locale-path?path=%2Fblog%2Fpagination-electrical-0&locale=ar');
  assert.deepEqual(JSON.parse(availableApi.html),{href:'/blog/pagination-electrical-0',available:true});
  const availableArabic=await get('/ar/blog/pagination-electrical-0');
  assert.equal(availableArabic.status,200);assert.ok(availableArabic.html.includes('class="prose-article"'));
  console.log('PASS completed Arabic remains available');
  const listing=await get('/en/blog?page=2');
  assert.equal(listing.status,200);
  const canonical=listing.html.match(/<link[^>]*rel="canonical"[^>]*href="([^"]+)"/)?.[1];
  assert.equal(canonical,'https://fixpoint.ae/en/blog?page=2');
  console.log('PASS page-2 canonical preserved');
  let hash=2166136261;
  for(const c of 'article:'+slug){hash^=c.charCodeAt(0);hash=Math.imul(hash,16777619);}
  const shard=(hash>>>0)%64;
  const sitemap=await get('/sitemap/'+shard+'.xml');
  assert.equal(sitemap.status,200);
  assert.ok(sitemap.html.includes('/en/blog/'+slug));assert.ok(!sitemap.html.includes('/ar/blog/'+slug));
  console.log('PASS production sitemap includes only available translation');
 }finally{server.kill('SIGTERM');}
}
(async()=>{if(process.argv.includes('--seed'))await seed();else await smoke();})().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>db.$disconnect());