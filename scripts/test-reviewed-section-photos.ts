import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {ReviewedSectionPhoto} from '../src/components/public/ReviewedSectionPhoto';
import {PAGE_PHOTOS} from '../src/lib/catalog/page-photos';
const sections=['blog','diy','services','locations','electrical-services-dubai'] as const;
let checks=0;
for(const section of sections){
 const key='section:'+section,original=PAGE_PHOTOS[key];
 try{
  for(const locale of ['en','ar']){
   delete PAGE_PHOTOS[key];
   assert.equal(renderToStaticMarkup(createElement(ReviewedSectionPhoto,{section,locale,title:'Sample overview'})),'');checks++;
   PAGE_PHOTOS[key]='/media/does-not-exist-section-test.webp';
   assert.equal(renderToStaticMarkup(createElement(ReviewedSectionPhoto,{section,locale,title:'Sample overview'})),'');checks++;
   // In-memory sample assignment only: no files, database records or live mappings change.
   PAGE_PHOTOS[key]='/media/editorial/photos-20261019/service-emergency-light.webp';
   const html=renderToStaticMarkup(createElement(ReviewedSectionPhoto,{section,locale,title:'Sample overview'}));
   assert(html.includes('data-section-cover="'+section+'"'));
   assert(html.includes('data-image-kind="illustration"'));
   assert(html.includes(locale==='ar'?'صورة توضيحية':'Illustrative image'));
   assert(html.includes(locale==='ar'?'بالذكاء الاصطناعي':'AI-generated'));
   assert(!/<h[1-6](?:\s|>)/.test(html));checks++;
  }
 }finally{if(original===undefined)delete PAGE_PHOTOS[key];else PAGE_PHOTOS[key]=original;}
 const source=readFileSync('src/app/[locale]/'+section+'/page.tsx','utf8');
 assert.equal(source.split('<ReviewedSectionPhoto section="'+section+'"').length,2);checks++;
}
console.log({passed:checks,failed:0,scope:'Five public overview/campaign hooks; EN/AR rendering, absent/missing assignment, localized illustration disclosure, no additional headings; sample mappings exist only in test memory'});
