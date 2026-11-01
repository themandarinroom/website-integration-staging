import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {adminPanel} from '../dist/admin-session.mjs';import {parseRoute} from '../dist/routing.mjs';import {renderUnit} from '../dist/unit-viewer/unit-renderer.mjs';
const read=file=>fs.readFileSync(new URL('../dist/'+file,import.meta.url),'utf8');
test('private management is linked only in the authorised Dashboard',()=>{assert(adminPanel({phase:'authorised'}).html.includes('href="unit-management.html"'));for(const phase of ['signed-out','checking','denied','error'])assert(!adminPanel({phase}).html.includes('unit-management.html'));assert(!read('index.html').includes('data-page="units"'));});
test('direct teacher routes render no private content before server-checked auth',()=>{const html=read('unit-management.html'),controller=read('unit-management.mjs'),adapter=read('teacher-unit-data.mjs');assert(html.includes('id="private-unit-library" hidden'));assert(controller.includes('startAdminSession'));assert(controller.includes("panel.title!=='Admin Dashboard'"));assert(adapter.includes('assertAuthorisedTeacher'));assert(adapter.includes("cache:'no-store'"));assert(adapter.includes("credentials:'omit'"));assert(!/localStorage|sessionStorage|sampleUnit|setDoc|updateDoc|deleteDoc/.test(adapter));assert(!html.includes('prep-colours'));});
test('legacy browsing redirects Home, while Student Viewer and Journey routes are preserved',()=>{for(const hash of ['#/units','#/units?unit=private-unit','#/units?year=3'])assert.equal(parseRoute(hash).redirect,'#/');assert.equal(parseRoute('#/unit?unit=approved-unit').page,'unit');assert.equal(parseRoute('#/journey?year=4').page,'journey');assert(read('units/index.html').includes('url=../#/'));});
test('student rendering still strips all teacher notes and editing controls',()=>{const unit={id:'approved-unit',englishTitle:'Approved',yearLevel:4,lessons:[{id:'a',title:'Approved lesson',content:'Approved activity',notes:'PRIVATE NOTE',resources:'PRIVATE LINK',workedExamples:[]}]};const html=renderUnit(unit,{student:true,backHref:'#/'});assert(!html.includes('PRIVATE'));assert(!html.includes('Edit unit'));assert(html.includes('Approved activity'));const adapter=read('unit-viewer/student-data.mjs');assert(!/\/units\/|localStorage|sampleUnit/.test(adapter));assert(adapter.includes('/publicUnits/'));});
test('reuse build sources the existing list/editor links rather than shipping a duplicate editor',()=>{const script=fs.readFileSync(new URL('../scripts/build-student-viewer.mjs',import.meta.url),'utf8');assert(script.includes("new URL('index.js',source)"));assert(script.includes('https://themandarinroom.github.io/units/edit.html?'));assert(!script.includes("new URL('edit.js',source)"));});

import {assertAuthorisedTeacher} from '../dist/admin-session.mjs';
test('real teacher authorisation fails closed for signed-out, unverified, inactive and denied responses',async()=>{
 const original=global.fetch,user={uid:'synthetic-teacher',emailVerified:true,getIdToken:async()=>'synthetic-token'},services={app:{options:{projectId:'the-mandarin-room-staging'}},auth:{currentUser:user}};
 try{
  let calls=0;global.fetch=async()=>{calls++;return {ok:true,json:async()=>({fields:{active:{booleanValue:true}}})};};
  for(const currentUser of [null,{...user,emailVerified:false}])await assert.rejects(assertAuthorisedTeacher({...services,auth:{currentUser}}));assert.equal(calls,0);
  for(const [ok,body]of [[false,{}],[true,{fields:{active:{booleanValue:false}}}],[true,{fields:{}}]]){global.fetch=async()=>({ok,json:async()=>body});await assert.rejects(assertAuthorisedTeacher(services));}
  global.fetch=async()=>{throw Error('offline')};await assert.rejects(assertAuthorisedTeacher(services),/offline/);
 }finally{global.fetch=original;}
});
test('teacher authorisation reads only its staging allowlist record with current credentials and no cache',async()=>{
 const original=global.fetch,user={uid:'synthetic-teacher',emailVerified:true,getIdToken:async()=>'synthetic-token'},services={app:{options:{projectId:'the-mandarin-room-staging'}},auth:{currentUser:user}};
 try{global.fetch=async(url,options)=>{assert(url.endsWith('/authorizedTeachers/synthetic-teacher'));assert(url.includes('/the-mandarin-room-staging/'));assert.equal(options.credentials,'omit');assert.equal(options.cache,'no-store');return {ok:true,json:async()=>({fields:{active:{booleanValue:true}}})};};assert.equal(await assertAuthorisedTeacher(services),user);}finally{global.fetch=original;}
});
