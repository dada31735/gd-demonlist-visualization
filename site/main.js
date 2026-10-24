import { mountHeatmap } from './heatmap.js';
import { mountEnjoyment } from './enjoyment-chart.js';

let levels;
try {
  const res = await fetch(new URL('../data/levels.json', import.meta.url));
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  levels = await res.json();
} catch (err) {
  document.querySelector('main').textContent = `Failed to load data: ${err.message}`;
  throw err;
}

mountHeatmap(levels);
mountEnjoyment(levels);