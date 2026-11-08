// Predeploy guard for firebase.hosting-default.json (Gate 4C-2): Hosting only, the existing DEFAULT site only.
// Security headers are scoped to the site's own files and "/" so they never apply to Firebase's reserved
// /__/ paths (the Google sign-in helper used by every Mandarin Room app). Rebuilds and re-checks the payload.
import {execFileSync} from 'node:child_process';
import fs from 'node:fs';
const project = process.argv[2];
if (project !== 'the-mandarin-room') { console.error(`Refusing Hosting deploy to "${project}".`); process.exit(1); }
const config = JSON.parse(fs.readFileSync(new URL('../firebase.hosting-default.json', import.meta.url), 'utf8'));
if (Object.keys(config).join() !== 'hosting' || config.hosting.site !== 'the-mandarin-room' || config.hosting.rewrites || config.hosting.redirects) { console.error('Config must deploy only static files to the default the-mandarin-room site.'); process.exit(1); }
if (config.hosting.headers.some(h => h.source === '**' || h.source.startsWith('/__'))) { console.error('Headers must not match the reserved /__/ paths.'); process.exit(1); }
// Public Beta indexing: the homepage stays indexable; teacher pages, /units/ and asset files send X-Robots-Tag noindex.
const robots = src => config.hosting.headers.filter(h => h.source === src).flatMap(h => h.headers).find(x => x.key === 'X-Robots-Tag')?.value || '';
if (robots('/') || robots('**/*.@(html|mjs|js|css|txt|png|svg|webp|ico)') || !/noindex/.test(robots('/@(unit-management|journey-admin|unit-publication).html')) || !/noindex/.test(robots('/units/**')) || !/noindex/.test(robots('**/*.@(mjs|js|css|txt|png|svg|webp|ico)'))) { console.error('Indexing headers do not match the Public Beta policy.'); process.exit(1); }
for (const script of [['scripts/build-production.mjs'], ['scripts/verify-payload.mjs', 'build/production']]) execFileSync(process.execPath, script, {stdio: 'inherit', cwd: new URL('..', import.meta.url)});
