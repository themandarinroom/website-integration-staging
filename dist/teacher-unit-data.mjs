// Server-only private Unit reads after existing teacher authorisation. No cache or sample fallback.
import {getFirebaseServices} from './unit-viewer/firebase.js';
import {assertAuthorisedTeacher} from './admin-session.mjs?v=units-admin-1';
export {yearLabel} from './catalog.mjs';
const ROOT='https://firestore.googleapis.com/v1/projects/the-mandarin-room-staging/databases/(default)/documents/units';
function decode(v){if('stringValue'in v)return v.stringValue;if('integerValue'in v)return Number(v.integerValue);if('booleanValue'in v)return v.booleanValue;if('arrayValue'in v)return(v.arrayValue.values||[]).map(decode);if('mapValue'in v)return fields(v.mapValue.fields||{});return null;}
const fields=value=>Object.fromEntries(Object.entries(value).map(([k,v])=>[k,decode(v)]));
async function read(url){
 const services=await getFirebaseServices(),user=await assertAuthorisedTeacher(services);
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),12000);
 try{const response=await fetch(url,{headers:{Authorization:`Bearer ${await user.getIdToken()}`},credentials:'omit',cache:'no-store',signal:controller.signal});if(response.status===404)return null;if(!response.ok)throw Error('Private Unit access unavailable.');return await response.json();}finally{clearTimeout(timer);}
}
export async function getUnits(){let units=[],page='';do{const result=await read(ROOT+'?pageSize=100'+(page?'&pageToken='+encodeURIComponent(page):''));for(const doc of result?.documents||[]){const unit=fields(doc.fields||{});if(unit.id===doc.name.split('/').pop()&&unit.deleted!==true)units.push(unit);}page=result?.nextPageToken||'';}while(page);return units;}
export async function getUnit(id){if(typeof id!=='string'||id.length>80||!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id))return null;const doc=await read(ROOT+'/'+encodeURIComponent(id)),unit=doc?fields(doc.fields||{}):null;return unit?.id===id&&unit.deleted!==true?unit:null;}
