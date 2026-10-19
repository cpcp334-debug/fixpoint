import {writeFileSync} from 'node:fs';
import {APPROVED_CHILDREN,APPROVED_CATEGORIES,childSlug} from '../prisma/data/catalog-a1';
import {loadLocationMaster} from '../prisma/data/location-master';
import {serviceHref,locationPageHref} from '../src/lib/slug/locale-slug';
const urls:string[]=[];for(const locale of ['en','ar']){for(const c of APPROVED_CATEGORIES)urls.push(`https://fixpoint.ae/${locale}/services/${c.slug}`);for(const s of APPROVED_CHILDREN)urls.push(`https://fixpoint.ae/${locale}${serviceHref(locale,childSlug(s))}`);for(const l of loadLocationMaster().locations.filter(x=>x.type!=='country'))urls.push(`https://fixpoint.ae/${locale}${locationPageHref(locale,l.slug)}`);}
writeFileSync('C:/Users/Asus Ultra 9/Documents/Codex/Fixpoint-2026-10-19/approved-catalog-url-manifest.json',JSON.stringify({createdAt:new Date().toISOString(),scope:'All approved child service routes, category hubs and geographic location hubs in both languages; not the service-location Cartesian product or blog corpus',urls:[...new Set(urls)]},null,2));console.log('Catalogue URL manifest: '+new Set(urls).size);
