/** Local sample-only tests. No publication, database calls or network access. */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {evaluateBlogPublicationGates,type BlogGateInput} from '../src/lib/blog/publication-gates';
import {evaluateExistingBlogRepairGates,type ExistingBlogRepairEvidence} from '../src/lib/blog/existing-repair-gates';
const base='C:/Users/Asus Ultra 9/Documents/Codex/Fixpoint-2026-10-19/';
const before=JSON.parse(readFileSync(base+'arabic-electrical-batch5-selected-originals.json','utf8'))[0];
const ar=JSON.parse(readFileSync('data/arabic-electrical-batch5-20261019.json','utf8')).articles[0].ar;
const input=(slug:string):BlogGateInput=>({slug,status:'published',indexable:true,heroImage:'/media/editorial/photos-20261019/blog-appliance-isolator-musaffah.webp',en:before.translations.find((x:any)=>x.locale==='en'),ar:structuredClone(ar)});
const evidence=(slug:string):ExistingBlogRepairEvidence=>{const url='https://fixpoint.ae/ar/blog/'+encodeURIComponent(slug);return{articleId:'SAMPLE_ONLY_EXISTING_RECORD',previousStatus:'published',previousIndexable:true,originalPublishedAt:'2026-09-01T00:00:00.000Z',originalPublicUrl:url,proposedPublicUrl:url,observedFinalUrl:url,canonicalUrl:url,observedStatus:200,checkedAt:new Date().toISOString()};};
const legacy='sample-only-existing-latin-route',native='مثال-اختبار-فقط';
const checks:string[]=[];const test=(name:string,fn:()=>void)=>{fn();checks.push(name);};
const rejectEvidence=(patch:Partial<ExistingBlogRepairEvidence>)=>assert.equal(evaluateExistingBlogRepairGates(input(legacy),{...evidence(legacy),...patch}).pass,false);
test('New publication still rejects Latin Arabic-route slug',()=>{const r=evaluateBlogPublicationGates(input(legacy));assert(!r.pass&&r.failures.includes('slug_not_arabic'));});
test('Standard Arabic publication gate still accepts complete native sample',()=>assert(evaluateBlogPublicationGates(input(native)).pass));
test('Existing stable legacy URL retained with explicit raw failure evidence',()=>{const r=evaluateExistingBlogRepairGates(input(legacy),evidence(legacy));assert(r.pass&&r.legacyUrlPreserved&&r.existingUrlEvidenceConsistent);assert.deepEqual(r.rawPublicationFailures,['slug_not_arabic']);});
test('Existing native URL needs no legacy exception',()=>{const r=evaluateExistingBlogRepairGates(input(native),evidence(native));assert(r.pass&&!r.legacyUrlPreserved);});
test('Draft record cannot use existing-publication path',()=>rejectEvidence({previousStatus:'draft'}));
test('Nonindexable old record rejected',()=>rejectEvidence({previousIndexable:false}));
test('Missing record identity rejected',()=>rejectEvidence({articleId:''}));
test('Stale public observation rejected',()=>rejectEvidence({checkedAt:new Date(Date.now()-90_000_000).toISOString()}));
test('Future observation rejected',()=>rejectEvidence({checkedAt:new Date(Date.now()+600_000).toISOString()}));
test('Missing original publication date rejected',()=>rejectEvidence({originalPublishedAt:null}));
test('Publication after observation rejected',()=>rejectEvidence({originalPublishedAt:new Date(Date.now()+1000).toISOString()}));
test('Other domain rejected',()=>rejectEvidence({originalPublicUrl:'https://example.com/ar/blog/'+legacy}));
test('English route rejected',()=>rejectEvidence({originalPublicUrl:'https://fixpoint.ae/en/blog/'+legacy}));
test('Changed proposed URL rejected',()=>rejectEvidence({proposedPublicUrl:evidence(legacy).proposedPublicUrl+'-new'}));
test('Redirected final URL rejected',()=>rejectEvidence({observedFinalUrl:evidence(legacy).observedFinalUrl+'-new'}));
test('Changed canonical rejected',()=>rejectEvidence({canonicalUrl:evidence(legacy).canonicalUrl+'-new'}));
test('Non-200 public observation rejected',()=>rejectEvidence({observedStatus:404}));
test('Different input slug rejected',()=>assert(!evaluateExistingBlogRepairGates(input('other'),evidence(legacy)).pass));
test('Current draft or nonindexable state rejected',()=>{const i=input(legacy);i.status='draft';assert(!evaluateExistingBlogRepairGates(i,evidence(legacy)).pass);i.status='published';i.indexable=false;assert(!evaluateExistingBlogRepairGates(i,evidence(legacy)).pass);});
for(const [name,change,failure] of [
 ['FAQ still required',(i:BlogGateInput)=>{i.ar.faq='[]';},'faq_ar'],
 ['Arabic word floor retained',(i:BlogGateInput)=>{i.ar.body='## ما هو الاختبار؟\n\nهذا نص قصير للاختبار فقط.';},'ar_words_'],
 ['Unsupported English claims still rejected',(i:BlogGateInput)=>{i.en={...i.en,title:'Best sample service'};},'unsupported_claims'],
 ['Arabic placeholders still rejected',(i:BlogGateInput)=>{i.ar.title='REVIEW_REQUIRED';},'ar_review_required'],
 ['Arabic body cannot fall back to English',(i:BlogGateInput)=>{i.ar.body='Sample only. '.repeat(1100);},'ar_body_not_arabic'],
 ['Unsafe external cover still rejected',(i:BlogGateInput)=>{i.heroImage='https://example.com/image.webp';},'image_webp'],
] as const)test(name,()=>{const i=input(legacy);change(i);const r=evaluateExistingBlogRepairGates(i,evidence(legacy));assert(!r.pass&&r.failures.some(f=>f.startsWith(failure)));});
const report={checkedAt:new Date().toISOString(),sampleDataOnly:true,networkOrDatabaseWrites:false,passed:checks.length,failed:0,checks};writeFileSync(base+'existing-blog-repair-gates-tests.json',JSON.stringify(report,null,2));console.log(report);
