import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
const source=readFileSync(new URL('../src/lib/catalog/category-child-copy.ts',import.meta.url),'utf8');
const exp={};new Function('exports',ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText)(exp);
const copy=exp.categoryChildCopy;let checks=0;
const eq=(a,b)=>{assert.deepEqual(a,b);checks++;};
for(const [slug,before,after,description,result] of [
 ['refrigerator-freezing-problem','الثلاجة','مشكلة تجميد الثلاجة','الثلاجة يقيّم الحالة ويوصي بالخطوة التالية.','اذكر مشكلة التجميد التي تلاحظها في الثلاجة ليُراجع الفريق الحالة قبل تأكيد النطاق وعرض السعر.'],
 ['refrigerator-ice-formation-problem','الثلاجة','مشكلة تكوّن الثلج في الثلاجة','الثلاجة يقيّم الحالة ويوصي بالخطوة التالية.','اذكر موضع تكوّن الثلج في الثلاجة وما تلاحظه ليُراجع الفريق الحالة قبل تأكيد النطاق وعرض السعر.'],
]){
 const input={name:before,description}; const snapshot={...input};
 eq(copy('refrigerator','ar',slug,input),{name:after,description:result});eq(input,snapshot);
 eq(copy('refrigerator','ar',slug,{name:before,description:'وصف مراجع مستقل'}),{name:after,description:'وصف مراجع مستقل'});
 eq(copy('refrigerator','ar',slug,{name:'اسم مراجع',description}),{name:'اسم مراجع',description});
 for(const [category,locale,id] of [['cleaning','ar',slug],['refrigerator','en',slug],['refrigerator','ar','unknown']])eq(copy(category,locale,id,input),input);
 eq(copy('refrigerator','ar',slug,{name:before,description:before+' وصف آخر'}),{name:after,description:after+' وصف آخر'});
}
// Existing category corrections must still use their established prefix behavior.
eq(copy('general-maintenance','ar','door-repair-and-adjustment',{name:'إصلاح الباب',description:'إصلاح الباب وصف'}),{name:'إصلاح الأبواب وضبطها',description:'إصلاح الأبواب وضبطها وصف'});
eq(copy('plumbing','ar','running-toilet-repair',{name:'إصلاح المرحاض',description:'وصف مستقل'}),{name:'إصلاح تدفق مياه المرحاض المستمر',description:'وصف مستقل'});
for(const slug of ['refrigerator-cooling-problem','refrigerator-compressor-inspection']){
 const original={name:'الثلاجة',description:'الثلاجة يقيّم الحالة ويوصي بالخطوة التالية.'};
 eq(copy('refrigerator','ar',slug,original),original);
}
console.log(`${checks} Refrigerator card guard assertions passed`);
