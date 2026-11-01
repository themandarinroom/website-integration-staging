// Shared Unit/lesson presentation. Student mode accepts only public fields.
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const safeUrl = value => { try { const url = new URL(value); return url.protocol === 'https:' && !url.username && !url.password ? value : ''; } catch { return ''; } };
export function renderUnit(unit, { student = false, vocab = [], speaking = new Map(), vocabularyUrl, speakingUrl, backHref = student ? '#/units' : './' } = {}) {
  const back = `<a class="back-link" href="${esc(backHref)}">← All units</a>`;
  if (!unit) return `${back}<section class="empty"><h1>${student ? 'Unit unavailable' : 'Unit not found'}</h1>${student ? '<p>This Unit is not available for student viewing. Please explore another Unit or try again later.</p>' : ''}</section>`;
  const examples = lesson => `<aside class="worked-examples" aria-label="Worked Examples"><h3>Worked Examples</h3>${lesson.workedExamples?.length ? `<div class="worked-example-gallery">${lesson.workedExamples.map((example, index) => {
    const url = student ? safeUrl(example.url) : example.url;
    return url ? `<a href="${esc(url)}" target="_blank" rel="noopener noreferrer"><img src="${esc(url)}" alt="${esc(example.alt || `Worked example ${index + 1}`)}" referrerpolicy="no-referrer" loading="lazy"><span>${esc(example.alt || `Example ${index + 1}`)}</span></a>` : '';
  }).join('')}</div>` : '<p class="muted">No examples yet.</p>'}</aside>`;
  const teacherResources = value => String(value || '').split('\n').filter(Boolean).map(line => /^https?:\/\//i.test(line.trim()) ? `<a href="${esc(line.trim())}" target="_blank" rel="noopener">${esc(line.trim())} →</a>` : esc(line)).join('<br>');
  return `${back}<section class="unit-header"><div><p class="eyebrow">${unit.yearLevel === 0 ? 'Prep' : `Year ${unit.yearLevel}`}</p><h1>${esc(unit.englishTitle)}</h1><p class="unit-chinese" lang="zh-Hans">${esc(unit.chineseTitle)}</p>${student && unit.description ? `<p class="preline">${esc(unit.description)}</p>` : ''}</div><div><strong>${unit.lessons.length} Lessons</strong>${student ? '' : `<a class="button secondary" href="edit.html?unit=${encodeURIComponent(unit.id)}">Edit unit</a>`}</div></section><section class="lesson-list">${unit.lessons.map((lesson, index) => {
    let detail;
    if (student) {
      detail = `${lesson.content ? `<div><h3>Activities</h3><p class="preline">${esc(lesson.content)}</p></div>` : ''}${lesson.links?.length ? `<div><h3>Resources</h3><p class="links">${lesson.links.map(link => safeUrl(link.url) ? `<a href="${esc(link.url)}" target="_blank" rel="noopener noreferrer">${esc(link.label)} →</a>` : '').join('<br>')}</p></div>` : ''}`;
    } else {
      const vocabulary = vocab.find(item => item.id === lesson.vocabularySetId), practice = speaking.get(lesson.speakingPracticeId);
      const speakingMarkup = practice ? `<a href="${speakingUrl(practice.id)}">${esc(practice.title)} →</a>` : lesson.speakingPracticeId ? `<p class="warning">Speaking Practice unavailable. <a href="edit.html?unit=${encodeURIComponent(unit.id)}">Edit unit</a></p>` : '<p class="muted">Not linked</p>';
      detail = `<div class="resource-grid"><div><h3>Vocabulary</h3>${vocabulary ? `<a href="${vocabularyUrl(vocabulary.id)}">${esc(vocabulary.title)} · ${vocabulary.itemCount} items →</a>` : '<p class="muted">Not linked</p>'}</div><div><h3>Speaking</h3>${speakingMarkup}</div></div>${lesson.notes ? `<div><h3>Activities / Notes</h3><p class="preline">${esc(lesson.notes)}</p></div>` : ''}${lesson.resources ? `<div><h3>Resources</h3><p class="links">${teacherResources(lesson.resources)}</p></div>` : ''}`;
    }
    return `<article class="lesson" data-lesson-id="${esc(lesson.id)}"><div class="lesson-layout"><div class="lesson-content"><p class="eyebrow">Lesson ${index + 1}</p><h2>${esc(lesson.title || `Lesson ${index + 1}`)}</h2>${lesson.learningIntention ? `<div><h3>Learning intention</h3><p>${esc(lesson.learningIntention)}</p></div>` : ''}${detail}</div>${examples(lesson)}</div></article>`;
  }).join('')}</section>`;
}
export function focusLesson(container, lessonId) {
  if (!lessonId) return;
  const target = [...container.querySelectorAll('[data-lesson-id]')].find(element => element.dataset.lessonId === lessonId);
  if (target) { target.classList.add('deep-linked'); target.tabIndex = -1; requestAnimationFrame(() => { target.scrollIntoView({ block: 'start' }); target.focus({ preventScroll: true }); }); }
  else container.querySelector('.unit-header')?.insertAdjacentHTML('afterend', '<p class="deep-link-warning">Linked lesson unavailable. The Unit is still available.</p>');
}
