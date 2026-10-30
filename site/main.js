import { CLASSIC, PLATFORMER } from '../src/datasets.js';
import { mountHeatmap } from './heatmap.js';
import { mountEnjoyment } from './enjoyment-chart.js';
import { mountGraph } from './graph.js';
import { mountCreators } from './creators-chart.js';
import { setupTabs } from './tabs.js';

async function loadJson(file) {
  const res = await fetch(new URL(`../data/${file}`, import.meta.url));
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${file}`);
  return res.json();
}

async function mountDataset(ds) {
  try {
    const levels = await loadJson(ds.levelsFile);
    const creators = await loadJson(ds.creatorsFile).catch(() => null); // optional

    mountHeatmap(levels, ds);
    mountEnjoyment(levels, ds);
    mountGraph(levels, ds);
    mountCreators(levels, creators, ds);
  } catch (err) {
    document.getElementById(`tab-${ds.tab}`).textContent = `Failed to load data: ${err.message}`;
  }
}

setupTabs({
  classic: () => mountDataset(CLASSIC),
  platformer: () => mountDataset(PLATFORMER),
});