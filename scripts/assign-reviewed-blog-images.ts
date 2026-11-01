/** Image-only existing-blog workflow. No body/translation writes, outreach or discovery. */
import './load-env-mysql';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import sharp from 'sharp';
import {prisma} from '../src/server/db';
import {blogPathSlug} from '../src/lib/slug/blog-slug-map';
import {assertImagePair,assertUnchangedBlog,assertImageOnlyResult,assertNoPriorImageApply,writeImageOnlyPair} from './lib/blog-image-only-guards';
const base='C:/Users/Asus Ultra 9/Documents/Codex/Fixpoint-2026-10-19/';
const json=(p:string)=>JSON.parse(readFileSync(p,'utf8'));
const digest=(x:Buffer)=>createHash('sha256').update(x).digest('hex');
const include={translations:{orderBy:{locale:'asc' as const}}};
async function publicPage(url:string){const r=await fetch(url,{signal:AbortSignal.timeout(25000)}),h=await r.text();return{url,final:r.url,status:r.status,title:h.match(/<title>(.*?)<\/title>/s)?.[1],canonical:h.match(/<link[^>]*rel="canonical"[^>]*href="([^"]+)"/)?.[1]};}
async function main(){
 const batch=Number(process.argv[2]),mode=process.argv[3];assert(Number.isInteger(batch)&&batch>=250);assert(['--backup','--validate','--apply','--verify'].includes(mode));
 const jobs=json(`data/editorial-photos-batch${batch}-provenance.json`);assertImagePair(jobs);
 const stem=base+`batch${batch}-blog-image-`,originalFile=stem+'originals.json',receiptFile=stem+'apply-result.json',intentFile=stem+'apply-intent.json',baselineFile=base+`batch${batch}-before-http.json`;
 const current=await prisma.article.findMany({where:{slug:{in:jobs.map((x:any)=>x.slug)}},include,orderBy:{slug:'asc'}});assert.equal(current.length,2);const plain=JSON.parse(JSON.stringify(current));
 for(const j of jobs){const raw=readFileSync('public'+j.output),m=await sharp(raw).metadata();assert(m.format==='webp'&&(m.width||0)>=1200&&(m.height||0)>=800);assert(plain.some((r:any)=>r.slug===j.slug));}
 if(mode==='--backup'){
  assert(!existsSync(originalFile)&&!existsSync(baselineFile),'Refusing to overwrite evidence');const pages=[];
  for(const row of plain){assertUnchangedBlog(row,row);const j=jobs.find((x:any)=>x.slug===row.slug);for(const locale of ['en','ar']){const url='https://fixpoint.ae/'+locale+'/blog/'+blogPathSlug(locale,row.slug),p=await publicPage(url);assert(p.status===200&&p.final===url&&p.title&&p.canonical,'Stable public URL required');pages.push({...p,key:'blog:'+row.slug,slug:row.slug,locale,image:j.output,originalPublishedAt:row.publishedAt});}}
  writeFileSync(originalFile,JSON.stringify({checkedAt:new Date().toISOString(),readOnlyDatabase:true,records:plain},null,2),{flag:'wx'});writeFileSync(baselineFile,JSON.stringify(pages,null,2),{flag:'wx'});console.log({batch,mode,backedUpFullRecords:2,publicUrls:4,databaseWrites:0});return;
 }
 const before=json(originalFile).records;assert.equal(before.length,2);for(const old of before)assert(jobs.some((j:any)=>j.slug===old.slug));
 if(mode==='--verify'){
  const receipt=json(receiptFile);assert.equal(receipt.batch,batch);assert.equal(receipt.updatedRecords,2);
  for(const old of before){const j=jobs.find((x:any)=>x.slug===old.slug),now=plain.find((x:any)=>x.id===old.id);assertImageOnlyResult(old,now,j.output,receipt.changedAt);}
  const report={batch,checkedAt:new Date().toISOString(),mode,pass:true,verifiedFullRecords:2,englishAndArabicUnchanged:true,originalDatesStatusIdsAndSlugsUnchanged:true,scope:'Only heroImage and updatedAt differ from immutable full-record backups'};writeFileSync(stem+'verify-result.json',JSON.stringify(report,null,2));console.log(report);return;
 }
 for(const old of before)assertUnchangedBlog(old,plain.find((x:any)=>x.id===old.id));
 const baseline=json(baselineFile);assert.equal(baseline.length,4);for(const p of baseline){const now=await publicPage(p.url);assert(now.status===200&&now.final===p.final&&now.title===p.title&&now.canonical===p.canonical,'Public metadata changed after backup');}
 const validation={batch,checkedAt:new Date().toISOString(),mode,pass:true,fullRecordsUnchanged:2,publicUrlsUnchanged:4,textChangesProposed:0};
 if(mode==='--validate'){writeFileSync(stem+'validate-result.json',JSON.stringify(validation,null,2));console.log(validation);return;}
 assertNoPriorImageApply(existsSync(receiptFile),existsSync(intentFile));
 for(const j of jobs){const r=await fetch('https://fixpoint.ae'+j.output,{signal:AbortSignal.timeout(25000)});assert(r.status===200&&r.headers.get('content-type')?.startsWith('image/'),'Publish reviewed assets first');assert.equal(digest(Buffer.from(await r.arrayBuffer())),digest(readFileSync('public'+j.output)),'Live asset bytes differ from reviewed local image');}
 const changedAt=new Date();writeFileSync(intentFile,JSON.stringify({batch,changedAt:changedAt.toISOString(),scope:'Exactly two heroImage/updatedAt changes; no translation writes',ids:before.map((x:any)=>x.id)},null,2),{flag:'wx'});
 await prisma.$transaction(tx=>writeImageOnlyPair(tx,before,jobs,changedAt),{timeout:30000});
 const receipt={...validation,changedAt:changedAt.toISOString(),updatedRecords:2,result:'Exactly two existing cover images assigned; all translation bodies, original publication dates, IDs, slugs, status and indexability retained'};writeFileSync(receiptFile,JSON.stringify(receipt,null,2),{flag:'wx'});console.log(receipt);
}
main().catch(e=>{console.error(e.message);process.exitCode=1}).finally(()=>prisma.$disconnect());
