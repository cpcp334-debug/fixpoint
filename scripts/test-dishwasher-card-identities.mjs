import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
const source=readFileSync(new URL('../src/lib/catalog/category-child-copy.ts',import.meta.url),'utf8');
const exp={};new Function('exports',ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText)(exp);
const copy=exp.categoryChildCopy;let checks=0;
const eq=(a,b)=>{assert.deepEqual(a,b);checks++;};
const before='تنظيف غسالة الصحون',description='تنظيف غسالة الصحون ينظّف ما تذكره في الطلب.';
for(const [slug,after,result] of [
 ['dishwasher-not-cleaning-properly','ضعف تنظيف غسالة الصحون','اذكر ما تلاحظه من ضعف تنظيف الصحون ليُراجع الفريق المشكلة قبل تأكيد النطاق وعرض السعر.'],
 ['dishwasher-spray-arm-cleaning','تنظيف أذرع الرش في غسالة الصحون','اذكر متطلبات تنظيف أذرع الرش في غسالة الصحون ليُراجع الفريق النطاق والتوفر قبل عرض السعر.'],
]){
 const input={name:before,description}; const snapshot={...input};
 eq(copy('dishwasher','ar',slug,input),{name:after,description:result});eq(input,snapshot);
 eq(copy('dishwasher','ar',slug,{name:before,description:'وصف مراجع مستقل'}),{name:after,description:'وصف مراجع مستقل'});
 eq(copy('dishwasher','ar',slug,{name:'اسم مراجع',description}),{name:'اسم مراجع',description});
 for(const [category,locale,id] of [['cleaning','ar',slug],['dishwasher','en',slug],['dishwasher','fr',slug],['dishwasher','ar','unknown']])eq(copy(category,locale,id,input),input);
 eq(copy('dishwasher','ar',slug,{name:before,description:before+' وصف آخر'}),{name:after,description:after+' وصف آخر'});
}
const english={name:'Dishwasher Not Cleaning Properly',description:'Dishwasher Not Cleaning Properly cleans Dishwasher Not Properly for the property you name on the request.'};
const snapshot={...english};
eq(copy('dishwasher','en','dishwasher-not-cleaning-properly',english),{...english,description:'Describe the poor wash results so the team can review the problem before confirming the scope and quotation.'});
eq(english,snapshot);
for(const [category,locale,slug] of [['cleaning','en','dishwasher-not-cleaning-properly'],['dishwasher','ar','dishwasher-not-cleaning-properly'],['dishwasher','fr','dishwasher-not-cleaning-properly'],['dishwasher','en','dishwasher-spray-arm-cleaning'],['dishwasher','en','unknown']])eq(copy(category,locale,slug,english),english);
for(const input of [{...english,name:'Reviewed name'},{...english,description:'Reviewed description'},{...english,description:english.description+' Extra context.'}])eq(copy('dishwasher','en','dishwasher-not-cleaning-properly',input),input);
for(const slug of ['dishwasher-filter-cleaning','dishwasher-poor-drying']){const input={name:before,description};eq(copy('dishwasher','ar',slug,input),input);}
console.log(`${checks} Dishwasher card guard assertions passed`);
