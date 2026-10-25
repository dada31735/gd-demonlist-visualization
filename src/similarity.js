import { filterTags } from './tags.js';

// Shared tags divided by all distinct tags across both levels (0 to 1).
export function similarity(a, b) {
  const [small, large] = a.size <= b.size ? [a, b] : [b, a];
  let shared = 0;
  for (const tag of small) if (large.has(tag)) shared++;
  const union = a.size + b.size - shared;
  return union === 0 ? 0 : shared / union;
}

// Each level keeps its k most similar levels. Edges are deduplicated.
export function nearestNeighbors(levels, options = {}) {
  const { groups, k = 4, minScore = 0.2 } = options;
  const sets = levels.map((level) => new Set(filterTags(level.tags, groups)));
  const edges = new Map();

  for (let i = 0; i < levels.length; i++) {
    const candidates = [];

    for (let j = 0; j < levels.length; j++) {
      if (i === j) continue;
      const score = similarity(sets[i], sets[j]);
      if (score >= minScore) {
        candidates.push({ j, score, gap: Math.abs(levels[i].position - levels[j].position) });
      }
    }

    // Best score first. Ties go to the level closest in position.
    candidates.sort((x, y) => y.score - x.score || x.gap - y.gap);

    for (const { j, score } of candidates.slice(0, k)) {
      const source = Math.min(i, j);
      const target = Math.max(i, j);
      edges.set(`${source}-${target}`, { source, target, score });
    }
  }

  return [...edges.values()];
}