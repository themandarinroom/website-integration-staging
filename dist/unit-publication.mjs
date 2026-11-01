import { getFirebaseServices } from './unit-viewer/firebase.js';
import { TOPICS, yearLabel } from './catalog.mjs';
const q = selector => document.querySelector(selector), status = q('#publication-status');
const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const services = await getFirebaseServices();
if (services.app.options.projectId !== 'the-mandarin-room-staging') throw new Error('Staging project required.');
const { getFunctions, httpsCallable } = await import('https://www.gstatic.com/firebasejs/12.16.0/firebase-functions.js');
const functions = getFunctions(services.app, 'australia-southeast1');
const sdk = services.firestoreSdk;
let sources = [], current = null, revision = 0, busy = false, loadVersion = 0;
const allowedUrl = value => { try { const url = new URL(value); return url.protocol === 'https:' && !url.username && !url.password; } catch { return false; } };
function controls() { q('#source-unit').disabled = busy; if (current) q('#source-year').textContent = `Recommended ${yearLabel(current.yearLevel)} · publication revision ${revision}`; q('#publish').disabled = busy || !current || current.deleted === true; q('#unpublish').disabled = busy || revision === 0; }
q('#sign-in').onclick = () => services.authSdk.signInWithPopup(services.auth, new services.authSdk.GoogleAuthProvider()).catch(error => { status.textContent = error.message; });
q('#sign-out').onclick = () => services.authSdk.signOut(services.auth);
services.authSdk.onAuthStateChanged(services.auth, async user => {
  const version = ++loadVersion;
  current = null; sources = []; revision = 0;
  q('#publication-panel').hidden = true; q('#publication-form').hidden = true;
  q('#sign-in').hidden = Boolean(user); q('#sign-out').hidden = !user;
  if (!user) { status.textContent = 'Sign in with your authorised staging Google teacher account.'; return; }
  try {
    if (!user.emailVerified) throw new Error('A verified teacher email is required.');
    const teacher = await sdk.getDoc(sdk.doc(services.db, 'authorizedTeachers', user.uid));
    if (!teacher.exists() || teacher.data().active !== true) throw new Error('This account is not authorised.');
    const snapshot = await sdk.getDocs(sdk.collection(services.db, 'units'));
    if (version !== loadVersion) return;
    sources = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
    q('#source-unit').innerHTML = '<option value="">Choose a cloud Unit…</option>' + sources.map(unit => `<option value="${escape(unit.id)}">${escape(unit.englishTitle)} · ${yearLabel(unit.yearLevel)}${unit.deleted ? ' (deleted)' : ''}</option>`).join('');
    q('#publication-panel').hidden = false;
    status.textContent = sources.length ? 'Choose a Unit and review the student-facing fields.' : 'No cloud Units are available in staging. Original production Units are not copied.';
  } catch (error) { status.textContent = error.message; }
});
q('#source-unit').onchange = async () => {
  const version = ++loadVersion;
  current = null; q('#publication-form').hidden = true; revision = 0; controls();
  const unit = sources.find(unit => unit.id === q('#source-unit').value);
  if (!unit) return;
  try {
    // Refresh source and publication so stale tabs cannot silently overwrite changes.
    const [source, published] = await Promise.all([sdk.getDoc(sdk.doc(services.db, 'units', unit.id)), sdk.getDoc(sdk.doc(services.db, 'publicUnits', unit.id))]);
    if (version !== loadVersion) return;
    if (!source.exists()) throw new Error('Source Unit is unavailable.');
    current = { ...source.data(), id: source.id }; revision = published.exists() ? published.data().revision : 0;
    const publicData = published.exists() ? published.data() : null;
    q('#source-title').textContent = `${current.englishTitle} ${current.chineseTitle || ''}`;
    q('#source-year').textContent = `Recommended ${yearLabel(current.yearLevel)} · publication revision ${revision}`;
    q('#student-description').value = publicData?.description || '';
    q('#unit-approval').checked = false;
    q('#publication-topics').innerHTML = TOPICS.map(topic => `<label><input type="checkbox" name="topic" value="${topic.id}" ${(publicData?.topics || []).includes(topic.id) ? 'checked' : ''}>${topic.title}</label>`).join('');
    q('#publication-lessons').innerHTML = (current.lessons || []).map((lesson, index) => {
      const approved = publicData?.lessons?.find(item => item.id === lesson.id);
      const resources = String(lesson.resources || '').split('\n').map(url => url.trim()).filter(allowedUrl);
      return `<section class="lesson-publication" data-index="${index}"><h3>${index + 1}. ${escape(lesson.title)}</h3><label><input type="checkbox" name="lesson" ${approved ? 'checked' : ''}>Include this lesson</label><label>Approved student activity text<textarea name="content" rows="3" maxlength="5000">${escape(approved?.content || '')}</textarea></label><label><input type="checkbox" name="intention">Include learning intention: ${escape(lesson.learningIntention || '')}</label>${lesson.vocabularySetId ? `<label><input type="checkbox" name="vocabulary">Include linked Vocabulary (${escape(lesson.vocabularySetId)})</label>` : ''}${lesson.speakingPracticeId ? `<label><input type="checkbox" name="speaking">Include linked Speaking Practice (${escape(lesson.speakingPracticeId)})</label>` : ''}<div class="source-links">${resources.map((url, i) => `<label><input type="checkbox" name="resource" value="${i}">Approve resource: ${escape(url)}</label>`).join('')}${(lesson.workedExamples || []).map(example => `<label><input type="checkbox" name="example" value="${escape(example.id)}">Approve worked example: ${escape(example.alt || example.id)}<small>${escape(example.url)}</small></label>`).join('')}</div></section>`;
    }).join('');
    q('#student-preview').href = `./#/unit?unit=${encodeURIComponent(current.id)}`;
    q('#student-preview').hidden = publicData?.published !== true;
    q('#publication-form').hidden = false; controls();
    status.textContent = 'Review selected lessons and every optional field. Reconfirm Unit approval before publishing.';
  } catch (error) { current = null; status.textContent = error.message; }
};
q('#publication-form').onsubmit = async event => {
  event.preventDefault(); if (busy || !current) return;
  if (!q('#unit-approval').checked) { status.textContent = 'Explicit Unit approval is required.'; return; }
  const topics = [...document.querySelectorAll('input[name=topic]:checked')].map(input => input.value);
  const lessons = [...q('#publication-lessons').children].filter(section => section.querySelector('[name=lesson]').checked).map(section => {
    const source = current.lessons[Number(section.dataset.index)];
    const resources = String(source.resources || '').split('\n').map(url => url.trim()).filter(allowedUrl);
    return { id: source.id, includeLearningIntention: section.querySelector('[name=intention]').checked, content: section.querySelector('[name=content]').value,
      includeVocabulary: section.querySelector('[name=vocabulary]')?.checked || false, includeSpeaking: section.querySelector('[name=speaking]')?.checked || false,
      resourceUrls: [...section.querySelectorAll('[name=resource]:checked')].map(input => resources[Number(input.value)]), workedExampleIds: [...section.querySelectorAll('[name=example]:checked')].map(input => input.value) };
  });
  if (!topics.length || !lessons.length) { status.textContent = 'Select at least one Topic and one lesson.'; return; }
  const stamp = current.updatedAt;
  if (!Number.isInteger(stamp?.seconds) || !Number.isInteger(stamp?.nanoseconds)) { status.textContent = 'Source Unit has no valid cloud revision; publication is unavailable.'; return; }
  busy = true; controls(); q('#unit-approval').checked = false;
  try {
    const result = await httpsCallable(functions, 'publishPublicUnit')({ unitId: current.id, expectedRevision: revision, sourceVersion: `${stamp.seconds}:${stamp.nanoseconds}`, approved: true, student: { description: q('#student-description').value, topics, lessons } });
    revision = result.data.revision; q('#student-preview').hidden = false;
    status.textContent = `Published for students · revision ${revision}. Original Unit unchanged.`;
  } catch (error) { status.textContent = `${error.message} Reload the Unit before trying again.`; }
  finally { busy = false; controls(); }
};
q('#unpublish').onclick = async () => {
  if (busy || !current || revision === 0) return;
  busy = true; controls();
  try { const result = await httpsCallable(functions, 'unpublishPublicUnit')({ unitId: current.id, expectedRevision: revision }); revision = result.data.revision; q('#student-preview').hidden = true; q('#unit-approval').checked = false; status.textContent = `Unpublished · revision ${revision}. Original Unit unchanged.`; }
  catch (error) { status.textContent = `${error.message} Reload the Unit before trying again.`; }
  finally { busy = false; controls(); }
};
