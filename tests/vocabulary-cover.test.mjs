import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {vocabularyResources} from '../dist/catalog.mjs';
import {publishedQuery,decodeFields} from '../dist/public-data.mjs';

const base={id:'prep-colours-i',yearLevel:0,title:'Colours I',chineseTitle:'颜色 I',description:'',published:true,
  items:[{id:'red',chinese:'红色',pinyin:'hong se',english:'red',image:'https://example.org/red.png',audio:{aiEnabled:true}}]};
const uploaded='https://firebasestorage.googleapis.com/v0/b/the-mandarin-room.firebasestorage.app/o/vocabulary%2Fprep-colours-i%2Fcover%2Fimage-1794991838909.webp?alt=media&token=t';

test('the public query requests the saved cover field and still excludes private fields',()=>{
  const fields=publishedQuery.structuredQuery.select.fields.map(f=>f.fieldPath);
  assert.ok(fields.includes('coverImage'));
  for(const hidden of ['coverImageStoragePath','updatedBy','updatedAt'])assert.ok(!fields.includes(hidden));
});
test('uploaded, external and AI-generated covers all map to the card',()=>{
  for(const coverImage of [uploaded,'https://example.org/cover.png','https://firebasestorage.googleapis.com/v0/b/x/o/vocabulary%2Fs%2Fcover%2Fimage-1.webp?alt=media'])
    assert.equal(vocabularyResources([{...base,coverImage}])[0].coverImage,coverImage);
});
test('missing, removed or unsafe covers fall back to no cover',()=>{
  for(const coverImage of [undefined,null,'','http://example.org/a.png','javascript:alert(1)','data:image/png;base64,AAAA','https://user:pw@example.org/a.png'])
    assert.equal(vocabularyResources([{...base,coverImage}])[0].coverImage,'');
});
test('a Firestore REST document with a cover decodes end to end',()=>{
  const fields={id:{stringValue:'prep-colours-i'},yearLevel:{integerValue:'0'},title:{stringValue:'Colours I'},chineseTitle:{stringValue:'颜色 I'},description:{stringValue:''},published:{booleanValue:true},coverImage:{stringValue:uploaded},items:{arrayValue:{values:[]}}};
  assert.equal(vocabularyResources([decodeFields(fields)])[0].coverImage,uploaded);
  assert.equal(vocabularyResources([decodeFields({...fields,coverImage:{nullValue:null}})])[0].coverImage,'');
});
test('card renderer uses the saved cover first and keeps the old artwork as the load-failure fallback',()=>{
  const app=fs.readFileSync(new URL('../dist/app.mjs',import.meta.url),'utf8');
  assert.match(app,/resource\.coverImage\?`<img class="clip-art catalog-cover catalog-saved-cover" src="\$\{escape\(resource\.coverImage\)\}"/);
  assert.match(app,/<template data-cover-fallback>\$\{defaultArt\}<\/template>/);
  assert.match(app,/catalog-placeholder" lang="zh-Hans" aria-hidden="true">文</);
  assert.match(app,/function wireCatalogCovers\(\)/);
  assert.match(app,/\n  wireCatalogCovers\(\);\n/);
});
