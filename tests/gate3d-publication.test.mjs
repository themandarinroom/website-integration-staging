// Gate 3D: publication selection preservation, Upcoming Units, year switching and student fallbacks.
import test from 'node:test';
import assert from 'node:assert/strict';
import {reconstructSelections, publicationPayload, previewProjection, removedContent, unitPublicationStatus, VOCABULARY_URL, SPEAKING_URL} from '../dist/publication-model.mjs';
import {publishBlockers, yearSwitchSummary, publicSlots} from '../dist/journey-model.mjs';
import {renderJourney} from '../dist/journey-view.mjs';

const stamp = {seconds: 1788498000, nanoseconds: 374000000};
const unit = {id: 'year-5-nationalities', yearLevel: 5, englishTitle: 'Nationalities', updatedAt: stamp, lessons: [
  {id: 'l1', title: 'Introduction', learningIntention: 'Say where you are from.', notes: 'PRIVATE', vocabularySetId: 'year2-family', speakingPracticeId: 'year3-what-s-your-name', resources: 'https://www.youtube.com/watch?v=a\nnot a url\nhttps://example.org/sheet'},
  {id: 'l2', title: 'Practice', learningIntention: '', notes: '', vocabularySetId: '', speakingPracticeId: '', resources: ''},
  {id: 'l3', title: 'Speaking Assessment', teacherOnly: true, learningIntention: 'Assess.', notes: 'rubric', vocabularySetId: '', speakingPracticeId: '', resources: 'https://example.org/rubric',
   workedExamples: [{id: 'e1', storagePath: 'units/year-5-nationalities/l3/worked-example-e1.webp', alt: 'Rubric'}]}]};
const published = {id: unit.id, schemaVersion: 1, published: true, approvedForStudents: true, revision: 3, description: 'Countries and people.', topics: ['countries', 'people'], lessons: [
  {id: 'l1', title: 'Introduction', learningIntention: 'Say where you are from.', content: 'Ask a partner.', links: [{label: 'Vocabulary', url: VOCABULARY_URL('year2-family')}, {label: 'Resource 1', url: 'https://example.org/sheet'}, {label: 'Speaking', url: SPEAKING_URL('year3-what-s-your-name')}]},
  {id: 'l2', title: 'Practice', learningIntention: '', content: '', links: []}]};
const asSelections = r => ({description: r.description, topics: r.topics, selections: r.selections});

test('A1: reopening restores every published selection exactly (cross-year Vocabulary and Speaking kept)', () => {
  const r = reconstructSelections(unit, published);
  assert.deepEqual(r.warnings, []);
  assert.deepEqual(r.selections.get('l1'), {include: true, intention: true, content: 'Ask a partner.', vocabulary: true, speaking: true, resources: ['https://example.org/sheet']});
  assert.deepEqual(r.selections.get('l2'), {include: true, intention: false, content: '', vocabulary: false, speaking: false, resources: []});
  assert.equal(r.selections.get('l3').include, false);
  // Republishing the restored selection reproduces the current publication and removes nothing.
  const payload = publicationPayload(unit, 3, asSelections(r));
  assert.deepEqual(previewProjection(unit, payload), published.lessons);
  assert.deepEqual(removedContent(published, unit, payload), []);
  assert.equal(payload.sourceVersion, '1788498000:374000000');
});

test('A1: untouched fields are never silently dropped; removals need explicit confirmation', () => {
  const r = reconstructSelections(unit, published);
  r.selections.get('l1').resources = []; r.selections.get('l1').intention = false;
  const removed = removedContent(published, unit, publicationPayload(unit, 3, asSelections(r)));
  assert.deepEqual(removed, ['Learning intention of “Introduction”', 'Resource https://example.org/sheet in “Introduction”']);
  r.selections.get('l2').include = false;
  assert.ok(removedContent(published, unit, publicationPayload(unit, 3, {...asSelections(r), topics: ['countries']})).includes('Topic “people”'));
});

test('A1: selections that cannot be reconstructed reliably produce warnings, never guesses', () => {
  const changed = structuredClone(unit);
  changed.lessons[0].resources = 'https://www.youtube.com/watch?v=a'; changed.lessons[0].vocabularySetId = 'year5-countries';
  changed.lessons[0].learningIntention = 'New wording.'; changed.lessons.splice(1, 1);
  const r = reconstructSelections(changed, published);
  assert.equal(r.selections.get('l1').vocabulary, false, 'not re-pointed to a different set');
  assert.deepEqual(r.selections.get('l1').resources, []);
  assert.equal(r.warnings.length, 4);
  assert.match(r.warnings.join('\n'), /learning intention changed/); assert.match(r.warnings.join('\n'), /Vocabulary link no longer matches/);
  assert.match(r.warnings.join('\n'), /no longer in the Unit/); assert.match(r.warnings.join('\n'), /“Practice” no longer exists/);
});

