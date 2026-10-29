export const TAG_GROUPS = {
  version: ['2.2', '2.1', '2.0', '1.9', '1.9PS', '1.8', '1.6', '1.6PS'],
  length: ['Medium', 'Long', 'XL', 'XXL', 'XXL+'],
  gamemode: ['Cube', 'Ship', 'Ball', 'UFO', 'Wave', 'Robot', 'Spider', 'Old Swing', 'New Swing', '2P'],
  style: [
    'Timings', 'Chokepoints', 'Overall', 'Fast-Paced', 'Slow-Paced', 'Learny',
    'Nerve Control', 'High CPS', 'Clicksync', 'Gimmicky', 'Flow', 'Unbalanced',
    'Memory', 'Duals', 'Mirror', 'Circles', 'Bossfight',
  ],
  meta: ['NONG'],
};

export const DEFAULT_GROUPS = ['gamemode', 'style'];

const lookups = new WeakMap();

function lookupFor(tagGroups) {
  let lookup = lookups.get(tagGroups);
  if (!lookup) {
    lookup = new Map();
    for (const [group, tags] of Object.entries(tagGroups)) {
      for (const tag of tags) lookup.set(tag, group);
    }
    lookups.set(tagGroups, lookup);
  }
  return lookup;
}

export function groupOf(tag, tagGroups = TAG_GROUPS) {
  return lookupFor(tagGroups).get(tag) ?? 'unknown';
}

export function filterTags(tags, groups = DEFAULT_GROUPS, tagGroups = TAG_GROUPS) {
  const allowed = new Set(groups);
  return tags.filter((tag) => allowed.has(groupOf(tag, tagGroups)));
}
