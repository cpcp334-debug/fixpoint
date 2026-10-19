import './load-env-mysql';
import {prisma} from '../src/server/db';
import {writeFileSync,readFileSync} from 'node:fs';
import {APPROVED_CATEGORIES,APPROVED_CHILDREN,childSlug} from '../prisma/data/catalog-a1';
import {loadLocationMaster} from '../prisma/data/location-master';
async function main(){
 const [services,locations,categories,articleCounts,slCounts,blogTranslations] = await Promise.all([
 prisma.service.findMany({select:{slug:true,status:true,indexable:true,categoryId:true,translations:{select:{locale:true,name:true}}}}),
 prisma.location.findMany({select:{slug:true,type:true,status:true,serves:true,indexable:true,translations:{select:{locale:true,name:true}}}}),
 prisma.serviceCategory.findMany({select:{id:true,slug:true,status:true,sortOrder:true}}),
 prisma.article.groupBy({by:['status','indexable'],_count:true}),
 prisma.serviceLocation.groupBy({by:['covered','coverageStatus','indexableEn','indexableAr'],_count:true}),
 prisma.articleI18n.count()
 ]);
 const master=loadLocationMaster();const proposed=APPROVED_CHILDREN.map(c=>({slug:childSlug(c),name:c.nameEn,category:c.categorySlug}));
 const serviceMap=new Map(services.map(s=>[s.slug,s]));
 const attachment=readFileSync('C:/Users/Asus Ultra 9/.codex/attachments/697901d6-8663-47f0-897f-41bb46072953/Pasted text.txt','utf8');
 const supplied=attachment.split(/\r?\n/).map(s=>s.match(/^(.+?)\s+—\s+([a-z0-9][a-z0-9-]+)\s*$/)).filter(Boolean).map(m=>({name:m![1],slug:m![2]}));
 const report={checkedAt:new Date().toISOString(),readOnly:true,master:{categories:APPROVED_CATEGORIES.length,children:proposed.length,offerings:APPROVED_CATEGORIES.length+proposed.length,categoryCounts:APPROVED_CATEGORIES.map(c=>({slug:c.slug,name:c.nameEn,children:proposed.filter(s=>s.category===c.slug).length})),locationRecords:master.locations.length,geographicPlaces:master.locations.filter(l=>l.type!=='country').length,byEmirate:Object.fromEntries([...new Set(master.locations.map(l=>l.emirateSlug).filter(Boolean))].map(e=>[e,master.locations.filter(l=>l.emirateSlug===e).length]))},suppliedAttachment:{parsed:supplied.length,differences:supplied.filter(s=>!proposed.some(p=>p.slug===s.slug)).map(s=>({...s,nameMatches:proposed.filter(p=>p.name.toLowerCase()===s.name.toLowerCase())}))},database:{serviceCount:services.length,serviceStatus:services.reduce((o:any,s)=>{o[s.status]=(o[s.status]||0)+1;return o},{}),categoryCount:categories.length,locationCount:locations.length,locationStatus:locations.reduce((o:any,s)=>{o[s.status]=(o[s.status]||0)+1;return o},{}),articleCounts,blogTranslations,slCounts},missingApprovedServices:proposed.filter(s=>!serviceMap.has(s.slug)),services,locations,categories};
 writeFileSync('C:/Users/Asus Ultra 9/Documents/Codex/Fixpoint-2026-10-19/owner-catalog-reconciliation.json',JSON.stringify(report,null,2));
 console.log(JSON.stringify({master:report.master,attachment:report.suppliedAttachment,database:report.database,missingApproved:report.missingApprovedServices.length},null,2));
}
main().catch(e=>{console.error(e.message.replace(/mysql:\/\/[^\s]+/g,'[REDACTED]'));process.exitCode=1}).finally(()=>prisma.$disconnect());
