// Shared configuration validation; persistence remains in the existing callables.
export const gradeKey = year => year === 0 ? 'prep' : `year-${year}`;
export const validGrade = value => Number.isInteger(value) && value >= 0 && value <= 6;
export const validYear = value => Number.isInteger(value) && value >= 2000 && value <= 2100;
export const validId = value => typeof value === 'string' && value.length <= 80 && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value);
export const journeyId = (year, grade) => `${year}_${gradeKey(grade)}`;
export function validatePlacements(value) {
  if (!Array.isArray(value) || value.length > 100) throw Error('A Journey supports up to 100 Units.');
  const ids = new Set(); let current = 0;
  return value.map(item => {
    if (!validId(item?.unitId) || ids.has(item.unitId)) throw Error('Unit references must be valid and unique.');
    if (!['completed','current','upcoming'].includes(item.status)) throw Error('Choose Completed, Current or Upcoming.');
    if (item.status === 'current' && ++current > 1) throw Error('Only one Unit may be Current.');
    ids.add(item.unitId); return { unitId: item.unitId, status: item.status };
  });
}
export const copyPlacements = placements => validatePlacements(placements).map(({ unitId }) => ({ unitId, status: 'upcoming' }));
export function changeStatus(placements, index, status, previousStatus = 'completed') {
  if (!placements[index] || !['completed','upcoming'].includes(previousStatus)) throw Error('Invalid status change.');
  return validatePlacements(placements.map((item, i) => ({ unitId: item.unitId, status: i === index ? status : status === 'current' && item.status === 'current' ? previousStatus : item.status })));
}
export function publicSlots(placements) {
  return validatePlacements(placements).map(({ unitId, status }, order) => status === 'upcoming' ? { order, status } : { order, status, unitId });
}
// Why a Journey cannot be published yet (mirrors publishJourney): Completed and Current Units must have an
// approved, published public record. Upcoming Units may stay private and are never exposed.
export function publishBlockers(placements, publishedUnits, titleOf = id => id) {
  return validatePlacements(placements).filter(p => p.status !== 'upcoming' && !publishedUnits.has(p.unitId))
    .map(p => `“${titleOf(p.unitId)}” is ${p.status === 'current' ? 'Current' : 'Completed'} but not published for students. Publish it in Unit Publication or set it to Upcoming.`);
}
// What each year level will show after switching the active public year (mirrors setActiveAcademicYear).
export function yearSwitchSummary(year, publishedJourneys) {
  return Array.from({length: 7}, (_, grade) => {
    const found = publishedJourneys.find(j => j.id === journeyId(year, grade) && j.schemaVersion === 1 && j.academicYear === year && j.yearLevel === grade && Number.isSafeInteger(j.revision) && j.revision > 0);
    return {grade, revision: found ? found.revision : 0};
  });
}
