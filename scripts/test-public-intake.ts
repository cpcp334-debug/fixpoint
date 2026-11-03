import assert from 'node:assert/strict';
import { publicIntakeQuestions } from '../src/lib/catalog/public-intake';
const source = JSON.stringify([
  {en:'Describe the issue and the property type.',ar:'REVIEW_REQUIRED'},
  {en:'English',ar:' عربي '},
  {en:' REVIEW_REQUIRED: translate ',ar:'سؤال'},
  {en:'REVIEW_REQUIRED',ar:'REVIEW_REQUIRED'},
  ' Legacy question ', 'REVIEW_REQUIRED', null, 3, [], {en:4,ar:false},
]);
assert.deepEqual(publicIntakeQuestions(source,'ar'),['صف المشكلة ونوع العقار.','عربي','سؤال','Legacy question']);
assert.deepEqual(publicIntakeQuestions(source,'en'),['Describe the issue and the property type.','English','سؤال','Legacy question']);
for (const raw of ['invalid','null','{}','"text"','[]']) assert.deepEqual(publicIntakeQuestions(raw,'ar'),[]);
assert.deepEqual(publicIntakeQuestions('[{"ar":" ","en":"Valid"}]','ar'),['Valid']);
for (const ar of [undefined, null, '', '  ', 'REVIEW_REQUIRED', ' REVIEW_REQUIRED: translate ']) {
  const raw = JSON.stringify([{en:' Describe the issue and the property type. ',ar}]);
  assert.deepEqual(publicIntakeQuestions(raw,'ar'),['صف المشكلة ونوع العقار.']);
  assert.deepEqual(publicIntakeQuestions(raw,'en'),['Describe the issue and the property type.']);
}
assert.deepEqual(publicIntakeQuestions(JSON.stringify([{en:'Describe the issue and the property type.',ar:'صف المساحة المطلوب تنظيفها.'}]),'ar'),['صف المساحة المطلوب تنظيفها.']);
assert.deepEqual(publicIntakeQuestions(JSON.stringify([{en:'Describe the issue and property type.',ar:'REVIEW_REQUIRED'}]),'ar'),['Describe the issue and property type.']);
assert.deepEqual(publicIntakeQuestions(JSON.stringify(['Describe the issue and the property type.']),'ar'),['Describe the issue and the property type.']);
console.log('Public intake: locale preference, marker fallback, legacy strings, whitespace and malformed data checks passed.');
