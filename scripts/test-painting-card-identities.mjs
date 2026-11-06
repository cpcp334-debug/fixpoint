import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
const source=readFileSync(new URL('../src/lib/catalog/category-child-copy.ts',import.meta.url),'utf8');
const exp={};new Function('exports',ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText)(exp);
const copy=exp.categoryChildCopy;let checks=0;
const eq=(a,b)=>{assert.deepEqual(a,b);checks++;};
for(const [slug,before,after] of [
 ['office-painting','المكتب الدهان','دهان المكاتب'],
 ['commercial-painting','التجاري الدهان','الدهان التجاري'],
]){
 const input=Object.freeze({name:before,description:before+' يقيّم الحالة ويوصي بالخطوة التالية.'});
 eq(copy('painting','ar',slug,input),{name:after,description:after+' يقيّم الحالة ويوصي بالخطوة التالية.'});
 eq(copy('painting','ar',slug,{name:before,description:'وصف مراجع مستقل'}),{name:after,description:'وصف مراجع مستقل'});
 const reviewed={name:'اسم مراجع',description:input.description};eq(copy('painting','ar',slug,reviewed),reviewed);
 for(const [category,locale,id] of [['cleaning','ar',slug],['painting','en',slug],['painting','fr',slug],['painting','ar','unknown']])eq(copy(category,locale,id,input),input);
}
// Retain the six previously published Painting identities.
for(const [slug,before,after] of [
 ['metal-painting','الدهان','دهان المعادن'],['wood-painting','الدهان','دهان الأخشاب'],
 ['repainting','خدمة ضمن الدهان','إعادة الدهان'],['touch-up-painting','الدهان','رتوش الدهان'],
 ['texture-painting','الدهان','دهان ذو ملمس'],['decorative-painting','الدهان','دهان زخرفي'],
])eq(copy('painting','ar',slug,{name:before,description:before+' وصف'}),{name:after,description:after+' وصف'});
console.log(`${checks} Painting card guard assertions passed`);
