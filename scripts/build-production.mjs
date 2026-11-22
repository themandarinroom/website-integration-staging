// Builds the production website (2026 Public Beta: themandarinroom.au on the default Hosting site the-mandarin-room) from the reviewed staging payload in dist/.
// dist/ stays pinned to staging. This script writes build/production/ only and never deploys.
// Every rewrite is listed below with its exact expected match count; any mismatch stops the build,
// so a later change to dist/ cannot silently ship a staging reference.
// Usage: node scripts/build-production.mjs [outputDir]
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const dist = path.resolve(here, '../dist');
const out = path.resolve(process.argv[2] || path.join(here, '../build/production'));
const PRODUCTION = 'the-mandarin-room';
const STAGING = 'the-mandarin-room-staging';

// Public Firebase web configuration (not a secret; access is enforced by Auth and rules),
// read from the production Vocabulary Library so every app shares one source of truth.
const configSource = fs.readFileSync(path.resolve(here, '../../vocabularylibrary/js/firebase-config.js'), 'utf8');
const block = configSource.match(/const productionFirebaseConfig = \{([\s\S]*?)\};/);
if (!block) throw new Error('Production Firebase web configuration not found.');
const config = Object.fromEntries([...block[1].matchAll(/(apiKey|authDomain|projectId|storageBucket|messagingSenderId|appId):\s*"([^"]+)"/g)].map(m => [m[1], m[2]]));
if (config.projectId !== PRODUCTION || config.authDomain !== `${PRODUCTION}.firebaseapp.com` || Object.keys(config).length !== 6) throw new Error('Unexpected production Firebase web configuration.');

const AUTH_HOST_STAGING = `https://${STAGING}.firebaseapp.com`;
const AUTH_HOST = `https://${config.authDomain}`;
const LIVE_PREVIEW = /<aside class="live-preview">[\s\S]*?<\/aside>/;

// [file, from, to, expected count]
const REWRITES = [
  // Public Beta indexing: the homepage is indexable (canonical: the official domain); app.mjs marks every other
  // route noindex; teacher pages and the /units/ redirect keep their static noindex.
  ['index.html', '<meta name="robots" content="noindex,nofollow">', '<link rel="canonical" href="https://themandarinroom.au/">', 1],
  ['index.html', AUTH_HOST_STAGING, AUTH_HOST, 2],
  ['index.html', ' · <span class="staging-label">Integration preview</span>', '', 1],
  ['unit-management.html', AUTH_HOST_STAGING, AUTH_HOST, 2],
  ['journey-admin.html', AUTH_HOST_STAGING, AUTH_HOST, 2],
  ['unit-publication.html', AUTH_HOST_STAGING, AUTH_HOST, 2],
  ['journey-admin.html', 'Authorised staging teachers only.', 'Authorised teachers only.', 1],
  ['unit-publication.html', 'Authorised staging teachers only.', 'Authorised teachers only.', 1],
  ['styles.css', '.staging-label{color:#60736b}', '', 1],
  ['admin-session.mjs', `!=='${STAGING}'`, `!=='${PRODUCTION}'`, 1],
  ['admin-session.mjs', `!== '${STAGING}'`, `!== '${PRODUCTION}'`, 1],
  ['admin-session.mjs', `projects/${STAGING}/`, `projects/${PRODUCTION}/`, 1],
  ['admin-session.mjs', 'Staging authentication required.', 'Production authentication required.', 2],
  ['journey-data.mjs', `projects/${STAGING}/`, `projects/${PRODUCTION}/`, 1],
  ['teacher-unit-data.mjs', `projects/${STAGING}/`, `projects/${PRODUCTION}/`, 1],
  ['unit-viewer/student-data.mjs', `STUDENT_PROJECT = '${STAGING}'`, `STUDENT_PROJECT = '${PRODUCTION}'`, 1],
  ['unit-viewer/student-data.mjs', '// Anonymous, staging-only adapter.', '// Anonymous, production adapter.', 1],
  ['journey-admin.mjs', `!== '${STAGING}') throw Error('Staging project required.')`, `!== '${PRODUCTION}') throw Error('Production project required.')`, 1],
  ['journey-admin.mjs', 'authorised staging Google teacher account', 'authorised Google teacher account', 1],
  ['unit-publication.mjs', `!== '${STAGING}') throw new Error('Staging project required.')`, `!== '${PRODUCTION}') throw new Error('Production project required.')`, 1],
  ['unit-publication.mjs', 'authorised staging Google teacher account', 'authorised Google teacher account', 1],
  ['unit-publication.mjs', 'No cloud Units are available in staging. Original production Units are not copied.', 'No Units are available yet.', 1],
  ['catalog.mjs', `,\n  live: 'https://themandarinroom.github.io/word-randomiser-staging/tools/word-randomizer/?firebase=staging'`, '', 1],
  ['app.mjs', LIVE_PREVIEW, '', 1],
];

function count(text, from) { return from instanceof RegExp ? (text.match(new RegExp(from.source, 'g')) || []).length : text.split(from).length - 1; }

fs.rmSync(out, {recursive: true, force: true});
fs.cpSync(dist, out, {recursive: true});
for (const [file, from, to, expected] of REWRITES) {
  const target = path.join(out, file);
  const text = fs.readFileSync(target, 'utf8');
  const found = count(text, from);
  if (found !== expected) throw new Error(`Production rewrite in ${file} expected ${expected} match(es) for ${from} but found ${found}.`);
  fs.writeFileSync(target, from instanceof RegExp ? text.replace(from, to) : text.replaceAll(from, to));
}
fs.writeFileSync(path.join(out, 'unit-viewer/firebase-config.js'),
  `// Production public Firebase Web SDK configuration (not a secret; Auth and rules enforce access).\nexport const firebaseConfig = Object.freeze(${JSON.stringify(config, null, 2)});\n`);
// Crawling is allowed so that search engines can see each page's noindex (a robots.txt Disallow would hide it).
fs.writeFileSync(path.join(out, 'robots.txt'), 'User-agent: *\nAllow: /\n');
// Final scan: nothing may still point at staging or preview-only features.
const problems = [];
const walk = dir => fs.readdirSync(dir, {withFileTypes: true}).flatMap(e => e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)]);
for (const file of walk(out).filter(f => /\.(html|mjs|js|css|txt)$/.test(f))) {
  const text = fs.readFileSync(file, 'utf8'), rel = path.relative(out, file);
  if (/staging/i.test(text)) problems.push(`${rel}: contains "staging"`);
  if (/Integration preview|word-randomiser-staging|firebase=staging/.test(text)) problems.push(`${rel}: preview-only content`);
  if (/PRIVATE KEY|service_account|client_secret|refresh_token|gh[pousr]_[A-Za-z0-9]{20,}/.test(text)) problems.push(`${rel}: secret pattern`);
}
for (const page of ['unit-management.html', 'journey-admin.html', 'unit-publication.html', 'units/index.html'])
  if (!fs.readFileSync(path.join(out, page), 'utf8').includes('<meta name="robots" content="noindex,nofollow">')) problems.push(`${page}: page lost noindex`);
if (/name="robots"/.test(fs.readFileSync(path.join(out, 'index.html'), 'utf8'))) problems.push('index.html: homepage must be indexable');
if (!fs.readFileSync(path.join(out, 'app.mjs'), 'utf8').includes('setRouteRobots(robotsFor(page))')) problems.push('app.mjs: route noindex missing');
if (problems.length) throw new Error('Production build check failed:\n' + problems.join('\n'));
console.log(`Production website built in ${path.relative(process.cwd(), out) || out} for project ${PRODUCTION}; no staging references remain. Not deployed.`);
