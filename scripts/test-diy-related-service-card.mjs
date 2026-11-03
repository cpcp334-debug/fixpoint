import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { sanitizePublicServiceI18n } = require('../src/lib/catalog/public-i18n.ts');
const { pickI18n } = require('../src/lib/utils.ts');
const { serviceLookupCandidates } = require('../src/lib/slug/locale-slug.ts');
const path = 'src/app/[locale]/diy/[slug]/page.tsx';
const route = ts.createSourceFile(path,fs.readFileSync(path,'utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
let fragment;
function visit(node){
  if(ts.isJsxExpression(node) && node.expression?.getText(route).includes('<SectionHeader title={t("relatedService")}')) fragment=node.expression;
  ts.forEachChild(node,visit);
}
visit(route);assert(fragment,'Locate the actual related-service card expression');
const exports = {};
const React={createElement:(type,props,...children)=>({type,props:props||{},children})};
vm.runInNewContext(ts.transpileModule(`exports.render=(relatedService,guide)=>(${fragment.getText(route)});`,{compilerOptions:{jsx:ts.JsxEmit.React}}).outputText,{exports,React,Section:'Section',SectionHeader:'SectionHeader',ServiceCard:'ServiceCard',t:k=>k,home:k=>k});
const catalog=ts.createSourceFile('catalog.ts',fs.readFileSync('src/lib/catalog.ts','utf8'),ts.ScriptTarget.Latest,true);
const names=['pickServiceTranslation','mapPublicService','publicServiceWhere','getServiceBySlug'];
const nodes=catalog.statements.filter(n=>(ts.isFunctionDeclaration(n)&&names.includes(n.name?.text))||(ts.isVariableStatement(n)&&n.declarationList.declarations.some(d=>names.includes(d.name.getText(catalog)))));
assert.equal(nodes.length,names.length);
let row;const queries=[];const loaded={};
vm.runInNewContext(ts.transpileModule(nodes.map(n=>n.getText(catalog)).join('\n'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,{exports:loaded,cache:f=>f,serviceLookupCandidates,pickI18n,sanitizePublicServiceI18n,pagePhoto:()=>null,editorialImage:()=>null,editorialImageAlt:()=>'',prisma:{service:{findFirst:async q=>{queries.push(q);return row&&row.status===q.where.status&&row.indexable===q.where.indexable?row:null;}}}});
const en={locale:'en',name:'Post-Construction Cleaning',shortDescription:'Post-Construction Cleaning is a draft catalog offering and is not publicly offered until activated.',longDescription:'Overview'};
const ar={locale:'ar',name:'تنظيف بعد البناء',shortDescription:'وصف عربي مراجع',longDescription:'نبذة مراجعة'};
function card(node){if(!node)return null;if(node.type==='ServiceCard')return node;for(const c of node.children||[]){const found=card(c);if(found)return found;}return null;}
async function run(status,indexable,translations,locale){row={slug:'post-construction-cleaning',status,indexable,category:{slug:'cleaning',translations:[]},translations};const before=JSON.stringify(row);const service=await loaded.getServiceBySlug(row.slug,locale);const rendered=card(exports.render(service,{service:{slug:row.slug},serviceT:en}));assert.equal(JSON.stringify(row),before,'Stored rows must not mutate');return {service,rendered};}
let result=await run('active',true,[en,ar],'en');assert(result.rendered);assert(!result.rendered.props.description.includes('draft catalog'));assert.equal(result.rendered.props.description,result.service.t.shortDescription);assert.equal(result.rendered.props.slug,'post-construction-cleaning');
result=await run('active',true,[{...en,shortDescription:'Reviewed cleaning scope.'},ar],'en');assert.equal(result.rendered.props.description,'Reviewed cleaning scope.');
result=await run('active',true,[en,ar],'ar');assert.equal(result.rendered.props.name,ar.name);assert.equal(result.rendered.props.description,ar.shortDescription);
for(const [status,indexable] of [['draft',true],['inactive',true],['active',false]]){result=await run(status,indexable,[en,ar],'en');assert.equal(result.service,null);assert.equal(result.rendered,null);}
result=await run('active',true,[en],'ar');assert.equal(result.rendered,null);
row=null;assert.equal(card(exports.render(await loaded.getServiceBySlug('missing','en'),{service:{slug:'missing'},serviceT:en})),null);
assert.equal(card(exports.render(null,{service:null,serviceT:null})),null);
for(const q of queries){assert.equal(q.where.status,'active');assert.equal(q.where.indexable,true);assert.equal(q.include.translations,true);}
console.log('9 actual loader/JSX card cases passed: active seed, reviewed/Arabic copy, draft/inactive/nonindexable, absent Arabic, missing and unlinked services.');
