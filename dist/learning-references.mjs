import {setTopics,validId,validYear,TOPICS} from './catalog.mjs';

// Reviewed, versioned teaching resources. No Firestore writes, second vocabulary catalogue or Admin editor.
// topicIds follows the existing multi-topic classifier. null yearLevels means all year levels.
export const LEARNING_REFERENCES = Object.freeze([
  Object.freeze({id:'number-chart-0-100',published:true,title:'Number Chart 0–100',chineseTitle:'数字表 0–100',
    topicIds:Object.freeze(['numbers']),yearLevels:null,
    description:'Numbers 0–100 with Chinese characters. Enlarge the chart or print the A4 landscape PDF.',
    altText:'Number Chart 0–100: zero shown separately above a ten by ten grid of Arabic and Chinese numbers 1–100, with Pinyin for 0–10 and 100.',
    assets:Object.freeze({svg:'assets/learning-references/number-chart-0-100/number_chart_0_100.svg',
      png:'assets/learning-references/number-chart-0-100/number_chart_0_100.png',
      pdf:'assets/learning-references/number-chart-0-100/number_chart_0_100.pdf'})})
]);
const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
// References are reviewed same-site assets only; URL schemes, traversal and remote HTML are not accepted.
const asset=(value,extension)=>typeof value==='string'&&new RegExp(`^assets/learning-references/[a-z0-9-]+/[a-zA-Z0-9_-]+\\.${extension}$`).test(value)?value:null;
export function publishedReferences(source=LEARNING_REFERENCES){
  const seen=new Set();return (Array.isArray(source)?source:[]).flatMap(item=>{
    if(!item||item.published!==true||item.deleted===true||!validId(item.id)||seen.has(item.id)||typeof item.title!=='string'||!item.title.trim())return [];
    const topics=setTopics(item);if(!topics.length)return [];
    const years=item.yearLevels===null?null:Array.isArray(item.yearLevels)&&item.yearLevels.length&&item.yearLevels.every(validYear)?[...new Set(item.yearLevels)]:undefined;
    if(years===undefined)return [];
    const assets={svg:asset(item.assets?.svg,'svg'),png:asset(item.assets?.png,'png'),pdf:asset(item.assets?.pdf,'pdf')};if(!assets.png||(item.assets?.svg!=null&&!assets.svg)||(item.assets?.pdf!=null&&!assets.pdf))return [];
    seen.add(item.id);return [{id:item.id,type:'learning-reference',title:item.title.trim(),chinese:String(item.chineseTitle||''),description:String(item.description||''),alt:String(item.altText||item.title),topics,yearLevels:years,assets}];
  });
}
export function referencesForTopic(topicId,{year=null,source=LEARNING_REFERENCES}={}){
  return publishedReferences(source).filter(item=>item.topics.includes(topicId)&&(year===null||item.yearLevels===null||item.yearLevels.includes(year)));
}
export function referenceRoute(item,topicId){
  const topic=item.topics.includes(topicId)?topicId:item.topics[0];
  return `#/reference?id=${encodeURIComponent(item.id)}&topic=${encodeURIComponent(topic)}`;
}
export function learningReferencesSection(topicId,{year=null,source=LEARNING_REFERENCES}={}){
  const refs=referencesForTopic(topicId,{year,source});if(!refs.length)return '';
  return `<section class="learning-references" aria-labelledby="references-heading"><h2 id="references-heading">Learning References</h2><div class="reference-grid">${refs.map(item=>`<a class="reference-card" href="${escape(referenceRoute(item,topicId))}" aria-label="Open ${escape(item.title)}"><img src="${escape(item.assets.png)}" alt="Preview of ${escape(item.title)}" width="3508" height="2480"><div class="reference-card-copy"><h3>${escape(item.title)}</h3><p class="reference-chinese" lang="zh-Hans">${escape(item.chinese)}</p><p class="reference-years">${item.yearLevels===null?'All year levels':item.yearLevels.map(y=>y===0?'Prep':`Year ${y}`).join(' · ')}</p><p>${escape(item.description)}</p></div></a>`).join('')}</div></section>`;
}
export function referenceView(id,topicId,{source=LEARNING_REFERENCES}={}){
  const item=publishedReferences(source).find(item=>item.id===id);
  if(!item)return '<section class="reference-view"><h1>Reference unavailable</h1><p>This reference is not currently published.</p><a href="#/topics">Topics</a></section>';
  const topic=item.topics.includes(topicId)?topicId:item.topics[0],label=TOPICS.find(t=>t.id===topic)?.title||'Topics';
  return `<section class="reference-view"><a class="inline-link reference-parent" href="#/topics?topic=${escape(topic)}">${escape(label)}</a><header class="reference-heading"><h1>${escape(item.title)}</h1><p lang="zh-Hans">${escape(item.chinese)}</p><p class="reference-years">${item.yearLevels===null?'All year levels':item.yearLevels.map(y=>y===0?'Prep':`Year ${y}`).join(' · ')}</p></header><div class="reference-toolbar" aria-label="Chart viewing and printing"><button type="button" data-reference-zoom aria-pressed="false" aria-controls="reference-chart">Enlarge chart</button><button type="button" data-reference-fullscreen hidden>Full screen</button><a href="${escape(item.assets.svg||item.assets.png)}" target="_blank" rel="noopener">Open full-size chart</a>${item.assets.pdf?`<a class="reference-print" href="${escape(item.assets.pdf)}" target="_blank" rel="noopener">Printable PDF (A4 landscape)</a>`:''}</div><p class="reference-hint">Enlarge the chart to read each number, then scroll across or down.</p><p class="sr-only" role="status" data-reference-status></p><div class="reference-canvas" id="reference-chart" tabindex="0" role="region" aria-label="Scrollable number chart"><button class="reference-exit" type="button" data-reference-exit hidden>Exit full screen</button><img src="${escape(item.assets.svg||item.assets.png)}" alt="${escape(item.alt)}" width="1600" height="1131"></div></section>`;
}
export function wireReferenceView(root){
  const area=root.querySelector('.reference-canvas'),zoom=root.querySelector('[data-reference-zoom]');if(!area||!zoom)return;
  zoom.onclick=()=>{const on=area.classList.toggle('is-enlarged');zoom.setAttribute('aria-pressed',String(on));zoom.textContent=on?'Fit chart to screen':'Enlarge chart';};
  const full=root.querySelector('[data-reference-fullscreen]'),exit=root.querySelector('[data-reference-exit]');
  const previousOverflow=document.body.style.overflow;
  let inertState=[];
  const overlay=()=>{area.classList.add('reference-overlay');document.body.style.overflow='hidden';inertState=[...root.querySelectorAll('.reference-view > :not(.reference-canvas)'),...document.querySelectorAll('.site-header,.site-footer,.skip-link')].map(element=>[element,element.inert]);inertState.forEach(([element])=>element.inert=true);exit.hidden=false;area.focus();};
  const restore=()=>{if(area.classList.contains('reference-overlay')){area.classList.remove('reference-overlay');document.body.style.overflow=previousOverflow;inertState.forEach(([element,inert])=>element.inert=inert);inertState=[];}exit.hidden=true;};
  const leave=()=>{if(document.fullscreenElement===area)document.exitFullscreen?.();restore();full.focus();};
  full.hidden=false;
  full.onclick=async()=>{exit.hidden=false;if(area.requestFullscreen&&document.fullscreenEnabled){try{await area.requestFullscreen();area.focus();return;}catch{/* Use the same readable viewport view when native full screen is unavailable. */}}overlay();};
  exit.onclick=leave;
  const escapeKey=event=>{if(!area.classList.contains('reference-overlay'))return;if(event.key==='Escape'){event.preventDefault();leave();}else if(event.key==='Tab'){event.preventDefault();exit.focus();}};
  area.addEventListener('keydown',escapeKey);
  const nativeExit=()=>{if(document.fullscreenElement!==area&&!area.classList.contains('reference-overlay'))exit.hidden=true;};
  document.addEventListener('fullscreenchange',nativeExit);
  return ()=>{restore();area.removeEventListener('keydown',escapeKey);document.removeEventListener('fullscreenchange',nativeExit);};
}
