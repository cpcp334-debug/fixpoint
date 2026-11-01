import assert from 'node:assert/strict';
import {hasUnsupportedBlogClaims} from '../src/lib/blog/publication-gates';
const accepted=[
 'When an authority process applies, use current official instructions and the responsible eligible parties rather than relying on a remembered sequence from another project.',
 'Follow official instructions for the selected product.',
 'Consult current official guidance before preparing the application.',
 'USE CURRENT OFFICIAL INSTRUCTIONS.',
 'Use current\nofficial instructions.',
 'Planning and documentation for the project.',
];
const rejected=[
 'Fixpoint is an official electrical contractor.',
 'Our official services are available.',
 'An official electrician for your project.',
 'Official installation guide by Fixpoint.',
 'We provide official instructions.',
 'Our certified team follows official instructions.',
 'Use current official instructions. We are licensed.',
 'Use current official instructions with guaranteed approval.',
 'Consult official guidance and hire the best company.',
 'Follow official instructions: cheapest service.',
 'Use current official instructions. Official Fixpoint approval.',
 'We are the number one contractor.',
 'Fastest service, 24/7.',
 'We are most trusted and certified.',
 'Use official credentials.',
 'Our licensed electricians follow current official guidance.',
];
for(const text of accepted)assert.equal(hasUnsupportedBlogClaims(text),false,text);
for(const text of rejected)assert.equal(hasUnsupportedBlogClaims(text),true,text);
console.log({passed:accepted.length+rejected.length,failed:0,sampleOnly:true,scope:'Benign instruction references only; credential,official-provider,approval,promotional and mixed-reference claims still blocked; no source content rewritten'});
