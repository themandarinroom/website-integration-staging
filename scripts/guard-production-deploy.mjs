// Predeploy guard for firebase.production.json (hosting only).
// Refuses any project other than production, rebuilds build/production from dist/
// and re-runs the payload check, so a deploy always ships the checked build.
import {execFileSync} from 'node:child_process';
import fs from 'node:fs';
const project = process.argv[2];
if (project !== 'the-mandarin-room') { console.error(`Refusing production website deploy to "${project}".`); process.exit(1); }
const config = JSON.parse(fs.readFileSync(new URL('../firebase.production.json', import.meta.url), 'utf8'));
const products = Object.keys(config);
if (products.length !== 1 || products[0] !== 'hosting' || config.hosting.site !== 'themandarinroom-au') { console.error('firebase.production.json must deploy only the themandarinroom-au Hosting site.'); process.exit(1); }
for (const script of [['scripts/build-production.mjs'], ['scripts/verify-payload.mjs', 'build/production']]) execFileSync(process.execPath, script, {stdio: 'inherit', cwd: new URL('..', import.meta.url)});
