// Unit content and lesson order are deliberately absent from this model.
export function orderedUnits(units, ids = []) {
  const rank = new Map(ids.map((id, index) => [id, index]));
  return units.map((unit, index) => ({ unit, index })).sort((a, b) =>
    (rank.get(a.unit.id) ?? ids.length + a.index) - (rank.get(b.unit.id) ?? ids.length + b.index)
  ).map(item => item.unit);
}
export function moveUnit(ids, id, target) {
  const next = [...ids], index = next.indexOf(id);
  if (index < 0 || !Number.isInteger(target) || target < 0 || target >= next.length) return next;
  next.splice(index, 1); next.splice(target, 0, id); return next;
}
