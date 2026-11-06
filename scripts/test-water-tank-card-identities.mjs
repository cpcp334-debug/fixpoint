import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
const source=readFileSync(new URL('../src/lib/catalog/category-child-copy.ts',import.meta.url),'utf8');
const exp={};new Function('exports',ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText)(exp);
const copy=exp.categoryChildCopy;let checks=0;
const eq=(a,b)=>{assert.deepEqual(a,b);checks++;};
for(const [slug,before,after,description,result] of [
 ['water-tank-cover-repair','إصلاح المياه الخزان','إصلاح غطاء خزان المياه','إصلاح المياه الخزان يصلح العطل بعد تحديده.','تُراجع مشكلة غطاء خزان المياه قبل تأكيد النطاق وعرض السعر.'],
 ['water-tank-valve-repair','إصلاح المياه الخزان','إصلاح صمام خزان المياه','إصلاح المياه الخزان يصلح العطل بعد تحديده.','تُراجع مشكلة صمام خزان المياه قبل تأكيد النطاق وعرض السعر.'],
]){
 const input={name:before,description}; const snapshot={...input};
 eq(copy('water-tank','ar',slug,input),{name:after,description:result});eq(input,snapshot);
 eq(copy('water-tank','ar',slug,{name:before,description:'وصف مراجع مستقل'}),{name:after,description:'وصف مراجع مستقل'});
 eq(copy('water-tank','ar',slug,{name:'اسم مراجع',description}),{name:'اسم مراجع',description});
 for(const [category,locale,id] of [['cleaning','ar',slug],['water-tank','en',slug],['water-tank','ar','unknown']])eq(copy(category,locale,id,input),input);
 eq(copy('water-tank','ar',slug,{name:before,description:before+' وصف آخر'}),{name:after,description:after+' وصف آخر'});
}
// Existing category corrections must still use their established prefix behavior.
eq(copy('general-maintenance','ar','door-repair-and-adjustment',{name:'إصلاح الباب',description:'إصلاح الباب وصف'}),{name:'إصلاح الأبواب وضبطها',description:'إصلاح الأبواب وضبطها وصف'});
eq(copy('plumbing','ar','running-toilet-repair',{name:'إصلاح المرحاض',description:'وصف مستقل'}),{name:'إصلاح تدفق مياه المرحاض المستمر',description:'وصف مستقل'});
for(const slug of ['float-valve-repair','water-tank-disinfection']){
 const original={name:'إصلاح المياه الخزان',description:'إصلاح المياه الخزان يصلح العطل بعد تحديده.'};
 eq(copy('water-tank','ar',slug,original),original);
}
console.log(`${checks} Water Tank card guard assertions passed`);
