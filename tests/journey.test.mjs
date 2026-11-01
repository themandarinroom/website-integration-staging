import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {copyPlacements,changeStatus,publicSlots,validatePlacements} from '../dist/journey-model.mjs';
import {publishedJourney,loadJourney} from '../dist/journey-data.mjs';
import {renderJourney} from '../dist/journey-view.mjs';
import {parseRoute} from '../dist/routing.mjs';
const placements=[{unitId:'completed-unit',status:'completed'},{unitId:'current-unit',status:'current'},{unitId:'secret-unit',status:'upcoming'}];
const pointer={academicYear:2026,yearLevel:4,journeyId:'2026_year-4',revision:3};
const doc={schemaVersion:1,academicYear:2026,yearLevel:4,revision:3,slots:publicSlots(placements)};
const unit=id=>({id,schemaVersion:1,yearLevel:1,englishTitle:'Approved '+id,chineseTitle:'中文',description:'Approved description',published:true,approvedForStudents:true,lessons:[{id:'first',title:'First lesson',workedExamples:[{url:'https://example.org/map.png'}]}]});
const encode=v=>typeof v==='string'?{stringValue:v}:typeof v==='number'?{integerValue:String(v)}:typeof v==='boolean'?{booleanValue:v}:Array.isArray(v)?{arrayValue:{values:v.map(encode)}}:{mapValue:{fields:Object.fromEntries(Object.entries(v).map(([k,v])=>[k,encode(v)]))}};
test('all seven staircase links open shareable Journey routes without replacing artwork',()=>{
 const source=fs.readFileSync(new URL('../dist/app.mjs',import.meta.url),'utf8');
 assert(source.includes('href="#/journey?year=${y}"'));assert(source.includes('assets/year-staircase.png'));
 for(let year=0;year<7;year++){const r=parseRoute(`#/journey?year=${year}`);assert.equal(r.page,'journey');assert.equal(r.params.get('year'),String(year));}
});
test('published projection validates active year, grade, revision and unique Current',()=>{
 assert.deepEqual(publishedJourney(doc,pointer,4).slots,doc.slots);
 for(const [value,p,grade] of [[doc,{...pointer,academicYear:2027},4],[doc,pointer,5],[{...doc,revision:2},pointer,4],[{...doc,slots:[{order:0,status:'current',unitId:'a'},{order:1,status:'current',unitId:'b'}]},pointer,4]])assert.equal(publishedJourney(value,p,grade),null);
 const extra={...doc,slots:[{order:0,status:'upcoming',unitId:'PRIVATE',title:'PRIVATE',description:'PRIVATE'}]};
 assert.deepEqual(publishedJourney(extra,pointer,4).slots,[{order:0,status:'upcoming'}]);
});
test('student adapter fetches only active publication and visible approved Units with anonymous no-cache requests',async()=>{
 const original=global.fetch,calls=[];
 global.fetch=async(url,options)=>{calls.push({url,options});const value=url.endsWith('journeySettings/year-4')?pointer:url.endsWith('publishedJourneys/2026_year-4')?doc:unit(url.split('/').pop());return {ok:true,json:async()=>({fields:encode(value).mapValue.fields})};};
 try{
  const result=await loadJourney(4);assert.equal(result.units.size,2);assert.equal(result.units.get('current-unit').yearLevel,1);
  assert(!JSON.stringify(calls).includes('secret-unit'));assert(!JSON.stringify(calls).includes('learningJourneys'));
  assert(calls.every(c=>c.url.includes('/the-mandarin-room-staging/')&&c.options.credentials==='omit'&&c.options.cache==='no-store'));
 }finally{global.fetch=original;}
});
test('pointer changes retry once; invalid or unavailable Journeys fail closed without private fallbacks',async()=>{
 const original=global.fetch;let count=0;
 global.fetch=async url=>{count++;const value=url.includes('journeySettings')?pointer:{...doc,revision:2};return {ok:true,json:async()=>({fields:encode(value).mapValue.fields})};};
 try{assert.equal(await loadJourney(4),null);assert.equal(count,4);assert.equal(await loadJourney(null),null);}finally{global.fetch=original;}
});
test('timeline omits Upcoming references and content; Viewer actions and Explore More stay independent',()=>{
 const journey={...doc,units:new Map([['completed-unit',unit('completed-unit')],['current-unit',unit('current-unit')],['secret-unit',{...unit('secret-unit'),englishTitle:'SECRET TITLE'}]])};
 const html=renderJourney(journey,4);
 assert(html.includes('Continue Learning'));assert(html.includes('Review'));assert(html.includes('#/unit?unit=current-unit'));assert(html.includes('#/unit?unit=completed-unit'));
 assert(renderJourney(journey,4,{base:'./'}).includes('href="./#/unit?unit=current-unit"'));
 assert(!html.includes('secret-unit'));assert(!html.includes('SECRET TITLE'));assert(html.includes('Coming Soon'));assert(html.includes('year-4'));
 for(const label of ['Explore Words','Explore Topics','Play &amp; Practise'])assert(html.includes(label)&&renderJourney(null,4).includes(label));
 assert(!renderJourney({...journey,units:new Map()},4).includes('#/unit?unit='));
 assert(!renderJourney({...journey,units:new Map([['current-unit',{...unit('current-unit'),englishTitle:'<script>',description:'<img onerror=x>'}]])},4).includes('<script>'));
});
test('copy retains stable Unit order, resets every status, and never mutates original records',()=>{
 const before=JSON.stringify(placements),copy=copyPlacements(placements);
 assert.deepEqual(copy.map(p=>p.unitId),placements.map(p=>p.unitId));assert(copy.every(p=>p.status==='upcoming'));assert.equal(JSON.stringify(placements),before);
 assert.throws(()=>validatePlacements([placements[0],placements[0]]),/unique/);
});
test('changing Current offers Completed or Upcoming for previous Current without creating duplicates',()=>{
 for(const previous of ['completed','upcoming']){
  const changed=changeStatus(placements,2,'current',previous);assert.equal(changed[1].status,previous);assert.equal(changed[2].status,'current');assert.equal(changed.filter(p=>p.status==='current').length,1);
 }
 assert.throws(()=>validatePlacements([{unitId:'a',status:'current'},{unitId:'b',status:'current'}]),/one/);
});
test('Admin reuses existing auth and callables; no direct writes, production targets or private preview links',()=>{
 const source=fs.readFileSync(new URL('../dist/journey-admin.mjs',import.meta.url),'utf8');
 assert(source.includes('user.emailVerified'));assert(source.includes("'authorizedTeachers'"));assert(source.includes('teacher.data().active !== true'));
 assert(source.includes("'saveJourney'"));assert(source.includes("'publishJourney'"));assert(source.includes('expectedRevision:revision'));assert(source.includes('functions/aborted'));
 assert(source.includes('publicSlots(placements)'));assert(!/setDoc|addDoc|updateDoc|deleteDoc|localStorage/.test(source));
 const student=['journey-data.mjs','journey-view.mjs'].map(p=>fs.readFileSync(new URL('../dist/'+p,import.meta.url),'utf8')).join('');
 assert(!/learningJourneys|localStorage|sessionStorage|signInWithPopup/.test(student));
});
