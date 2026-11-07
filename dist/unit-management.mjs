import {startAdminSession} from './admin-session.mjs?v=units-admin-1';
import {LINKS} from './catalog.mjs';
import {renderUnit,focusLesson} from './unit-viewer/unit-renderer.mjs';
const auth=document.querySelector('#management-auth'),library=document.querySelector('#private-unit-library');
let generation=0,session;
const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
try{session=await startAdminSession(async panel=>{
 const request=++generation;library.hidden=true;library.replaceChildren();
 if(panel.title!=='Admin Dashboard'){auth.innerHTML=`<h1>${panel.title}</h1>${panel.html}`;return;}
 auth.innerHTML='<div class="catalog-heading"><h1>Units Management</h1><button class="button secondary" data-admin-action="logout">Sign out</button></div><p class="data-note">Private teaching content. Reorder Units within a year level here. Editing opens the existing Unit Library, which may ask you to sign in separately.</p>';
 library.hidden=false;library.innerHTML='<p role="status">Loading private Units…</p>';
 try{
  const id=new URLSearchParams(location.search).get('unit');
  if(id){
   const {getUnit}=await import('./teacher-unit-data.mjs'),unit=await getUnit(id);if(request!==generation)return;
   library.innerHTML=renderUnit(unit,{student:false,backHref:'unit-management.html',vocab:[...new Set((unit?.lessons||[]).map(l=>l.vocabularySetId).filter(Boolean))].map(id=>({id,title:id})),speaking:new Map((unit?.lessons||[]).filter(l=>l.speakingPracticeId).map(l=>[l.speakingPracticeId,{id:l.speakingPracticeId,title:l.speakingPracticeId}])),vocabularyUrl:id=>`${LINKS.vocabulary}?set=${encodeURIComponent(id)}`,speakingUrl:id=>`${LINKS.speaking}?practice=${encodeURIComponent(id)}`}).replaceAll('href="edit.html?','href="'+LINKS.units+'edit.html?');
   if(unit)focusLesson(library,new URLSearchParams(location.search).get('lesson'));
  }else{
   library.innerHTML=`<p class="library-actions"><a class="button primary" href="${LINKS.units}">Open existing Unit Library editor →</a> <a class="button secondary" href="unit-publication.html">Review student publication →</a></p><div hidden><span id="auth-state"></span><button id="sign-in" type="button">Sign in</button><button id="sign-out" type="button">Sign out</button></div><p id="reorder-help" class="muted">Browse Units by year level.</p><p id="status" class="status" role="status"></p><section id="units" class="year-board" aria-label="Units by year level"></section>`;
   await import(`./teacher-units/index.js?session=${request}`);
   if(request!==generation)return;
  }
 }catch(error){if(request===generation)library.innerHTML=`<p role="status">Private Unit Library unavailable: ${escape(error.message)}</p>`;}
});}catch(error){auth.innerHTML=`<h1>Admin Login</h1><p role="status">Sign-in unavailable: ${escape(error.message)}</p>`;}
auth.addEventListener('click',event=>{const action=event.target.closest('[data-admin-action]');if(action)session?.act(action.dataset.adminAction);});
