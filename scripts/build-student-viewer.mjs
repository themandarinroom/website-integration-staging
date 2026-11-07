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

// Reuse the original teacher list (Unit Library v0.4.0 board) and styles inside the Admin page.
// Every rewrite must match exactly once, so an upstream change fails the build instead of shipping a broken module.
const teacherTarget=new URL('../dist/teacher-units/',import.meta.url);fs.mkdirSync(teacherTarget,{recursive:true});
function rewrite(text,from,to,{all=false}={}){const count=text.split(from).length-1;if(all?count<1:count!==1)throw new Error(`Teacher Unit Library rewrite expected ${all?'at least one':'exactly one'} match for: ${from} (found ${count})`);return all?text.replaceAll(from,to):text.replace(from,to);}
let teacherIndex=fs.readFileSync(new URL('index.js',source),'utf8');
teacherIndex=rewrite(teacherIndex,"from './store.js'","from '../teacher-unit-data.mjs'");
// Share the Admin page's Firebase app and sign-in instead of starting a second one.
teacherIndex=rewrite(teacherIndex,"from './firebase.js'","from '../unit-viewer/firebase.js'");
teacherIndex=rewrite(teacherIndex,"from './library-order.mjs'","from './library-order.mjs'");
teacherIndex=rewrite(teacherIndex,'href="edit.html?','href="https://themandarinroom.github.io/units/edit.html?',{all:true});
teacherIndex=rewrite(teacherIndex,'href="view.html?','href="unit-management.html?',{all:true});
// The Admin page re-imports this module after each sign-in; an older copy whose board was replaced must stop polling.
teacherIndex=rewrite(teacherIndex,'const token=++session; stop?.();','const token=++session; stop?.(); if(!grid.isConnected)return;');
teacherIndex=rewrite(teacherIndex,"if(token!==session || busy || drag || document.visibilityState!=='visible')return;","if(!grid.isConnected){stop?.();return;} if(token!==session || busy || drag || document.visibilityState!=='visible')return;");
fs.writeFileSync(new URL('index.js',teacherTarget),teacherIndex);
for(const file of ['styles.css','library-order.mjs'])fs.copyFileSync(new URL(file,source),new URL(file,teacherTarget));
