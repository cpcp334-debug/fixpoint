import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
let checks=0,state=[],cursor=0;
const eq=(a,b)=>{assert.deepEqual(a,b);checks++;};
const jsx={jsx:(type,props)=>({type,props}),jsxs:(type,props)=>({type,props})};
const react={useState(initial){const i=cursor++;if(!(i in state))state[i]=initial;return [state[i],v=>state[i]=typeof v==='function'?v(state[i]):v];}};
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const load=(source,require)=>{const exp={};new Function('require','exports',ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText)(require,exp);return exp;};
const field=load(read('src/components/forms/ServiceModeField.tsx'),n=>n==='react'?react:n==='react/jsx-runtime'?jsx:{}).ServiceModeField;
const eligibility=read('src/lib/bookings.ts').match(/export function serviceAllowsBookingType\([\s\S]*?\n}/)[0];
const allows=load(eligibility,()=>({})).serviceAllowsBookingType;
const catalog=[{slug:'circuit-installation',name:'Circuit Installation',ar:'تركيب الدائرة',status:'active',bookingEnabled:true,amcAvailable:false},{slug:'electrical-maintenance',name:'Electrical Maintenance',ar:'صيانة الكهرباء',status:'active',bookingEnabled:true,amcAvailable:true},{slug:'cleaning-services',name:'Cleaning Services',ar:'خدمات التنظيف',status:'active',bookingEnabled:true,amcAvailable:true},{slug:'disabled',name:'Disabled',status:'active',bookingEnabled:false,amcAvailable:true}];
function nodes(n){if(!n||typeof n!=='object')return [];if(Array.isArray(n))return n.flatMap(nodes);return [n,...nodes(n.props?.children)];}
const text=n=>Array.isArray(n)?n.map(text).join(''):n&&typeof n==='object'?text(n.props?.children):n==null?'':String(n);
for(const locale of ['en','ar']){
 const messages=JSON.parse(read(`messages/${locale}.json`));
 const booking=load(read('src/components/forms/BookingForm.tsx'),n=>n==='react'?react:n==='react/jsx-runtime'?jsx:n==='next-intl'?{useTranslations:ns=>k=>messages[ns][k]}:n==='@/lib/analytics/client'?{formStart:()=>()=>{}}:n==='@/i18n/routing'?{useRouter:()=>({push(){throw Error('unexpected navigation');}})}:n.includes('ServiceModeField')?{ServiceModeField:field}:{}).BookingForm;
 for(const type of ['standard','site_inspection','emergency','recurring_cleaning','amc_visit']){
  const services=catalog.filter(s=>allows(s,type)).map(s=>({slug:s.slug,name:locale==='ar'?s.ar:s.name}));
  const defaultService=services[0].slug;
  state=[];cursor=0;
  const tree=nodes(booking({locale,type,services,defaultService,defaultLocation:'dubai',locations:[],labels:{}}));
  const picker=tree.find(n=>n.type===field);eq(picker.props.defaultSlug,defaultService);
  eq(picker.props.search,{label:messages.Contact.serviceSearch,clear:messages.Contact.serviceSearchClear,empty:messages.Contact.serviceSearchEmpty,shown:messages.Contact.serviceSearchShown,selected:messages.Contact.serviceSearchSelected});
  eq(services.map(s=>s.slug),type==='recurring_cleaning'?['cleaning-services']:type==='amc_visit'?['electrical-maintenance','cleaning-services']:['circuit-installation','electrical-maintenance','cleaning-services']);
  state=[];let rendered;
  const render=()=>{cursor=0;rendered=nodes(field(picker.props));};
  const input=()=>rendered.find(n=>n.type==='input'&&n.props.type==='search');
  const choices=()=>rendered.filter(n=>n.type==='input'&&n.props.name==='serviceSlugs');
  const values=()=>choices().filter(n=>n.props.checked&&!n.props.disabled).map(n=>n.props.value);
  render();eq(values(),[defaultService]);eq(input().props.name,undefined);
  input().props.onChange({target:{value:'no-matching-service'}});render();eq(values(),[defaultService]);eq(choices().length,services.length);
  const fd=new FormData();for(const n of choices().filter(n=>n.props.checked&&!n.props.disabled))fd.append(n.props.name,n.props.value);
  eq(fd.getAll('serviceSlugs'),[defaultService]);
  let prevented=false;input().props.onKeyDown({key:'Enter',preventDefault(){prevented=true;}});eq(prevented,true);
  const clear=rendered.find(n=>n.type==='button'&&text(n)===messages.Contact.serviceSearchClear);eq(clear.props.type,'button');clear.props.onClick();render();eq(input().props.value,'');eq(values(),[defaultService]);
  const custom=rendered.find(n=>typeof n.type==='function'&&n.props.label===messages.Quote.serviceWriteOwn);custom.props.onClick();render();eq(choices().length,0);eq(input(),undefined);
  rendered.find(n=>typeof n.type==='function'&&n.props.label===messages.Quote.serviceChooseOur).props.onClick();render();eq(values(),[]);eq(input().props.value,'');
 }
}
console.log(`${checks} Booking search assertions passed`);
