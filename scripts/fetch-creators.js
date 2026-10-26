import { mkdir, readFile, writeFile } from 'node:fs/promises';

const base = process.argv[2];
if (!base) {
  console.error('Usage: node scripts/fetch-creators.js <base-url>');
  process.exit(1);
}

const levels = JSON.parse(await readFile('data/levels.json', 'utf8'));

let creators = {};
try {
  creators = JSON.parse(await readFile('data/creators.json', 'utf8'));
} catch {}

const todo = levels.filter((level) => !(level.name in creators));
const total = todo.length;
console.log(`${total} to fetch, ${levels.length - total} already cached`);

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

let done = 0;

async function worker() {
  while (todo.length) {
    const level = todo.pop();
    const detail = await getJson(`${base}/aredl/levels/${level.id}`);
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
  await writeFile('data/creators.json', JSON.stringify(sorted));
  console.log('saved', Object.keys(sorted).length, 'levels');
  console.log('sample:', Object.entries(sorted).slice(0, 3));
}