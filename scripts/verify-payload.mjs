import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=new URL('../dist/',import.meta.url);
const allowed=new Set(['.nojekyll','index.html','robots.txt','styles.css','app.mjs','catalog.mjs','public-data.mjs','assets/seal.svg','assets/topics.png','assets/pinyin.png','assets/hanzi.png','assets/about.png']);
function walk(dir,prefix=''){
 for(const entry of fs.readdirSync(dir,{withFileTypes:true})){
  const relative=prefix+entry.name;const file=path.join(dir,entry.name);
  if(entry.isSymbolicLink())throw new Error('Symlinks are prohibited: '+relative);
  if(entry.isDirectory())walk(file,relative+'/');
  else{if(!allowed.delete(relative))throw new Error('Unexpected deployment file: '+relative);
   if(/\.(mjs|html|css|svg|txt)$/.test(relative)){
    const content=fs.readFileSync(file,'utf8');
    if(/PRIVATE KEY|service_account|client_secret|refresh_token|gh[pousr]_[A-Za-z0-9]{20,}/.test(content))throw new Error('Potential secret in '+relative);
   }
  }
 }
}
walk(fileURLToPath(root));if(allowed.size)throw new Error('Missing files: '+[...allowed].join(', '));
console.log('Deployment payload verified: 12 allowlisted static files; no backend, credentials, rules or private content.');
