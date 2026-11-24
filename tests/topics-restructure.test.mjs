// Topics restructure (24 Nov 2026): 11-topic taxonomy, membership from each set's topicId, fixed topic art.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {TOPICS,LEGACY_TOPIC_IDS,UNIT_PUBLICATION_TOPICS,currentTopicIds,vocabularyResources,selectResources,topicYears,sortTopicResources,yearLabel} from '../dist/catalog.mjs';
import {publishedQuery} from '../dist/public-data.mjs';
import {parseRoute,readFilters} from '../dist/routing.mjs';

const here=path.dirname(fileURLToPath(import.meta.url));
const app=fs.readFileSync(new URL('../dist/app.mjs',import.meta.url),'utf8');
const set=(id,yearLevel,topicId,extra={})=>({id,title:id,chineseTitle:'',yearLevel,published:true,topicId,items:[],...extra});

// The Vocabulary Library's js/topic-taxonomy.js is canonical. Set VOCABULARY_LIBRARY_DIR to point at a checkout;
// otherwise the sibling topic worktree, then the sibling main checkout, are tried.
function taxonomyFile(){
  const candidates=[process.env.VOCABULARY_LIBRARY_DIR,'../../vocabularylibrary-topics','../../vocabularylibrary'].filter(Boolean).map(dir=>path.resolve(here,dir,'js/topic-taxonomy.js'));
  const found=candidates.find(file=>fs.existsSync(file));
  assert(found,`Canonical js/topic-taxonomy.js not found in: ${candidates.join(', ')}`);
  return found;
}

test('website topics equal the canonical Vocabulary Library taxonomy (IDs, order, English, Chinese, descriptions)',async()=>{
  const {TOPIC_TAXONOMY,LEGACY_TOPIC_IDS:canonicalLegacy}=await import(pathToFileURL(taxonomyFile()).href);
  assert.deepEqual(TOPICS.map(({id,title,chinese,description})=>({id,title,chinese,description})),TOPIC_TAXONOMY.map(({id,titleEn,titleZh,description})=>({id,title:titleEn,chinese:titleZh,description})));
  assert.deepEqual({...LEGACY_TOPIC_IDS},{...canonicalLegacy});
});

test('topic membership comes only from a valid topicId, never from IDs or titles',()=>{
  const resources=vocabularyResources([set('year1-pets',1,'animals'),set('year5-animals-everywhere',5,undefined,{title:'Animals'}),set('year2-family',2,'family'),set('year4-weather',4,'Time & Weather')]);
  assert.deepEqual(resources.map(r=>[r.id,r.topics]),[['year1-pets',['animals']],['year5-animals-everywhere',[]],['year2-family',[]],['year4-weather',[]]]);
  assert(publishedQuery.structuredQuery.select.fields.some(f=>f.fieldPath==='topicId'));
  assert(!/VOCABULARY_TOPICS/.test(fs.readFileSync(new URL('../dist/catalog.mjs',import.meta.url),'utf8')),'no hand-maintained set-to-topic map');
});

test('year badges and collections follow the published sets: moving, renaming or re-levelling needs no code change',()=>{
  const before=vocabularyResources([set('zz-test',5,'free-time'),set('year5-sports-i',5,'free-time')]);
  assert.deepEqual(topicYears(before,'free-time'),[5]);
  const moved=vocabularyResources([set('zz-test',2,'people',{title:'ZZ renamed'}),set('year5-sports-i',5,'free-time')]);
  assert.deepEqual(topicYears(moved,'free-time'),[5]);assert.deepEqual(topicYears(moved,'people'),[2]);
  assert.equal(selectResources(moved,{topic:'people'})[0].title,'ZZ renamed');
  assert.deepEqual(topicYears(vocabularyResources([set('zz-test',2,'people',{published:false})]),'people'),[],'unpublished sets leave the topic');
  assert.deepEqual(topicYears(vocabularyResources([set('zz-test',2,'people',{deleted:true})]),'people'),[],'deleted sets leave the topic');
});

