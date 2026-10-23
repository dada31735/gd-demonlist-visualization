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

const GROUP_BY_TAG = new Map();
for (const [group, tags] of Object.entries(TAG_GROUPS)) {
  for (const tag of tags) GROUP_BY_TAG.set(tag, group);
}

export const DEFAULT_GROUPS = ['gamemode', 'style'];

export function filterTags(tags, groups = DEFAULT_GROUPS) {
  const allowed = new Set(groups);
  return tags.filter((tag) => allowed.has(groupOf(tag)));
}
export function groupOf(tag) {
  return GROUP_BY_TAG.get(tag) ?? 'unknown';
}
