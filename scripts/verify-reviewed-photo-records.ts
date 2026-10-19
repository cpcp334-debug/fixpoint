/** Exact read-only record snapshots for image-only batches. No Prisma mutations. */
import './load-env-mysql';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {prisma} from '../src/server/db';
const base='C:/Users/Asus Ultra 9/Documents/Codex/Fixpoint-2026-10-19/';
const hash=(value:any)=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
async function main(){
 const batch=Number(process.argv[2]),mode=process.argv[3];
 assert(Number.isInteger(batch)&&batch>=6);assert(mode==='--backup'||mode==='--verify');
 const targets=JSON.parse(readFileSync(base+`batch${batch}-targets.json`,'utf8'));
 assert(targets.length>0&&targets.length<=20);assert.equal(new Set(targets.map((r:any)=>r.key)).size,targets.length);
 const records=[];
 for(const t of targets){let row;if(t.kind==='service')row=await prisma.service.findUnique({where:{id:t.id},include:{translations:{orderBy:{locale:'asc'}}}});else if(t.kind==='diy')row=await prisma.diyGuide.findUnique({where:{id:t.id},include:{translations:{orderBy:{locale:'asc'}}}});else if(t.kind==='location')row=await prisma.location.findUnique({where:{id:t.id},include:{translations:{orderBy:{locale:'asc'}}}});else throw Error('Only public service/DIY/location records supported');assert(row&&row.slug===t.slug);if(t.kind==='location')assert(row.status==='active'&&row.indexable&&row.serves,'Location must remain public');records.push({key:t.key,record:row});}
 const snapshot=base+`batch${batch}-database-records-before.json`;
 if(mode==='--backup'){assert(!existsSync(snapshot),'Snapshot already exists; no overwrite');writeFileSync(snapshot,JSON.stringify({checkedAt:new Date().toISOString(),readOnly:true,records},null,2),{flag:'wx'});console.log({batch,readOnly:true,backedUpRecords:records.length});return;}
 const before=JSON.parse(readFileSync(snapshot,'utf8'));assert.equal(before.records.length,records.length);const items=records.map(r=>({key:r.key,unchanged:hash(r.record)===hash(before.records.find((x:any)=>x.key===r.key)?.record)}));const report={checkedAt:new Date().toISOString(),batch,readOnly:true,pass:items.every(r=>r.unchanged),items};writeFileSync(base+`batch${batch}-database-records-verify.json`,JSON.stringify(report,null,2));console.log(report);assert(report.pass,'Concurrent record changes detected; inspect before claiming preservation');
}
main().catch(e=>{console.error(e.message);process.exitCode=1}).finally(()=>prisma.$disconnect());
