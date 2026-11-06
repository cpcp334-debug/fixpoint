import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
const source=readFileSync(new URL('../src/lib/catalog/category-child-copy.ts',import.meta.url),'utf8');
const exp={};new Function('exports',ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText)(exp);
const copy=exp.categoryChildCopy;let checks=0;
const eq=(a,b)=>{assert.deepEqual(a,b);checks++;};
for(const [slug,before,after,description,result] of [
 ['preventive-building-maintenance','صيانة الوقائية المبنى','الصيانة الوقائية للمباني','صيانة الوقائية المبنى يشمل العناية والفحص للعطل الظاهر.','تُراجع متطلبات الصيانة الوقائية للمباني قبل تأكيد النطاق وعرض السعر.'],
 ['minor-building-repairs','البسيطة المبنى','إصلاحات بسيطة للمباني','البسيطة المبنى يقيّم الحالة ويوصي بالخطوة التالية.','تُراجع متطلبات الإصلاحات البسيطة للمباني قبل تأكيد النطاق وعرض السعر.'],
]){
 const input={name:before,description}; const snapshot={...input};
 eq(copy('general-maintenance','ar',slug,input),{name:after,description:result});eq(input,snapshot);
 eq(copy('general-maintenance','ar',slug,{name:before,description:'وصف مراجع مستقل'}),{name:after,description:'وصف مراجع مستقل'});
 eq(copy('general-maintenance','ar',slug,{name:'اسم مراجع',description}),{name:'اسم مراجع',description});
 for(const [category,locale,id] of [['cleaning','ar',slug],['general-maintenance','en',slug],['general-maintenance','ar','unknown']])eq(copy(category,locale,id,input),input);
 eq(copy('general-maintenance','ar',slug,{name:before,description:before+' وصف آخر'}),{name:after,description:after+' وصف آخر'});
}
// Existing category corrections must still use their established prefix behavior.
eq(copy('general-maintenance','ar','door-repair-and-adjustment',{name:'إصلاح الباب',description:'إصلاح الباب وصف'}),{name:'إصلاح الأبواب وضبطها',description:'إصلاح الأبواب وضبطها وصف'});
eq(copy('plumbing','ar','running-toilet-repair',{name:'إصلاح المرحاض',description:'وصف مستقل'}),{name:'إصلاح تدفق مياه المرحاض المستمر',description:'وصف مستقل'});
console.log(`${checks} maintenance card guard assertions passed`);
