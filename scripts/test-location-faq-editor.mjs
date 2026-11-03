import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { locationFaqField } = require('../src/lib/admin/location-faq.ts');
const pair = { q: 'Where is the property?', a: 'Send the full property address.' };
const valid = JSON.stringify([pair]);
function field(raw, stored = null) { const form = new FormData(); if (raw !== undefined) form.set('faq', raw); return locationFaqField(form, 'faq', stored); }
assert.deepEqual(field(undefined, 'legacy'), { ok: true, value: undefined });
assert.deepEqual(field('legacy', 'legacy'), { ok: true, value: undefined });
assert.deepEqual(field(''), { ok: true, value: undefined });
assert.equal(field(valid).value, valid);
assert.equal(field('[]').value, '[]');
for (const raw of ['{', '{}', 'null', '[null]', '[{}]', '[{"q":1,"a":"Answer text"}]', JSON.stringify([{q:'xx',a:'Answer text'}]), JSON.stringify([{q:'Question',a:'short'}]), JSON.stringify([pair,{...pair,q:' WHERE is the property? '}]), JSON.stringify([{...pair,q:'q'.repeat(501)}]), JSON.stringify([{...pair,a:'a'.repeat(5001)}]), JSON.stringify(Array(51).fill(pair)), ' '.repeat(65537), JSON.stringify([{...pair,extra:'discarded?'}])]) assert.equal(field(raw).ok,false,raw.slice(0,70));
const repeated = new FormData(); repeated.append('faq',valid); repeated.append('faq',valid); assert.equal(locationFaqField(repeated,'faq',valid).ok,false);
const source = ts.createSourceFile('actions.ts',fs.readFileSync('src/app/admin/actions.ts','utf8'),ts.ScriptTarget.Latest,true);
const action = source.statements.find(n=>ts.isFunctionDeclaration(n)&&n.name?.text==='updateLocationAction');assert(action);
const compiled = ts.transpileModule(action.getText(source),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
function withoutFaq(row) { const copy = {...row}; delete copy.faq; return copy; }
const initial = {id:'place',slug:'dubai',status:'active',serves:true,indexable:true,translations:['en','ar'].map(locale=>({id:locale,locale,name:locale,intro:'intro',localServiceInfo:'body',propertyTypes:'types',nearbyAreas:'nearby',seoTitle:locale,metaDescription:'description',faq:'legacy '+locale}))};
async function run(overrides={}, options={}) {
 let state=structuredClone(initial), transactions=0, writes=0, audits=0;const revalidated=[]; if (options.noTranslations) state.translations=[];
 const form = new FormData(); for(const [k,v] of Object.entries({id:'place',status:'active',serves:'on',indexable:'on',...Object.fromEntries(['En','Ar'].flatMap(suffix=>{const row=initial.translations.find(t=>t.locale===suffix.toLowerCase());return ['name','intro','localServiceInfo','propertyTypes','nearbyAreas','seoTitle','metaDescription'].map(k=>[k+suffix,row[k]]);})),...overrides})) form.set(k,v);
 const out={}; const context={exports:out,LOCATION_STATUSES:['active','draft','archived'],locationFaqField,str:(f,k)=>String(f.get(k)||'').trim(),bool:(f,k)=>f.has(k),actor:async p=>{assert.equal(p,'locations');if(options.denied)throw Error('denied');return {email:'staff@example.test'};},redirect:url=>{throw Error('redirect:'+url);},adminAudit:async()=>{audits++;},revalidatePath:p=>revalidated.push(p),revalidatePublicLocation:p=>revalidated.push(p),prisma:{location:{findUnique:async()=>structuredClone(state)},$transaction:async fn=>{transactions++;const draft=structuredClone(state);await fn({location:{update:async({data})=>{writes++;Object.assign(draft,data);}},locationI18n:{update:async({where,data})=>{writes++;if(options.failArabic&&where.id==='ar')throw Error('write failed');Object.assign(draft.translations.find(t=>t.id===where.id),data);},create:async({data})=>{writes++;draft.translations.push({id:data.locale,...data});}}});state=draft;}}};
 vm.runInNewContext(compiled,context);let error;try{await out.updateLocationAction(form);}catch(e){error=e.message;}return {state,transactions,writes,audits,revalidated,error};
}
let r=await run({faqEn:valid,faqAr:'broken'});assert.equal(r.transactions,0);assert.equal(r.writes,0);assert(r.error.endsWith('faq_ar'));assert.deepEqual(r.state,initial);
r=await run({faqEn:valid,faqAr:JSON.stringify([{q:'ما الموقع؟',a:'أرسل عنوان العقار الكامل.'}])});assert.equal(r.transactions,1);assert.equal(r.audits,1);assert.equal(r.state.translations[0].faq,valid);assert(r.state.translations[1].faq.includes('عنوان'));assert.deepEqual(r.state.translations.map(withoutFaq),initial.translations.map(withoutFaq));assert.equal(r.state.status,initial.status);assert.equal(r.state.serves,true);assert.equal(r.state.indexable,true);assert(r.revalidated.includes('dubai'));
r=await run();assert.deepEqual(r.state,initial);
r=await run({faqEn:valid,faqAr:valid},{failArabic:true});assert.equal(r.error,'write failed');assert.deepEqual(r.state,initial);assert.equal(r.audits,0);assert.equal(r.revalidated.length,0);
r=await run({faqEn:valid},{denied:true});assert.equal(r.transactions,0);assert.equal(r.error,'denied');
r=await run({faqEn:valid,faqAr:valid},{noTranslations:true});assert.equal(r.transactions,1);assert.equal(r.state.translations.length,2);assert(r.state.translations.every(t=>t.faq===valid));
console.log('20 FAQ field validation/preservation cases and 6 actual-action transaction/permission cases passed.');
