import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
const source=readFileSync(new URL('../src/lib/catalog/category-child-copy.ts',import.meta.url),'utf8');
const exp={};new Function('exports',ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText)(exp);
const copy=exp.categoryChildCopy;let checks=0;
const eq=(a,b)=>{assert.deepEqual(a,b);checks++;};
for(const [slug,before,after,description,result] of [
 ['washing-machine-not-starting','الغسيل الآلة','مشكلة عدم تشغيل الغسالة','الغسيل الآلة يقيّم الحالة ويوصي بالخطوة التالية.','اذكر ما يحدث عند محاولة تشغيل الغسالة ليُراجع الفريق الحالة قبل تأكيد النطاق وعرض السعر.'],
 ['washing-machine-not-spinning','الغسيل الآلة','مشكلة عدم عصر الغسالة','الغسيل الآلة يقيّم الحالة ويوصي بالخطوة التالية.','اذكر ما يحدث أثناء مرحلة العصر في الغسالة ليُراجع الفريق الحالة قبل تأكيد النطاق وعرض السعر.'],
]){
 const input={name:before,description}; const snapshot={...input};
 eq(copy('washing-machine','ar',slug,input),{name:after,description:result});eq(input,snapshot);
 eq(copy('washing-machine','ar',slug,{name:before,description:'وصف مراجع مستقل'}),{name:after,description:'وصف مراجع مستقل'});
 eq(copy('washing-machine','ar',slug,{name:'اسم مراجع',description}),{name:'اسم مراجع',description});
 for(const [category,locale,id] of [['cleaning','ar',slug],['washing-machine','en',slug],['washing-machine','ar','unknown']])eq(copy(category,locale,id,input),input);
 eq(copy('washing-machine','ar',slug,{name:before,description:before+' وصف آخر'}),{name:after,description:after+' وصف آخر'});
}
// Existing category corrections must still use their established prefix behavior.
eq(copy('general-maintenance','ar','door-repair-and-adjustment',{name:'إصلاح الباب',description:'إصلاح الباب وصف'}),{name:'إصلاح الأبواب وضبطها',description:'إصلاح الأبواب وضبطها وصف'});
eq(copy('plumbing','ar','running-toilet-repair',{name:'إصلاح المرحاض',description:'وصف مستقل'}),{name:'إصلاح تدفق مياه المرحاض المستمر',description:'وصف مستقل'});
for(const slug of ['washing-machine-excessive-noise','washing-machine-vibration-problem']){
 const original={name:'الغسيل الآلة',description:'الغسيل الآلة يقيّم الحالة ويوصي بالخطوة التالية.'};
 eq(copy('washing-machine','ar',slug,original),original);
}
console.log(`${checks} Washing Machine card guard assertions passed`);