test('B4/B5: teacher-only lessons and Worked Examples can never enter a payload', () => {
  const r = reconstructSelections(unit, published);
  r.selections.set('l3', {include: true, intention: true, content: 'x', vocabulary: false, speaking: false, resources: ['https://example.org/rubric']});
  const payload = publicationPayload(unit, 3, asSelections(r));
  assert.deepEqual(payload.student.lessons.map(l => l.id), ['l1', 'l2']);
  assert.ok(payload.student.lessons.every(l => Array.isArray(l.workedExampleIds) && l.workedExampleIds.length === 0));
  assert.ok(!JSON.stringify(payload).includes('worked-example'));
  const nowTeacherOnly = structuredClone(unit); nowTeacherOnly.lessons[1].teacherOnly = true;
  assert.match(reconstructSelections(nowTeacherOnly, published).warnings.join(), /“Practice” is now teacher-only/);
});

test('A3: Draft, Published and Unpublished Unit states are distinct', () => {
  assert.equal(unitPublicationStatus(null).key, 'draft');
  assert.equal(unitPublicationStatus(published).key, 'published');
  assert.equal(unitPublicationStatus({id: 'x', schemaVersion: 1, revision: 4, published: false, approvedForStudents: false}).key, 'unpublished');
  assert.deepEqual(reconstructSelections(unit, {revision: 4, published: false}).selections.get('l1').include, false);
});

test('A2: unpublished Units may be Upcoming; Current/Completed must be published; Upcoming stays hidden', () => {
  const live = new Map([['prep-numbers', {}]]);
  const placements = [{unitId: 'prep-numbers', status: 'current'}, {unitId: 'prep-colours', status: 'upcoming'}];
  assert.deepEqual(publishBlockers(placements, live), []);
  assert.deepEqual(publicSlots(placements), [{order: 0, status: 'current', unitId: 'prep-numbers'}, {order: 1, status: 'upcoming'}]);
  const blocked = publishBlockers([{unitId: 'prep-colours', status: 'completed'}, {unitId: 'prep-numbers', status: 'current'}], live, id => ({'prep-colours': 'Colours'})[id]);
  assert.deepEqual(blocked, ['“Colours” is Completed but not published for students. Publish it in Unit Publication or set it to Upcoming.']);
});

test('C3: the switch summary shows exactly which year levels have a published Journey', () => {
  const rows = yearSwitchSummary(2027, [{id: '2027_prep', schemaVersion: 1, academicYear: 2027, yearLevel: 0, revision: 2}, {id: '2027_year-5', schemaVersion: 1, academicYear: 2027, yearLevel: 5, revision: 7}, {id: '2026_year-1', schemaVersion: 1, academicYear: 2026, yearLevel: 1, revision: 3}]);
  assert.deepEqual(rows.map(r => r.revision), [2, 0, 0, 0, 0, 7, 0]);
});

test('C4: students never see a calendar-derived year; the semester appears only within the Journey’s year', () => {
  const jan2027 = new Date('2027-01-05T00:00:00Z'), nov2026 = new Date('2026-11-08T00:00:00Z');
  assert.match(renderJourney(null, 0, {date: jan2027}), /Learning Journey · Prep</);
  assert.doesNotMatch(renderJourney(null, 0, {date: jan2027}), /2027|Semester/);
  const journey = {academicYear: 2026, yearLevel: 0, revision: 2, slots: [], units: new Map()};
  assert.match(renderJourney(journey, 0, {date: nov2026}), /Learning Journey · 2026 · Semester 2 · Prep/);
  assert.match(renderJourney(journey, 0, {date: jan2027}), /Learning Journey · 2026 · Prep</);
  const withExample = {academicYear: 2026, yearLevel: 0, revision: 2, slots: [{order: 0, status: 'current', unitId: 'u'}], units: new Map([['u', {englishTitle: 'U', chineseTitle: '', description: '', lessons: [{workedExamples: [{url: 'https://example.org/private.webp'}]}]}]])};
  const html = renderJourney(withExample, 0, {date: nov2026});
  assert.doesNotMatch(html, /private\.webp/); assert.match(html, /assets\/emblem\.svg/);
});
