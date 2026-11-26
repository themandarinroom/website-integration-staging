// D3: Activities → Vocabulary Games → Tarsia Puzzle. Bingo and Build The Great Wall stay only under Listening Games.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {LINKS} from '../dist/catalog.mjs';
import {parseRoute,robotsFor} from '../dist/routing.mjs';

const read=file=>fs.readFileSync(new URL(`../dist/${file}`,import.meta.url),'utf8');
const app=read('app.mjs');
const tiles=app.slice(app.indexOf('function activityTiles()'),app.indexOf('// Listening Games:'));
const vocabularyCard=tiles.slice(tiles.indexOf('<a class="activity-card pink"'));
const games=app.slice(app.indexOf('// Vocabulary Games:'),app.indexOf('function listeningGamesPage()'));

test('Activities has a Vocabulary Games card next to Listening Games, whole-card link, no arrow, circle or badge',()=>{
 assert(tiles.indexOf('<h3>Listening Games</h3>')<tiles.indexOf('<h3>Vocabulary Games</h3>'),'Vocabulary Games follows Listening Games');
 assert.match(vocabularyCard,/^<a class="activity-card pink" href="#\/activities\/vocabulary-games" aria-label="Open Vocabulary Games"><span class="symbol">/);
 assert(!/\$\{arrow\}|class="circle"|Introduction|badge/i.test(vocabularyCard),'no arrow, circle or badge');
 assert(!tiles.includes('<article'),'all four cards are whole-card links of the same kind');
});
test('Vocabulary Games route: sub-page of Activities, noindex, back link, top navigation keeps Activities current',()=>{
 for(const hash of ['#/activities/vocabulary-games','#/activities/vocabulary-games/'])assert.equal(parseRoute(hash).page,'vocabulary-games');
 assert.equal(parseRoute('#/activities/listening-games').page,'listening-games');
 assert.equal(robotsFor('vocabulary-games'),'noindex');
 assert(app.includes(`'vocabulary-games':vocabularyGamesPage`)&&app.includes(`'vocabulary-games':'Vocabulary Games'`));
 assert(app.includes(`page==='listening-games'||page==='vocabulary-games'?'activities'`));
 assert.match(app,/function vocabularyGamesPage\(\) \{\n  return `<a class="back-link" href="#\/activities">← Back to Activities<\/a><header class="page-intro activities-intro"><h1>Vocabulary Games<\/h1>/);
});
test('Vocabulary Games lists only Tarsia Puzzle; Bingo and Great Wall stay exclusively under Listening Games',()=>{
 assert.deepEqual([...games.matchAll(/id:'([^']+)'/g)].map(m=>m[1]),['tarsia']);
 assert(!/bingo|great-wall|greatWall/i.test(games));
 assert.match(games,/title:'Tarsia Puzzle',href:LINKS\.tarsia,/);
});
test('Tarsia card opens the game in a new tab safely, with no arrow circle',()=>{
 assert.match(games,/<a class="game-card" href="\$\{game\.href\}" target="_blank" rel="noopener noreferrer"/);
 assert(games.includes('Play · opens in a new tab'));
 assert(!/class="circle"|\$\{arrow\}/.test(games));
});
test('staging payload links the staging Tarsia; the production build rewrites it to the Vocabulary Library path',()=>{
 assert.equal(LINKS.tarsia,'https://themandarinroom.github.io/tarsia-staging/tools/tarsia-puzzle/');
 const out=fs.mkdtempSync(path.join(os.tmpdir(),'vg-build-'));
 execFileSync(process.execPath,[fileURLToPath(new URL('../scripts/build-production.mjs',import.meta.url)),out],{stdio:'pipe'});
 const built=fs.readFileSync(path.join(out,'catalog.mjs'),'utf8');
 assert(built.includes(`tarsia: 'https://themandarinroom.github.io/vocabularylibrary/tools/tarsia-puzzle/'`));
 assert(!/staging/i.test(built));
 fs.rmSync(out,{recursive:true,force:true});
});
test('Tarsia cover: optimised 16:9 WebP files with meaningful alt text',()=>{
 for(const [size,max] of [[800,90_000],[1600,200_000]]){
  const bytes=fs.readFileSync(new URL(`../dist/assets/vocabulary-games/tarsia-cover-${size}.webp`,import.meta.url));
  assert.equal(bytes.subarray(0,4).toString(),'RIFF');assert.equal(bytes.subarray(8,12).toString(),'WEBP');
  assert(bytes.length<max,`${size}: ${bytes.length} bytes`);
 }
 assert.match(games,/width="1600" height="900" alt="\$\{escape\(game\.alt\)\}"/);
 for(const m of games.matchAll(/alt:'([^']+)'/g))assert(m[1].length>40);
});
