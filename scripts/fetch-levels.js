import {mkdir, writeFile} from 'node:fs/promises';

const url = process.argv[2];
const KEEP = new Set(['MainList', 'Legacy']);
const counts = {};

const res = await fetch(url);
if (!res.ok) throw new Error(`HTTTP ${res.status}`);
const allLevels = await res.json();

for (const level of allLevels) counts[level.status] = (counts[level.status] ?? 0) + 1;
console.log('total:', allLevels.length, counts);

const levels = allLevels.filter((level) => KEEP.has(level.status) && level.position != null).map((level) => ({
    id: level.id,
    name: level.name,
    position: level.position,
    status: level.status,
    level_id: level.level_id,
    two_player: level.two_player,
    publisher_id: level.publisher_id,
    tags: (level.tags ?? []).filter(Boolean),
    edel_enjoyment: level.edel_enjoyment,
    is_edel_pending: level.is_edel_pending,
    gddl_tier: level.gddl_tier,
})).sort((a, b) => a.position - b.position);

await mkdir('data', {recursive: true});
await writeFile('data/levels.json', JSON.stringify(levels));
console.log('kept:', levels.length);