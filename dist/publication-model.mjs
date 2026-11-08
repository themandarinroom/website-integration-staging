// Teacher publication logic shared by unit-publication.mjs and tests. Pure functions: no Firebase, no DOM.
// Mirrors the deployed publishPublicUnit projection so a reopened publication can be reconstructed exactly
// and any content a republish would remove can be shown to the teacher before it happens.
const https = value => { try { const url = new URL(value); return url.protocol === 'https:' && !url.username && !url.password; } catch { return false; } };
export const VOCABULARY_URL = id => `https://themandarinroom.github.io/vocabularylibrary/?set=${encodeURIComponent(id)}`;
export const SPEAKING_URL = id => `https://themandarinroom.github.io/speaking/student.html?practice=${encodeURIComponent(id)}`;
export const sourceResources = lesson => String(lesson?.resources || '').split('\n').map(line => line.trim()).filter(Boolean);
export const publishableResources = lesson => sourceResources(lesson).filter(https);

// Draft (never published), Published, or Unpublished (published before, withdrawn now).
export function unitPublicationStatus(publicRecord) {
  if (!publicRecord) return {key: 'draft', label: 'Draft · not published for students'};
  if (publicRecord.published === true && publicRecord.approvedForStudents === true) return {key: 'published', label: `Published for students · revision ${publicRecord.revision}`};
  return {key: 'unpublished', label: `Unpublished · revision ${publicRecord.revision}`};
}

// Rebuild the teacher's previous selections from the stored public projection.
// Every published item is restored when the current source still supports it; anything that cannot be
// restored reliably is reported as a warning instead of being guessed or silently dropped.
export function reconstructSelections(unit, publicRecord) {
  const selections = new Map(), warnings = [];
  const live = publicRecord?.published === true;
  for (const lesson of unit.lessons || []) selections.set(lesson.id, {include: false, intention: false, content: '', vocabulary: false, speaking: false, resources: []});
  if (!live) return {description: publicRecord?.description || '', topics: publicRecord?.topics || [], selections, warnings, reconstructed: false};
  for (const published of publicRecord.lessons || []) {
    const source = (unit.lessons || []).find(lesson => lesson.id === published.id);
    if (!source) { warnings.push(`Published lesson “${published.title}” no longer exists in the Unit. Republishing will remove it for students.`); continue; }
    if (source.teacherOnly === true) { warnings.push(`“${source.title}” is now teacher-only. Republishing will remove it for students.`); continue; }
    const links = published.links || [];
    const vocabulary = links.find(link => link.label === 'Vocabulary'), speaking = links.find(link => link.label === 'Speaking');
    const selection = {include: true, intention: Boolean(published.learningIntention), content: String(published.content || ''), vocabulary: false, speaking: false, resources: []};
    if (published.learningIntention && published.learningIntention !== (source.learningIntention || ''))
      warnings.push(`“${source.title}”: the learning intention changed since publication. Republishing will show the current text.`);
    if (published.learningIntention && !source.learningIntention) { selection.intention = false; warnings.push(`“${source.title}”: the published learning intention was removed from the Unit. Republishing will remove it for students.`); }
    if (vocabulary) {
      if (source.vocabularySetId && vocabulary.url === VOCABULARY_URL(source.vocabularySetId)) selection.vocabulary = true;
      else warnings.push(`“${source.title}”: the published Vocabulary link no longer matches the Unit. Review the Vocabulary selection.`);
    }
    if (speaking) {
      if (source.speakingPracticeId && speaking.url === SPEAKING_URL(source.speakingPracticeId)) selection.speaking = true;
      else warnings.push(`“${source.title}”: the published Speaking link no longer matches the Unit. Review the Speaking selection.`);
    }
    const available = publishableResources(source);
    for (const link of links.filter(link => /^Resource \d+$/.test(link.label))) {
      if (available.includes(link.url)) selection.resources.push(link.url);
      else warnings.push(`“${source.title}”: published resource ${link.url} is no longer in the Unit. Republishing will remove it for students.`);
    }
    selections.set(source.id, selection);
  }
  return {description: publicRecord.description || '', topics: publicRecord.topics || [], selections, warnings, reconstructed: true};
}

// The exact callable payload (worked examples are teacher-only and never sent).
export function publicationPayload(unit, publicationRevision, {description, topics, selections}) {
  const stamp = unit.updatedAt;
  if (!Number.isInteger(stamp?.seconds) || !Number.isInteger(stamp?.nanoseconds)) throw Error('Source Unit has no valid cloud revision; publication is unavailable.');
  const lessons = (unit.lessons || []).filter(lesson => lesson.teacherOnly !== true && selections.get(lesson.id)?.include).map(lesson => {
    const s = selections.get(lesson.id), available = publishableResources(lesson);
    return {id: lesson.id, includeLearningIntention: Boolean(s.intention && lesson.learningIntention), content: String(s.content || ''),
      includeVocabulary: Boolean(s.vocabulary && lesson.vocabularySetId), includeSpeaking: Boolean(s.speaking && lesson.speakingPracticeId),
      resourceUrls: available.filter(url => s.resources.includes(url)), workedExampleIds: []};
  });
  return {unitId: unit.id, expectedRevision: publicationRevision, sourceVersion: `${stamp.seconds}:${stamp.nanoseconds}`, approved: true, student: {description, topics, lessons}};
}

// What students would see after publishing this payload (same rules as the Function's projection).
export function previewProjection(unit, payload) {
  return payload.student.lessons.map(selection => {
    const source = unit.lessons.find(lesson => lesson.id === selection.id);
    const links = selection.resourceUrls.map((url, i) => ({label: `Resource ${i + 1}`, url}));
    if (selection.includeVocabulary) links.unshift({label: 'Vocabulary', url: VOCABULARY_URL(source.vocabularySetId)});
    if (selection.includeSpeaking) links.push({label: 'Speaking', url: SPEAKING_URL(source.speakingPracticeId)});
    return {id: source.id, title: source.title, learningIntention: selection.includeLearningIntention ? source.learningIntention || '' : '', content: selection.content, links};
  });
}

// Student-visible content that would disappear if this payload replaced the current publication.
export function removedContent(publicRecord, unit, payload) {
  if (publicRecord?.published !== true) return [];
  const next = new Map(previewProjection(unit, payload).map(lesson => [lesson.id, lesson])), removed = [];
  for (const old of publicRecord.lessons || []) {
    const now = next.get(old.id);
    if (!now) { removed.push(`Lesson “${old.title}”`); continue; }
    if (old.learningIntention && !now.learningIntention) removed.push(`Learning intention of “${old.title}”`);
    if (old.content && !now.content) removed.push(`Activity text of “${old.title}”`);
    for (const link of old.links || []) if (!now.links.some(item => item.url === link.url)) removed.push(`${/^Resource/.test(link.label) ? 'Resource ' + link.url : link.label + ' link'} in “${old.title}”`);
  }
  if (publicRecord.description && !payload.student.description) removed.push('Unit description');
  for (const topic of publicRecord.topics || []) if (!payload.student.topics.includes(topic)) removed.push(`Topic “${topic}”`);
  return removed;
}
