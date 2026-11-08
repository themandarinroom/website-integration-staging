// Production website build (themandarinroom.au): project selection, staging removal, routes and hosting safety.
// Builds into a temporary folder; no network and no deployment.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {fileURLToPath, pathToFileURL} from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const out = fs.mkdtempSync(path.join(os.tmpdir(), 'tmr-production-'));
execFileSync(process.execPath, [path.join(root, 'scripts/build-production.mjs'), out], {stdio: 'pipe'});
const read = file => fs.readFileSync(path.join(out, file), 'utf8');
const walk = dir => fs.readdirSync(dir, {withFileTypes: true}).flatMap(e => e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)]);
test.after(() => fs.rmSync(out, {recursive: true, force: true}));

test('production build passes the same 40-file payload allowlist and secret scan', () => {
  const result = execFileSync(process.execPath, [path.join(root, 'scripts/verify-payload.mjs'), out], {encoding: 'utf8'});
  assert.match(result, /40 allowlisted static files/);
});

test('every Firebase target is the production project and no staging reference remains', () => {
  const config = read('unit-viewer/firebase-config.js');
  assert.match(config, /"projectId": "the-mandarin-room"/);
  assert.match(config, /"authDomain": "the-mandarin-room.firebaseapp.com"/);
  for (const file of walk(out).filter(f => /\.(html|mjs|js|css|txt)$/.test(f))) assert(!/staging/i.test(fs.readFileSync(file, 'utf8')), path.relative(out, file));
  for (const [file, token] of [['journey-data.mjs', 'projects/the-mandarin-room/'], ['teacher-unit-data.mjs', 'projects/the-mandarin-room/'], ['unit-viewer/student-data.mjs', "STUDENT_PROJECT = 'the-mandarin-room'"],
    ['admin-session.mjs', "!=='the-mandarin-room'"], ['journey-admin.mjs', "!== 'the-mandarin-room'"], ['unit-publication.mjs', "!== 'the-mandarin-room'"]]) assert(read(file).includes(token), `${file}: ${token}`);
  for (const page of ['index.html', 'unit-management.html', 'journey-admin.html', 'unit-publication.html']) assert(read(page).includes('https://the-mandarin-room.firebaseapp.com'), page);
});

test('Public Beta indexing: homepage indexable with canonical domain; teacher pages and /units/ noindex', () => {
  const pages = walk(out).filter(f => f.endsWith('.html')).map(f => path.relative(out, f)).sort();
  assert.deepEqual(pages, ['index.html', 'journey-admin.html', 'unit-management.html', 'unit-publication.html', 'units/index.html']);
  const index = read('index.html');
  assert(!/name="robots"/.test(index) && index.includes('<link rel="canonical" href="https://themandarinroom.au/">'));
  for (const page of pages.slice(1)) assert(read(page).includes('<meta name="robots" content="noindex,nofollow">'), page);
  assert.equal(read('robots.txt'), 'User-agent: *\nAllow: /\n');
  assert(read('app.mjs').includes('setRouteRobots(robotsFor(page))'));
  assert(!index.includes('Integration preview') && !index.includes('staging-label'));
  assert(!read('app.mjs').includes('LINKS.live') && !read('app.mjs').includes('live-preview'));
  assert(!read('catalog.mjs').includes('live:'));
});

test('every route except the homepage is noindex (teaching content stays out of search during the Beta)', async () => {
  const {robotsFor} = await import(pathToFileURL(path.join(out, 'routing.mjs')).href);
  assert.equal(robotsFor('home'), null);
  for (const page of ['journey', 'unit', 'vocabulary', 'units', 'activities', 'topics', 'pinyin', 'hanzi', 'about', 'search', 'nonexistent']) assert.equal(robotsFor(page), 'noindex', page);
});

test('approved routes and UI decisions are preserved in the production build', async () => {
  const app = read('app.mjs'), html = read('index.html');
  for (const page of ['home', 'vocabulary', 'activities', 'topics', 'pinyin', 'hanzi', 'about']) assert(html.includes(`data-page="${page}"`), page);
  assert(html.includes('id="admin-open"') && html.includes('assets/emblem.svg'));
  assert(app.includes('href="#/journey?year=${y}"'));
  const {parseRoute} = await import(pathToFileURL(path.join(out, 'routing.mjs')).href);
  for (let year = 0; year < 7; year++) assert.equal(parseRoute(`#/journey?year=${year}`).page, 'journey');
  assert.equal(parseRoute('#/unit?unit=prep-numbers').page, 'unit');
  const {renderJourney} = await import(pathToFileURL(path.join(out, 'journey-view.mjs')).href);
  for (let year = 0; year < 7; year++) assert(!/journey-explore|Finished Early/i.test(renderJourney(null, year)));
  assert(app.includes("hanzi:{title:'Hanzi',"), 'Hanzi page heading is "Hanzi"');
});

