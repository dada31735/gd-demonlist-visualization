import {mkdir, writeFile} from 'node:fs/promises';
import { BASE, LISTS } from './config.js';

const KEEP = new Set(['MainList', 'Legacy']);

await mkdir('data', { recursive: true });

for (const [list, files] of Object.entries(LISTS)) {
  const res = await fetch(`${BASE}/${list}/levels`);
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${list}`);
  const allLevels = await res.json();

  const counts = {};
  for (const level of allLevels) counts[level.status] = (counts[level.status] ?? 0) + 1;
  console.log(list, 'total:', allLevels.length, counts);

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

  await writeFile(files.levels, JSON.stringify(levels));
  console.log(list, 'kept:', levels.length);
}