test('collections sort by year (Prep first), then the Vocabulary page order, so series stay I, II, III',()=>{
  const resources=vocabularyResources([set('year2-wild-animals-ii',2,'animals'),set('year1-pets-ii',1,'animals'),set('year2-wild-animals-i',2,'animals'),set('year1-pets',1,'animals')]);
  assert.deepEqual(sortTopicResources(resources).map(r=>r.id),['year1-pets','year1-pets-ii','year2-wild-animals-i','year2-wild-animals-ii']);
  const countries=vocabularyResources([set('year5-countries-iii',5,'countries'),set('year5-countries',5,'countries'),set('year4-australian-states',4,'countries'),set('year5-countries-ii',5,'countries')]);
  assert.deepEqual(sortTopicResources(countries).map(r=>r.id),['year4-australian-states','year5-countries','year5-countries-ii','year5-countries-iii']);
  const units=[{id:'prep-numbers',type:'unit',year:0},{id:'zz',type:'vocabulary',year:0}];
  assert.deepEqual(sortTopicResources(units).map(r=>r.type),['vocabulary','unit']);
});

test('old topic links redirect to their new topic and survive refresh',()=>{
  for(const [legacy,next] of Object.entries(LEGACY_TOPIC_IDS)){
    const route=parseRoute(`#/topics?topic=${legacy}`);
    assert.equal(route.page,'topics');assert.equal(route.redirect,`#/topics?topic=${next}`);assert.equal(readFilters(route.params).topic,next);
  }
  assert.equal(parseRoute('#/vocabulary?year=3&topic=food').redirect,'#/vocabulary?year=3&topic=food-drinks');
  assert.equal(parseRoute('#/topics?topic=time-weather').redirect,null);
  assert.equal(readFilters(new URLSearchParams('topic=sports')).topic,null);
});

test('Units keep working: legacy Unit topics map to new ones; Unit publication keeps the IDs its Function accepts',()=>{
  assert.deepEqual(currentTopicIds(['family','body-parts','numbers','food','bogus']),['people','numbers','food-drinks']);
  assert.deepEqual(UNIT_PUBLICATION_TOPICS.map(t=>t.id),['numbers','family','food','animals','weather','countries','school','colours','body-parts','time','people','culture']);
  assert.match(fs.readFileSync(new URL('../dist/unit-publication.mjs',import.meta.url),'utf8'),/UNIT_PUBLICATION_TOPICS as TOPICS/);
  assert.match(fs.readFileSync(new URL('../dist/public-data.mjs',import.meta.url),'utf8'),/topics:currentTopicIds\(unit\.topics\)/);
});

function artMaps(){
  const source=app.slice(app.indexOf('const SPRITE='),app.indexOf('const yearBadge='));
  const context=vm.createContext({art:(...args)=>JSON.stringify(args)});
  vm.runInContext(source+';globalThis.out=JSON.stringify({SPRITE,TOPIC_ART,SET_FALLBACK_ART});',context);
  return JSON.parse(context.out); // plain objects from this realm
}
test('every topic has its fixed, approved illustration',()=>{
  const {SPRITE,TOPIC_ART}=artMaps();
  assert.deepEqual(Object.keys(TOPIC_ART),TOPICS.map(t=>t.id));
  const sprite=name=>['topic-covers-transparent',...SPRITE[name]];
  assert.deepEqual(TOPIC_ART.people,sprite('people'),'People: four friends');
  assert.deepEqual(TOPIC_ART.greetings,sprite('body-parts'),'Greetings: waving boy (old Body Parts)');
  assert.deepEqual(TOPIC_ART.countries,sprite('countries'),'Countries keeps the globe');
  assert.deepEqual(TOPIC_ART['food-drinks'],sprite('food'));
  for(const id of ['numbers','colours','animals','school','culture'])assert.deepEqual(TOPIC_ART[id],sprite(id));
  assert.equal(TOPIC_ART['free-time'][0],'topic-free-time');assert.equal(TOPIC_ART['time-weather'][0],'topic-time-weather');
  assert.equal(new Set(Object.values(TOPIC_ART).map(a=>a.join())).size,11,'no artwork is used twice');
});

