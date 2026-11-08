import {getFirebaseServices} from './unit-viewer/firebase.js';
import {yearLabel} from './catalog.mjs';
import {validYear,validGrade,journeyId,gradeKey,validatePlacements,copyPlacements,changeStatus,publicSlots,publishBlockers,yearSwitchSummary} from './journey-model.mjs';
import {studentUnit} from './unit-viewer/student-data.mjs';
import {unitPublicationStatus} from './publication-model.mjs';
import {renderJourney} from './journey-view.mjs';
const q = selector => document.querySelector(selector), message = text => q('#journey-status').textContent = text;
const esc = value => String(value ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const services = await getFirebaseServices();
if (services.app.options.projectId !== 'the-mandarin-room-staging') throw Error('Staging project required.');
const {getFunctions,httpsCallable} = await import('https://www.gstatic.com/firebasejs/12.16.0/firebase-functions.js');
const functions = getFunctions(services.app,'australia-southeast1'), sdk = services.firestoreSdk;
// allUnits: every teacher Unit (authoritative titles). publicUnits: approved student projections only.
let allUnits = new Map(), publicRecords = new Map(), units = new Map(), placements = [], selected = null, revision = 0, busy = false, dirty = false, conflicted = false, discardArmed = false, pendingCurrent = null, generation = 0;
let config = null, pendingSwitch = null;
const options = Array.from({length:7},(_,grade)=>`<option value="${grade}">${yearLabel(grade)}</option>`).join('');
q('#journey-grade').innerHTML = options; q('#unit-grade').innerHTML += options;
q('#academic-year').value = new Date().getFullYear(); q('#copy-year').value = new Date().getFullYear()-1;
const PLACEMENT = {completed:'Completed placement',current:'Current placement',upcoming:'Upcoming placement · private'};
const title = id => allUnits.get(id)?.englishTitle || `Unknown Unit (${id})`;
function clearPreview() { q('#journey-preview').hidden = true; q('#journey-preview').replaceChildren(); }
function edited() { dirty = true; discardArmed = false; q('#load-journey').textContent = 'Load Journey'; clearPreview(); }
function blockers() { return publishBlockers(placements, units, id => title(id)); }
function controls() {
  q('#journey-panel').disabled = busy; q('#sign-out').disabled = busy;
  q('#save-journey').disabled = conflicted || pendingCurrent !== null;
  const blocked = blockers();
  q('#publish-journey').disabled = dirty || conflicted || revision === 0 || pendingCurrent !== null || blocked.length > 0 || !config;
  const reasons = [...(dirty ? ['Save the draft first.'] : []), ...(revision === 0 && !dirty ? ['Save the draft first.'] : []), ...(!config ? ['Choose the active public academic year (below) before publishing any Journey.'] : []), ...blocked];
  q('#publish-blockers').innerHTML = reasons.length && selected ? `<p><strong>This Journey cannot be published yet:</strong></p><ul>${reasons.map(r=>`<li>${esc(r)}</li>`).join('')}</ul>` : '';
  q('#publish-blockers').hidden = !(reasons.length && selected);
  q('#copy-journey').disabled = revision !== 0 || placements.length > 0;
}
function renderRows() {
  q('#editing-title').textContent = `${selected.year} · ${yearLabel(selected.grade)} · revision ${revision}${dirty?' · unsaved changes':''}`;
  q('#journey-rows').innerHTML = placements.map((p,index) => {
    const unit = allUnits.get(p.unitId), pub = unitPublicationStatus(publicRecords.get(p.unitId)), live = units.has(p.unitId);
    const note = !unit ? '<small class="warning">This Unit no longer exists. Remove it from the Journey.</small>'
      : p.status !== 'upcoming' && !live ? '<small class="warning">Not published for students. Publish it in Unit Publication, or set it to Upcoming, before publishing this Journey.</small>'
      : p.status === 'upcoming' ? '<small>Students see only a locked “Coming Soon” card. The Unit stays private.</small>' : `<small>Recommended ${yearLabel(unit.yearLevel)}</small>`;
    return `<article class="journey-row" data-row="${index}"><div class="journey-row-title"><strong>${index+1}. ${esc(title(p.unitId))}</strong><span class="status-badge placement ${p.status}">${PLACEMENT[p.status]}</span> <span class="status-badge ${pub.key}">${esc(pub.label.split(' · ')[0])}</span>${note}</div><label>Status<select data-status="${index}" aria-label="Status for Unit ${index+1}">${['completed','current','upcoming'].map(status=>`<option value="${status}" ${status===p.status?'selected':''}>${status[0].toUpperCase()+status.slice(1)}</option>`).join('')}</select></label><button class="button secondary" data-move="-1" data-index="${index}" aria-label="Move Unit ${index+1} up" ${index===0?'disabled':''}>↑</button><button class="button secondary" data-move="1" data-index="${index}" aria-label="Move Unit ${index+1} down" ${index===placements.length-1?'disabled':''}>↓</button><button class="button secondary" data-remove="${index}" aria-label="Remove Unit ${index+1}">Remove</button></article>`;
  }).join('') || '<p class="empty-state">Add a Unit to start this Journey.</p>';
  q('#current-choice').hidden = pendingCurrent === null; controls();
}
function browseUnits() {
  const grade = q('#unit-grade').value;
  q('#unit-select').innerHTML = [...allUnits.values()].filter(u=>!u.deleted && (grade==='' || u.yearLevel===Number(grade))).sort((a,b)=>a.yearLevel-b.yearLevel||a.englishTitle.localeCompare(b.englishTitle)).map(u=>`<option value="${esc(u.id)}">${esc(u.englishTitle)} · recommended ${yearLabel(u.yearLevel)} · ${esc(unitPublicationStatus(publicRecords.get(u.id)).label.split(' · ')[0])}</option>`).join('');
  q('#add-unit').disabled = !q('#unit-select').options.length;
}
async function refreshUnits() {
  const [teacherUnits, publicSnapshot] = await Promise.all([sdk.getDocs(sdk.collection(services.db,'units')), sdk.getDocs(sdk.collection(services.db,'publicUnits'))]);
  allUnits = new Map(teacherUnits.docs.map(doc=>{const d=doc.data();return [doc.id,{id:doc.id,englishTitle:String(d.englishTitle||''),chineseTitle:String(d.chineseTitle||''),yearLevel:d.yearLevel,deleted:d.deleted===true}];}));
  publicRecords = new Map(publicSnapshot.docs.map(doc=>[doc.id,doc.data()]));
  units = new Map(publicSnapshot.docs.map(doc=>studentUnit(doc.data(),doc.id)).filter(Boolean).map(unit=>[unit.id,unit])); browseUnits();
}
// ---- Active public academic year (journeyConfig/public is the single source of truth) ----
async function refreshConfig() {
  const snapshot = await sdk.getDoc(sdk.doc(services.db,'journeyConfig','public'));
  config = snapshot.exists() ? snapshot.data() : null;
  q('#active-public-year').innerHTML = config ? `Students currently see the <strong>${config.activeAcademicYear}</strong> Learning Journeys.${config.previousAcademicYear?` Previously: ${config.previousAcademicYear}.`:''}` : 'No active public academic year has been chosen yet. Students see “coming soon” for every year level.';
  q('#undo-switch').hidden = !config?.previousAcademicYear; q('#undo-switch').textContent = config?.previousAcademicYear ? `Switch back to ${config.previousAcademicYear}…` : '';
}
async function prepareSwitch(year) {
  if (!validYear(year)) throw Error('Choose a year from 2000–2100.');
  const snapshot = await sdk.getDocs(sdk.query(sdk.collection(services.db,'publishedJourneys'),sdk.where('academicYear','==',year)));
  const summary = yearSwitchSummary(year, snapshot.docs.map(doc=>({id:doc.id,...doc.data()})));
  pendingSwitch = {year, expectedRevision: config?.revision || 0};
  q('#switch-summary').innerHTML = `<p><strong>After switching to ${year}, students will see:</strong></p><ul>${summary.map(row=>`<li>${yearLabel(row.grade)}: ${row.revision?`the published ${year} Journey (revision ${row.revision})`:'“Your Learning Journey is coming soon” (no published '+year+' Journey)'}</li>`).join('')}</ul><p>Draft Journeys, unpublished Units and other years stay hidden. You can switch back at any time.</p>`;
  q('#confirm-year-text').value = ''; q('#confirm-switch').disabled = true; q('#switch-confirm').hidden = false;
}
q('#prepare-switch').onclick = () => run(async()=>prepareSwitch(Number(q('#switch-year').value)));
q('#undo-switch').onclick = () => run(async()=>{ q('#switch-year').value = config.previousAcademicYear; await prepareSwitch(config.previousAcademicYear); });
q('#confirm-year-text').oninput = () => { q('#confirm-switch').disabled = !pendingSwitch || q('#confirm-year-text').value.trim() !== String(pendingSwitch.year); };
q('#cancel-switch').onclick = () => { pendingSwitch = null; q('#switch-confirm').hidden = true; };
q('#confirm-switch').onclick = () => run(async()=>{
  if (!pendingSwitch || q('#confirm-year-text').value.trim() !== String(pendingSwitch.year)) throw Error('Type the academic year to confirm.');
  const result = await httpsCallable(functions,'setActiveAcademicYear')({academicYear:pendingSwitch.year,expectedRevision:pendingSwitch.expectedRevision});
  pendingSwitch = null; q('#switch-confirm').hidden = true; await refreshConfig();
  message(`Students now see the ${result.data.activeAcademicYear} Learning Journeys (${result.data.liveYearLevels.length} of 7 year levels have one).`);
});
function failure(error) {
  if (error.code === 'functions/aborted') { conflicted = true; message('Revision conflict: this changed elsewhere. Your edits are still here. Reload before saving, publishing or switching; reapply any changes you need.'); }
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
  allUnits = new Map(); units = new Map(); selected = null; placements = []; revision = 0; dirty = false; conflicted = false; pendingCurrent = null; config = null; pendingSwitch = null;
  q('#journey-panel').hidden = true; q('#journey-editor').hidden = true; q('#journey-rows').replaceChildren(); clearPreview();
  q('#sign-in').hidden = Boolean(user); q('#sign-out').hidden = !user;
  if (!user) { message('Sign in with your authorised staging Google teacher account.'); return; }
  try {
    if (!user.emailVerified) throw Error('A verified teacher email is required.');
    const teacher = await sdk.getDoc(sdk.doc(services.db,'authorizedTeachers',user.uid));
    if (!teacher.exists() || teacher.data().active !== true) throw Error('This account is not authorised.');
    await Promise.all([refreshUnits(), refreshConfig()]); if (generation !== version) return;
    q('#journey-panel').hidden = false; message('Choose an academic year and Journey year level, then load it.');
  } catch(error) { failure(error); }
});
q('#load-journey').onclick = () => {
  if (dirty && !discardArmed) { discardArmed = true; q('#load-journey').textContent = 'Discard changes and load'; message('Unsaved edits will be discarded. Click “Discard changes and load” to continue.'); return; }
  run(async()=>{
    const year = Number(q('#academic-year').value), grade = Number(q('#journey-grade').value);
    if (!validYear(year) || !validGrade(grade)) throw Error('Choose a year from 2000–2100 and Prep–Year 6.');
    const version = generation;
    const draft = await sdk.getDoc(sdk.doc(services.db,'learningJourneys',journeyId(year,grade)));
    if (version !== generation) return;
    placements = draft.exists() ? validatePlacements(draft.data().placements) : []; revision = draft.exists() ? draft.data().revision : 0;
    selected = {year,grade}; dirty = false; conflicted = false; pendingCurrent = null; discardArmed = false;
    q('#load-journey').textContent = 'Load Journey'; clearPreview();
    await Promise.all([refreshUnits(), refreshConfig()]);
    q('#active-year').textContent = !config ? 'No active public academic year yet: publishing stores this Journey but students will not see it until a year is chosen.' : config.activeAcademicYear === year ? `${year} is the active public year: publishing updates what ${yearLabel(grade)} students see.` : `${year} is not the active public year (${config.activeAcademicYear}): publishing prepares this Journey without showing it to students.`;
    q('#open-journey').href = `./#/journey?year=${grade}`;
    q('#journey-editor').hidden = false; renderRows();
    message(`Loaded ${year} ${yearLabel(grade)}${revision?'':' — new configuration'}.`);
  });
};
q('#unit-grade').onchange = browseUnits;
q('#add-unit').onclick = () => {
  const id = q('#unit-select').value;
  if (!allUnits.has(id)) return;
  if (placements.some(p=>p.unitId===id)) { message('This Unit is already in the Journey.'); return; }
  if (placements.length >= 100) { message('A Journey supports up to 100 Units.'); return; }
  pendingCurrent = null; placements.push({unitId:id,status:'upcoming'}); edited(); renderRows();
  message(`${title(id)} added as Upcoming${units.has(id)?'':' (it stays private until you publish it in Unit Publication)'}. Save your draft when ready.`);
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
  await Promise.all([refreshUnits(), refreshConfig()]); renderRows();
  const blocked = blockers(); if (blocked.length) throw Error(blocked.join(' '));
  const result = await httpsCallable(functions,'publishJourney')({academicYear:selected.year,yearLevel:selected.grade,expectedRevision:revision});
  revision = result.data.revision; renderRows();
  message(result.data.active ? `Journey published · revision ${revision}. ${yearLabel(selected.grade)} students now see it.` : `Journey published for ${selected.year} · revision ${revision}. Students do not see it yet: the active public year is ${result.data.activeAcademicYear}.`);
});
q('#copy-journey').onclick = () => run(async()=>{
  const year = Number(q('#copy-year').value);
  if (!validYear(year) || year===selected.year || revision!==0 || placements.length) throw Error('Copy from another year into a new, empty configuration.');
  const source = await sdk.getDoc(sdk.doc(services.db,'learningJourneys',journeyId(year,selected.grade)));
  if (!source.exists()) throw Error('The source academic year has no saved Journey for this year level.');
  placements = copyPlacements(source.data().placements); edited(); renderRows(); message('Copied Unit references and order. All statuses are Upcoming. Save the new year, then publish separately.');
});
