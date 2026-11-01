import {getFirebaseServices} from './unit-viewer/firebase.js';
import {yearLabel} from './catalog.mjs';
import {validYear,validGrade,journeyId,gradeKey,validatePlacements,copyPlacements,changeStatus,publicSlots} from './journey-model.mjs';
import {studentUnit} from './unit-viewer/student-data.mjs';
import {renderJourney} from './journey-view.mjs';
const q = selector => document.querySelector(selector), message = text => q('#journey-status').textContent = text;
const esc = value => String(value ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const services = await getFirebaseServices();
if (services.app.options.projectId !== 'the-mandarin-room-staging') throw Error('Staging project required.');
const {getFunctions,httpsCallable} = await import('https://www.gstatic.com/firebasejs/12.16.0/firebase-functions.js');
const functions = getFunctions(services.app,'australia-southeast1'), sdk = services.firestoreSdk;
let units = new Map(), placements = [], selected = null, revision = 0, busy = false, dirty = false, conflicted = false, discardArmed = false, pendingCurrent = null, generation = 0;
const options = Array.from({length:7},(_,grade)=>`<option value="${grade}">${yearLabel(grade)}</option>`).join('');
q('#journey-grade').innerHTML = options; q('#unit-grade').innerHTML += options;
q('#academic-year').value = new Date().getFullYear(); q('#copy-year').value = new Date().getFullYear()-1;
function clearPreview() { q('#journey-preview').hidden = true; q('#journey-preview').replaceChildren(); }
function edited() { dirty = true; discardArmed = false; q('#load-journey').textContent = 'Load Journey'; clearPreview(); }
function controls() {
  q('#journey-panel').disabled = busy; q('#sign-out').disabled = busy;
  q('#save-journey').disabled = conflicted || pendingCurrent !== null;
  q('#publish-journey').disabled = dirty || conflicted || revision === 0 || pendingCurrent !== null || placements.some(p=>p.status !== 'upcoming' && !units.has(p.unitId));
  q('#copy-journey').disabled = revision !== 0 || placements.length > 0;
}
function renderRows() {
  q('#editing-title').textContent = `${selected.year} · ${yearLabel(selected.grade)} · revision ${revision}${dirty?' · unsaved changes':''}`;
  q('#journey-rows').innerHTML = placements.map((p,index) => {
    const unit = units.get(p.unitId);
    return `<article class="journey-row" data-row="${index}"><div class="journey-row-title"><strong>${index+1}. ${esc(unit?.englishTitle || p.unitId)}</strong><small>${unit?`Recommended ${yearLabel(unit.yearLevel)}`:'Warning: no approved public projection. Current or Completed cannot be published.'}</small></div><label>Status<select data-status="${index}" aria-label="Status for Unit ${index+1}">${['completed','current','upcoming'].map(status=>`<option value="${status}" ${status===p.status?'selected':''}>${status[0].toUpperCase()+status.slice(1)}</option>`).join('')}</select></label><button class="button secondary" data-move="-1" data-index="${index}" aria-label="Move Unit ${index+1} up" ${index===0?'disabled':''}>↑</button><button class="button secondary" data-move="1" data-index="${index}" aria-label="Move Unit ${index+1} down" ${index===placements.length-1?'disabled':''}>↓</button><button class="button secondary" data-remove="${index}" aria-label="Remove Unit ${index+1}">Remove</button></article>`;
  }).join('') || '<p class="empty-state">Add a published Unit to start this Journey.</p>';
  q('#current-choice').hidden = pendingCurrent === null; controls();
}
function browseUnits() {
  const grade = q('#unit-grade').value;
  q('#unit-select').innerHTML = [...units.values()].filter(u=>grade==='' || u.yearLevel===Number(grade)).map(u=>`<option value="${esc(u.id)}">${esc(u.englishTitle)} · recommended ${yearLabel(u.yearLevel)}</option>`).join('');
  q('#add-unit').disabled = !q('#unit-select').options.length;
}
async function refreshUnits() {
  const snapshot = await sdk.getDocs(sdk.query(sdk.collection(services.db,'publicUnits'),sdk.where('published','==',true),sdk.where('approvedForStudents','==',true),sdk.where('schemaVersion','==',1)));
  units = new Map(snapshot.docs.map(doc=>studentUnit(doc.data(),doc.id)).filter(Boolean).map(unit=>[unit.id,unit])); browseUnits();
}
function failure(error) {
  if (error.code === 'functions/aborted') { conflicted = true; message('Revision conflict: this Journey changed elsewhere. Your edits are still here. Reload the Journey before saving or publishing; reapply any changes you need.'); }
  else message(`Operation failed: ${error.message || error}. No success has been confirmed.`);
}
async function run(action) {
  if (busy) return; busy = true; controls();
  try { await action(); } catch (error) { failure(error); }
  finally { busy = false; controls(); }
}
q('#sign-in').onclick = () => services.authSdk.signInWithPopup(services.auth,new services.authSdk.GoogleAuthProvider()).catch(failure);
q('#sign-out').onclick = () => services.authSdk.signOut(services.auth);
services.authSdk.onAuthStateChanged(services.auth,async user=>{
  const version = ++generation;
  units = new Map(); selected = null; placements = []; revision = 0; dirty = false; conflicted = false; pendingCurrent = null;
  q('#journey-panel').hidden = true; q('#journey-editor').hidden = true; q('#journey-rows').replaceChildren(); clearPreview();
  q('#sign-in').hidden = Boolean(user); q('#sign-out').hidden = !user;
  if (!user) { message('Sign in with your authorised staging Google teacher account.'); return; }
  try {
    if (!user.emailVerified) throw Error('A verified teacher email is required.');
    const teacher = await sdk.getDoc(sdk.doc(services.db,'authorizedTeachers',user.uid));
    if (!teacher.exists() || teacher.data().active !== true) throw Error('This account is not authorised.');
    await refreshUnits(); if (generation !== version) return;
    q('#journey-panel').hidden = false; message('Choose an academic year and Journey year level, then load it.');
  } catch(error) { failure(error); }
});
q('#load-journey').onclick = () => {
  if (dirty && !discardArmed) { discardArmed = true; q('#load-journey').textContent = 'Discard changes and load'; message('Unsaved edits will be discarded. Click “Discard changes and load” to continue.'); return; }
  run(async()=>{
    const year = Number(q('#academic-year').value), grade = Number(q('#journey-grade').value);
    if (!validYear(year) || !validGrade(grade)) throw Error('Choose a year from 2000–2100 and Prep–Year 6.');
    const version = generation;
    const [draft,pointer] = await Promise.all([sdk.getDoc(sdk.doc(services.db,'learningJourneys',journeyId(year,grade))),sdk.getDoc(sdk.doc(services.db,'journeySettings',gradeKey(grade)))]);
    if (version !== generation) return;
    placements = draft.exists() ? validatePlacements(draft.data().placements) : []; revision = draft.exists() ? draft.data().revision : 0;
    selected = {year,grade}; dirty = false; conflicted = false; pendingCurrent = null; discardArmed = false;
    q('#load-journey').textContent = 'Load Journey'; clearPreview();
    q('#active-year').textContent = pointer.exists()?`Active academic year for ${yearLabel(grade)}: ${pointer.data().academicYear}`:`No active academic year for ${yearLabel(grade)} yet.`;
    q('#open-journey').href = `./#/journey?year=${grade}`;
    q('#journey-editor').hidden = false; await refreshUnits(); renderRows();
    message(`Loaded ${year} ${yearLabel(grade)}${revision?'':' — new configuration'}. ${placements.some(p=>!units.has(p.unitId))?'Warning: some Unit references have no approved public projection.':''}`);
  });
};
q('#unit-grade').onchange = browseUnits;
q('#add-unit').onclick = () => {
  const id = q('#unit-select').value;
  if (!units.has(id)) return;
  if (placements.some(p=>p.unitId===id)) { message('This Unit is already in the Journey.'); return; }
  if (placements.length >= 100) { message('A Journey supports up to 100 Units.'); return; }
  pendingCurrent = null; placements.push({unitId:id,status:'upcoming'}); edited(); renderRows(); message('Unit added as Upcoming. Save your draft when ready.');
};
q('#journey-rows').onclick = event => {
  const move = event.target.closest('[data-move]'), remove = event.target.closest('[data-remove]');
  if (!move && !remove) return;
  if (pendingCurrent !== null) { message('Finish or cancel the Current status choice first.'); return; }
  if (remove) placements.splice(Number(remove.dataset.remove),1);
  else { const index = Number(move.dataset.index), next = index+Number(move.dataset.move); if (next<0 || next>=placements.length) return; [placements[index],placements[next]]=[placements[next],placements[index]]; }
  edited(); renderRows();
};
q('#journey-rows').onchange = event => {
  const input = event.target.closest('[data-status]'); if (!input) return;
  if (pendingCurrent !== null) { renderRows(); message('Finish or cancel the Current status choice first.'); return; }
  const index = Number(input.dataset.status), status = input.value;
  if (status==='current' && placements.some((p,i)=>i!==index && p.status==='current')) { pendingCurrent = index; renderRows(); return; }
  placements = changeStatus(placements,index,status); edited(); renderRows();
};
for (const [id,previous] of [['previous-completed','completed'],['previous-upcoming','upcoming']]) q('#'+id).onclick = () => {
  if (pendingCurrent===null) return;
  placements = changeStatus(placements,pendingCurrent,'current',previous); pendingCurrent = null; edited(); renderRows();
};
q('#cancel-current').onclick = () => {pendingCurrent=null; renderRows();};
q('#save-journey').onclick = () => run(async()=>{
  validatePlacements(placements);
  const result = await httpsCallable(functions,'saveJourney')({academicYear:selected.year,yearLevel:selected.grade,placements,expectedRevision:revision});
  revision = result.data.revision; dirty = false; renderRows(); message(`Draft saved · revision ${revision}. Student publication is unchanged.`);
});
q('#preview-journey').onclick = () => {
  if (!selected || pendingCurrent !== null) return;
  const preview = {academicYear:selected.year,yearLevel:selected.grade,slots:publicSlots(placements),units};
  q('#journey-preview').innerHTML = '<p class="notice">Admin preview of unsaved selections. This is not the active student publication.</p>'+renderJourney(preview,selected.grade,{base:'./'});
  q('#journey-preview').hidden = false; message('Student preview ready. Upcoming references and details are excluded.');
};
q('#publish-journey').onclick = () => run(async()=>{
  if (dirty || conflicted || !revision) throw Error('Save the draft before publishing.');
  await refreshUnits(); renderRows();
  if (placements.some(p=>p.status!=='upcoming' && !units.has(p.unitId))) throw Error('Every Current or Completed Unit needs an approved public projection.');
  const result = await httpsCallable(functions,'publishJourney')({academicYear:selected.year,yearLevel:selected.grade,expectedRevision:revision});
  revision = result.data.revision; renderRows();
  q('#active-year').textContent = `Active academic year for ${yearLabel(selected.grade)}: ${selected.year}`;
  message(`Journey published · revision ${revision}. ${selected.year} is now the active academic year for ${yearLabel(selected.grade)}.`);
});
q('#copy-journey').onclick = () => run(async()=>{
  const year = Number(q('#copy-year').value);
  if (!validYear(year) || year===selected.year || revision!==0 || placements.length) throw Error('Copy from another year into a new, empty configuration.');
  const source = await sdk.getDoc(sdk.doc(services.db,'learningJourneys',journeyId(year,selected.grade)));
  if (!source.exists()) throw Error('The source academic year has no saved Journey for this year level.');
  placements = copyPlacements(source.data().placements); edited(); renderRows(); message('Copied Unit references and order. All statuses are Upcoming. Save the new year, then publish separately.');
});
