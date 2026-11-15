import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {LINKS} from '../dist/catalog.mjs';

const app=fs.readFileSync(new URL('../dist/app.mjs',import.meta.url),'utf8');
const tiles=app.slice(app.indexOf('function activityTiles()'),app.indexOf('function yearActivities('));

test('Bingo Games links to the released Production Bingo Solo only',()=>{
 assert.equal(LINKS.bingo,'https://themandarinroom.github.io/vocabularylibrary/tools/bingo-board/');
 assert(!/live|staging|\?/.test(LINKS.bingo),'Bingo link must not point at Live Mode, Staging or carry parameters');
});
test('Activities shows a Bingo Games card reusing the existing card design, opening in a new tab safely',()=>{
 const card=tiles.match(/<article class="activity-card blue">.*?<\/article>/s)?.[0]||'';
 assert.match(card,/<h3>Bingo Games<\/h3>/);
 assert.match(card,/<span class="symbol">\$\{icon\('grid'\)\}<\/span>/);
 assert.match(card,/<p>[^<]{10,90}<\/p>/,'short student-friendly description');
 assert.match(card,/<a class="circle" href="\$\{LINKS\.bingo\}" target="_blank" rel="noopener noreferrer" aria-label="Open Bingo Games \(opens in a new tab\)">/);
 assert(!card.includes('Coming soon'));
});
test('Activities exposes no Bingo Live Mode and keeps the other activity cards',()=>{
 assert.equal((tiles.match(/<article class="activity-card/g)||[]).length,4);
 for(const name of ['Word Randomiser','Speaking App','Bingo Games','Listening Game'])assert(tiles.includes(`<h3>${name}</h3>`),name);
 assert(!/bingo[^<]{0,40}live|live[^<]{0,40}bingo/i.test(app),'no Bingo Live Mode link or text');
 assert(!tiles.includes('Bingo Board'),'old placeholder name removed');
});
