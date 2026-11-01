// Reuse the existing Viewer source; never package its teacher store or caches.
import fs from 'node:fs';
const source = new URL('../../units-repository/', import.meta.url);
const target = new URL('../dist/unit-viewer/', import.meta.url);
fs.mkdirSync(target, { recursive: true });
for (const file of ['unit-renderer.mjs','student-data.mjs','student-view.css','firebase.js']) fs.copyFileSync(new URL(file, source), new URL(file, target));
await import(new URL('../../tools/word-randomizer/staging-runtime-config.mjs', import.meta.url));
const config = globalThis.__TMR_FIREBASE_RUNTIME__?.firebaseConfig;
if (config?.projectId !== 'the-mandarin-room-staging') throw new Error('Refusing a non-staging Viewer configuration.');
fs.writeFileSync(new URL('firebase-config.js', target), `// Staging-only public Firebase Web SDK configuration.\nexport const firebaseConfig = Object.freeze(${JSON.stringify(config, null, 2)});\n`);
console.log('Built existing student Viewer and staging-only Admin SDK utilities; no teacher store or Unit data copied.');
