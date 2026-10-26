import {LINKS,vocabularyResources,unitResources,safeHttps,validId} from './catalog.mjs';
const ROOT='https://firestore.googleapis.com/v1/projects/the-mandarin-room/databases/(default)/documents';
export function decodeValue(value) {
  if('stringValue' in value)return value.stringValue;
  if('integerValue' in value)return Number(value.integerValue);
  if('doubleValue' in value)return value.doubleValue;
  if('booleanValue' in value)return value.booleanValue;
  if('nullValue' in value)return null;
  if('arrayValue' in value)return (value.arrayValue.values||[]).map(decodeValue);
  if('mapValue' in value)return decodeFields(value.mapValue.fields||{});
  return null;
}
export function decodeFields(fields) { return Object.fromEntries(Object.entries(fields).map(([key,value])=>[key,decodeValue(value)])); }
async function request(url,options={}) {
  const controller=new AbortController(); const timeout=setTimeout(()=>controller.abort(),12000);
  try { const response=await fetch(url,{...options,signal:controller.signal,credentials:'omit',cache:'no-store',referrerPolicy:'no-referrer'});
    if(!response.ok)throw new Error(`Resource unavailable (${response.status})`); return await response.json();
  } finally {clearTimeout(timeout);}
}
export const publishedQuery={structuredQuery:{from:[{collectionId:'vocabularySets'}],
  where:{fieldFilter:{field:{fieldPath:'published'},op:'EQUAL',value:{booleanValue:true}}},
  select:{fields:['id','yearLevel','title','chineseTitle','description','items','published','deleted'].map(fieldPath=>({fieldPath}))}}};
export async function loadVocabulary() {
  const rows=await request(`${ROOT}:runQuery`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(publishedQuery)});
  if(!Array.isArray(rows))throw new Error('Invalid vocabulary response');
  return vocabularyResources(rows.filter(r=>r.document?.fields).map(r=>decodeFields(r.document.fields)));
}
export async function loadUnits() {return unitResources(await request(LINKS.unitIndex));}
export async function loadTeacherVoice(setId,itemId) {
  if(!validId(setId)||!validId(itemId))return '';
  try { const doc=await request(`${ROOT}/vocabularyTeacherVoices/${encodeURIComponent(setId+'--'+itemId)}`);
    const data=decodeFields(doc.fields||{});
    if(data.setId!==setId||data.itemId!==itemId)return '';
    const url=safeHttps(data.teacherAudioUrl);
    if(!url || new URL(url).hostname!=='firebasestorage.googleapis.com')return '';
    return url+(url.includes('?')?'&':'?')+'revision='+encodeURIComponent(data.revision||'latest');
  } catch {return '';}
}