test('topic illustrations never follow a vocabulary set cover',()=>{
  const landing=app.slice(app.indexOf('  const years=topicYears(allResources(),topic.id);'),app.indexOf('function openLearning('));
  assert.match(landing,/\$\{topicArt\(topic\.id\)\}/);assert.doesNotMatch(landing,/coverImage/);
});

test('Vocabulary cards without a saved cover keep their previous artwork',()=>{
  const {SPRITE,SET_FALLBACK_ART}=artMaps();
  assert.deepEqual(SET_FALLBACK_ART,{'prep-numbers':SPRITE.numbers,'year1-body-parts':SPRITE['body-parts'],'year2-family':SPRITE.family,'year3-age':SPRITE.numbers});
});

function renderTopics(query,vocabulary,status='ready'){
  const source=app.slice(app.indexOf('function topics('),app.indexOf('const learning={'));
  const context=vm.createContext({TOPICS,selectResources,sortTopicResources,yearLabel,state:{vocabularyStatus:status,unitsStatus:status},allResources:()=>vocabulary,
    topicCard:(topic,resource)=>resource?`<card ${resource.id} ${yearLabel(resource.year)}>`:`<topic ${topic.id}>`,icon:()=>''});
  vm.runInContext(source,context);
  return context.topics(new URLSearchParams(query));
}
test('topic detail lists its published sets in order with Vocabulary page cards; empty topics say so',()=>{
  const vocabulary=vocabularyResources([set('year2-wild-animals-i',2,'animals'),set('year1-pets-ii',1,'animals'),set('year1-pets',1,'animals'),set('year5-sports-i',5,'free-time')]);
  const html=renderTopics('topic=animals',vocabulary);
  assert.deepEqual([...html.matchAll(/<card ([^ ]+) /g)].map(m=>m[1]),['year1-pets','year1-pets-ii','year2-wild-animals-i']);
  assert.match(html,/class="topic-grid catalog-cards topic-collection"/);
  assert.match(html,/href="#\/topics">← All Topics<\/a>/);
  assert.match(renderTopics('topic=greetings',vocabulary),/No published resources for Greetings yet\. Resources coming soon\./);
  assert.match(renderTopics('topic=greetings',[],'loading'),/Loading published resources/);
  assert.match(renderTopics('topic=greetings',[],'error'),/data-action="retry"/);
  const landing=renderTopics('',vocabulary);
  assert.equal((landing.match(/<topic /g)||[]).length,11);assert.match(landing,/11 topics/);
});

test('topic search matches English and Chinese names',()=>{
  const search=q=>TOPICS.filter(t=>`${t.title} ${t.chinese} ${t.description}`.toLowerCase().includes(q.toLowerCase())).map(t=>t.id);
  assert.deepEqual(search('动物'),['animals']);assert.deepEqual(search('Free Time'),['free-time']);assert.deepEqual(search('天气'),['time-weather']);
  assert.deepEqual(search('family'),['people'],'old topic names still find their new home');
  assert.match(app,/TOPICS\.filter\(t=>`\$\{t\.title\} \$\{t\.chinese\} \$\{t\.description\}`/);
});

test('the two supplied illustrations are shipped unchanged as transparent RGBA PNGs',()=>{
  const expected={'topic-time-weather.png':'70cc7260a765496326baa72be69d7b5e70c24e322e2cb1cea096d235dccabfd3','topic-free-time.png':'247efb48620ced69f6091e3406fcd3297f98580214866fb63b3c0a65a57b1948'};
  for(const [file,sha] of Object.entries(expected)){
    const bytes=fs.readFileSync(new URL(`../dist/assets/${file}`,import.meta.url));
    assert.equal(bytes.subarray(1,4).toString(),'PNG');assert.equal(bytes.readUInt32BE(16),1536);assert.equal(bytes.readUInt32BE(20),1024);
    assert.equal(bytes[25],6,`${file} is RGBA (colour type 6)`);
    assert.equal(createHash(bytes),sha);
  }
});
import {createHash as hash} from 'node:crypto';
function createHash(bytes){return hash('sha256').update(bytes).digest('hex');}
