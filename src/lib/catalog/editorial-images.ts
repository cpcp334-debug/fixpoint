import { existsSync } from 'node:fs';
import path from 'node:path';
import { APPROVED_CATEGORIES, APPROVED_CHILDREN, childSlug } from '../../../prisma/data/catalog-a1';
const serviceCategories = new Map(APPROVED_CHILDREN.map(c => [childSlug(c), c.categorySlug]));
const aliases: Record<string,string> = { 'air-conditioning':'ac','painting-walls':'painting','building-maintenance':'general-maintenance','home-maintenance':'general-maintenance','uae-local-guides':'location','diy-safety':'general-maintenance','water-tank-cleaning':'water-tank','electrical-maintenance':'electrical','general-building-maintenance':'general-maintenance'};
const known = new Set([...APPROVED_CATEGORIES.map(c=>c.slug),'location']);
export function editorialImageCategory(categories:string[]=[], services:string[]=[]): string {
 for(const service of services){const cat=serviceCategories.get(service)||aliases[service];if(cat&&known.has(cat))return cat;}
 for(const category of categories){const cat=aliases[category]||category;if(known.has(cat))return cat;}
 return 'general-maintenance';
}
export function safeLocalImage(src?:string|null): string|null {
 if(!src||!src.startsWith('/media/')||src.includes('..')||src.includes('?')||src.includes('#')||src.includes('\\'))return null;
 return existsSync(path.join(process.cwd(),'public',src))?src:null;
}
/** Keep real existing assets; replace old text-only topic covers and missing files. No CMS writes. */
export function editorialImage(src:string|null|undefined,categories:string[]=[],services:string[]=[]):string {
 const valid=safeLocalImage(src);
 if(valid&&!valid.startsWith('/media/topics/')&&valid!=='/media/hero.jpg')return valid;
 const category=services.includes("cooker-electrical-connection") ? "burner-cooker" : editorialImageCategory(categories,services);
 return `/media/editorial/${category}.webp`;
}
export function editorialImageAlt(src:string,locale:string,title:string,original=''):string {
 if(src.startsWith('/media/editorial/photos-'))return locale==='ar'?`صورة توضيحية مولدة بالذكاء الاصطناعي: ${title}؛ ليست صورة عميل أو فرع فعلي`:`AI-generated illustrative image: ${title}; not a real customer project or branch photograph`;
 if(src.startsWith('/media/editorial/'))return locale==='ar'?`رسم توضيحي: ${title}، وليس صورة لموقع أو مشروع منفذ`:`Illustration: ${title}; not a photograph of a completed job or local branch`;
 return original||title;
}
