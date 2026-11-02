const assert=require('node:assert/strict');
const fields=['id','slug','status','indexable','categorySlugs','heroImage','relatedServiceSlugs','relatedDiySlugs','publishedAt','createdAt','updatedAt'];
function buildMasterCas(original,image,changedAt){
assert(original&&typeof original==='object'&&!Array.isArray(original));
const extras=Object.keys(original).filter(k=>!fields.includes(k)&&!['translations','arUrl','duplicateCopies'].includes(k));assert.equal(extras.length,0,'Unknown master field; review schema before updating');
assert(fields.every(k=>Object.hasOwn(original,k)),'Complete master backup required');assert(original.status==='published'&&original.indexable===true&&typeof original.id==='string'&&typeof original.slug==='string');
assert(/^\/media\/editorial\/photos-[a-z0-9-]+\/[a-z0-9-]+\.webp$/.test(image)&&image!==original.heroImage,'A new reviewed editorial cover is required');
assert(changedAt instanceof Date&&Number.isFinite(changedAt.getTime()));for(const k of ['publishedAt','createdAt','updatedAt'])assert(original[k]===null&&k==='publishedAt'||Number.isFinite(new Date(original[k]).getTime()),'Invalid backed-up date');
return{where:Object.fromEntries(fields.map(k=>[k,original[k]])),data:{heroImage:image,updatedAt:changedAt}};
}
module.exports={buildMasterCas,fields};
