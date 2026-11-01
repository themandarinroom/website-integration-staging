// Anonymous active-publication reads only. No Auth, private configuration or cache.
import {validGrade,validYear,validId,journeyId} from './journey-model.mjs';
import {getStudentUnit} from './unit-viewer/student-data.mjs';
const ROOT = 'https://firestore.googleapis.com/v1/projects/the-mandarin-room-staging/databases/(default)/documents';
function decode(v) {
  if ('stringValue' in v) return v.stringValue;
  if ('integerValue' in v) return Number(v.integerValue);
  if ('arrayValue' in v) return (v.arrayValue.values || []).map(decode);
  if ('mapValue' in v) return fields(v.mapValue.fields || {});
  return null;
}
const fields = value => Object.fromEntries(Object.entries(value).map(([key,v]) => [key,decode(v)]));
async function read(path) {
  const controller = new AbortController(), timer = setTimeout(() => controller.abort(),10000);
  try {
    const response = await fetch(`${ROOT}/${path}`,{credentials:'omit',cache:'no-store',referrerPolicy:'no-referrer',signal:controller.signal});
    if (!response.ok) throw Error('Journey unavailable');
    return fields((await response.json()).fields || {});
  } finally { clearTimeout(timer); }
}
export function publishedJourney(value, pointer, grade) {
  if (!validGrade(grade) || !validYear(pointer?.academicYear) || pointer.yearLevel !== grade || pointer.journeyId !== journeyId(pointer.academicYear,grade) || !Number.isSafeInteger(pointer.revision) || pointer.revision < 1 || value?.schemaVersion !== 1 || value.academicYear !== pointer.academicYear || value.yearLevel !== grade || value.revision !== pointer.revision || !Array.isArray(value.slots) || value.slots.length > 100) return null;
  let current = 0; const ids = new Set(), slots = [];
  for (const [order,item] of value.slots.entries()) {
    if (item?.order !== order || !['completed','current','upcoming'].includes(item.status)) return null;
    if (item.status === 'upcoming') { slots.push({order,status:'upcoming'}); continue; }
    if (!validId(item.unitId) || ids.has(item.unitId) || item.status === 'current' && ++current > 1) return null;
    ids.add(item.unitId); slots.push({order,status:item.status,unitId:item.unitId});
  }
  return {academicYear:value.academicYear,yearLevel:grade,revision:value.revision,slots};
}
export async function loadJourney(grade) {
  if (!validGrade(grade)) return null;
  // One retry handles a publication switching the active pointer between reads.
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const pointer = await read(`journeySettings/${grade === 0 ? 'prep' : 'year-'+grade}`);
      if (!validYear(pointer.academicYear) || pointer.yearLevel !== grade || pointer.journeyId !== journeyId(pointer.academicYear,grade)) return null;
      const journey = publishedJourney(await read(`publishedJourneys/${pointer.journeyId}`),pointer,grade);
      if (!journey) continue;
      const units = new Map(await Promise.all(journey.slots.filter(slot => slot.status !== 'upcoming').map(async slot => [slot.unitId,await getStudentUnit(slot.unitId)])));
      return {...journey,units};
    } catch { /* Fail closed when absent, revoked, offline, or switching years. */ }
  }
  return null;
}
