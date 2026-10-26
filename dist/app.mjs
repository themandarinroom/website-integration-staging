import {LINKS,TOPICS,yearLabel,selectResources,topicYears} from './catalog.mjs';
import {loadVocabulary,loadUnits,loadTeacherVoice} from './public-data.mjs';

const main=document.querySelector('#main');
const state={vocabulary:[],units:[],vocabularyStatus:'loading',unitsStatus:'loading',homeYear:'all'};
const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const allResources=()=>[...state.vocabulary,...state.units];
const arrow='<span aria-hidden="true">→</span>';
const icons={book:'<path d="M12 5C8 2 4 3 2 4v16c3-2 7-2 10 0 3-2 7-2 10 0V4c-3-1-7-2-10 1ZM12 5v15"/>',
  file:'<path d="M5 2h9l5 5v15H5zM14 2v6h5M8 12h8M8 16h8"/>',
  grid:'<rect x="2" y="2" width="8" height="8" rx="1"/><rect x="14" y="2" width="8" height="8" rx="1"/><rect x="2" y="14" width="8" height="8" rx="1"/><rect x="14" y="14" width="8" height="8" rx="1"/>',
  shuffle:'<path d="M2 6h4c4 0 8 12 12 12h4m-4-4 4 4-4 4M2 18h4c4 0 8-12 12-12h4m-4-4 4 4-4 4"/>',
  mic:'<rect x="8" y="2" width="8" height="13" rx="4"/><path d="M5 11v2a7 7 0 0 0 14 0v-2M12 20v3M8 23h8"/>',
  headphones:'<path d="M3 16v-4a9 9 0 0 1 18 0v4"/><rect x="2" y="13" width="5" height="8" rx="2"/><rect x="17" y="13" width="5" height="8" rx="2"/>',
  search:'<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>'};
