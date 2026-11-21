import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
// Optional argument: another payload folder to check (e.g. build/production). Default: dist/.
const root=process.argv[2]?new URL('file://'+path.resolve(process.argv[2])+'/'):new URL('../dist/',import.meta.url);
const allowed=new Set(['unit-management-layout.css','unit-management.html','unit-management.mjs','teacher-unit-data.mjs','publication-model.mjs','teacher-units/index.js','teacher-units/styles.css','teacher-units/library-order.mjs','units/index.html','admin-session.mjs','journey-model.mjs','journey-data.mjs','journey-view.mjs','journey-admin.mjs','journey-admin.html','journey.css','.nojekyll','index.html','robots.txt','styles.css','tmr-tokens.css','app.mjs','catalog.mjs','public-data.mjs','routing.mjs','assets/emblem.svg','assets/year-staircase.png','assets/home-hero-1755.webp','assets/home-hero-900.webp','assets/topics.png','assets/pinyin.png','assets/hanzi.png','assets/about.png','assets/australia-states.png','assets/topic-covers-transparent.png','unit-viewer/unit-renderer.mjs','unit-viewer/student-data.mjs','unit-viewer/student-view.css','unit-viewer/firebase.js','unit-viewer/firebase-config.js','unit-publication.html','unit-publication.mjs','unit-publication.css']);
function walk(dir,prefix=''){
 for(const entry of fs.readdirSync(dir,{withFileTypes:true})){
  const relative=prefix+entry.name;const file=path.join(dir,entry.name);
  if(entry.isSymbolicLink())throw new Error('Symlinks are prohibited: '+relative);
  if(entry.isDirectory())walk(file,relative+'/');
  else{if(!allowed.delete(relative))throw new Error('Unexpected deployment file: '+relative);
   if(/\.(mjs|js|html|css|svg|txt)$/.test(relative)){
    const content=fs.readFileSync(file,'utf8');
    if(/PRIVATE KEY|service_account|client_secret|refresh_token|gh[pousr]_[A-Za-z0-9]{20,}/.test(content))throw new Error('Potential secret in '+relative);
   }
  }
 }
}
walk(fileURLToPath(root));if(allowed.size)throw new Error('Missing files: '+[...allowed].join(', '));
console.log('Deployment payload verified: 42 allowlisted static files; no backend, credentials, rules or private content.');
