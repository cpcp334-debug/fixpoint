import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
const source=readFileSync(new URL('../src/components/forms/LeadForm.tsx',import.meta.url),'utf8');
let state=[],cursor=0,nav=[],events=[],calls=0,payload;
const react={useState(initial){const i=cursor++;if(!(i in state))state[i]=initial;return [state[i],v=>{state[i]=v;}];},useRef(initial){const i=cursor++;return state[i]??=( {current:initial} );}};
const jsx=(type,props)=>({type,props});
const exports={};
new Function('require','exports',ts.transpileModule(source,{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.CommonJS}}).outputText)(name=>{
  if(name==='react')return react;
  if(name==='react/jsx-runtime')return {jsx,jsxs:jsx,Fragment:'fragment'};
  if(name==='next-intl')return {useTranslations:ns=>key=>`${ns}.${key}`};
  if(name==='@/i18n/routing')return {useRouter:()=>({push:url=>nav.push(url)})};
  if(name==='@/lib/analytics/client')return {formStart:()=>()=>{}};
  if(name==='@/lib/attribution/client')return {getAttributionForSubmit:()=>({utm_source:'qa'})};
  if(name==='@/lib/analytics/datalayer')return {pushDataLayer:(...args)=>events.push(args)};
  if(name==='@/config/site')return {whatsappUrl:()=> 'https://wa.me/971543447959'};
  return new Proxy({}, {get:(_,key)=>key});
},exports);
const NativeFormData=globalThis.FormData;
globalThis.FormData=class extends NativeFormData {constructor(form){super();if(form)for(const [k,v] of form.entries())this.append(k,v);}};
function nodes(n){return !n||typeof n!=='object'?[]:Array.isArray(n)?n.flatMap(nodes):[n,...nodes(n.props?.children)];}
function render(mode,locale){cursor=0;return nodes(exports.LeadForm({mode,locale,services:[],locations:[]}));}
let checks=0;
try {
  for(const mode of ['quote','contact','booking'])for(const locale of ['en','ar'])for(const outcome of ['validation','reject','rateLimit','malformed','network','success','duplicate','ignored']){
    state=[];nav=[];events=[];calls=0;payload=undefined;
    const data=new NativeFormData();
    for(const [k,v] of Object.entries({name:'QA Contractor',phone:'0000000000',email:'qa@example.invalid',requirement:outcome==='validation'?'short':'Synthetic requirement',locationSlug:'sharjah',serviceSlug:'circuit-installation',serviceOther:'',urgency:'normal'}))data.append(k,v);
    data.append('serviceSlugs','circuit-installation');
    globalThis.fetch=async (_url,options)=>{calls++;payload=JSON.parse(options.body);if(outcome==='network')throw Error('network');return {json:async()=>{if(outcome==='malformed')throw Error('json');return outcome==='reject'?{ok:false,fieldErrors:{email:'Invalid'}}:outcome==='rateLimit'?{ok:false,error:'rateLimit'}:{ok:true,id:'qa/ref',duplicate:outcome==='duplicate',ignored:outcome==='ignored'};}};};
    const form=render(mode,locale).find(x=>x.type==='form');
    if(mode==='quote'){
      assert.equal(form.props.action,undefined);
      let prevented=false;form.props.onSubmit({currentTarget:data,preventDefault(){prevented=true;}});assert.equal(prevented,true);
      // A second synchronous submit must not send another request.
      if(outcome!=='validation')form.props.onSubmit({currentTarget:data,preventDefault(){}});
      await new Promise(resolve=>setImmediate(resolve));
    }else{assert.equal(form.props.onSubmit,undefined);await form.props.action(data);}
    const tree=render(mode,locale);
    assert.equal(calls,outcome==='validation'?0:1);
    assert.equal(tree.find(x=>x.type==='Button').props.disabled,false);
    const expected=outcome==='validation'?'Errors.formIncomplete':outcome==='rateLimit'?'Errors.rateLimit':['reject','network','malformed'].includes(outcome)?'Quote.error':null;
    if(expected)assert.ok(tree.some(x=>x.type==='p'&&JSON.stringify(x.props.children).includes(expected)));
    assert.deepEqual(nav,mode==='quote'&&outcome==='success'?['/get-a-quote/received?ref=qa%2Fref']:[]);
    assert.equal(events.length,mode==='contact'&&outcome==='success'?1:0);
    if(payload){assert.equal(payload.source,mode);assert.equal(payload.locale,locale);assert.equal(payload.locationSlug,'sharjah');assert.deepEqual(payload.serviceSlugs,['circuit-installation']);assert.equal(payload.attribution.utm_source,'qa');}
    checks++;
  }
  console.log(`${checks} handler scenarios passed; DOM/browser validation remains separate.`);
} finally {globalThis.FormData=NativeFormData;}
