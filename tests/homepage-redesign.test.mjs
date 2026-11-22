// Homepage redesign: approved watercolour hero, seven compact year-level cards, Teacher Login header label.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = file => fs.readFileSync(new URL('../dist/' + file, import.meta.url), 'utf8');
const app = read('app.mjs'), html = read('index.html');
const homeSource = app.slice(app.indexOf('function home(params)'), app.indexOf('function catalogPage('));

test('hero uses the prepared approved artwork at its native aspect ratio, with responsive sources', () => {
  for (const file of ["assets/home-hero-1755.webp", "assets/home-hero-900.webp"]) {
    const bytes = fs.readFileSync(new URL('../dist/' + file, import.meta.url));
    assert.equal(bytes.toString('ascii', 0, 4), 'RIFF'); assert.equal(bytes.toString('ascii', 8, 12), 'WEBP');
    assert(bytes.length < 350_000, `${file} is optimised`);
    assert(homeSource.includes(file), `${file} referenced`);
  }
  assert.match(homeSource, /width="1755" height="609"/);
  assert.match(homeSource, /srcset="assets\/home-hero-900\.webp 900w, assets\/home-hero-1755\.webp 1755w"/);
  assert.match(homeSource, /alt="Primary Mandarin Teaching Resources\./);
  assert(!homeSource.includes('year-staircase.png'), 'old staircase artwork no longer rendered on Home');
});

test('seven year-level cards keep the existing Journey destinations, in order, with one icon each', () => {
  const icons = app.slice(app.indexOf('const YEAR_CARDS=['), app.indexOf('];', app.indexOf('const YEAR_CARDS=[')));
  assert.equal((icons.match(/^\s*'</gm) || []).length, 7);
  assert(homeSource.includes('href="#/journey?year=${y}"'));
  assert(homeSource.includes('class="year-level-card year-${y}"'));
  assert(homeSource.includes('aria-label="Choose your year level"'));
  assert(homeSource.includes('${yearLabel(y)}'));
});

test('cards show no topic labels and the homepage has no Vocabulary Library / Activities / Units shortcut cards', () => {
  for (const word of ['Greetings', 'Pets', 'Family', 'Fruit', 'Sports', 'Vocabulary Library', 'feature-action', 'home-grid']) assert(!homeSource.includes(word), word);
  // The optional ?year= resource area (existing behaviour) is preserved.
  assert(homeSource.includes('id="year-resource-heading"'));
});

test('header keeps nav order, routes and the existing admin sign-in control, relabelled Teacher Login', () => {
  assert.deepEqual([...html.matchAll(/data-page="([^"]+)"/g)].map(m => m[1]), ['home', 'vocabulary', 'activities', 'topics', 'pinyin', 'hanzi', 'about']);
  assert.match(html, /<button class="admin-button" id="admin-open" aria-haspopup="dialog">.*<span class="admin-label">Teacher Login<\/span><\/button>/);
  assert.match(html, /src="assets\/emblem\.svg"/);
  assert.match(html, /<strong>The Mandarin Room<\/strong><small>Language · Culture · Classroom<\/small>/);
  assert.match(html, /styles\.css\?v=card-navigation-1/); assert.match(html, /app\.mjs\?v=card-navigation-1/);
});
