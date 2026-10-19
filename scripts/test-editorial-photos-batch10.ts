import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,readdirSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import sharp from 'sharp';
import {editorialImageAlt} from '../src/lib/catalog/editorial-images';
async function main(){
 const files=readdirSync('data').filter(f=>/^editorial-photos-batch\d+-provenance\.json$/.test(f));
 const rows=files.flatMap(f=>JSON.parse(readFileSync('data/'+f,'utf8')));
 const home=JSON.parse(readFileSync('data/homepage-photos-provenance-20261019.json','utf8'));
 const all=[...rows,...home],hashes=new Set<string>(),paths=new Set<string>();
 for(const a of all){assert(a.originalFile&&existsSync('C:/Users/Asus Ultra 9/.codex/generated_images/01a13014-6545-78e1-a576-7654114d1478/'+a.originalFile));assert(a.review&&a.reviewedAt&&a.prompt);const bytes=readFileSync('public'+a.output),m=await sharp(bytes).metadata();assert.equal(m.format,'webp');assert((m.width||0)>=1200&&(m.height||0)>=800);hashes.add(createHash('sha256').update(bytes).digest('hex'));paths.add(a.output);assert.match(editorialImageAlt(a.output,'ar','موضوع'),/بالذكاء الاصطناعي/);assert.match(editorialImageAlt(a.output,'en','Topic'),/AI-generated/);}
 assert.equal(hashes.size,all.length);assert.equal(paths.size,all.length);
 const jobs=JSON.parse(readFileSync('data/editorial-photos-batch10-provenance.json','utf8'));
 const drafts=JSON.parse(readFileSync('data/arabic-electrical-batch6-20261019.json','utf8')).articles;
 assert.equal(jobs.length,2);assert.equal(drafts.length,2);
 for(const a of drafts){const j=jobs.find((x:any)=>x.key===a.imageKey);assert(j&&j.slug===a.slug);assert.equal(j.output,'/media/editorial/photos-20261019/'+a.imageKey+'.webp');}
 const report={checkedAt:new Date().toISOString(),pass:true,newImages:2,totalDistinctBatchImages:rows.length,additionalHomepageAssets:home.length,distinctImageHashes:hashes.size,originalGeneratedFilesRetained:true,dimensionsAndDecode:true,localizedAIAlts:true};
 writeFileSync('C:/Users/Asus Ultra 9/Documents/Codex/Fixpoint-2026-10-19/batch10-image-tests.json',JSON.stringify(report,null,2));console.log(report);
}main().catch(e=>{console.error(e.message);process.exitCode=1});
