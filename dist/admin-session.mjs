import {LINKS} from './catalog.mjs';
const esc = value => String(value ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function adminPanel(state) {
  if (state.phase === 'authorised') return {title:'Admin Dashboard',html:`<nav class="admin-dashboard" aria-label="Admin management"><a class="resource-link" href="${LINKS.vocabulary}">Vocabulary Management →</a><a class="resource-link" href="${LINKS.units}">Units Management →</a><a class="resource-link" href="https://themandarinroom.github.io/speaking/">Activities Management →</a><a class="resource-link" href="journey-admin.html">Learning Journey Management →</a><a class="resource-link" href="unit-publication.html">Unit Publication →</a></nav><p class="data-note">Existing applications keep their own permissions and may require a separate sign-in. Activities Management opens the existing Speaking management application.</p><button class="button secondary" data-admin-action="logout">Sign out</button>`};
  const ready = state.phase === 'signed-out' || state.phase === 'error';
  return {title:'Admin Login',html:`<p>Sign in to manage The Mandarin Room.</p>${state.message?`<p role="status">${esc(state.message)}</p>`:''}${ready?'<button class="button" data-admin-action="login">Continue with Google</button>':state.phase==='checking'?'<p role="status">Checking administrator access…</p>':''}${state.phase==='denied'?'<button class="button secondary" data-admin-action="logout">Sign out</button>':''}<p class="data-note">Authorised administrators only</p>`};
}
export async function startAdminSession(update) {
  const {getFirebaseServices} = await import('./unit-viewer/firebase.js');
  const services = await getFirebaseServices();
  if (services.app.options.projectId !== 'the-mandarin-room-staging') throw Error('Staging authentication required.');
  const {auth,authSdk,db,firestoreSdk:sdk} = services;
  await authSdk.setPersistence(auth,authSdk.browserLocalPersistence);
  let state = {phase:'checking'}, generation = 0, busy = false;
  const emit = next => {state=next;update(adminPanel(state));};
  authSdk.onAuthStateChanged(auth,async user=>{
    const request = ++generation;
    if (!user) {emit({phase:'signed-out'});return;}
    emit({phase:'checking'});
    try {
      if (!user.emailVerified) throw Error('A verified teacher email is required.');
      const teacher = await sdk.getDoc(sdk.doc(db,'authorizedTeachers',user.uid));
      if (request !== generation) return;
      if (!teacher.exists() || teacher.data().active !== true) throw Error('This account is not authorised.');
      emit({phase:'authorised'});
    } catch(error) {if(request===generation)emit({phase:'denied',message:error.message});}
  },error=>emit({phase:'error',message:error.message}));
  return {
    open:()=>update(adminPanel(state)),
    async act(action) {
      if (busy) return;
      busy = true;
      try {
        if (action==='login') await authSdk.signInWithPopup(auth,new authSdk.GoogleAuthProvider());
        else if (action==='logout') await authSdk.signOut(auth);
      } catch(error) {emit({phase:auth.currentUser?'denied':'error',message:error.message});}
      finally {busy=false;}
    }
  };
}
