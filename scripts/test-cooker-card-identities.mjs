import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
const source=readFileSync(new URL('../src/lib/catalog/category-child-copy.ts',import.meta.url),'utf8');
const exp={};new Function('exports',ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText)(exp);
const copy=exp.categoryChildCopy;let checks=0;
const eq=(a,b)=>{assert.deepEqual(a,b);checks++;};
const before='إصلاح الموقد',description='إصلاح الموقد يصلح العطل بعد تحديده.';
for(const [slug,after,result] of [
 ['cooker-igniter-repair','إصلاح قداحة الموقد','اذكر المشكلة التي تلاحظها في قداحة الموقد ونوع الجهاز، ليُراجع الفريق النطاق والتوفر قبل عرض السعر.'],
 ['electric-cooker-repair','إصلاح الموقد الكهربائي','اذكر العطل الذي تلاحظه في الموقد الكهربائي ونوع الجهاز، ليُراجع الفريق الحالة قبل تأكيد النطاق وعرض السعر.'],
]){
 const input=Object.freeze({name:before,description});
 const output={name:after,description:result};
 eq(copy('burner-cooker','ar',slug,input),output);
 eq(copy('burner-cooker','ar',slug,output),output);
 eq(copy('burner-cooker','ar',slug,{name:before,description:'وصف مراجع مستقل'}),{name:after,description:'وصف مراجع مستقل'});
 const reviewed={name:'اسم مراجع',description};eq(copy('burner-cooker','ar',slug,reviewed),reviewed);
 for(const [category,locale,id] of [['cleaning','ar',slug],['burner-cooker','en',slug],['burner-cooker','fr',slug],['burner-cooker','ar','unknown']])eq(copy(category,locale,id,input),input);
 eq(copy('burner-cooker','ar',slug,{name:before,description:before+' وصف آخر'}),{name:after,description:after+' وصف آخر'});
}
console.log(`${checks} Cooker card guard assertions passed`);
