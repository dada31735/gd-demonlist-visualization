import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { BASE, LISTS } from './config.js';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function getJson(url) {
  for (let attempt = 0; attempt < 4; attempt++) {
    const res = await fetch(url);
    if (res.status === 429) {
      await sleep(2000 * (attempt + 1));
      continue;
    }
    if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
    return res.json();
  }
  throw new Error(`Rate limited: ${url}`);
}

async function fetchCreators(list, files) {
  const levels = JSON.parse(await readFile(files.levels, 'utf8'));

  let creators = {};
  try {
    creators = JSON.parse(await readFile(files.creators, 'utf8'));
  } catch {}

  const todo = levels.filter((level) => !(level.name in creators));
  const total = todo.length;
  console.log(`${list}: ${total} to fetch, ${levels.length - total} already cached`);

  let done = 0;

  async function worker() {
    while (todo.length) {
      const level = todo.pop();
      const detail = await getJson(`${BASE}/${list}/levels/${level.id}`);
      const publisher = detail.publisher;
      creators[level.name] = publisher?.global_name ?? publisher?.username ?? null;
      done++;
      if (done % 100 === 0) console.log(`${done} / ${total}`);
      await sleep(100);
    }
  }

  try {
    await Promise.all(Array.from({ length: 4 }, worker));
  } finally {
    const sorted = Object.fromEntries(Object.entries(creators).sort(([a], [b]) => a.localeCompare(b)),);
    await mkdir('data', { recursive: true });
    await writeFile(files.creators, JSON.stringify(sorted));
    console.log(list, 'saved', Object.keys(sorted).length, 'levels');
  }
}

for (const [list, files] of Object.entries(LISTS)) await fetchCreators(list, files);