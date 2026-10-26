import test from 'node:test';
import assert from 'node:assert/strict';
import {parseRoute,readFilters,resourceRoute} from '../dist/routing.mjs';

test('bare root and hash root both resolve to the staircase home',()=>{
 for(const hash of ['', '#/', '#/?year=0'])assert.equal(parseRoute(hash).page,'home');
 assert.equal(readFilters(parseRoute('#/?year=0').params).year,0);
});
test('legacy Year Levels links redirect to Home without losing year/filter parameters',()=>{
 assert.equal(parseRoute('#/year-levels').redirect,'#/');
 for(let year=0;year<7;year++){
  const legacy=parseRoute(`#/year-levels?year=${year}&topic=numbers`);
  assert.equal(legacy.redirect,`#/?year=${year}&topic=numbers`);
  assert.equal(legacy.page,'home');assert.equal(readFilters(legacy.params).year,year);
 }
});
test('all eight top-level destinations remain independent routes',()=>{
 for(const page of ['home','vocabulary','units','activities','topics','pinyin','hanzi','about']){
  const hash=resourceRoute(page);assert.equal(parseRoute(hash).page,page);assert.equal(parseRoute(hash).redirect,null);
 }
});
test('shareable filters round-trip Prep, reviewed topic and bilingual search safely',()=>{
 const hash=resourceRoute('vocabulary',{year:0,topic:'numbers',query:'数字 & age?'});
 assert.deepEqual(readFilters(parseRoute(hash).params),{year:0,topic:'numbers',query:'数字 & age?'});
 assert.equal(resourceRoute('home',{year:6}),'#/?year=6');
 assert.deepEqual(readFilters(new URLSearchParams('year=7&topic=unreviewed')),{year:null,topic:null,query:''});
 assert.equal(readFilters(new URLSearchParams('year=')).year,null);
});
