import { yearLabel } from '../teacher-unit-data.mjs';
import { getFirebaseServices } from '../unit-viewer/firebase.js';
import { orderedUnits, moveUnit } from './library-order.mjs';
const grid = document.querySelector('#units'), status = document.querySelector('#status');
let units = [], orders = {}, admin = false, busy = false, drag = null, services, stop, session = 0;
let functionsPromise;
async function callable(name, data = {}) {
  functionsPromise ||= import('https://www.gstatic.com/firebasejs/12.16.0/firebase-functions.js');
  const sdk = await functionsPromise;
  return (await sdk.httpsCallable(sdk.getFunctions(services.app, 'us-central1'), name)(data)).data;
}
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const group = year => orderedUnits(units.filter(u => Number(u.yearLevel) === year), orders[year]?.unitIds);
function render(focus) {
  grid.innerHTML = Array.from({length:7}, (_, year) => {
    const items = group(year);
    return `<section class="year-column" data-year="${year}"><header><h2>${yearLabel(year)}</h2><span class="unit-count">${items.length}</span></header><div class="year-cards">${items.map(u => `<article class="library-card" data-id="${esc(u.id)}"><a class="unit-editor-link" href="https://themandarinroom.github.io/units/edit.html?unit=${encodeURIComponent(u.id)}"><h3>${esc(u.englishTitle)}</h3></a>${admin ? `<button class="drag-handle" data-handle aria-label="Reorder ${esc(u.englishTitle)}. Use Up and Down arrow keys." aria-describedby="reorder-help" ${busy?'disabled':''}>⠿</button>` : ''}<div class="unit-card-footer"><p class="lesson-count">${u.lessons.length} ${u.lessons.length === 1 ? 'lesson' : 'lessons'}</p><a class="unit-open" href="unit-management.html?unit=${encodeURIComponent(u.id)}" aria-label="Open ${esc(u.englishTitle)}" title="Open ${esc(u.englishTitle)}"><span aria-hidden="true">→</span></a></div></article>`).join('') || '<p class="column-empty">No units yet</p>'}</div></section>`;
  }).join('');
  if (focus) [...grid.querySelectorAll('[data-id]')].find(el => el.dataset.id === focus)?.querySelector('[data-handle]')?.focus();
}
async function save(year, id, target) {
  if (!admin || busy) return;
  const savingSession = session;
  const before = orders[year], ids = group(year).map(u => u.id), next = moveUnit(ids,id,target);
  if (ids.join() === next.join()) return;
  busy = true; orders = {...orders, [year]:{...before, unitIds:next}}; render(id); status.textContent = 'Saving order…';
  try {
    const result = await callable('saveUnitLibraryOrder', {yearLevel:year, unitIds:next, expectedRevision:before?.revision || 0});
    if (session !== savingSession) return;
    orders[year] = {unitIds:next,revision:result.revision}; status.textContent = 'Order saved.';
  } catch(error) {
    if (session !== savingSession) return;
    orders[year] = before; status.textContent = 'Order could not be saved. Previous order restored. ' + (error.message || 'Try again.');
    try { const latest = await callable('readUnitLibraryOrder'); if (session === savingSession) orders = latest; } catch {}
  } finally { if (session === savingSession) { busy = false; render(id); } }
}
grid.addEventListener('keydown', e => {
  if (e.key === 'Escape') { cancel(); return; }
  if (!e.target.matches('[data-handle]') || !['ArrowUp','ArrowDown','Home','End'].includes(e.key)) return;
  e.preventDefault(); const card=e.target.closest('[data-id]'), year=Number(card.closest('[data-year]').dataset.year), items=group(year), index=items.findIndex(u=>u.id===card.dataset.id);
  save(year,card.dataset.id,e.key==='Home'?0:e.key==='End'?items.length-1:index+(e.key==='ArrowUp'?-1:1));
});
function cancel() { drag=null; grid.querySelectorAll('.drop-before,.drop-after,.is-dragging').forEach(el=>el.classList.remove('drop-before','drop-after','is-dragging')); }
grid.addEventListener('pointerdown', e => {
  const handle=e.target.closest('[data-handle]'); if (!handle || !admin || busy || e.button!==0) return;
  const card=handle.closest('[data-id]'); drag={id:card.dataset.id,year:Number(card.closest('[data-year]').dataset.year),start:e.clientY,target:null,active:false}; handle.setPointerCapture(e.pointerId);
});
grid.addEventListener('pointermove', e => {
  if (!drag) return;
  if (Math.abs(e.clientY-drag.start)<6 && !drag.active) return;
  drag.active=true; e.preventDefault();
  grid.querySelectorAll('.drop-before,.drop-after').forEach(el=>el.classList.remove('drop-before','drop-after'));
  const card=document.elementFromPoint(e.clientX,e.clientY)?.closest('[data-id]'); drag.target=null;
  if (!card || Number(card.closest('[data-year]').dataset.year)!==drag.year) return;
  const items=group(drag.year).map(u=>u.id).filter(id=>id!==drag.id), after=e.clientY>card.getBoundingClientRect().top+card.offsetHeight/2;
  if(card.dataset.id===drag.id)return;
  drag.target=items.indexOf(card.dataset.id)+(after?1:0); card.classList.add(after?'drop-after':'drop-before');
});
grid.addEventListener('pointerup', () => {const completed=drag;cancel();if(completed?.active && completed.target!==null)save(completed.year,completed.id,completed.target);});
grid.addEventListener('pointercancel',cancel);
window.addEventListener('blur',cancel);
render();
try {
  services=await getFirebaseServices(); const {authSdk,auth,firestoreSdk:sdk,db}=services;
  document.querySelector('#sign-in').onclick=()=>authSdk.signInWithPopup(auth,new authSdk.GoogleAuthProvider()).catch(e=>status.textContent=e.message);
  document.querySelector('#sign-out').onclick=()=>authSdk.signOut(auth);
  authSdk.onAuthStateChanged(auth,async user=>{
    const token=++session; stop?.(); if(!grid.isConnected)return; admin=false;busy=false;units=[];orders={};cancel();render();
    document.querySelector('#sign-in').hidden=!!user;document.querySelector('#sign-out').hidden=!user;
    document.querySelector('#auth-state').textContent=user?.email || '';
    document.querySelector('#reorder-help').textContent='Browse Units by year level.';
    status.textContent=user?'Loading Units…':'Sign in to view the Unit Library.';
    if(!user)return;
    try {
      const teacher=await sdk.getDoc(sdk.doc(db,'authorizedTeachers',user.uid));
      if(token!==session)return;
      if (!user.emailVerified || !teacher.exists() || teacher.data().active!==true) {
        status.textContent='This account does not have access to the Unit Library.'; return;
      }
      // Server read only: never fall back to a previous account's local cache.
      const source=await sdk.getDocsFromServer(sdk.collection(db,'units'));
      const latest=await callable('readUnitLibraryOrder');
      if(token!==session)return;
      units=source.docs.filter(d=>d.data().deleted!==true).map(d=>({...d.data(),id:d.id,lessons:d.data().lessons || []}));
      orders=latest;admin=true;status.textContent='';
      document.querySelector('#reorder-help').textContent='Drag the dotted handle within a year level. Use arrow keys on a handle to reorder. Escape cancels dragging.';
      render();
      const timer=setInterval(async()=>{
        if(!grid.isConnected){stop?.();return;} if(token!==session || busy || drag || document.visibilityState!=='visible')return;
        try {
          const latest=await callable('readUnitLibraryOrder');
          if(token!==session || busy || drag)return;
          if(Object.keys(orders).some(year=>(latest[year]?.revision || 0)<(orders[year]?.revision || 0)))return;
          if(JSON.stringify(latest)!==JSON.stringify(orders)){
            const focus=document.activeElement?.closest('[data-id]')?.dataset.id;
            orders=latest;render(focus);
          }
        }catch{ /* Keep the last confirmed order; a save still checks revision. */ }
      },15000);
      stop=()=>clearInterval(timer);
    }catch(error){if(token===session){units=[];orders={};admin=false;render();status.textContent='Unit Library unavailable. Please try signing in again.';}}
  });
}catch{status.textContent='Cloud unavailable; showing local preview.';}
