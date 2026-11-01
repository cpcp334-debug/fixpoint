/** Full read-only snapshots for hubs; source-managed sections are not database records. */
import './load-env-mysql';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {prisma} from '../src/server/db';
import {reviewedHubSourceScope} from './lib/reviewed-hub-source-scope';
const base='C:/Users/Asus Ultra 9/Documents/Codex/Fixpoint-2026-10-19/';
const hash=(x:unknown)=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
async function main(){
 const batch=Number(process.argv[2]),mode=process.argv[3];assert(Number.isInteger(batch)&&batch>=6);assert(mode==='--backup'||mode==='--verify');
 const targets=JSON.parse(readFileSync(base+`batch${batch}-targets.json`,'utf8'));assert(targets.length>0&&targets.length<=20);assert.equal(new Set(targets.map((t:any)=>t.key)).size,targets.length);
 const records=[];for(const t of targets){
  assert.equal(t.key,t.kind+':'+t.slug);
  const files=reviewedHubSourceScope(t.kind,t.slug),sources=Object.fromEntries(files.map(file=>[file,readFileSync(file,'utf8').replace(/\r\n/g,'\n')]));
  let databaseRecord=null;
  if(t.kind==='diy-category'){assert(t.id);databaseRecord=await prisma.diyCategory.findUnique({where:{id:t.id},include:{translations:{orderBy:{locale:'asc'}}}});assert(databaseRecord&&databaseRecord.slug===t.slug&&databaseRecord.status==='published'&&databaseRecord.indexable);}
  records.push({key:t.key,kind:t.kind,sources,databaseRecord});
 }
 const snapshot=base+`batch${batch}-hub-records-before.json`;
 if(mode==='--backup'){assert(!existsSync(snapshot),'Refusing to overwrite backup');writeFileSync(snapshot,JSON.stringify({checkedAt:new Date().toISOString(),readOnly:true,records},null,2),{flag:'wx'});console.log({batch,sourceManagedHubs:records.filter(r=>!r.databaseRecord).length,databaseCategoryRecords:records.filter(r=>!!r.databaseRecord).length,readOnly:true});return;}
 const before=JSON.parse(readFileSync(snapshot,'utf8'));assert.equal(before.records.length,records.length);const items=records.map(r=>({key:r.key,unchanged:hash(r)===hash(before.records.find((x:any)=>x.key===r.key))}));const out={batch,checkedAt:new Date().toISOString(),readOnly:true,pass:items.every(x=>x.unchanged),items};writeFileSync(base+`batch${batch}-hub-records-verify.json`,JSON.stringify(out,null,2));console.log(out);assert(out.pass,'Hub sources or category record changed');
}
main().catch(e=>{console.error(e.message);process.exitCode=1}).finally(()=>prisma.$disconnect());
