import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {referencesForTopic} from '../dist/learning-references.mjs';
const app=fs.readFileSync(new URL('../dist/app.mjs',import.meta.url),'utf8');
const topicSource=app.slice(app.indexOf('function topicCard('),app.indexOf('function topics('));
function render({resource=null,years=[],status='ready',topic='numbers'}={}) {
  const context=vm.createContext({SET_FALLBACK_ART:{},topicArt:()=>'<svg aria-hidden="true"></svg>',escape:s=>String(s),art:()=>'<svg aria-hidden="true"></svg>',yearLabel:y=>y===0?'Prep':`Year ${y}`,yearBadge:y=>`<span class="year-badge year-${y}">${y===0?'Prep':`Year ${y}`}</span>`,resourceRoute:()=> '#/units?year=0',allResources:()=>[],referencesForTopic,topicYears:()=>years,state:{vocabularyStatus:status,unitsStatus:status},arrow:'→'});
  vm.runInContext(topicSource,context);
  return context.topicCard({id:topic,colour:'green',title:'Numbers',chinese:'数字',description:'Counting'},resource);
}
test('Vocabulary uses one full-card native link, including the year badge, with unchanged set destination and artwork',()=>{
  const html=render({resource:{type:'vocabulary',id:'prep-numbers',title:'Numbers',year:0,url:'https://themandarinroom.github.io/vocabularylibrary/student.html?set=prep-numbers',coverImage:'https://example.com/cover.webp'}});
  assert.equal((html.match(/<a /g)||[]).length,1);
  assert.match(html,/class="catalog-resource-open" href="https:\/\/themandarinroom.github.io\/vocabularylibrary\/student.html\?set=prep-numbers"/);
  assert.match(html,/catalog-saved-cover/);assert.match(html,/data-cover-fallback/);assert.match(html,/year-badge year-0/);assert(!html.includes('circle'));assert(!html.includes('→'));
});
test('active Topics retain their original destination with a single full-card native link',()=>{
  const html=render({years:[0,3]});assert.equal((html.match(/<a /g)||[]).length,1);assert.match(html,/href="#\/topics\?topic=numbers" class="catalog-resource-open"/);assert.match(html,/Prep/);assert.match(html,/Year 3/);assert(!html.includes('circle'));
});
test('empty, loading and unavailable Topics without published references never gain a destination',()=>{
  for(const status of ['ready','loading','error']){const html=render({status,topic:'animals'});assert(!html.includes('<a '));assert(!html.includes('tabindex'));assert(!html.includes('circle'));}
  assert.match(render({topic:'animals'}),/Resources coming soon/);
});
test('all seven Home cards preserve their native Journey links, labels and icons without navigation arrows',()=>{
  const source=app.slice(app.indexOf('const YEAR_CARDS=['),app.indexOf('function catalogPage('));
  const context=vm.createContext({state:{vocabulary:[],units:[]},selectResources:()=>[],yearLabel:y=>y===0?'Prep':`Year ${y}`});
  const html=vm.runInContext(source+';home(new URLSearchParams())',vm.createContext({...context,URLSearchParams}));
  assert.equal((html.match(/class="year-level-card /g)||[]).length,7);assert.equal((html.match(/class="year-level-icon"/g)||[]).length,7);
  for(let y=0;y<7;y++)assert(html.includes(`href="#/journey?year=${y}"`));assert(!html.includes('year-level-arrow'));
});
test('unrelated Unit card arrows and independent Unit badge navigation remain',()=>{
 const html=render({resource:{type:'unit',id:'prep-numbers',title:'Numbers',year:0,url:'#/unit?unit=prep-numbers'}});assert.match(html,/class="circle"/);assert(html.includes('→'));assert.equal((html.match(/<a /g)||[]).length,2);
});