const icon=name=>`<svg viewBox="0 0 24 24" aria-hidden="true">${icons[name]||icons.book}</svg>`;
// Clip supplied, approved illustrations in the browser; the PNG files remain unchanged.
function art(source,x,y,w,h,className='') {
  const height=source==='topics'?1024:source==='pinyin'?500:source==='hanzi'?524:1024;
  return `<svg class="clip-art ${className}" viewBox="0 0 ${w} ${h}" aria-hidden="true" focusable="false"><svg width="${w}" height="${h}" viewBox="${x} ${y} ${w} ${h}" overflow="hidden"><image href="assets/${source}.png" width="1536" height="${height}"/></svg></svg>`;
}
const yearBadge=year=>`<span class="year-badge year-${year}">${yearLabel(year)}</span>`;
function route() {
  const raw=location.hash.slice(1)||'/'; const [path,query='']=raw.split('?');
  return {page:path.split('/')[1]||'home',params:new URLSearchParams(query)};
}
function loadingOrEmpty(type,message) {
  const status=state[`${type}Status`];
  if(status==='loading')return `<p class="empty-state" role="status">Loading published ${type==='units'?'unit previews':'vocabulary'}…</p>`;
  if(status==='error')return `<p class="empty-state">${type==='units'?'Unit previews':'Vocabulary'} could not be loaded. <button class="text-button" data-action="retry">Try again</button> or open the existing library.</p>`;
  return `<p class="empty-state">${message}</p>`;
}
function resourceCard(resource) {
  return `<a class="resource-link" ${resource.type==='unit'?`href="#" data-unit="${escape(resource.id)}"`:`href="${escape(resource.url)}"`}>
    ${yearBadge(resource.year)} <span class="badge">${resource.type==='unit'?'Unit preview':'Vocabulary'}</span><strong>${escape(resource.title)} ${arrow}</strong>
    ${resource.chinese?`<p lang="zh-Hans">${escape(resource.chinese)}</p>`:''}<p>${resource.type==='unit'?`${resource.lessons.length} lesson${resource.lessons.length===1?'':'s'} · viewer access may be restricted`:escape(resource.description)}</p></a>`;
}
function choosePreview() {
  const chosen=[];
  // Real published image-bearing items, preferring pets to match the approved visual concept.
  const sets=[...state.vocabulary].sort((a,b)=>Number(b.topics.includes('animals'))-Number(a.topics.includes('animals')));
  const seen=new Set();
  for(const set of sets)for(let index=0;index<set.items.length;index++){
    const item=set.items[index]; if(!item.image||seen.has(item.chinese))continue;
    seen.add(item.chinese); chosen.push({set,item,index}); if(chosen.length===6)return chosen;
  }
  return chosen;
}
function wordCards() {
  const previews=choosePreview();
  if(!previews.length)return loadingOrEmpty('vocabulary','No published vocabulary images are available yet. Explore the library for all published sets.');
  return `<div class="word-grid">${previews.map(({set,item,index},i)=>`<article class="word-card">
    <a href="${escape(set.url)}&item=${index+1}" aria-label="Explore ${escape(item.english||item.chinese)}"><div class="word-image"><img src="${escape(item.image)}" alt="${escape(item.english||item.chinese)}" decoding="async" referrerpolicy="no-referrer"></div></a>
    <div class="word-content"><strong lang="zh-Hans">${escape(item.chinese)}</strong><span class="pinyin" lang="zh-Latn-pinyin">${escape(item.pinyin)}</span>
    <div class="audio-buttons"><button class="audio-button" data-ai="${i}" ${!item.aiEnabled||!canSpeak()?'disabled':''} aria-label="AI Voice: ${escape(item.chinese)}">▶ AI Voice</button><button class="audio-button" data-teacher="${i}" disabled aria-label="Teacher Voice: ${escape(item.chinese)}">Checking…</button></div></div></article>`).join('')}</div>`;
}
function homeUnits() {
  const units=selectResources(state.units,{year:state.homeYear==='all'?null:state.homeYear});
  return `<div class="unit-browser"><div class="year-tabs" role="group" aria-label="Preview units by year"><button data-home-year="all" aria-pressed="${state.homeYear==='all'}">All</button>${Array.from({length:7},(_,y)=>`<button data-home-year="${y}" aria-pressed="${state.homeYear===y}">${yearLabel(y)}</button>`).join('')}</div>
  <div><div class="unit-list">${units.length?units.map(unit=>`<button class="unit-preview" data-unit="${escape(unit.id)}"><span class="unit-thumb" aria-hidden="true">${unit.topics.includes('countries')?'🌎':'文'}</span><span><strong>${escape(unit.title)}</strong><small>${yearLabel(unit.year)} · ${unit.lessons.length} ${unit.lessons.length===1?'lesson':'lessons'}</small></span><span class="arrow" aria-hidden="true">›</span></button>`).join(''):loadingOrEmpty('units','No public unit previews for this year yet.')}</div>
  <p class="unit-hint">Public title and lesson previews. Full unit access remains in the existing library.</p></div></div>`;
}
function activityTiles() {
  return `<div class="activity-grid"><article class="activity-card yellow"><span class="symbol">${icon('shuffle')}</span><h3>Word Randomiser</h3><p>Turn vocabulary into fun classroom activities.</p><a class="circle" href="${LINKS.randomiser}" aria-label="Open Word Randomiser Local Mode">${arrow}</a></article>
  <article class="activity-card lavender"><span class="symbol">${icon('mic')}</span><h3>Speaking App</h3><p>Build confidence with listening and speaking practice.</p><a class="circle" href="${LINKS.speaking}" aria-label="Open Speaking App">${arrow}</a></article>
  <article class="activity-card blue"><span class="symbol">${icon('grid')}</span><h3>Bingo Board</h3><p>Classroom bingo activities.</p><span class="badge">Coming soon</span></article>
  <article class="activity-card green"><span class="symbol">${icon('headphones')}</span><h3>Listening Game</h3><p>Interactive listening activities.</p><span class="badge">Coming soon</span></article></div>`;
}
function home() {
  return `<h1 class="sr-only">The Mandarin Room — Mandarin learning resources</h1><div class="home-grid">
  <section class="feature green" aria-labelledby="vocabulary-heading"><div class="feature-heading"><span class="feature-icon vocabulary-icon">${icon('book')}</span><div><h2 id="vocabulary-heading">Vocabulary</h2><p>Explore, learn and practise vocabulary with images, audio and more.</p></div><a class="circle" href="${LINKS.vocabulary}" aria-label="Explore Vocabulary">${arrow}</a></div><div class="feature-body">${wordCards()}</div><p class="audio-status" id="audio-status" role="status">AI Voice and Teacher Voice are independent. Recordings appear where available.</p><a class="feature-action vocabulary-action" href="${LINKS.vocabulary}">Explore Vocabulary ${arrow}</a></section>
  <section class="feature pink" aria-labelledby="units-heading"><div class="feature-heading"><span class="feature-icon unit-icon">${icon('file')}</span><div><h2 id="units-heading">Units</h2><p>Browse structured teaching units and lesson previews.</p></div><a class="circle" href="${LINKS.units}" aria-label="Open existing Unit Library">${arrow}</a></div><div class="feature-body">${homeUnits()}</div><a class="feature-action units-action" href="${LINKS.units}">Explore Units ${arrow}</a></section>
  <section class="feature blue" aria-labelledby="activities-heading"><div class="feature-heading"><span class="feature-icon activities-icon">${icon('grid')}</span><div><h2 id="activities-heading">Activities</h2><p>Fun and interactive classroom activities to practise and engage.</p></div><button class="circle" data-action="activities" aria-label="Explore Activities">${arrow}</button></div><div class="feature-body">${activityTiles()}</div><button class="feature-action activities-action" data-action="activities">Explore Activities ${arrow}</button></section></div>`;
}
function yearActivities(year) {
  const vocab=selectResources(state.vocabulary,{year});
  return `<a class="resource-link" href="${LINKS.speaking}?year=${year===0?'prep':'year-'+year}"><strong>Speaking App ${arrow}</strong><p>Open this year’s published practice channel. The app will explain if no practice is published.</p></a>
    ${vocab.length?`<a class="resource-link" href="${LINKS.randomiser}?set=${encodeURIComponent(vocab[0].id)}"><strong>Word Randomiser ${arrow}</strong><p>Start with ${escape(vocab[0].title)} in Local Mode.</p></a>`:'<p class="muted">Word Randomiser will be available here when vocabulary for this year is published.</p>'}
    <p class="data-note">Bingo Board and Listening Game · Coming soon</p>`;
}
function yearLevels(params) {
  const raw=params.get('year'); const selected=/^[0-6]$/.test(raw||'')?Number(raw):null;
  const vocab=selectResources(state.vocabulary,{year:selected}); const units=selectResources(state.units,{year:selected});
  return `<a class="back-link" href="#/">← Back to Home</a><div class="page-intro"><h1>Explore by Year Level</h1><p class="subtitle">Find vocabulary, units and activities for your year level.</p></div>
  <div class="year-grid">${Array.from({length:7},(_,y)=>`<a class="year-card year-${y}" href="#/year-levels?year=${y}" ${selected===y?'aria-current="true"':''}>${yearLabel(y)}<span class="circle" aria-hidden="true">→</span></a>`).join('')}</div>
  ${selected!==null?`<section class="resource-area"><h2>${yearLabel(selected)} resources</h2><p class="muted">Published vocabulary and public unit previews for this year.</p><div class="resource-columns"><section class="resource-panel"><h3>Vocabulary</h3>${vocab.length?vocab.map(resourceCard).join(''):loadingOrEmpty('vocabulary','No published vocabulary for this year yet.')}</section><section class="resource-panel"><h3>Units</h3>${units.length?units.map(resourceCard).join(''):loadingOrEmpty('units','No public unit previews for this year yet.')}</section><section class="resource-panel"><h3>Activities</h3>${yearActivities(selected)}</section></div></section>`:''}`;
}
function topicCard(topic) {
  const years=topicYears(allResources(),topic.id);
  const empty=state.vocabularyStatus==='loading'||state.unitsStatus==='loading'?'Loading resources…':state.vocabularyStatus==='error'||state.unitsStatus==='error'?'Library temporarily unavailable':'Resources coming soon';
  return `<article class="topic-card ${topic.colour}"><div class="topic-top">${art('topics',topic.x,topic.y,120,130)}<div class="topic-copy"><h2>${topic.title}</h2><div class="chinese-title" lang="zh-Hans">${topic.chinese}</div><p>${topic.description}</p></div></div><a href="#/topics?topic=${topic.id}" class="circle" aria-label="Explore ${topic.title}">${arrow}</a><div class="year-tags">${years.length?years.map(y=>`<a href="#/topics?topic=${topic.id}&year=${y}" class="year-badge year-${y}" aria-label="${topic.title}, ${yearLabel(y)}">${yearLabel(y)}</a>`).join(''):`<span class="muted">${empty}</span>`}</div></article>`;
}
function topics(params) {
  const topic=TOPICS.find(t=>t.id===params.get('topic'));
  if(topic){
    const year=/^[0-6]$/.test(params.get('year')||'')?Number(params.get('year')):null;
    const resources=selectResources(allResources(),{topic:topic.id,year}); const years=topicYears(resources,topic.id);
    return `<a class="back-link" href="#/topics">← All Topics</a><section class="banner ${topic.colour}"><div><h1>${topic.title} <span lang="zh-Hans">${topic.chinese}</span></h1><p class="subtitle">${topic.description}</p></div></section>
    ${year!==null?`<p><a class="inline-link" href="#/topics?topic=${topic.id}">View all available year levels</a></p>`:''}
    ${years.length?years.map(y=>`<section class="topic-detail-year"><h2>${yearLabel(y)}</h2><div class="results-grid">${selectResources(resources,{year:y}).map(resourceCard).join('')}</div></section>`).join(''):`<p class="empty-state">${state.vocabularyStatus==='loading'?'Loading published resources…':state.vocabularyStatus==='error'?'Vocabulary is temporarily unavailable. Please try again later.':'No linked public resources for this topic'+(year!==null?' and year':'')+' yet.'}</p>`}
    <p class="data-note">Year labels come from available resource metadata. New resources appear here after their topic association has been reviewed.</p>`;
  }
  return `<section class="banner green"><div><h1>Explore by Topic</h1><p class="subtitle">See how topics are taught across different year levels. Explore vocabulary, units and activities.</p></div><label class="topic-search">${icon('search')}<input id="topic-filter" type="search" placeholder="Search topics (e.g. numbers, food, family…)" aria-label="Search topics"></label></section><div class="topic-grid" id="topic-grid">${TOPICS.map(topicCard).join('')}</div><p class="data-note" id="topic-count" role="status">12 topics · Year badges reflect currently linked resources.</p>`;
}
const learning={
  pinyin:{title:'Pinyin',colour:'pink',description:'Learn and practise Chinese Pinyin.<br>Explore sounds, tones and useful words.',banner:[1015,130,460,105],items:[
    ['initials','Initials & Finals','Learn the building blocks of Pinyin.',70,298,178,76,'pink',true],
    ['tones','Tones','Learn the four tones and the neutral tone.',319,300,178,74,'peach',true],
    ['chart','Pinyin Chart','View the complete Pinyin chart.',566,281,166,102,'yellow',false],
    ['practice','Practice','Listen and repeat common syllables.',834,280,126,107,'green',false],
    ['games','Games','Fun activities to build confidence.',1060,281,141,105,'blue',false],
    ['words','Useful Words','Practise with common words.',1310,281,149,107,'lavender',false]
  ]},
  hanzi:{title:'Hanzi',colour:'green',description:'Explore Chinese characters.<br>Learn strokes, meanings and practise writing.',banner:[1000,121,442,116],items:[
    ['basic','Basic Characters','Learn high-frequency characters.',100,289,109,92,'pink',true],
    ['strokes','Stroke Order','Watch and practise the correct strokes.',330,281,145,112,'peach',false],
    ['library','Character Library','Explore characters with meanings.',585,281,120,112,'yellow',false],
    ['writing','Writing Practice','Trace and write step by step.',815,281,177,112,'green',false],
    ['games','Character Games','Fun activities to recognise characters.',1080,278,135,114,'blue',false],
    ['culture','Culture & Meaning','Discover the stories behind characters.',1338,280,101,104,'lavender',false]
  ]}
};
function learningPage(page) {
  const config=learning[page];
  return `<section class="banner learning-banner ${config.colour}"><div><h1>${config.title}</h1><p>${config.description}</p></div>${art(page,...config.banner,'banner-art')}</section><div class="learning-grid">${config.items.map(([id,title,description,x,y,w,h,colour,ready])=>`<article class="learning-card ${colour}">${art(page,x,y,w,h)}<h2>${title}</h2><p>${description}</p>${ready?`<button class="circle" data-learning="${page}:${id}" aria-label="Explore ${title}">${arrow}</button><span class="badge">Introduction</span>`:'<span class="badge">Coming soon</span>'}</article>`).join('')}</div>`;
}
function about() {
  return `<section class="about-intro"><div><h1>About</h1><h2>The Mandarin Room</h2><p>The Mandarin Room is a free educational platform created by a primary school Mandarin teacher in Australia. It brings together vocabulary, structured lessons, interactive activities, Pinyin and Chinese character learning resources to make Mandarin learning engaging, accessible and enjoyable.</p></div><div class="about-chinese" lang="zh-Hans"><h2>关于我们</h2><p>The Mandarin Room 是一个由澳大利亚小学中文教师创建的免费中文学习平台，汇集中文词汇、教学单元、互动活动、汉语拼音及汉字学习资源，致力于让中文学习变得有趣、轻松且富有意义。</p></div>${art('about',980,109,519,261)}</section>
  <div class="about-grid"><section class="about-card pink"><div class="card-title"><span aria-hidden="true">💗</span><div><h2>Our Vision</h2><h3 lang="zh-Hans">我们的愿景</h3></div></div><p>To make Chinese language learning engaging, accessible and meaningful for all students.</p><p lang="zh-Hans">让每一位学生都能以有趣、易于接触且有意义的方式学习中文。</p>${art('about',365,491,112,141)}</section>
  <section class="about-card blue"><div class="card-title"><span aria-hidden="true">👥</span><div><h2>Our Resources</h2><h3 lang="zh-Hans">我们的资源</h3></div></div><p>Explore vocabulary, units, activities and cultural content designed for primary learners.</p><p lang="zh-Hans">提供词汇、教学单元、课堂活动和文化内容，专为小学学习者设计。</p>${art('about',818,470,155,172)}</section>
  <section class="about-card yellow"><div class="card-title"><span aria-hidden="true">⭐</span><div><h2>For Students and Teachers</h2><h3 lang="zh-Hans">面向学生与教师</h3></div></div><p>Free to explore, easy to use, and designed to support Mandarin learning in classrooms and at home.</p><p lang="zh-Hans">免费使用，操作简单，适合课堂教学和家庭学习。</p>${art('about',1310,472,192,190)}</section></div>
  <section class="contact" aria-labelledby="contact-title"><div class="contact-copy"><h2 id="contact-title">Contact Admin</h2><h3 lang="zh-Hans">联系管理员</h3><p>Have a question, suggestion or feedback? We’d love to hear from you!</p><p lang="zh-Hans">如有问题、建议或意见，欢迎与我们联系。</p><span class="badge">Coming soon · 暂未开放</span>${art('about',415,734,235,227)}</div>
  <form class="contact-form" aria-describedby="contact-unavailable"><p class="data-note" id="contact-unavailable">Contact delivery is not configured yet. This form is unavailable and does not collect or send information. Planned address: info@themandarinroom.au.</p><fieldset disabled><legend class="sr-only">Contact form — coming soon</legend><div class="form-row"><label>Name 姓名（可选）<input name="name" autocomplete="off" placeholder="Your name 您的姓名"></label><label>Email 邮箱（必填）<input type="email" name="email" required autocomplete="off" placeholder="your@email.com"></label></div><label>Message 留言（必填）<textarea name="message" required placeholder="Type your message here…&#10;请输入您的留言…"></textarea></label><button type="submit" class="button">Send Message 发送留言</button></fieldset></form></section>`;
}
function searchPage(params) {
  const query=params.get('q')||'';
  const resources=selectResources(allResources(),{query});
  return `<section class="banner green"><div><h1>Search resources</h1><p class="subtitle">Find published vocabulary and public unit previews.</p></div><label class="topic-search">${icon('search')}<input id="resource-search" type="search" value="${escape(query)}" placeholder="Search in English or Chinese…" aria-label="Search published resources"></label></section><p class="search-summary" id="search-summary" role="status">${resources.length} resources${query?' found':''}</p><div class="results-grid" id="search-results">${resources.map(resourceCard).join('')||'<p class="no-results">No matching public resources. Try another word.</p>'}</div>${state.vocabularyStatus==='error'||state.unitsStatus==='error'?'<p class="notice">Some resources could not be loaded. <button class="text-button" data-action="retry">Try again</button></p>':''}`;
}
let currentAudio=null;
let currentUtterance=null;
function stopAudio(){if(currentAudio){currentAudio.pause();currentAudio=null;}if('speechSynthesis'in window)window.speechSynthesis.cancel();currentUtterance=null;}
function canSpeak(){return 'speechSynthesis'in window && 'SpeechSynthesisUtterance'in window;}
const voicePromises=new Map();
function teacherVoice(setId,itemId){const key=setId+'--'+itemId;if(!voicePromises.has(key))voicePromises.set(key,loadTeacherVoice(setId,itemId));return voicePromises.get(key);}
function announce(message){const el=document.querySelector('#audio-status')||document.querySelector('#announcement');el.textContent=message;}
function wireAudio(){
  choosePreview().forEach(({set,item},i)=>{
    const button=main.querySelector(`[data-teacher="${i}"]`);if(!button)return;
    teacherVoice(set.id,item.id).then(url=>{
      if(!button.isConnected)return;button.textContent=url?'▶ Teacher':'No recording';button.disabled=!url;
      button.setAttribute('aria-label',url?`Teacher Voice: ${item.chinese}`:`No Teacher Voice recording for ${item.chinese}`);
      if(url){const audio=new Audio();audio.preload='none';audio.src=url;
        button.onclick=()=>{stopAudio();currentAudio=audio;audio.currentTime=0;audio.play().then(()=>announce(`Playing Teacher Voice: ${item.chinese}`)).catch(()=>announce('Teacher Voice could not play. Open the Vocabulary Library to try its audio controls.'));};
        audio.onended=()=>announce('Teacher Voice finished.');audio.onerror=()=>announce('Teacher Voice could not load. Please try again in the Vocabulary Library.');}
    });
    const ai=main.querySelector(`[data-ai="${i}"]`);if(ai)ai.onclick=()=>{
      if(!canSpeak())return;stopAudio();currentUtterance=new SpeechSynthesisUtterance(item.chinese);currentUtterance.lang='zh-CN';currentUtterance.rate=.82;
      currentUtterance.onstart=()=>announce(`Playing AI Voice: ${item.chinese}`);
      currentUtterance.onend=()=>announce('AI Voice finished.');currentUtterance.onerror=()=>announce('AI Voice is unavailable on this device. Use Teacher Voice where a recording is available.');
      window.speechSynthesis.speak(currentUtterance);
    };
  });
  main.querySelectorAll('.word-image img').forEach(img=>img.addEventListener('error',()=>{
    const fallback=document.createElement('span');fallback.className='missing';fallback.textContent='文';fallback.setAttribute('aria-label','Image unavailable');img.replaceWith(fallback);
  }));
}
function render({focus=false}={}){
  const {page,params}=route();
  const renderers={home, 'year-levels':()=>yearLevels(params),topics:()=>topics(params),pinyin:()=>learningPage('pinyin'),hanzi:()=>learningPage('hanzi'),about,search:()=>searchPage(params)};
  main.innerHTML=renderers[page]?renderers[page]():`<section class="banner green"><div><h1>Page not found</h1><p class="subtitle"><a class="inline-link" href="#/">Return Home</a></p></div></section>`;
  document.title=`${({'home':'Home','year-levels':'Year Levels',topics:'Topics',pinyin:'Pinyin',hanzi:'Hanzi',about:'About',search:'Search'})[page]||'Page not found'} · The Mandarin Room`;
  document.querySelectorAll('nav [data-page]').forEach(a=>{if(a.dataset.page===page)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');});
  if(page==='home')wireAudio();
  const topicInput=document.querySelector('#topic-filter');if(topicInput)topicInput.addEventListener('input',()=>{
    const q=topicInput.value.trim().toLowerCase();const matched=TOPICS.filter(t=>`${t.title} ${t.chinese} ${t.description}`.toLowerCase().includes(q));
    document.querySelector('#topic-grid').innerHTML=matched.map(topicCard).join('')||'<p class="no-results">No matching topics. Try another word.</p>';
    document.querySelector('#topic-count').textContent=`${matched.length} topic${matched.length===1?'':'s'}`;
  });
  const search=document.querySelector('#resource-search');if(search)search.addEventListener('input',()=>{
    const resources=selectResources(allResources(),{query:search.value});
    document.querySelector('#search-summary').textContent=`${resources.length} resources found`;
    document.querySelector('#search-results').innerHTML=resources.map(resourceCard).join('')||'<p class="no-results">No matching public resources. Try another word.</p>';
    history.replaceState(null,'',`#/search${search.value?'?q='+encodeURIComponent(search.value):''}`);
  });
  const form=document.querySelector('.contact-form');if(form)form.addEventListener('submit',e=>e.preventDefault());
  if(focus){main.focus({preventScroll:true});window.scrollTo(0,0);}
}
const backdrop=document.querySelector('#modal'),modal=backdrop.querySelector('.modal');let returnFocus=null;
function showModal(title,html){returnFocus=document.activeElement;document.querySelector('#modal-content').innerHTML=`<h2 id="modal-title">${title}</h2>${html}`;backdrop.hidden=false;document.body.style.overflow='hidden';main.setAttribute('aria-hidden','true');document.querySelector('.site-header').setAttribute('aria-hidden','true');document.querySelector('.site-footer').setAttribute('aria-hidden','true');modal.focus();}
function closeModal(){backdrop.hidden=true;document.body.style.overflow='';main.removeAttribute('aria-hidden');document.querySelector('.site-header').removeAttribute('aria-hidden');document.querySelector('.site-footer').removeAttribute('aria-hidden');if(returnFocus?.isConnected)returnFocus.focus();}
document.querySelector('#modal-close').onclick=closeModal;
backdrop.addEventListener('click',e=>{if(e.target===backdrop)closeModal();});
document.addEventListener('keydown',e=>{
  if(backdrop.hidden)return;if(e.key==='Escape'){closeModal();return;}
  if(e.key==='Tab'){const controls=[...modal.querySelectorAll('button:not([disabled]),a[href],input:not([disabled]),[tabindex="0"]')];const first=controls[0],last=controls[controls.length-1];
    if(e.shiftKey&&(document.activeElement===first||document.activeElement===modal)){e.preventDefault();last?.focus();}
    else if(!e.shiftKey&&(document.activeElement===last||document.activeElement===modal)){e.preventDefault();first?.focus();}}
});
document.querySelector('#admin-open').onclick=()=>showModal('Admin',`<p>Authorised administrators can manage resources in the existing applications. Sign in there with your approved Google account.</p><a class="resource-link" href="${LINKS.vocabulary}"><strong>Vocabulary administration ${arrow}</strong><p>Existing sign-in and editing permissions apply.</p></a><a class="resource-link" href="https://themandarinroom.github.io/speaking/"><strong>Speaking administration ${arrow}</strong><p>Sign in before opening Teacher Mode.</p></a><a class="resource-link" href="${LINKS.units}"><strong>Unit Library ${arrow}</strong><p>Unit cloud access requires an authorised Admin account.</p></a><p>No public account registration is available.</p>`);
document.querySelector('#privacy-open').onclick=()=>showModal('Privacy',`<p>This integration frontend has no analytics, advertising trackers, student accounts or student information forms. It does not save search terms or curriculum content in browser storage.</p><p>Published resources and images are loaded from existing Google Firebase and GitHub Pages services. Those services receive ordinary network requests. Existing applications retain their own authentication, storage and microphone behaviour.</p><p>The contact form is disabled and sends nothing. Student speaking recordings remain under the existing app’s device-local workflow.</p>`);
function openUnit(id){const unit=state.units.find(u=>u.id===id);if(!unit)return;
  showModal(escape(unit.title),`${yearBadge(unit.year)}<p>${unit.lessons.length} lesson${unit.lessons.length===1?'':'s'} in the public metadata preview:</p><ul>${unit.lessons.map(l=>`<li>${escape(l.title)}</li>`).join('')}</ul><p>Full unit content is not published for anonymous browsing yet. The existing viewer may require authorised Admin access or show its local preview instead.</p><a class="button" href="${escape(unit.url)}">Open existing Unit Library ${arrow}</a>`);
}
function openActivities(){showModal('Classroom activities',`<a class="resource-link" href="${LINKS.randomiser}"><strong>Word Randomiser ${arrow}</strong><p>Use existing vocabulary in Local Mode.</p></a><a class="resource-link" href="${LINKS.speaking}"><strong>Speaking App ${arrow}</strong><p>Choose a year and follow the published practice.</p></a><a class="resource-link" href="${LINKS.live}"><strong>Live Word Randomiser — staging ${arrow}</strong><p>Separate classroom test environment. Live sessions are not deployed to the production backend.</p></a><p>Bingo Board and Listening Game · Coming soon.</p>`);}
function openLearning(key){
  if(key==='pinyin:initials')showModal('Initials & Finals',`<p>An initial begins a syllable; a final follows it. Some syllables have no initial.</p><h3>Common initials</h3><p class="letter-list" lang="zh-Latn-pinyin">b p m f · d t n l · g k h · j q x · zh ch sh r · z c s</p><h3>Simple finals</h3><p class="letter-list" lang="zh-Latn-pinyin">a o e i u ü</p><p>Examples: m + ā → mā; n + ǐ → nǐ. The tone mark shows how the syllable is pronounced. A complete chart and listening practice are coming soon.</p>`);
  if(key==='pinyin:tones')showModal('Four Tones & Neutral Tone',`<p>Mandarin uses four main tones and a neutral tone. A tone can change a word’s meaning.</p><div class="tone-grid"><span><b lang="zh-Latn-pinyin">mā</b>1 · high and level</span><span><b lang="zh-Latn-pinyin">má</b>2 · rising</span><span><b lang="zh-Latn-pinyin">mǎ</b>3 · low / dipping</span><span><b lang="zh-Latn-pinyin">mà</b>4 · falling</span><span><b lang="zh-Latn-pinyin">ma</b>Neutral · light</span></div><p>The third tone often stays low in connected speech. Neutral-tone syllables have no tone mark. Listening and pronunciation practice are coming soon.</p>`);
  if(key==='hanzi:basic')showModal('Basic Characters',`<p>Start by noticing the shape and meaning of a few common characters.</p><div class="character-examples"><span><b lang="zh-Hans">人</b><span lang="zh-Latn-pinyin">rén</span> · person</span><span><b lang="zh-Hans">口</b><span lang="zh-Latn-pinyin">kǒu</span> · mouth</span><span><b lang="zh-Hans">山</b><span lang="zh-Latn-pinyin">shān</span> · mountain</span></div><p>Verified stroke-order demonstrations and writing practice are coming soon.</p>`);
}
main.addEventListener('click',event=>{
  const year=event.target.closest('[data-home-year]');if(year){state.homeYear=year.dataset.homeYear==='all'?'all':Number(year.dataset.homeYear);render();main.querySelector(`[data-home-year="${state.homeYear}"]`)?.focus();return;}
  const unit=event.target.closest('[data-unit]');if(unit){event.preventDefault();openUnit(unit.dataset.unit);return;}
  const action=event.target.closest('[data-action]');if(action){if(action.dataset.action==='activities')openActivities();if(action.dataset.action==='retry')refreshData();return;}
  const learningButton=event.target.closest('[data-learning]');if(learningButton)openLearning(learningButton.dataset.learning);
});
window.addEventListener('hashchange',()=>{stopAudio();closeModal();render({focus:true});});
let refreshVersion=0;
async function refreshData(){
  const version=++refreshVersion;state.vocabularyStatus='loading';state.unitsStatus='loading';render();
  const [vocabulary,units]=await Promise.allSettled([loadVocabulary(),loadUnits()]);if(version!==refreshVersion)return;
  state.vocabularyStatus=vocabulary.status==='fulfilled'?'ready':'error';state.unitsStatus=units.status==='fulfilled'?'ready':'error';
  state.vocabulary=vocabulary.status==='fulfilled'?vocabulary.value:[];state.units=units.status==='fulfilled'?units.value:[];
  // Preserve an in-progress search while initial public data finishes loading.
  const active=document.activeElement;const activeId=active?.id;const value=active instanceof HTMLInputElement?active.value:null;
  render();if(activeId&&value!==null){const input=document.getElementById(activeId);if(input){input.value=value;input.focus();input.dispatchEvent(new Event('input'));}}
}
refreshData();

document.querySelector('.skip-link').addEventListener('click',event=>{event.preventDefault();main.focus();main.scrollIntoView();});