test('student Journey reads go anonymously to production published records only', async () => {
  const {loadJourney} = await import(pathToFileURL(path.join(out, 'journey-data.mjs')).href);
  const original = global.fetch, calls = [];
  global.fetch = async (url, options) => { calls.push({url, options}); return {ok: false, status: 404, json: async () => ({})}; };
  try {
    assert.equal(await loadJourney(4), null);
    assert(calls.length > 0);
    assert(calls.every(c => c.url.startsWith('https://firestore.googleapis.com/v1/projects/the-mandarin-room/databases/(default)/documents/') && c.options.credentials === 'omit'));
    assert(calls.some(c => c.url.endsWith('/journeySettings/year-4')));
    assert(!calls.some(c => /learningJourneys|\/units\//.test(c.url)));
  } finally { global.fetch = original; }
});

test('production Hosting config deploys only the new site, and its guard refuses other projects', () => {
  const config = JSON.parse(fs.readFileSync(path.join(root, 'firebase.production.json'), 'utf8'));
  assert.deepEqual(Object.keys(config), ['hosting']);
  assert.equal(config.hosting.site, 'themandarinroom-au');
  assert.equal(config.hosting.public, 'build/production');
  assert(config.hosting.predeploy[0].includes('guard-production-deploy.mjs'));
  const headers = JSON.stringify(config.hosting.headers);
  assert(headers.includes("frame-ancestors 'none'") && headers.includes('nosniff'));
  assert(!headers.includes('Cross-Origin-Opener-Policy'), 'COOP same-origin would break Google sign-in popups');
  assert.throws(() => execFileSync(process.execPath, [path.join(root, 'scripts/guard-production-deploy.mjs'), 'the-mandarin-room-staging'], {stdio: 'pipe'}));
});

test('default-site Hosting config: static files only, selective noindex headers, nothing applied to the reserved /__/ sign-in paths', () => {
  const config = JSON.parse(fs.readFileSync(path.join(root, 'firebase.hosting-default.json'), 'utf8'));
  assert.deepEqual(Object.keys(config), ['hosting']);
  assert.equal(config.hosting.site, 'the-mandarin-room');
  assert.equal(config.hosting.public, 'build/production');
  assert(!config.hosting.rewrites && !config.hosting.redirects && !config.hosting.cleanUrls);
  assert(config.hosting.predeploy[0].includes('guard-hosting-default.mjs'));
  const get = (src, key) => config.hosting.headers.filter(h => h.source === src).flatMap(h => h.headers).find(x => x.key === key)?.value;
  for (const src of ['/', '**/*.@(html|mjs|js|css|txt|png|svg|webp|ico)']) { assert.equal(get(src, 'X-Frame-Options'), 'DENY', src); assert.equal(get(src, 'X-Content-Type-Options'), 'nosniff', src); assert.equal(get(src, 'X-Robots-Tag'), undefined, src); }
  assert.equal(get('/@(unit-management|journey-admin|unit-publication).html', 'X-Robots-Tag'), 'noindex, nofollow');
  assert.equal(get('/units/**', 'X-Robots-Tag'), 'noindex, nofollow');
  assert.equal(get('**/*.@(mjs|js|css|txt|png|svg|webp|ico)', 'X-Robots-Tag'), 'noindex');
  assert(config.hosting.headers.every(h => h.source !== '**' && !h.source.startsWith('/__')), 'no header rule may match the reserved /__/ sign-in paths');
  assert(!JSON.stringify(config).includes('Cross-Origin-Opener-Policy'), 'COOP same-origin would break Google sign-in popups');
  assert.throws(() => execFileSync(process.execPath, [path.join(root, 'scripts/guard-hosting-default.mjs'), 'the-mandarin-room-staging'], {stdio: 'pipe'}));
});
