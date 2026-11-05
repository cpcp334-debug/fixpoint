import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
const source=readFileSync(new URL('../src/lib/catalog/category-child-copy.ts',import.meta.url),'utf8');
const exp={};new Function('exports',ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText)(exp);
const copy=exp.categoryChildCopy;let checks=0;
const eq=(a,b)=>{assert.deepEqual(a,b);checks++;};
const cases=[['cleaning','residential-cleaning','تنظيف السكني','تنظيف العقارات السكنية'],['cleaning','commercial-cleaning','تنظيف التجاري','التنظيف التجاري'],['cleaning','building-common-area-cleaning','تنظيف المبنى المشتركة','تنظيف المناطق المشتركة في المباني'],['general-maintenance','door-repair-and-adjustment','إصلاح الباب','إصلاح الأبواب وضبطها'],['general-maintenance','door-hardware-replacement','استبدال الباب','استبدال ملحقات الأبواب']];
for(const [category,slug,before,after] of cases){
 eq(copy(category,'ar',slug,{name:before,description:before+' ينظّف ما تذكره في الطلب.'}),{name:after,description:after+' ينظّف ما تذكره في الطلب.'});
 const reviewed={name:'صياغة مراجعة',description:'وصف مستقل'};eq(copy(category,'ar',slug,reviewed),reviewed);
 eq(copy(category,'ar',slug,{name:before,description:'وصف مستقل'}),{name:after,description:'وصف مستقل'});
 for(const [cat,locale,id] of [['unrelated','ar',slug],[category,'en',slug],[category,'ar','unknown']]){const original={name:before,description:before+' وصف'};eq(copy(cat,locale,id,original),original);}
}
// Exercise every existing mapping, so new Cleaning entries cannot displace prior categories.
for(const table of source.matchAll(/const (\w+)Names:[\s\S]*?= \{([\s\S]*?)\n};/g)){
 for(const row of table[2].matchAll(/"([^"]+)": \{ before: "([^"]+)", after: "([^"]+)" }/g)){
  eq(copy(table[1]==='generalMaintenance'?'general-maintenance':table[1],'ar',row[1],{name:row[2],description:row[2]+' وصف'}),{name:row[3],description:row[3]+' وصف'});
 }
}
console.log(`${checks} category identity assertions passed`);
