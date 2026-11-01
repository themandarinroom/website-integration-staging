// Anonymous, staging-only adapter. No Auth, teacher store, cache or sample imports.
export const STUDENT_PROJECT = 'the-mandarin-room-staging';
const ROOT = `https://firestore.googleapis.com/v1/projects/${STUDENT_PROJECT}/databases/(default)/documents`;
const validId = id => typeof id === 'string' && id.length <= 100 && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id);
const TOPICS = new Set(['numbers','family','food','animals','weather','countries','school','colours','body-parts','time','people','culture']);
const https = value => { try { const url = new URL(value); return url.protocol === 'https:' && !url.username && !url.password ? value : ''; } catch { return ''; } };
function decode(value) {
  if ('stringValue' in value) return value.stringValue;
  if ('integerValue' in value) return Number(value.integerValue);
  if ('booleanValue' in value) return value.booleanValue;
  if ('arrayValue' in value) return (value.arrayValue.values || []).map(decode);
  if ('mapValue' in value) return fields(value.mapValue.fields || {});
  return null;
}
function fields(value) { return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, decode(entry)])); }
export function studentUnit(value, expectedId = value?.id) {
  if (!value || value.schemaVersion !== 1 || value.published !== true || value.approvedForStudents !== true || !validId(value.id) || value.id.length > 80 || value.id !== expectedId || !Number.isInteger(value.yearLevel) || value.yearLevel < 0 || value.yearLevel > 6 || typeof value.englishTitle !== 'string' || !Array.isArray(value.lessons) || !value.lessons.length) return null;
  const ids = new Set();
  const lessons = [];
  for (const lesson of value.lessons) {
    if (!lesson || !validId(lesson.id) || ids.has(lesson.id) || typeof lesson.title !== 'string') return null;
    ids.add(lesson.id);
    lessons.push({ id: lesson.id, title: lesson.title, learningIntention: String(lesson.learningIntention || ''), content: String(lesson.content || ''),
      links: (Array.isArray(lesson.links) ? lesson.links : []).filter(link => link && typeof link.label === 'string' && https(link.url)).map(link => ({ label: link.label, url: link.url })),
      workedExamples: (Array.isArray(lesson.workedExamples) ? lesson.workedExamples : []).filter(example => example && https(example.url)).map(example => ({ url: example.url, alt: String(example.alt || '') })) });
  }
  return { id: value.id, yearLevel: value.yearLevel, englishTitle: value.englishTitle, chineseTitle: String(value.chineseTitle || ''), description: String(value.description || ''), topics: (Array.isArray(value.topics) ? value.topics : []).filter(topic => TOPICS.has(topic)), lessons };
}
async function request(url, body) {
  const controller = new AbortController(), timer = setTimeout(() => controller.abort(), 10000);
  try {
    const response = await fetch(url, { ...(body ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : {}), signal: controller.signal, credentials: 'omit', cache: 'no-store', referrerPolicy: 'no-referrer' });
    if (!response.ok) throw new Error('Public Unit unavailable');
    return await response.json();
  } finally { clearTimeout(timer); }
}
export async function getStudentUnit(id) {
  if (!validId(id) || id.length > 80) return null;
  try { const document = await request(`${ROOT}/publicUnits/${encodeURIComponent(id)}`); return studentUnit(fields(document.fields || {}), id); } catch { return null; }
}
export const publicUnitQuery = { structuredQuery: { from: [{ collectionId: 'publicUnits' }], where: { compositeFilter: { op: 'AND', filters: [...['published','approvedForStudents'].map(fieldPath => ({ fieldFilter: { field: { fieldPath }, op: 'EQUAL', value: { booleanValue: true } } })), { fieldFilter: { field: { fieldPath: 'schemaVersion' }, op: 'EQUAL', value: { integerValue: '1' } } }] } } } };
export async function listStudentUnits() {
  const rows = await request(`${ROOT}:runQuery`, publicUnitQuery);
  if (!Array.isArray(rows)) throw new Error('Public Units unavailable');
  return rows.filter(row => row.document?.fields).map(row => studentUnit(fields(row.document.fields), row.document.name.split('/').pop())).filter(Boolean);
}
