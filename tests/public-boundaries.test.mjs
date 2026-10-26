import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {vocabularyResources,unitResources,selectResources,topicYears,safeHttps,LINKS,TOPICS} from '../dist/catalog.mjs';
import {decodeValue,decodeFields,publishedQuery,loadVocabulary,loadUnits,loadTeacherVoice} from '../dist/public-data.mjs';
const sample={id:'prep-numbers',title:'Numbers 0-10',yearLevel:0,published:true,items:[{id:'one',chinese:'一',pinyin:'yi',image:'https://example.com/one.webp'}]};
const publishedIndex={schemaVersion:1,provider:'the-mandarin-room-unit-library',units:[{id:'year-5-countries',title:'Countries',yearLevel:5,lessons:[{id:'introduction',title:'Introduction'}],url:'https://attacker.example/'}]};

test('unpublished, deleted, invalid-year and invalid-ID vocabulary cannot enter the catalog',()=>{
 const input=[sample,{...sample,published:false},{...sample,published:undefined},{...sample,deleted:true},{...sample,yearLevel:7},{...sample,yearLevel:'0'},{...sample,id:'<script>'}];
 assert.equal(vocabularyResources(input).length,1);
});
test('preview strips author metadata and embedded audio paths',()=>{
 const [resource]=vocabularyResources([{...sample,updatedBy:'private',teacherEmail:'private',items:[{...sample.items[0],notes:'private',audio:{teacherAudioUrl:'https://example.com/private'}}]}]);
 assert.equal('updatedBy'in resource,false);assert.equal('teacherEmail'in resource,false);assert.equal('notes'in resource.items[0],false);assert.equal('audio'in resource.items[0],false);
});
test('unknown set IDs never acquire guessed topic or year relationships',()=>{
 const [unknown]=vocabularyResources([{...sample,id:'unknown-numbers',title:'Numbers and every year'}]);
 assert.deepEqual(unknown.topics,[]);assert.deepEqual(topicYears([unknown],'numbers'),[]);
});
test('topic badges reflect published resource years only',()=>{
 const resources=vocabularyResources([sample,{...sample,id:'year3-age',yearLevel:3},{...sample,id:'year1-body-parts',yearLevel:1}]);
 assert.deepEqual(topicYears(resources,'numbers'),[0,3]);assert.deepEqual(topicYears(resources,'weather'),[]);
 assert.equal(selectResources(resources,{topic:'numbers',year:3}).length,1);
});
test('search supports English, Chinese and year labels without interpreting markup',()=>{
 const resources=vocabularyResources([{...sample,chineseTitle:'数字'}]);
 for(const query of ['Numbers','数字','Prep'])assert.equal(selectResources(resources,{query}).length,1);
 assert.equal(selectResources(resources,{query:'<script>'}).length,0);
});
test('unsafe image schemes and credentials are rejected',()=>{
 for(const url of ['javascript:alert(1)','data:image/svg+xml,test','http://example.com','https://user:pass@example.com','https://'])assert.equal(safeHttps(url),'');
 assert.equal(safeHttps('https://example.com/a.webp'),'https://example.com/a.webp');
});
test('Units accepts only its public index contract and reconstructs canonical URLs',()=>{
 assert.deepEqual(unitResources({units:publishedIndex.units}),[]);
 const [unit]=unitResources(publishedIndex);assert.equal(unit.year,5);assert.equal(unit.lessons.length,1);
 assert.equal(unit.url,LINKS.units+'view.html?unit=year-5-countries');assert.equal('notes'in unit,false);
});
test('Firestore decoding preserves nested arrays, booleans, null and numbers',()=>{
 assert.deepEqual(decodeValue({arrayValue:{values:[{stringValue:'一'},{integerValue:'1'},{booleanValue:true},{nullValue:null}]}}),['一',1,true,null]);
 assert.deepEqual(decodeFields({items:{mapValue:{fields:{count:{integerValue:'2'}}}}}),{items:{count:2}});
});
test('anonymous query includes published predicate and excludes identity fields',()=>{
 assert.equal(publishedQuery.structuredQuery.where.fieldFilter.field.fieldPath,'published');
 assert.equal(publishedQuery.structuredQuery.where.fieldFilter.value.booleanValue,true);
 assert(!JSON.stringify(publishedQuery).includes('updatedBy'));
});
test('network adapter uses anonymous no-cache read-only endpoints',async()=>{
 const original=global.fetch;const calls=[];
 global.fetch=async(url,options)=>{calls.push({url,options});return {ok:true,json:async()=>url.endsWith(':runQuery')?[{document:{fields:{id:{stringValue:'prep-numbers'},title:{stringValue:'Numbers'},yearLevel:{integerValue:'0'},published:{booleanValue:true}}}}]:publishedIndex};};
 try{assert.equal((await loadVocabulary()).length,1);assert.equal((await loadUnits()).length,1);
 for(const {url,options}of calls){assert.equal(options.credentials,'omit');assert.equal(options.cache,'no-store');if(url.includes('/units/'))assert.equal(url,LINKS.unitIndex);}
 assert.equal(calls[0].options.method,'POST');assert(calls[0].url.endsWith(':runQuery'));
 }finally{global.fetch=original;}
});
test('Teacher Voice rejects mismatched identities and arbitrary audio hosts',async()=>{
 const original=global.fetch;let data={setId:{stringValue:'other'},itemId:{stringValue:'one'},teacherAudioUrl:{stringValue:'https://firebasestorage.googleapis.com/audio'}};
 global.fetch=async()=>({ok:true,json:async()=>({fields:data})});
 try{assert.equal(await loadTeacherVoice('prep-numbers','one'),'');data.setId.stringValue='prep-numbers';data.teacherAudioUrl.stringValue='https://attacker.example/audio';assert.equal(await loadTeacherVoice('prep-numbers','one'),'');data.teacherAudioUrl.stringValue='https://firebasestorage.googleapis.com/audio';assert.match(await loadTeacherVoice('prep-numbers','one'),/^https:\/\/firebasestorage.googleapis.com/);}finally{global.fetch=original;}
});
test('six navigation links, staging noindex, restrictive CSP, and no third-party scripts',()=>{
 const html=fs.readFileSync(new URL('../dist/index.html',import.meta.url),'utf8');
 assert.equal((html.match(/data-page=/g)||[]).length,6);assert.match(html,/noindex,nofollow/);assert.match(html,/form-action 'none'/);assert.match(html,/object-src 'none'/);assert(!/<script[^>]+src="https:/.test(html));assert(!html.includes('Teacher Login'));
});
test('frontend cannot write Firebase, collect contact data or add tracking',()=>{
 const app=fs.readFileSync(new URL('../dist/app.mjs',import.meta.url),'utf8');
 assert.match(app,/<fieldset disabled>/);assert.match(app,/required/);assert.match(app,/role="status"/);
 const sources=['app.mjs','public-data.mjs','catalog.mjs'].map(p=>fs.readFileSync(new URL('../dist/'+p,import.meta.url),'utf8')).join('');
 assert(!/setDoc|addDoc|updateDoc|deleteDoc|signIn|localStorage|sessionStorage|sendBeacon|gtag\(|analytics\(/.test(sources));
});
test('topic IDs are unique and all twelve approved categories are present',()=>{
 assert.equal(TOPICS.length,12);assert.equal(new Set(TOPICS.map(t=>t.id)).size,12);
});
