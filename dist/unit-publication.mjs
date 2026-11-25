import { getFirebaseServices } from './unit-viewer/firebase.js';
import { TOPICS, currentTopicIds, yearLabel } from './catalog.mjs';
import { unitPublicationStatus, reconstructSelections, publicationPayload, removedContent, publishableResources } from './publication-model.mjs';
const q = selector => document.querySelector(selector), status = q('#publication-status');
const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const services = await getFirebaseServices();
if (services.app.options.projectId !== 'the-mandarin-room-staging') throw new Error('Staging project required.');
const { getFunctions, httpsCallable } = await import('https://www.gstatic.com/firebasejs/12.16.0/firebase-functions.js');
const functions = getFunctions(services.app, 'australia-southeast1');
const sdk = services.firestoreSdk;
let sources = [], publicRecords = new Map(), current = null, publicRecord = null, revision = 0, busy = false, loadVersion = 0, pendingRemoval = null;
function controls() {
  q('#source-unit').disabled = busy;
  if (current) { const s = unitPublicationStatus(publicRecord); q('#source-year').innerHTML = `Recommended ${yearLabel(current.yearLevel)} · <span class="status-badge ${s.key}">${escape(s.label)}</span>`; }
  q('#publish').disabled = busy || !current || current.deleted === true;
  q('#unpublish').disabled = busy || publicRecord?.published !== true;
}
function sourceOptions() {
  q('#source-unit').innerHTML = '<option value="">Choose a cloud Unit…</option>' + sources.map(unit => `<option value="${escape(unit.id)}">${escape(unit.englishTitle)} · ${yearLabel(unit.yearLevel)} · ${escape(unitPublicationStatus(publicRecords.get(unit.id)).label.split(' · ')[0])}${unit.deleted ? ' (deleted)' : ''}</option>`).join('');
}
async function loadPublicRecords() {
  const snapshot = await sdk.getDocs(sdk.collection(services.db, 'publicUnits'));
  publicRecords = new Map(snapshot.docs.map(doc => [doc.id, doc.data()]));
}
// Vocabulary Sets and Speaking Practices may come from any year level; only availability to students matters.
async function availability(unit) {
  const ids = kind => [...new Set((unit.lessons || []).map(lesson => lesson[kind]).filter(Boolean))];
  const read = async (collection, id) => { try { return await sdk.getDoc(sdk.doc(services.db, collection, id)); } catch { return null; } };
  const vocabulary = new Map(await Promise.all(ids('vocabularySetId').map(async id => { const d = await read('vocabularySets', id); return [id, Boolean(d?.exists() && d.data().published === true && d.data().deleted !== true)]; })));
  const speaking = new Map(await Promise.all(ids('speakingPracticeId').map(async id => { const d = await read('speakingPractices', id); return [id, Boolean(d?.exists() && d.data().deleted === false)]; })));
  return {vocabulary, speaking};
}
q('#sign-in').onclick = () => services.authSdk.signInWithPopup(services.auth, new services.authSdk.GoogleAuthProvider()).catch(error => { status.textContent = error.message; });
q('#sign-out').onclick = () => services.authSdk.signOut(services.auth);
services.authSdk.onAuthStateChanged(services.auth, async user => {
  const version = ++loadVersion;
  current = null; publicRecord = null; sources = []; revision = 0;
  q('#publication-panel').hidden = true; q('#publication-form').hidden = true;
  q('#sign-in').hidden = Boolean(user); q('#sign-out').hidden = !user;
  if (!user) { status.textContent = 'Sign in with your authorised staging Google teacher account.'; return; }
  try {
    if (!user.emailVerified) throw new Error('A verified teacher email is required.');
    const teacher = await sdk.getDoc(sdk.doc(services.db, 'authorizedTeachers', user.uid));
    if (!teacher.exists() || teacher.data().active !== true) throw new Error('This account is not authorised.');
    const [snapshot] = await Promise.all([sdk.getDocs(sdk.collection(services.db, 'units')), loadPublicRecords()]);
    if (version !== loadVersion) return;
    sources = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
    sourceOptions();
    q('#publication-panel').hidden = false;
    status.textContent = sources.length ? 'Choose a Unit and review the student-facing fields.' : 'No cloud Units are available in staging. Original production Units are not copied.';
  } catch (error) { status.textContent = error.message; }
});
function renderLessons(unit, selections, available) {
  q('#publication-lessons').innerHTML = (unit.lessons || []).map((lesson, index) => {
    if (lesson.teacherOnly === true) return `<section class="lesson-publication teacher-only" data-index="${index}"><h3>${index + 1}. ${escape(lesson.title)}</h3><p class="status-badge teacher">Teacher only · never published to students</p></section>`;
    const s = selections.get(lesson.id), resources = publishableResources(lesson);
    const vocabOk = lesson.vocabularySetId && available.vocabulary.get(lesson.vocabularySetId), speakOk = lesson.speakingPracticeId && available.speaking.get(lesson.speakingPracticeId);
    return `<section class="lesson-publication" data-index="${index}"><h3>${index + 1}. ${escape(lesson.title)}</h3><label><input type="checkbox" name="lesson" ${s.include ? 'checked' : ''}>Include this lesson</label><label>Approved student activity text<textarea name="content" rows="3" maxlength="5000">${escape(s.content)}</textarea></label>${lesson.learningIntention ? `<label><input type="checkbox" name="intention" ${s.intention ? 'checked' : ''}>Include learning intention: ${escape(lesson.learningIntention)}</label>` : ''}${lesson.vocabularySetId ? `<label><input type="checkbox" name="vocabulary" ${s.vocabulary && vocabOk ? 'checked' : ''} ${vocabOk ? '' : 'disabled'}>Include linked Vocabulary (${escape(lesson.vocabularySetId)})${vocabOk ? '' : ' — <span class="warning">not available to students, cannot be included</span>'}</label>` : ''}${lesson.speakingPracticeId ? `<label><input type="checkbox" name="speaking" ${s.speaking && speakOk ? 'checked' : ''} ${speakOk ? '' : 'disabled'}>Include linked Speaking Practice (${escape(lesson.speakingPracticeId)})${speakOk ? '' : ' — <span class="warning">not available to students, cannot be included</span>'}</label>` : ''}<div class="source-links">${resources.map((url, i) => `<label><input type="checkbox" name="resource" value="${i}" ${s.resources.includes(url) ? 'checked' : ''}>Approve resource: ${escape(url)}</label>`).join('')}</div></section>`;
  }).join('');
}
function readSelections() {
  const selections = new Map();
  for (const section of q('#publication-lessons').children) {
    const lesson = current.lessons[Number(section.dataset.index)];
    if (lesson.teacherOnly === true) continue;
    const resources = publishableResources(lesson);
    selections.set(lesson.id, {include: section.querySelector('[name=lesson]').checked, content: section.querySelector('[name=content]').value,
      intention: section.querySelector('[name=intention]')?.checked || false, vocabulary: section.querySelector('[name=vocabulary]')?.checked || false,
      speaking: section.querySelector('[name=speaking]')?.checked || false, resources: [...section.querySelectorAll('[name=resource]:checked')].map(input => resources[Number(input.value)])});
  }
  return selections;
}
function clearRemoval() { pendingRemoval = null; q('#removal-confirm').hidden = true; q('#confirm-removal').checked = false; }
q('#source-unit').onchange = async () => {
  const version = ++loadVersion;
  current = null; publicRecord = null; q('#publication-form').hidden = true; revision = 0; clearRemoval(); controls();
  const unit = sources.find(unit => unit.id === q('#source-unit').value);
  if (!unit) return;
  try {
    // Refresh source and publication so stale tabs cannot silently overwrite changes.
    const [source, published] = await Promise.all([sdk.getDoc(sdk.doc(services.db, 'units', unit.id)), sdk.getDoc(sdk.doc(services.db, 'publicUnits', unit.id))]);
    if (!source.exists()) throw new Error('Source Unit is unavailable.');
    const next = { ...source.data(), id: source.id }, available = await availability(next);
    if (version !== loadVersion) return;
    current = next; publicRecord = published.exists() ? published.data() : null; revision = publicRecord?.revision || 0;
    const restored = reconstructSelections(current, publicRecord);
    q('#source-title').textContent = `${current.englishTitle} ${current.chineseTitle || ''}`;
    q('#student-description').value = restored.description;
    q('#unit-approval').checked = false;
    q('#publication-topics').innerHTML = TOPICS.map(topic => `<label><input type="checkbox" name="topic" value="${topic.id}" ${currentTopicIds(restored.topics).includes(topic.id) ? 'checked' : ''}>${topic.title}</label>`).join('');
    renderLessons(current, restored.selections, available);
    q('#publication-warnings').innerHTML = restored.warnings.length ? `<p><strong>Review before republishing:</strong></p><ul>${restored.warnings.map(w => `<li>${escape(w)}</li>`).join('')}</ul>` : '';
    q('#publication-warnings').hidden = !restored.warnings.length;
    q('#student-preview').href = `./#/unit?unit=${encodeURIComponent(current.id)}`;
    q('#student-preview').hidden = publicRecord?.published !== true;
    q('#publication-form').hidden = false; controls();
    status.textContent = restored.reconstructed ? 'The current student publication has been restored below. Change only what you intend to change, then reconfirm approval.'
      : publicRecord ? 'This Unit was unpublished, so no student selections are stored. Choose the lessons and fields again before publishing.'
      : 'Review selected lessons and every optional field. Reconfirm Unit approval before publishing.';
  } catch (error) { current = null; status.textContent = error.message; }
};
q('#publication-form').onchange = event => { if (event.target.id !== 'confirm-removal' && event.target.id !== 'unit-approval') clearRemoval(); };
q('#publication-form').onsubmit = async event => {
  event.preventDefault(); if (busy || !current) return;
  if (!q('#unit-approval').checked) { status.textContent = 'Explicit Unit approval is required.'; return; }
  const topics = [...document.querySelectorAll('input[name=topic]:checked')].map(input => input.value);
  let payload;
  try { payload = publicationPayload(current, revision, {description: q('#student-description').value, topics, selections: readSelections()}); }
  catch (error) { status.textContent = error.message; return; }
  if (!topics.length || !payload.student.lessons.length) { status.textContent = 'Select at least one Topic and one lesson.'; return; }
  // Never remove published student content without an explicit, itemised confirmation.
  const removed = removedContent(publicRecord, current, payload), key = JSON.stringify(payload);
  if (removed.length && !(pendingRemoval === key && q('#confirm-removal').checked)) {
    pendingRemoval = key;
    q('#removal-list').innerHTML = removed.map(item => `<li>${escape(item)}</li>`).join('');
    q('#removal-confirm').hidden = false; q('#confirm-removal').checked = false;
    status.textContent = `Republishing would remove ${removed.length} item(s) students can currently see. Review the list, confirm, then publish again.`;
    return;
  }
  busy = true; controls(); q('#unit-approval').checked = false;
  try {
    const result = await httpsCallable(functions, 'publishPublicUnit')(payload);
    revision = result.data.revision;
    const fresh = await sdk.getDoc(sdk.doc(services.db, 'publicUnits', current.id));
    publicRecord = fresh.exists() ? fresh.data() : null; publicRecords.set(current.id, publicRecord); sourceOptions(); q('#source-unit').value = current.id;
    clearRemoval(); q('#student-preview').hidden = false;
    status.textContent = `Published for students · revision ${revision}. Original Unit unchanged.`;
  } catch (error) { status.textContent = `${error.message} Reload the Unit before trying again.`; }
  finally { busy = false; controls(); }
};
q('#unpublish').onclick = async () => {
  if (busy || !current || publicRecord?.published !== true) return;
  if (!confirm(`Unpublish “${current.englishTitle}”? Students will no longer see it, and any Journey showing it as Current or Completed will show “Unit unavailable”. Its student selections are not kept.`)) return;
  busy = true; controls();
  try {
    const result = await httpsCallable(functions, 'unpublishPublicUnit')({ unitId: current.id, expectedRevision: revision });
    revision = result.data.revision; publicRecord = {...publicRecord, published: false, approvedForStudents: false, revision}; publicRecords.set(current.id, publicRecord); sourceOptions(); q('#source-unit').value = current.id;
    q('#student-preview').hidden = true; q('#unit-approval').checked = false;
    status.textContent = `Unpublished · revision ${revision}. Original Unit unchanged.`;
  } catch (error) { status.textContent = `${error.message} Reload the Unit before trying again.`; }
  finally { busy = false; controls(); }
};
