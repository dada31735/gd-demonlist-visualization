import { filterTags } from './tags.js';

export function enjoymentByTag(levels, options = {}) {
  const { groups, includePending = false, minCount = 20 } = options;

  const rated = levels.filter(
    (level) => level.edel_enjoyment != null && (includePending || !level.is_edel_pending),
  );

  const stats = {};
  let total = 0;

  for (const level of rated) {
    total += level.edel_enjoyment;

    for (const tag of new Set(filterTags(level.tags, groups))) {
      const s = (stats[tag] ??= { tag, count: 0, sum: 0 });
      s.count += 1;
      s.sum += level.edel_enjoyment;
    }
  }

  const overall = rated.length ? total / rated.length : 0;

  const rows = Object.values(stats)
    .filter((s) => s.count >= minCount)
    .map((s) => ({
      tag: s.tag,
      count: s.count,
      mean: s.sum / s.count,
      diff: s.sum / s.count - overall,
    }))
    .sort((a, b) => b.mean - a.mean);

  return { overall, ratedCount: rated.length, rows };
}