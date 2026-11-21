import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
const read=file=>fs.readFileSync(new URL('../dist/'+file,import.meta.url),'utf8');
const props=body=>new Set(body.split(';').map(d=>d.split(':')[0].trim()).filter(Boolean));
// Every declaration block whose selector list contains a bare `.year-cards` (homepage nav or shared board styles).
const sharedRules=css=>[...css.matchAll(/(?:^|[{}])\s*([^{}@]*?)\{([^{}]*)\}/g)].filter(([,sel])=>sel.split(',').some(s=>s.trim()==='.year-cards')).map(([,,body])=>body);

test('Units Management overrides every shared .year-cards declaration so cards fill one column per year level',()=>{
 const html=read('unit-management.html');
 const sheets=[...html.matchAll(/<link rel="stylesheet" href="([^"?]+)/g)].map(m=>m[1]);
 assert.deepEqual(sheets,['styles.css','teacher-units/styles.css','unit-management-layout.css'],'layout sheet must load last');
 const layout=read('unit-management-layout.css');
 const rule=layout.match(/\.unit-management-page \.year-cards\{([^}]*)\}/);
 assert(rule,'scoped .year-cards rule is present');
 const own=props(rule[1]);
 assert.match(rule[1],/grid-template-columns:minmax\(0,1fr\)/,'exactly one card track per year column');
 assert.match(rule[1],/padding:0(;|$)/,'no inherited homepage padding');
 assert.match(rule[1],/display:grid/);
 // Flex-only properties are inert on a grid container; justify-content is inert because one 1fr track always fills the column.
 const inert=new Set(['flex-wrap','flex-direction','flex-flow','justify-content']);
 for(const file of ['styles.css','teacher-units/styles.css'])for(const body of sharedRules(read(file)))for(const p of props(body))
  if(!inert.has(p))assert(own.has(p),`${file} sets .year-cards{${p}} which Units Management does not override`);
});
