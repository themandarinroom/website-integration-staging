import {startAdminSession} from './admin-session.mjs?v=units-admin-1';
import {LINKS} from './catalog.mjs';
import {renderUnit,focusLesson} from './unit-viewer/unit-renderer.mjs';
const auth=document.querySelector('#management-auth'),library=document.querySelector('#private-unit-library');
let generation=0,session;
const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
try{session=await startAdminSession(async panel=>{
 const request=++generation;library.hidden=true;library.replaceChildren();
 if(panel.title!=='Admin Dashboard'){auth.innerHTML=`<h1>${panel.title}</h1>${panel.html}`;return;}
 auth.innerHTML='<div class="catalog-heading"><h1>Units Management</h1><button class="button secondary" data-admin-action="logout">Sign out</button></div><p class="data-note">Private staging copy. Planning and editing continue in the existing independent Unit Library; its Google sign-in and permissions apply separately. Staging source Units are read-only here.</p>';
 library.hidden=false;library.innerHTML='<p role="status">Loading private Units…</p>';
 try{
  const id=new URLSearchParams(location.search).get('unit');
  if(id){
   const {getUnit}=await import('./teacher-unit-data.mjs'),unit=await getUnit(id);if(request!==generation)return;
   library.innerHTML=renderUnit(unit,{student:false,backHref:'unit-management.html',vocab:[...new Set((unit?.lessons||[]).map(l=>l.vocabularySetId).filter(Boolean))].map(id=>({id,title:id})),speaking:new Map((unit?.lessons||[]).filter(l=>l.speakingPracticeId).map(l=>[l.speakingPracticeId,{id:l.speakingPracticeId,title:l.speakingPracticeId}])),vocabularyUrl:id=>`${LINKS.vocabulary}?set=${encodeURIComponent(id)}`,speakingUrl:id=>`${LINKS.speaking}?practice=${encodeURIComponent(id)}`}).replaceAll('href="edit.html?','href="'+LINKS.units+'edit.html?');
   if(unit)focusLesson(library,new URLSearchParams(location.search).get('lesson'));
  }else{
   library.innerHTML=`<p><a class="button" href="${LINKS.units}">Open existing Unit Library editor →</a> <a class="button secondary" href="unit-publication.html">Review student publication →</a></p><nav id="filters" class="filters" aria-label="Filter private Units by year"></nav><p id="status" role="status"></p><section id="units" class="unit-grid"></section>`;
   await import(`./teacher-units/index.js?session=${request}`);
   if(request!==generation)return;
  }
 }catch(error){if(request===generation)library.innerHTML=`<p role="status">Private Unit Library unavailable: ${escape(error.message)}</p>`;}
});}catch(error){auth.innerHTML=`<h1>Admin Login</h1><p role="status">Sign-in unavailable: ${escape(error.message)}</p>`;}
auth.addEventListener('click',event=>{const action=event.target.closest('[data-admin-action]');if(action)session?.act(action.dataset.adminAction);});
