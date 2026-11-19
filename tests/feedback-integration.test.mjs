import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {feedbackForm, communityFeedback, feedbackCall} from '../dist/feedback.mjs';

const read = p => fs.readFileSync(new URL(`../dist/${p}`, import.meta.url), 'utf8');
const STAGING_FUNCTIONS = 'https://australia-southeast1-the-mandarin-room-staging.cloudfunctions.net';

test('feedback form enforces server-matching limits, optional fields, spam trap and privacy notice', () => {
  const html = feedbackForm();
  assert.match(html, /name="displayName" maxlength="80"/);
  assert.match(html, /type="email" name="email" maxlength="254"/);
  assert.match(html, /name="comment" maxlength="2000"/);
  assert.equal((html.match(/type="radio" name="rating"/g) || []).length, 5);
  assert.match(html, /hidden class="feedback-trap"/);
  assert.match(html, /Email stays private/);
  assert.match(html, /邮箱不会公开/);
  assert(!/\brequired\b/.test(html), 'name, email and comment stay optional');
});

test('community feedback section has a status region and hidden pagination', () => {
  const html = communityFeedback();
  assert.match(html, /data-feedback-entries/);
  assert.match(html, /role="status" data-feedback-status/);
  assert.match(html, /data-feedback-more hidden/);
});

test('feedbackCall posts JSON to the staging callable without cookies and only sends a token for admins', async () => {
  const calls = [];
  const realFetch = globalThis.fetch;
  globalThis.fetch = async (url, init) => { calls.push({url, init}); return {ok: true, json: async () => ({result: {ok: 1}})}; };
  try {
    assert.deepEqual(await feedbackCall('submitFeedback', {comment: 'hi'}), {ok: 1});
    await feedbackCall('moderateFeedback', {action: 'list'}, {getIdToken: async () => 'tok'});
  } finally { globalThis.fetch = realFetch; }
  assert.equal(calls[0].url, `${STAGING_FUNCTIONS}/submitFeedback`);
  assert.equal(calls[0].init.method, 'POST');
  assert.equal(calls[0].init.credentials, 'omit');
  assert.equal(calls[0].init.headers.Authorization, undefined);
  assert.deepEqual(JSON.parse(calls[0].init.body), {data: {comment: 'hi'}});
  assert.equal(calls[1].init.headers.Authorization, 'Bearer tok');
});

test('feedbackCall surfaces server errors instead of reporting success', async () => {
  const realFetch = globalThis.fetch;
  globalThis.fetch = async () => ({ok: false, json: async () => ({error: {status: 'RESOURCE_EXHAUSTED'}})});
  try { await assert.rejects(feedbackCall('submitFeedback', {}), {code: 'RESOURCE_EXHAUSTED'}); }
  finally { globalThis.fetch = realFetch; }
});

test('About page hosts the feedback form and community list; refresh does not wipe an open form', () => {
  const app = read('app.mjs');
  assert.match(app, /import \{feedbackForm, communityFeedback, wireFeedback\} from '\.\/feedback\.mjs'/);
  assert.match(app, /\$\{feedbackForm\(\)\}<\/section>\$\{communityFeedback\(\)\}/);
  assert.match(app, /if\(page==='about'\)wireFeedback\(main\)/);
  assert.match(app, /if\(route\(\)\.page==='about'\)return;/);
});

test('reconciliation keeps Production features alongside feedback', () => {
  const app = read('app.mjs');
  assert.match(app, /function wireCatalogCovers\(\)/);
  assert.match(app, /\n  wireCatalogCovers\(\);\n/);
  assert.match(read('public-data.mjs'), /'coverImage'/);
  assert.match(read('catalog.mjs'), /bingo-board\//);
  const html = read('index.html');
  assert.match(html, /app\.mjs\?v=feedback-reconcile-1/);
  assert.match(html, /styles\.css\?v=feedback-reconcile-1/);
  assert.match(html, new RegExp(`connect-src 'self' ${STAGING_FUNCTIONS.replace(/[.]/g, '\\.')} `));
  assert.match(html, /form-action 'none'/);
  const css = read('styles.css');
  assert.match(css, /\.library-actions\{/);
  assert.match(css, /\.feedback-card \{/);
});

test('moderation page checks the authorised-teacher allowlist before any list or moderation call', () => {
  const admin = read('feedback-admin.mjs');
  assert.match(admin, /import \{assertAuthorisedTeacher\} from '\.\/admin-session\.mjs/);
  // The admin panel stays hidden and no list is requested until the allowlist check resolves.
  assert.match(admin, /const authorised = await assertAuthorisedTeacher\(services\);\s*if \(request !== generation\) return;\s*user = authorised;\s*panel\.hidden = false;\s*await load\(\);/);
  // Every moderation call carries the verified user's ID token (the server re-verifies it).
  assert.equal((admin.match(/feedbackCall\('moderateFeedback',\{[^}]*\},user\)/g) || []).length, 2);
  assert.match(read('admin-session.mjs'), /projectId!=='the-mandarin-room-staging'\)throw Error\('Staging authentication required\.'\)/);
  assert.match(read('admin-session.mjs'), /href="feedback-admin\.html">Comments \/ 留言管理/);
});
