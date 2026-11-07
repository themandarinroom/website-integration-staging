// Unit Library v0.4.0 board embedded in the Admin page: module graph, ordering, conflict and auth behaviour.
// Runs the built dist/teacher-units/index.js against in-memory Firebase stubs; nothing touches the network.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';

const dist = fileURLToPath(new URL('../dist/', import.meta.url));
const read = file => fs.readFileSync(path.join(dist, file), 'utf8');

function relativeImports(source) {
  const found = [];
  for (const m of source.matchAll(/(?:import|export)\s[^'"`;]*?from\s*['"]([^'"]+)['"]|import\(\s*['"`]([^'"`$]+)['"`]\s*\)|<script[^>]+src="([^"]+)"|<link[^>]+href="([^"]+\.css[^"]*)"/g)) {
    const spec = m[1] || m[2] || m[3] || m[4];
    if (spec.startsWith('./') || spec.startsWith('../') || /^[\w-]+\.(mjs|js|css)/.test(spec)) found.push(spec);
  }
  return found;
}

test('every relative module, script and stylesheet referenced by the website exists in the payload', () => {
  const missing = [];
  const walk = dir => fs.readdirSync(dir, {withFileTypes: true}).flatMap(e => e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)]);
  for (const file of walk(dist).filter(f => /\.(mjs|js|html)$/.test(f))) {
    for (const spec of relativeImports(fs.readFileSync(file, 'utf8'))) {
      const target = path.resolve(path.dirname(file), spec.split(/[?#]/)[0]);
      if (!fs.existsSync(target)) missing.push(`${path.relative(dist, file)} -> ${spec}`);
    }
  }
  assert.deepEqual(missing, []);
  assert(read('teacher-units/index.js').includes("from './library-order.mjs'"));
});

test('embedded board shares the Admin Firebase app, keeps editor links external and never writes Firestore directly', () => {
  const js = read('teacher-units/index.js');
  assert(js.includes("from '../unit-viewer/firebase.js'") && js.includes("from '../teacher-unit-data.mjs'"));
  assert(!js.includes("'./store.js'") && !js.includes("'./firebase.js'"));
  assert(js.includes('href="https://themandarinroom.github.io/units/edit.html?') && js.includes('href="unit-management.html?'));
  assert(!/href="(edit|view)\.html\?/.test(js));
  assert(!/setDoc|updateDoc|addDoc|deleteDoc|writeBatch|runTransaction|localStorage|sessionStorage/.test(js));
  const controller = read('unit-management.mjs');
  for (const id of ['id="units" class="year-board"', 'id="status"', 'id="reorder-help"', 'id="sign-in"', 'id="sign-out"', 'id="auth-state"']) assert(controller.includes(id), id);
  assert(controller.includes('<div hidden><span id="auth-state">'), 'board auth controls stay hidden; the Admin page owns sign-in');
  const css = read('teacher-units/styles.css');
  assert(css.includes('.year-board{display:grid;grid-template-columns:repeat(7,') && css.includes('@media(max-width:700px)'));
});

test('website ordering module is the Unit Library module unchanged', async () => {
  const source = fs.readFileSync(new URL('../../units-repository/library-order.mjs', import.meta.url), 'utf8');
  assert.equal(read('teacher-units/library-order.mjs'), source);
  const {orderedUnits, moveUnit} = await import(pathToFileURL(path.join(dist, 'teacher-units/library-order.mjs')));
  assert.deepEqual(orderedUnits([{id: 'c'}, {id: 'a'}, {id: 'b'}], ['b']).map(u => u.id), ['b', 'c', 'a']);
  assert.deepEqual(moveUnit(['a', 'b', 'c'], 'a', 2), ['b', 'c', 'a']);
  assert.deepEqual(moveUnit(['a', 'b'], 'a', 9), ['a', 'b']);
});

// ---- Behavioural harness -------------------------------------------------
const UNITS = [
  {id: 'p-colours', yearLevel: 0, englishTitle: 'Colours', lessons: []},
  {id: 'y1-animals', yearLevel: 1, englishTitle: 'Animals', lessons: [{}]},
  {id: 'y1-numbers', yearLevel: 1, englishTitle: 'Numbers', lessons: [{}, {}]},
  {id: 'y1-gone', yearLevel: 1, englishTitle: 'Deleted', lessons: [], deleted: true}
];
let counter = 0;
async function loadBoard({teacher = {active: true}, save = async () => ({revision: 1}), order = {}} = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tmr-board-'));
  fs.mkdirSync(path.join(dir, 'teacher-units')); fs.mkdirSync(path.join(dir, 'unit-viewer'));
  const js = read('teacher-units/index.js').replace(/https:\/\/www\.gstatic\.com\/firebasejs\/[\d.]+\/firebase-functions\.js/, './functions-stub.mjs');
  fs.writeFileSync(path.join(dir, 'teacher-units/index.js'), js);
  fs.copyFileSync(path.join(dist, 'teacher-units/library-order.mjs'), path.join(dir, 'teacher-units/library-order.mjs'));
  fs.writeFileSync(path.join(dir, 'teacher-units/functions-stub.mjs'), 'export const getFunctions=(app,region)=>({region});export const httpsCallable=(f,name)=>d=>globalThis.__board.call(name,d,f.region);');
  fs.writeFileSync(path.join(dir, 'teacher-unit-data.mjs'), "export const yearLabel=y=>y===0?'Prep':'Year '+y;");
  fs.writeFileSync(path.join(dir, 'unit-viewer/firebase.js'), 'export const getFirebaseServices=async()=>globalThis.__board.services;');
  const el = () => ({hidden: false, textContent: '', onclick: null});
  const grid = {innerHTML: '', isConnected: true, listeners: {}, addEventListener(t, f) { this.listeners[t] = f; }, querySelectorAll: () => []};
  const nodes = {'#units': grid, '#status': el(), '#sign-in': el(), '#sign-out': el(), '#auth-state': el(), '#reorder-help': el()};
  const state = {calls: [], reads: 0, authCallback: null, order: structuredClone(order)};
  globalThis.document = {querySelector: s => nodes[s], visibilityState: 'visible', activeElement: null};
  globalThis.window = {addEventListener() {}};
  globalThis.__board = {
    async call(name, data, region) {
      state.calls.push({name, data, region});
      if (name === 'readUnitLibraryOrder') return {data: structuredClone(state.order)};
      return {data: await save(data)};
    },
    services: {app: {}, auth: {}, db: {},
      authSdk: {onAuthStateChanged: (a, cb) => { state.authCallback = cb; }, signOut: async () => {}, signInWithPopup: async () => {}, GoogleAuthProvider: class {}},
      firestoreSdk: {doc: (db, c, id) => ({c, id}), collection: (db, c) => ({c}),
        getDoc: async ref => { assert.equal(ref.c, 'authorizedTeachers'); return {exists: () => !!teacher, data: () => teacher}; },
        getDocsFromServer: async ref => { assert.equal(ref.c, 'units'); state.reads++; return {docs: UNITS.map(u => ({id: u.id, data: () => structuredClone(u)}))}; }}}
  };
  await import(pathToFileURL(path.join(dir, 'teacher-units/index.js')).href + '?n=' + (++counter));
  const signIn = async (user = {email: 't@example.org', emailVerified: true, uid: 'teacher'}) => { await state.authCallback(user); };
  const key = async (id, year, k) => {
    const card = {dataset: {id}, closest: () => ({dataset: {year: String(year)}})};
    grid.listeners.keydown({key: k, preventDefault() {}, target: {matches: () => true, closest: () => card}});
    await new Promise(r => setTimeout(r, 0)); await new Promise(r => setTimeout(r, 0));
  };
  const cleanup = async () => { await state.authCallback?.(null); fs.rmSync(dir, {recursive: true, force: true}); };
  return {grid, nodes, state, signIn, key, cleanup};
}
const titlesIn = (html, year) => [...html.split(`data-year="${year}"`)[1].split('</section>')[0].matchAll(/<h3>([^<]+)<\/h3>/g)].map(m => m[1]);

test('authorised teacher sees seven year columns with counts, handles and the existing editor links', async () => {
  const b = await loadBoard();
  try {
    await b.signIn();
    const html = b.grid.innerHTML;
    assert.equal((html.match(/class="year-column"/g) || []).length, 7);
    assert(html.includes('<h2>Prep</h2>') && html.includes('<h2>Year 6</h2>'));
    assert.deepEqual(titlesIn(html, 1), ['Animals', 'Numbers']);
    assert(!html.includes('Deleted'));
    assert(html.includes('data-handle') && html.includes('edit.html?unit=y1-animals') && html.includes('unit-management.html?unit=y1-animals'));
    assert(b.state.calls.every(c => c.region === 'us-central1'));
    assert(b.nodes['#reorder-help'].textContent.includes('arrow keys'));
  } finally { await b.cleanup(); }
});

test('keyboard reorder saves with the expected revision and keeps the confirmed order', async () => {
  const b = await loadBoard({save: async () => ({revision: 4}), order: {1: {unitIds: ['y1-animals', 'y1-numbers'], revision: 3}}});
  try {
    await b.signIn();
    await b.key('y1-animals', 1, 'ArrowDown');
    const save = b.state.calls.find(c => c.name === 'saveUnitLibraryOrder');
    assert.deepEqual(save.data, {yearLevel: 1, unitIds: ['y1-numbers', 'y1-animals'], expectedRevision: 3});
    assert.equal(b.nodes['#status'].textContent, 'Order saved.');
    assert.deepEqual(titlesIn(b.grid.innerHTML, 1), ['Numbers', 'Animals']);
    await b.key('y1-animals', 1, 'ArrowDown');
    assert.equal(b.state.calls.filter(c => c.name === 'saveUnitLibraryOrder').length, 1, 'moving past the end is ignored');
  } finally { await b.cleanup(); }
});

test('a rejected save (revision conflict) restores the previous order and reloads the server order', async () => {
  const conflict = Object.assign(new Error('Order changed on another device.'), {code: 'functions/aborted'});
  const b = await loadBoard({save: async () => { throw conflict; }, order: {1: {unitIds: ['y1-animals', 'y1-numbers'], revision: 2}}});
  try {
    await b.signIn();
    b.state.order = {1: {unitIds: ['y1-numbers', 'y1-animals'], revision: 3}};
    await b.key('y1-numbers', 1, 'Home');
    assert.match(b.nodes['#status'].textContent, /Previous order restored/);
    assert.deepEqual(titlesIn(b.grid.innerHTML, 1), ['Numbers', 'Animals'], 'shows the newer order from the server');
    assert.equal(b.state.calls.filter(c => c.name === 'readUnitLibraryOrder').length, 2);
  } finally { await b.cleanup(); }
});

test('inactive or unverified accounts load no Units, and sign-out clears the board', async () => {
  const inactive = await loadBoard({teacher: {active: false}});
  try {
    await inactive.signIn();
    assert.equal(inactive.state.reads, 0);
    assert.match(inactive.nodes['#status'].textContent, /does not have access/);
    await inactive.signIn({email: 'x@example.org', emailVerified: false, uid: 'x'});
    assert.equal(inactive.state.reads, 0);
  } finally { await inactive.cleanup(); }
  const b = await loadBoard();
  try {
    await b.signIn(); assert(b.grid.innerHTML.includes('Animals'));
    await b.state.authCallback(null);
    assert(!b.grid.innerHTML.includes('Animals') && !b.grid.innerHTML.includes('data-handle'));
  } finally { await b.cleanup(); }
});

test('an older board replaced by a newer Admin session does not load Units or poll', async () => {
  const b = await loadBoard();
  try {
    b.grid.isConnected = false;
    await b.signIn();
    assert.equal(b.state.reads, 0);
    assert.equal(b.state.calls.length, 0);
  } finally { await b.cleanup(); }
});
