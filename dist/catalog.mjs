export const LINKS = Object.freeze({
  vocabulary: 'https://themandarinroom.github.io/vocabularylibrary/',
  units: 'https://themandarinroom.github.io/units/',
  unitIndex: 'https://themandarinroom.github.io/units/unit-library-index.json',
  speaking: 'https://themandarinroom.github.io/speaking/student.html',
  randomiser: 'https://themandarinroom.github.io/vocabularylibrary/tools/word-randomizer/',
  live: 'https://themandarinroom.github.io/word-randomiser-staging/tools/word-randomizer/?firebase=staging'
});
export const TOPICS = [
  ['numbers','Numbers','数字','Counting, age, dates and more.',60,285,'pink'],
  ['family','Family','家庭','Family members and introducing family.',425,285,'peach'],
  ['food','Food','食物','Fruits, meals and food preferences.',795,285,'yellow'],
  ['animals','Animals','动物','Pets, wild animals and animal characteristics.',1156,285,'green'],
  ['weather','Weather','天气','Describing the weather and seasons.',59,530,'blue'],
  ['countries','Countries','国家','Country names, nationalities and places.',425,530,'lavender'],
  ['school','School','学校','School places, subjects and everyday life.',795,530,'pink'],
  ['colours','Colours','颜色','Recognising and using colours.',1156,530,'aqua'],
  ['body-parts','Body Parts','身体部位','Naming body parts and simple descriptions.',59,775,'green'],
  ['time','Time','时间','Telling the time and daily routines.',425,775,'yellow'],
  ['people','People','人物','Describing people, nationalities and friends.',795,775,'blue'],
  ['culture','Culture','文化','Festivals, traditions and cultural activities.',1156,775,'lavender']
].map(([id,title,chinese,description,x,y,colour])=>({id,title,chinese,description,x,y,colour}));
// Reviewed against anonymous published Vocabulary metadata on 26 October 2026.
// Stable IDs only; no keyword-based year or curriculum inference.
export const VOCABULARY_TOPICS = Object.freeze({
  'prep-numbers':['numbers'], 'year1-body-parts':['body-parts'],
  'year1-pets':['animals'], 'year1-pets-ii':['animals'],
  'year2-family':['family'], 'year3-age':['numbers'],
  'year3-fruit':['food'], 'year5-countries':['countries']
});
// Only titles/relationships already published in the Units public metadata index.
export const UNIT_TOPICS = Object.freeze({'year-5-countries':['countries'],'year-6-chinese-names':['culture']});
export const yearLabel = year => year === 0 ? 'Prep' : `Year ${year}`;
export const validYear = value => Number.isInteger(value) && value >= 0 && value <= 6;
export const validId = value => typeof value === 'string' && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value);
export function safeHttps(value) {
  if (typeof value !== 'string' || !value.startsWith('https://')) return '';
  try { const url = new URL(value); return url.username || url.password ? '' : url.href; } catch { return ''; }
}
export function selectResources(resources, {year=null,topic=null,query=''}={}) {
  const term=query.trim().toLocaleLowerCase();
  return resources.filter(r => (year===null || r.year===year) && (!topic || r.topics.includes(topic)) &&
    (!term || `${r.title} ${r.chinese} ${r.description} ${yearLabel(r.year)}`.toLocaleLowerCase().includes(term)));
}
export function topicYears(resources, topic) {
  return [...new Set(selectResources(resources,{topic}).map(r=>r.year))].sort((a,b)=>a-b);
}
export function vocabularyResources(sets) {
  return sets.filter(s=>s.published===true && s.deleted!==true && validId(s.id) && validYear(s.yearLevel) && typeof s.title==='string')
    .map(s=>({id:s.id,type:'vocabulary',title:s.title,chinese:String(s.chineseTitle||''),description:String(s.description||''),year:s.yearLevel,
      topics:VOCABULARY_TOPICS[s.id]||[],url:`${LINKS.vocabulary}student.html?set=${encodeURIComponent(s.id)}`,
      items:(Array.isArray(s.items)?s.items:[]).filter(i=>validId(i.id) && typeof i.chinese==='string').map(i=>({
        id:i.id,chinese:i.chinese,pinyin:String(i.pinyin||''),english:String(i.english||''),image:safeHttps(i.image),aiEnabled:i.audio?.aiEnabled!==false
      }))}));
}
export function unitResources(index) {
  if(index?.schemaVersion!==1 || index?.provider!=='the-mandarin-room-unit-library' || !Array.isArray(index.units)) return [];
  return index.units.filter(u=>validId(u.id) && validYear(u.yearLevel) && typeof u.title==='string').map(u=>({
    id:u.id,type:'unit',title:u.title,chinese:'',description:'Unit preview · existing viewer may require Admin access.',year:u.yearLevel,
    topics:UNIT_TOPICS[u.id]||[],url:`${LINKS.units}view.html?unit=${encodeURIComponent(u.id)}`,
    lessons:(Array.isArray(u.lessons)?u.lessons:[]).filter(l=>validId(l.id)&&typeof l.title==='string').map(l=>({id:l.id,title:l.title}))
  }));
}
