import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { createRequire } from 'node:module';
const loadModule = createRequire(import.meta.url);
const { diyCategoryPathSlug, diyGuidePathSlug, diyLookupCandidates, diyPathSlug, toMasterDiyGuideSlug, toMasterDiyCategorySlug } = loadModule('../src/lib/slug/diy-slug-map.ts');
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
  let row = null, guideCalls = 0;
  const queries = [];
  const { getDiyCategoryBySlug } = load('src/lib/catalog.ts', ['getDiyCategoryBySlug'], {
    cache:f=>f, prisma:{diyCategory:{findFirst:async q=>{queries.push(q);return row;}}},
    diyLookupCandidates,diyPathSlug,toMasterDiyCategorySlug,pickI18n,pagePhoto:()=>null,editorialImageAlt:()=>'',
  });
  const { publicCanonical } = load('src/components/public/PublicHero.tsx',['publicCanonical'],{getSiteUrl});
  const { generateMetadata } = load('src/app/[locale]/diy/[slug]/page.tsx',['generateMetadata'],{
    getDiyCategoryBySlug,getGuideBySlug:async()=>{guideCalls++;return null;},buildMetadata,publicCanonical,diyGuidePathSlug,diyCategoryPathSlug,brandName:()=> 'Brand',
  });
  const translation = locale => ({locale,name:locale+' name',seoTitle:locale+' SEO',description:locale+' body',metaDescription:locale+' description'});
  const fixture = (slug,locales) => ({slug,translations:locales.map(translation),guides:[{slug:'diy-cleaning-services',translations:[{locale:'en',title:'Guide'}]}]});
  let cases=0;
  for(const master of ['cleaning','electrical'])for(const locales of [['en','ar'],['en'],['ar']]){
    row=fixture(master,locales);
    for(const locale of ['en','ar'])for(const slug of [master,decodeURIComponent(diyCategoryPathSlug('ar',master)),diyCategoryPathSlug('ar',master)]){
      const before=queries.length;
      const result=await generateMetadata({params:Promise.resolve({locale,slug})});
      assert.equal(queries.length-before,1);assert.equal(guideCalls,0);
      const expected=Object.fromEntries(locales.map(l=>[l,`${getSiteUrl()}/${l}/diy/${diyCategoryPathSlug(l,master)}`]));if(locales.includes('en'))expected['x-default']=expected.en;
      assert.deepEqual(result.alternates.languages,expected);
      assert.equal(result.alternates.canonical,`${getSiteUrl()}/${locale}/diy/${diyPathSlug(locale,master)}`);
      const selected=locales.includes(locale)?locale:locales.includes('en')?'en':locales[0];
      assert.equal(result.title,selected+' SEO');assert.equal(result.description,selected+' description');assert.deepEqual(result.robots,{index:true,follow:true});
      const resolved=await getDiyCategoryBySlug(slug,locale);
      assert.equal(resolved.masterSlug,master);assert.equal(resolved.publishedGuides.length,1);
      assert.equal(resolved.publishedGuides[0].slug,diyPathSlug(locale,'diy-cleaning-services'));cases++;
    }
  }
  row=fixture(decodeURIComponent(diyCategoryPathSlug('ar','cleaning')),['en','ar']);
  assert.equal((await getDiyCategoryBySlug(row.slug,'ar')).masterSlug,'cleaning');cases++;
  row=fixture('cleaning',['en','ar']);for(const tr of row.translations){tr.seoTitle='';tr.metaDescription='';}
  const fallback=await generateMetadata({params:Promise.resolve({locale:'ar',slug:'cleaning'})});
  assert.equal(fallback.title,'ar name | Brand');assert.equal(fallback.description,'ar body');cases++;
  for(const invalid of [null,fixture('cleaning',[])]){row=invalid;assert.equal(JSON.stringify(await generateMetadata({params:Promise.resolve({locale:'en',slug:'missing'})})), '{}');cases++;}
  for(const q of queries){assert.equal(q.where.status,'published');assert.equal(q.where.indexable,true);assert.equal(q.include.translations,true);assert.equal(q.include.guides.where.status,'published');assert.equal(q.include.guides.where.indexable,true);assert.equal(q.include.guides.include.translations,true);assert.equal(q.include.guides.orderBy.slug,'asc');}
  console.log(`${cases} category loader/metadata cases passed; aliases, translation locales, content selection and query predicates preserved.`);
}
main().catch(error=>{console.error(error);process.exitCode=1;});
