// Read-only, bounded public HTML snapshot. Never submits forms or modifies content.
const base='https://fixpoint.ae';
const known=[
'/en','/ar','/en/blog','/en/blog?page=2',
'/en/blog/electrical-boq-quotation-checklist-uae','/ar/blog/electrical-boq-quotation-checklist-uae',
'/en/blog/electrical-testing-commissioning-readiness','/ar/blog/electrical-testing-commissioning-readiness',
'/en/blog/kw-emergency-room-technician','/sitemap/18.xml','/sitemap/29.xml',
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
    if(path.includes('.xml'))return {url,status:response.status,locCount:(html.match(/<loc>/g)||[]).length,includesEmptyArabicTesting:html.includes('/ar/blog/electrical-testing-commissioning-readiness'),includesEmptyArabicBoq:html.includes('/ar/blog/electrical-boq-quotation-checklist-uae')};
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
const fs=await import('node:fs/promises');
await fs.writeFile('fixpoint-public-snapshot.json',JSON.stringify({checkedAt:new Date().toISOString(),limit:20,results:output},null,2));
