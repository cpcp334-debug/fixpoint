import assert from 'node:assert/strict';
import {APPROVED_CATEGORIES} from '../../prisma/data/catalog-a1';
/** Exact local sources whose preservation is checked for source-managed hubs. */
export function reviewedHubSourceScope(kind:string,slug:string):string[]{
 const common=['messages/en.json','messages/ar.json'];
 if(kind==='section'){
  assert(['blog','diy','services','locations'].includes(slug),'Unknown section; homepage uses its existing separate provenance');
  return [...common,`src/app/[locale]/${slug}/page.tsx`,'src/components/public/ReviewedSectionPhoto.tsx'];
 }
 if(kind==='service-category'){
  assert(APPROVED_CATEGORIES.some(c=>c.slug===slug),'Unknown approved service category');
  return [...common,'prisma/data/catalog-a1.ts','src/lib/catalog/approved-nav.ts','src/app/[locale]/services/[category]/page.tsx'];
 }
 if(kind==='diy-category'){
  assert(/^[a-z0-9\u0600-\u06ff-]+$/u.test(slug),'Unsafe DIY category slug');
  return [...common,'src/lib/catalog.ts','src/app/[locale]/diy/[slug]/page.tsx'];
 }
 throw Error('Unsupported hub kind');
}
