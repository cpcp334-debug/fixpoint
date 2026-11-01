// Read-only, bounded public HTML snapshot. Never submits forms or modifies content.
const base='https://fixpoint.ae';
const known=[
'/en','/ar','/en/blog','/en/blog?page=2',
'/en/blog/electrical-boq-quotation-checklist-uae','/ar/blog/electrical-boq-quotation-checklist-uae',
'/en/blog/electrical-testing-commissioning-readiness','/ar/blog/electrical-testing-commissioning-readiness',
'/en/blog/kw-emergency-room-technician',
'/en/blog/kw-medical-lab-technician','/en/blog/kw-medical-laboratory-technologist',
'/en/blog/kw-medical-lab-tech','/en/blog/kw-emergency-medical-technician-training',
'/en/blog/kw-sterile-processing-technician-certification','/en/blog/kw-central-service-technician',
'/en/blog/kw-operating-room-technician','/ar/blog/kw-emergency-room-technician',
'/api/locale-path?path=%2Fblog%2Felectrical-boq-quotation-checklist-uae&locale=ar',
'/sitemap/18.xml','/sitemap/29.xml',
'/api/locale-path?path=%2Fblog%2Felectrical-testing-commissioning-readiness&locale=ar'
];
const decode=s=>s.replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#x27;|&#39;/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&nbsp;/g,' ');
const text=s=>decode(s.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,' ').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,' ').replace(/<[^>]*>/g,' ')).replace(/\s+/g,' ').trim();
const attr=(tag,name)=>decode(tag.match(new RegExp('\\b'+name+'=["\\\']([^"\\\']*)["\\\']','i'))?.[1]??'');
const links=new Set();
async function inspect(path) {
  const url=base+path;
  try {
    const response=await fetch(url,{signal:AbortSignal.timeout(20000),headers:{'User-Agent':'FixpointOwnedSiteAudit/1.0'}});
    const html=await response.text();
    if(html.length>5000000)throw Error('Response exceeds audit size limit');
    if(path.startsWith('/api/'))return {url,status:response.status,localeResponse:html.slice(0,500)};
    if(path.includes('.xml'))return {url,status:response.status,locCount:(html.match(/<loc>/g)||[]).length,includesArabicTesting:html.includes('/ar/blog/electrical-testing-commissioning-readiness'),includesArabicBoq:html.includes('/ar/blog/electrical-boq-quotation-checklist-uae')};
    const title=text(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]??'');
    const h1=text(html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i)?.[1]??'');
    const body=html.match(/<div class="prose-article">([\s\S]*?)<\/div>/i)?.[1];
    const tags=html.match(/<(?:meta|link)\b[^>]*>/gi)||[];
    const meta=name=>tags.find(t=>attr(t,'name').toLowerCase()===name);
    const canonical=tags.find(t=>attr(t,'rel').toLowerCase()==='canonical');
    const alternates=tags.filter(t=>attr(t,'hreflang')).map(t=>({locale:attr(t,'hreflang'),href:attr(t,'href')}));
    for(const m of html.matchAll(/<a\b[^>]*\bhref=["']([^"']+)["']/gi)){
      const u=new URL(decode(m[1]),base);
      if(u.origin===base&&/^\/en\/blog\/[^/?#]+$/.test(u.pathname))links.add(u.pathname);
    }
    return {url,finalUrl:response.url,status:response.status,title,h1,robots:attr(meta('robots')??'','content'),canonical:attr(canonical??'','href'),alternates,
      articleBodyWords:body===undefined?null:text(body).split(/\s+/).filter(Boolean).length,
      articleBodyPreview:path.includes('/kw-')&&body?text(body).slice(0,1000):undefined,
      medicalTopicCandidate:/medical|emergency room|operating room|sterile processing|laboratory techn/i.test(title+' '+h1),
      gtmIds:[...new Set(html.match(/\bGTM-[A-Z0-9]{4,}\b/g)||[])],
      ga4Ids:[...new Set(html.match(/\bG-[A-Z0-9]{6,}\b/g)||[])],
      googleVerificationMetaPresent:Boolean(meta('google-site-verification')),
      notes:'Initial server HTML only. No assertion of Google indexing, browser tag execution, analytics totals or ranking.'};
  }catch(e){return {url,error:String(e.message),notes:'One fetch failure is not a confirmed outage.'};}
}
const output=[];
for(const path of known){const item=await inspect(path);output.push(item);console.log(JSON.stringify(item));}
const extra=[...links].filter(p=>!known.includes(p)).slice(0,8);
for(const path of extra){const item=await inspect(path);output.push(item);console.log(JSON.stringify(item));}
// Inspect only containers observed in owned-site HTML. Public script contents
// reveal configuration, not receipt of events in an authenticated GA4 property.
for(const id of [...new Set(output.flatMap(item=>item.gtmIds??[]))].slice(0,2)){
  const url='https://www.googletagmanager.com/gtm.js?id='+encodeURIComponent(id);
  try{
    const response=await fetch(url,{signal:AbortSignal.timeout(20000)});
    const script=await response.text();
    const item={url,status:response.status,containerId:id,
      configuredGa4Ids:[...new Set(script.match(/\bG-[A-Z0-9]{6,}\b/g)||[])],
      configuredAdsIds:[...new Set(script.match(/\bAW-[0-9]+\b/g)||[])],
      tagConfigFields:[...script.matchAll(/"(?:vtp_measurementId|vtp_tagId|vtp_conversionId|vtp_conversionLabel|function)"\s*:\s*(?:"[^"]*"|\[[^\]]{0,300}\]|\d+)/g)].map(x=>x[0]).slice(0,50),
      successEventNames:['quote_submit_success','booking_submit_success','contact_submit_success'].filter(event=>script.includes(event)),
      notes:'Public container configuration only; event firing and GA4 receipt require browser and account verification.'};
    output.push(item);console.log(JSON.stringify(item));
  }catch(e){const item={url,error:String(e.message)};output.push(item);console.log(JSON.stringify(item));}
}
const fs=await import('node:fs/promises');
await fs.writeFile('fixpoint-public-snapshot.json',JSON.stringify({checkedAt:new Date().toISOString(),limit:30,results:output},null,2));
