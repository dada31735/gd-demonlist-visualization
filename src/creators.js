export function creatorRanking(levels, creators, options = {}) {
  const { minLevels = 3, includePending = false, top = 20 } = options;
  const byCreator = new Map();

  for (const level of levels) {
    const creator = creators[level.name];
    if (!creator) continue;
    if (level.edel_enjoyment == null) continue;
    if (!includePending && level.is_edel_pending) continue;

    const entry = byCreator.get(creator) ?? { creator, count: 0, sum: 0, best: null };
    entry.count += 1;
    entry.sum += level.edel_enjoyment;
    if (!entry.best || level.edel_enjoyment > entry.best.enjoyment) {
      entry.best = { name: level.name, enjoyment: level.edel_enjoyment };
    }
    byCreator.set(creator, entry);
  }

  const eligible = [...byCreator.values()]
    .filter((e) => e.count >= minLevels)
    .map((e) => ({ creator: e.creator, count: e.count, mean: e.sum / e.count, best: e.best }))
    .sort((a, b) => b.mean - a.mean || b.count - a.count);

  return { rows: eligible.slice(0, top), eligible: eligible.length };
}