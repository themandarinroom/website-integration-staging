export const LINKS = Object.freeze({
  vocabulary: 'https://themandarinroom.github.io/vocabularylibrary/',
  units: 'https://themandarinroom.github.io/units/',
  unitIndex: 'https://themandarinroom.github.io/units/unit-library-index.json',
  speaking: 'https://themandarinroom.github.io/speaking/student.html',
  randomiser: 'https://themandarinroom.github.io/vocabularylibrary/tools/word-randomizer/',
  bingo: 'https://themandarinroom.github.io/vocabularylibrary/tools/bingo-board/',
  greatWall: 'https://themandarinroom.github.io/vocabularylibrary/tools/great-wall/',
  // Staging Tarsia (temporary GitHub Pages repo, D3); build-production.mjs rewrites it to the Vocabulary Library path.
  tarsia: 'https://themandarinroom.github.io/tarsia-staging/tools/tarsia-puzzle/',
  live: 'https://themandarinroom.github.io/word-randomiser-staging/tools/word-randomizer/?firebase=staging'
});
// Canonical topic taxonomy (v1.1, approved 25 November 2026: 13 topics). Must equal js/topic-taxonomy.js in the
// Vocabulary Library, which is the source of truth (tests/topics-restructure.test.mjs checks this).
// Colours and illustrations are website presentation only.
export const TOPICS = [
  ['numbers','Numbers','数字','Counting and using numbers.','pink'],
  ['colours','Colours','颜色','Recognising and using colours.','aqua'],
  ['people','People','人物','Family, body parts and personal information.','blue'],
  ['animals','Animals','动物','Pets, wild animals and animal vocabulary.','green'],
  ['social-interactions','Social Interactions','社交','Greetings, polite expressions and everyday social interactions.','peach'],
  ['food-drinks','Food & Drinks','餐饮','Fruit, food, drinks and food preferences.','yellow'],
  ['school','School','学校','School places and everyday school life.','pink'],
  ['free-time','Free Time','休闲活动','Sports, hobbies and leisure activities.','green'],
  ['countries','Countries','国家','Countries, nationalities and geographical places.','lavender'],
  ['time-weather','Time & Weather','时间与天气','Time, dates, seasons and weather.','blue'],
  ['culture','Culture','文化','Festivals, traditions and cultural vocabulary.','lavender'],
  ['nature','Nature','自然','Plants, natural landscapes and the environment.','green'],
  ['community','Community','社区','Community places, occupations, transport and everyday life.','blue']
].map(([id,title,chinese,description,colour])=>Object.freeze({id,title,chinese,description,colour}));
export const isTopicId = value => typeof value==='string' && TOPICS.some(t=>t.id===value);
// Retired topic IDs: the 12-topic structure used before 24 November 2026, and Greetings (24–25 November 2026).
// Only for old links and Unit metadata; they are mapped, never shown.
export const LEGACY_TOPIC_IDS = Object.freeze({family:'people','body-parts':'people',food:'food-drinks',weather:'time-weather',time:'time-weather',greetings:'social-interactions'});
export const currentTopicId = value => isTopicId(value) ? value : (LEGACY_TOPIC_IDS[value] || null);
export const currentTopicIds = values => [...new Set((Array.isArray(values)?values:[]).map(currentTopicId).filter(Boolean))];
// A vocabulary set's topics: topicIds (multi-topic) when present, else the single legacy topicId. Canonical order,
// no duplicates, only current IDs. The set stays one resource; it is matched by every topic it lists.
export const setTopics = s => { const list=Array.isArray(s?.topicIds)?s.topicIds:[s?.topicId]; const chosen=new Set(list.filter(isTopicId)); return TOPICS.map(t=>t.id).filter(id=>chosen.has(id)); };
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
    .map(s=>({id:s.id,type:'vocabulary',title:s.title,chinese:String(s.chineseTitle||''),description:String(s.description||''),year:s.yearLevel,coverImage:safeHttps(s.coverImage),
      topicId:setTopics(s)[0]||null,topics:setTopics(s),url:`${LINKS.vocabulary}student.html?set=${encodeURIComponent(s.id)}`,
      items:(Array.isArray(s.items)?s.items:[]).filter(i=>validId(i.id) && typeof i.chinese==='string').map(i=>({
        id:i.id,chinese:i.chinese,pinyin:String(i.pinyin||''),english:String(i.english||''),image:safeHttps(i.image),aiEnabled:i.audio?.aiEnabled!==false
      }))}));
}
export function unitResources(index) {
  if(index?.schemaVersion!==1 || index?.provider!=='the-mandarin-room-unit-library' || !Array.isArray(index.units)) return [];
  return index.units.filter(u=>validId(u.id) && validYear(u.yearLevel) && typeof u.title==='string').map(u=>({
    id:u.id,type:'unit',title:u.title,chinese:'',description:'Unit preview · existing viewer may require Admin access.',year:u.yearLevel,
    topics:currentTopicIds(UNIT_TOPICS[u.id]),url:`${LINKS.units}view.html?unit=${encodeURIComponent(u.id)}`,
    lessons:(Array.isArray(u.lessons)?u.lessons:[]).filter(l=>validId(l.id)&&typeof l.title==='string').map(l=>({id:l.id,title:l.title}))
  }));
}
// Topic collections: Prep → Year 6, then the existing Vocabulary page order (stable set ID, so I < II < III),
// vocabulary before units within a year.
export function sortTopicResources(resources) {
  const kind = r => r.type==='vocabulary'?0:1;
  return [...resources].sort((a,b)=>a.year-b.year || kind(a)-kind(b) || (a.id<b.id?-1:a.id>b.id?1:0));
}
