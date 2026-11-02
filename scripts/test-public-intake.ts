import assert from 'node:assert/strict';
import { publicIntakeQuestions } from '../src/lib/catalog/public-intake';
const source = JSON.stringify([
  {en:'Describe the issue and the property type.',ar:'REVIEW_REQUIRED'},
  {en:'English',ar:' عربي '},
  {en:' REVIEW_REQUIRED: translate ',ar:'سؤال'},
  {en:'REVIEW_REQUIRED',ar:'REVIEW_REQUIRED'},
  ' Legacy question ', 'REVIEW_REQUIRED', null, 3, [], {en:4,ar:false},
]);
assert.deepEqual(publicIntakeQuestions(source,'ar'),['Describe the issue and the property type.','عربي','سؤال','Legacy question']);
assert.deepEqual(publicIntakeQuestions(source,'en'),['Describe the issue and the property type.','English','سؤال','Legacy question']);
for (const raw of ['invalid','null','{}','"text"','[]']) assert.deepEqual(publicIntakeQuestions(raw,'ar'),[]);
assert.deepEqual(publicIntakeQuestions('[{"ar":" ","en":"Valid"}]','ar'),['Valid']);
console.log('Public intake: locale preference, marker fallback, legacy strings, whitespace and malformed data checks passed.');
