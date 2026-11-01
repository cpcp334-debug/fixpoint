import assert from 'node:assert/strict';
import {assertNoPriorImageApply,writeImageOnlyPair,assertImageOnlyResult} from './lib/blog-image-only-guards';
// Clearly labelled in-memory sample database. No live calls or records.
const at=new Date('2026-11-01T00:00:00.000Z');
const before=[1,2].map(n=>({id:'SAMPLE_ONLY_'+n,slug:'sample-only-'+n,status:'published',indexable:true,publishedAt:'2026-01-01T00:00:00.000Z',createdAt:'2026-01-01T00:00:00.000Z',updatedAt:'2026-01-02T00:00:00.000Z',heroImage:'/sample-old.webp',translations:[{locale:'ar',body:'مثال اختباري فقط'},{locale:'en',body:'SAMPLE ONLY'}]}));
const jobs=before.map((r,i)=>({kind:'blog',key:'blog:'+r.slug,slug:r.slug,output:'/media/editorial/photos-test/sample-'+i+'.webp',prompt:'SAMPLE',review:'SAMPLE',reviewedAt:at.toISOString()}));
async function transaction(state:any[],failSecond=false){const working=structuredClone(state);let writes=0;const tx={article:{findUnique:async({where}:any)=>structuredClone(working.find(x=>x.id===where.id)),updateMany:async({where,data}:any)=>{writes++;if(failSecond&&writes===2)return{count:0};const row=working.find(x=>Object.entries(where).every(([k,v])=>JSON.stringify(x[k])===JSON.stringify(v)));if(!row)return{count:0};Object.assign(row,data);return{count:1};}}};await writeImageOnlyPair(tx,before,jobs,at);state.splice(0,state.length,...working);}
(async()=>{let passed=0;assertNoPriorImageApply(false,false);passed++;for(const [r,i]of [[true,false],[false,true],[true,true]]){assert.throws(()=>assertNoPriorImageApply(r,i));passed++;}
 const good=structuredClone(before);await transaction(good);for(let i=0;i<2;i++)assertImageOnlyResult(before[i],good[i],jobs[i].output,at.toISOString());passed++;
 await assert.rejects(()=>transaction(good),/changed after backup/);passed++;
 const rollback=structuredClone(before);await assert.rejects(()=>transaction(rollback,true),/Concurrent article edit/);assert.deepEqual(rollback,before);passed++;
 const concurrent=structuredClone(before);concurrent[0].translations[0].body='SAMPLE CONCURRENT EDIT';const saved=structuredClone(concurrent);await assert.rejects(()=>transaction(concurrent),/changed after backup/);assert.deepEqual(concurrent,saved);passed++;
 console.log({passed,failed:0,sampleOnly:true,scope:'Receipt/intent guards, two-record image-only success, repeated apply rejected, second-record CAS failure rolls back pair, concurrent text edit preserved; mocked transaction only, no live DB'});
})().catch(e=>{console.error(e);process.exitCode=1});
