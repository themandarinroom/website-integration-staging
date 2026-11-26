import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {createHash} from 'node:crypto';
import {TOPICS,selectResources,sortTopicResources,yearLabel,vocabularyResources} from '../dist/catalog.mjs';
import {LEARNING_REFERENCES,publishedReferences,referencesForTopic,referenceRoute,learningReferencesSection,referenceView} from '../dist/learning-references.mjs';
const chart=LEARNING_REFERENCES[0];
const app=fs.readFileSync(new URL('../dist/app.mjs',import.meta.url),'utf8');
function topicHtml(topic,resources=[]){
 const source=app.slice(app.indexOf('function topics('),app.indexOf('const learning={'));
 const context=vm.createContext({TOPICS,selectResources,sortTopicResources,yearLabel,learningReferencesSection,state:{vocabularyStatus:'ready',unitsStatus:'ready'},allResources:()=>resources,topicCard:(t,r)=>`<card data-type="${r.type}" data-id="${r.id}"></card>`});
 vm.runInContext(source,context);return context.topics(new URLSearchParams(`topic=${topic}`));
}
test('only the approved Number Chart is published; it is independent of vocabulary and spans all years',()=>{
 assert.equal(LEARNING_REFERENCES.length,1);const [item]=publishedReferences();assert.equal(item.type,'learning-reference');assert.equal(item.title,'Number Chart 0–100');assert.equal(item.chinese,'数字表 0–100');assert.equal(item.yearLevels,null);assert.deepEqual(item.topics,['numbers']);assert.equal(item.items,undefined);
 for(let year=0;year<=6;year++)assert.equal(referencesForTopic('numbers',{year}).length,1);
 assert.equal(referencesForTopic('animals').length,0);assert.equal(referencesForTopic('unknown').length,0);
});
test('references reuse canonical multi-topic order, deduplicate IDs and exclude invalid/unpublished data',()=>{
 const source=[{...chart,id:'multi',topicIds:['people','numbers','numbers','bogus'],yearLevels:[2,3]}, {...chart,id:'draft',published:false},{...chart,id:'deleted',deleted:true},{...chart,id:'invalid',topicIds:['bogus']},{...chart,id:'bad-year',yearLevels:[9]},{...chart}];
 const refs=publishedReferences(source);assert.deepEqual(refs.map(r=>r.id),['multi',chart.id]);assert.deepEqual(refs[0].topics,['numbers','people']);assert.equal(referencesForTopic('people',{source,year:2}).length,1);assert.equal(referencesForTopic('people',{source,year:1}).length,0);
 assert.equal(publishedReferences([{...chart},{...chart}]).length,1);assert.equal(publishedReferences(null).length,0);
});
test('asset paths stay same-site and markup is escaped',()=>{
 for(const unsafe of ['javascript:alert(1)','//evil.example/chart.svg','https://evil.example/chart.svg','assets/learning-references/../chart.svg'])assert.equal(publishedReferences([{...chart,assets:{...chart.assets,svg:unsafe}}]).length,0);
 const html=learningReferencesSection('numbers',{source:[{...chart,title:'<img src=x onerror=evil()>',chineseTitle:'<script>'}]});assert(html.includes('&lt;img'));assert(!html.includes('<script>'));assert(!html.includes('onerror="'));
});
test('topic sections have the requested order and retain existing public Units after vocabulary',()=>{
 const vocab=vocabularyResources([{id:'year2-numbers-ii',title:'Numbers II',yearLevel:2,published:true,topicIds:['numbers'],items:[]}]);const unit={id:'prep-numbers',type:'unit',title:'Numbers Unit',year:0,topics:['numbers']};
 const html=topicHtml('numbers',[...vocab,unit]);assert(html.indexOf('<h1>Numbers')<html.indexOf('Learning References'));assert(html.indexOf('Learning References')<html.indexOf('>Vocabulary Sets<'));assert(html.indexOf('>Vocabulary Sets<')<html.indexOf('>Units<'));assert(html.includes('data-id="prep-numbers"'));assert(html.includes('data-id="year2-numbers-ii"'));
 assert(!topicHtml('animals').includes('Learning References'));assert.equal(learningReferencesSection('numbers',{source:[{...chart,published:false}]}),'');
});
test('reference-only topics are navigable without inventing a year or decorative link badges',()=>{
 const source=app.slice(app.indexOf('function topicCard('),app.indexOf('function topics('));const context=vm.createContext({referencesForTopic,topicYears:()=>[],allResources:()=>[],state:{vocabularyStatus:'ready',unitsStatus:'ready'},topicArt:()=>'',yearBadge:()=>'',escape:x=>x});vm.runInContext(source,context);
 const html=context.topicCard(TOPICS.find(t=>t.id==='numbers'));assert(html.includes('href="#/topics?topic=numbers"'));assert(html.includes('All year levels'));assert(!html.includes('circle'));assert(!html.includes('→'));
 const section=learningReferencesSection('numbers');assert(!section.includes('→'));assert(!section.includes('class="circle"'));assert.equal((section.match(/<a /g)||[]).length,1);
});
test('viewer deep links resolve a published resource and retain the valid parent topic',()=>{
 const item=publishedReferences()[0];assert.equal(referenceRoute(item,'numbers'),'#/reference?id=number-chart-0-100&topic=numbers');assert.equal(referenceRoute(item,'bogus'),referenceRoute(item,'numbers'));
 const html=referenceView(item.id,'numbers');assert(html.includes('href="#/topics?topic=numbers"'));assert(html.includes('Printable PDF (A4 landscape)'));assert(html.includes('data-reference-zoom'));assert(html.includes('data-reference-fullscreen'));assert(html.includes('target="_blank" rel="noopener"'));assert(!html.includes('iframe'));assert(!referenceView('unknown','numbers').includes('<img'));assert(!referenceView(item.id,'numbers',{source:[{...chart,published:false}]}).includes('<img'));
 assert(app.includes("page==='reference'?'topics':page"));const index=fs.readFileSync(new URL('../dist/index.html',import.meta.url),'utf8');assert(!index.includes('data-page="reference"'));
});
test('references introduce no cloud writes, authentication or admin editor',()=>{
 const source=fs.readFileSync(new URL('../dist/learning-references.mjs',import.meta.url),'utf8');assert(!/fetch\(|firestore|signIn|setDoc\(|updateDoc\(/.test(source));assert(!app.includes('reference-admin'));
});

test('approved archived SVG, PNG and PDF are shipped byte-identical without regeneration',()=>{
 const hashes={"number_chart_0_100.svg":"d5ea3df178b4685d26ac8089d4fc724f45571003caa17fa72c096fdc0444bd22","number_chart_0_100.png":"631b3866d9aa0dc2d5daa7867bab95baa6891d782cde1f099f3ca612f97f1d53","number_chart_0_100.pdf":"cb7e2375be756dd9ca4a3e150836bedfbc14933c905913a885d6fd53f9cfd2bd"};
 for(const [file,sha]of Object.entries(hashes)){const bytes=fs.readFileSync(new URL('../dist/assets/learning-references/number-chart-0-100/'+file,import.meta.url));assert.equal(createHash('sha256').update(bytes).digest('hex'),sha);}
});

test('full-screen fallback supports iPads without the native API, Escape, focus restoration and route cleanup',async()=>{
 const {wireReferenceView}=await import('../dist/learning-references.mjs');const original=globalThis.document;const flags=new Set();let keyboard,focused='';const body={style:{overflow:'auto'}};const area={classList:{contains:k=>flags.has(k),add:k=>flags.add(k),remove:k=>flags.delete(k),toggle:k=>{if(flags.has(k)){flags.delete(k);return false;}flags.add(k);return true;}},focus:()=>focused='chart',addEventListener:(name,fn)=>keyboard=fn,removeEventListener:()=>{},requestFullscreen:async()=>{throw Error('Native unavailable');}};const zoom={setAttribute:()=>{}},full={hidden:true,focus:()=>focused='full'},exit={hidden:true,focus:()=>focused='exit'};const controls={'.reference-canvas':area,'[data-reference-zoom]':zoom,'[data-reference-fullscreen]':full,'[data-reference-exit]':exit};
 try{globalThis.document={body,querySelectorAll:()=>[],fullscreenEnabled:true,addEventListener:()=>{},removeEventListener:()=>{}};const cleanup=wireReferenceView({querySelector:s=>controls[s],querySelectorAll:()=>[]});await full.onclick();assert(flags.has('reference-overlay'));assert.equal(body.style.overflow,'hidden');assert.equal(exit.hidden,false);assert.equal(focused,'chart');keyboard({key:'Escape',preventDefault:()=>{}});assert(!flags.has('reference-overlay'));assert.equal(body.style.overflow,'auto');assert.equal(focused,'full');await full.onclick();cleanup();assert(!flags.has('reference-overlay'));assert.equal(body.style.overflow,'auto');}finally{globalThis.document=original;}
});

test('late vocabulary/unit loading does not close or reset an active reference viewer',async()=>{
 const source=app.slice(app.indexOf('let refreshVersion=0;'),app.indexOf('\nrefreshData();'));
 for(const page of ['reference','topics']){let renders=0;const state={};const context=vm.createContext({state,route:()=>({page}),render:()=>renders++,loadVocabulary:async()=>['vocab'],loadUnits:async()=>['unit'],document:{activeElement:null},HTMLInputElement:class{},HTMLSelectElement:class{}});vm.runInContext(source,context);await context.refreshData();assert.equal(renders,page==='reference'?1:2);assert.equal(state.vocabularyStatus,'ready');assert.equal(state.unitsStatus,'ready');}
});

test('the independent resource model permits a preview without optional vector/PDF files and carries its own alt text',()=>{
 const source=[{...chart,assets:{png:chart.assets.png},altText:'A teacher-provided reference description'}];const [item]=publishedReferences(source);assert(item);assert.equal(item.assets.svg,null);assert.equal(item.assets.pdf,null);const html=referenceView(item.id,'numbers',{source});assert(!html.includes('Printable PDF'));assert(html.includes('A teacher-provided reference description'));assert(html.includes(`src="${chart.assets.png}"`));assert(!html.includes('href="null"'));
});
