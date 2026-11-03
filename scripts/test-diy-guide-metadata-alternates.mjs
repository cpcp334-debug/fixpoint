import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { createRequire } from 'node:module';
const loadModule = createRequire(import.meta.url);
const { diyGuidePathSlug, diyLookupCandidates, diyPathSlug, toMasterDiyGuideSlug } = loadModule('../src/lib/slug/diy-slug-map.ts');
const { pickI18n } = loadModule('../src/lib/utils.ts');
const { buildMetadata } = loadModule('../src/lib/seo.ts');
const { getSiteUrl } = loadModule('../src/config/site.ts');
function load(path, names, bindings) {
  const src = ts.createSourceFile(path, fs.readFileSync(path, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const nodes = src.statements.filter(n => (ts.isFunctionDeclaration(n) && names.includes(n.name?.text)) || (ts.isVariableStatement(n) && n.declarationList.declarations.some(d => names.includes(d.name.getText(src)))));
  assert.equal(nodes.length, names.length);
  const exports = {};
  vm.runInNewContext(ts.transpileModule(nodes.map(n => n.getText(src)).join('\n'), {compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText, {...bindings,exports});
  return exports;
}
async function main() {
  let row = null, category = null, missFirst = false;
  const queries = [];
  const { getGuideBySlug } = load('src/lib/catalog.ts', ['getGuideBySlug','diySlugCandidates','diyGuideInclude'], {
    cache:f=>f, prisma:{diyGuide:{findFirst:async q=>{queries.push(q);if(missFirst && q.where.slug)return null;return row;}}},
    diyLookupCandidates,diyPathSlug,toMasterDiyGuideSlug,pickI18n,pagePhoto:()=>null,editorialImageAlt:()=>'',
  });
  const { publicCanonical } = load('src/components/public/PublicHero.tsx',['publicCanonical'],{getSiteUrl});
  const { generateMetadata } = load('src/app/[locale]/diy/[slug]/page.tsx',['generateMetadata'],{
    getDiyCategoryBySlug:async()=>category,getGuideBySlug,buildMetadata,publicCanonical,diyGuidePathSlug,brandName:()=> 'Brand',
  });
  const translation = locale => ({locale,title:locale+' title',seoTitle:locale+' SEO',metaDescription:locale+' description'});
  const fixture = locales => ({slug:'diy-cleaning-services',translations:locales.map(translation),service:null,category:{translations:[{locale:'en',name:'Cleaning'}]}});
  let cases=0;
  for(const locales of [['en','ar'],['en'],['ar']]){
    row=fixture(locales);
    for(const locale of ['en','ar'])for(const slug of ['diy-cleaning-services',decodeURIComponent(diyGuidePathSlug('ar',row.slug)),diyGuidePathSlug('ar',row.slug)]){
      const before=queries.length;
      const result=await generateMetadata({params:Promise.resolve({locale,slug})});
      assert.equal(queries.length-before,1);
      const expected=Object.fromEntries(locales.map(l=>[l,`${getSiteUrl()}/${l}/diy/${diyGuidePathSlug(l,row.slug)}`]));if(locales.includes('en'))expected['x-default']=expected.en;
      assert.deepEqual(result.alternates.languages,expected);
      assert.equal(result.alternates.canonical,`${getSiteUrl()}/${locale}/diy/${diyPathSlug(locale,row.slug)}`);
      const selected=locales.includes(locale)?locale:locales.includes('en')?'en':locales[0];
      assert.equal(result.title,selected+' SEO');assert.equal(result.description,selected+' description');assert.deepEqual(result.robots,{index:true,follow:true});assert.equal(result.openGraph.type,'article');cases++;
    }
  }
  row=fixture(['en','ar']);row.slug=decodeURIComponent(diyGuidePathSlug('ar',row.slug));
  assert.equal((await getGuideBySlug(row.slug,'ar')).masterSlug,'diy-cleaning-services');cases++;
  row=fixture(['en','ar']);missFirst=true;
  let before=queries.length;assert.equal((await getGuideBySlug('cleaning-services','en')).masterSlug,'diy-cleaning-services');assert.equal(queries.length-before,2);assert.deepEqual(JSON.parse(JSON.stringify(queries.at(-1).orderBy)),[{isPrimary:'desc'},{slug:'asc'}]);cases++;missFirst=false;
  for(const invalid of [null,fixture([])]){row=invalid;assert.equal(JSON.stringify(await generateMetadata({params:Promise.resolve({locale:'en',slug:'missing'})})), '{}');cases++;}
  for(const locale of ['en','ar']){
    category={slug:locale==='ar'?'التنظيف':'cleaning',t:{name:'Cleaning',seoTitle:'Category SEO',metaDescription:'Category description'}};
    before=queries.length;const result=await generateMetadata({params:Promise.resolve({locale,slug:category.slug})});
    const expected=buildMetadata({locale,title:'Category SEO',description:'Category description',path:`/diy/${category.slug}`,index:true});assert.deepEqual(result,expected);assert.equal(queries.length,before);cases++;
  }
  for(const q of queries){assert.equal(q.where.status,'published');assert.equal(q.where.indexable,true);assert.equal(q.include.translations,true);}
  console.log(`${cases} DIY loader/metadata cases passed; guide query counts and category branch preserved.`);
}
main().catch(error=>{console.error(error);process.exitCode=1;});
