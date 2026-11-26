// Activities (four cards since D3) and the Listening Games sub-page (Bingo, Build The Great Wall). Replaces bingo-games.test.mjs.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {LINKS} from '../dist/catalog.mjs';
import {parseRoute,robotsFor} from '../dist/routing.mjs';

const read=file=>fs.readFileSync(new URL(`../dist/${file}`,import.meta.url),'utf8');
const app=read('app.mjs');
const tiles=app.slice(app.indexOf('function activityTiles()'),app.indexOf('// Listening Games:'));
const games=app.slice(app.indexOf('const LISTENING_GAMES'),app.indexOf('// Vocabulary Games:'));
const activities=app.slice(app.indexOf('function activitiesPage()'),app.indexOf('function',app.indexOf('function activitiesPage()')+10));

test('Activities shows exactly Word Randomiser, Speaking Practice, Listening Games and Vocabulary Games (D3)',()=>{
 assert.deepEqual([...tiles.matchAll(/<h3>([^<]+)<\/h3>/g)].map(m=>m[1]),['Word Randomiser','Speaking Practice','Listening Games','Vocabulary Games']);
 assert(tiles.includes('href="${LINKS.randomiser}"')&&tiles.includes('href="${LINKS.speaking}"'),'existing apps stay linked');
 assert(tiles.includes('href="#/activities/listening-games"'));
 assert(!/Coming soon|Bingo Games|Speaking App|Listening Game</.test(tiles));
});
test('Activities has a plain heading and no light-blue introduction banner',()=>{
 assert.match(activities,/<header class="page-intro activities-intro"><h1>Activities<\/h1><\/header>/);
 assert(!/banner|subtitle/.test(activities));
});
test('Listening Games route is a sub-page of Activities, noindex, with a way back',()=>{
 for(const hash of ['#/activities/listening-games','#/activities/listening-games/'])assert.equal(parseRoute(hash).page,'listening-games');
 assert.equal(parseRoute('#/activities').page,'activities');
 assert.equal(robotsFor('listening-games'),'noindex');
 assert(app.includes(`'listening-games':listeningGamesPage`)&&app.includes(`'listening-games':'Listening Games'`));
 assert(app.includes(`page==='listening-games'||page==='vocabulary-games'?'activities'`),'top navigation keeps Activities current');
 assert.match(app,/<a class="back-link" href="#\/activities">← Back to Activities<\/a>/);
});
test('Bingo and Build The Great Wall cards: approved text, verified links, whole-card links, safe new tab',()=>{
 assert.equal(LINKS.bingo,'https://themandarinroom.github.io/vocabularylibrary/tools/bingo-board/');
 assert.equal(LINKS.greatWall,'https://themandarinroom.github.io/vocabularylibrary/tools/great-wall/');
 assert(games.includes(`title:'Bingo',href:LINKS.bingo,description:'Listen to a Chinese word, find it on your board and make a Bingo!'`));
 assert(games.includes(`title:'Build The Great Wall',href:LINKS.greatWall,description:'Listen, answer and build the Great Wall brick by brick!'`));
 assert.match(games,/<a class="game-card" href="\$\{game\.href\}" target="_blank" rel="noopener noreferrer"/);
 assert(!/bingo[^<]{0,40}live|live[^<]{0,40}bingo/i.test(app),'no Bingo Live Mode link or text');
});
test('covers are separate optimised 16:9 WebP files with alt text and no layout shift',()=>{
 for(const name of ['bingo-cover','great-wall-cover'])for(const [size,max] of [[800,90_000],[1600,200_000]]){
  const bytes=fs.readFileSync(new URL(`../dist/assets/listening-games/${name}-${size}.webp`,import.meta.url));
  assert.equal(bytes.subarray(0,4).toString(),'RIFF');assert.equal(bytes.subarray(8,12).toString(),'WEBP');
  assert(bytes.length<max,`${name}-${size}: ${bytes.length} bytes`);
 }
 assert.match(games,/width="1600" height="900" alt="\$\{escape\(game\.alt\)\}"/);
 for(const m of games.matchAll(/alt:'([^']+)'/g))assert(m[1].length>40,'meaningful alt text');
 const css=read('styles.css');
 assert.match(css,/\.game-cover\{aspect-ratio:16\/9/);assert.match(css,/\.game-cover img\{[^}]*object-fit:cover/);
});
test('the homepage year panel no longer calls Listening Games "coming soon"',()=>{
 assert(!app.includes('Bingo Board and Listening Game · Coming soon'));
 assert(app.includes('<strong>Speaking Practice ${arrow}</strong>'));
});

test('Activities and Listening Games use arrow-free full-card links',()=>{
 assert.equal((tiles.match(/<a class="activity-card /g)||[]).length,4); // D3: Vocabulary Games is the fourth card
 assert.equal((tiles.match(/<a /g)||[]).length,4);
 assert.doesNotMatch(tiles,/class="circle"|\$\{arrow\}/);
 assert.doesNotMatch(games,/class="circle"|\$\{arrow\}/);
 assert(games.includes('Play · opens in a new tab'));
});
