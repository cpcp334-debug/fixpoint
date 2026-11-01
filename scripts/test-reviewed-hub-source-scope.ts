import assert from 'node:assert/strict';
import {reviewedHubSourceScope} from './lib/reviewed-hub-source-scope';
import {APPROVED_CATEGORIES} from '../prisma/data/catalog-a1';
let passed=0;
for(const s of ['blog','diy','services','locations','electrical-services-dubai']){const files=reviewedHubSourceScope('section',s);assert(files.includes(`src/app/[locale]/${s}/page.tsx`));assert.equal(new Set(files).size,files.length);passed++;}
for(const c of APPROVED_CATEGORIES){assert(reviewedHubSourceScope('service-category',c.slug).includes('prisma/data/catalog-a1.ts'));passed++;}
assert(reviewedHubSourceScope('diy-category','الكهرباء').includes('src/lib/catalog.ts'));passed++;
for(const[k,s]of [['section','../admin'],['section','home'],['service-category','made-up'],['diy-category','../../.env'],['blog','blog']]){assert.throws(()=>reviewedHubSourceScope(k,s));passed++;}
console.log({passed,failed:0,scope:'Hub source allowlists, all18approved categories,Arabic slug support, traversal and unsupported target rejection; no database writes'});
