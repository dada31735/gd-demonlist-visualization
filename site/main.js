import { TAG_GROUPS } from '../src/tags.js';
import { renderHeatmap } from './heatmap.js';

const DEFAULT_ON = new Set(['gamemode']);
const controls = document.getElementById('controls');
const chart = document.getElementById('chart');

let levels;
try {
  const res = await fetch(new URL('../data/levels.json', import.meta.url));
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  levels = await res.json();
} catch (err) {
  chart.textContent = `Failed to load data: ${err.message}`;
  throw err;
}

for (const group of Object.keys(TAG_GROUPS)) {
  const label = document.createElement('label');
  const box = document.createElement('input');
  box.type = 'checkbox';
  box.value = group;
  box.dataset.group = group;
  box.checked = DEFAULT_ON.has(group);
  label.append(box, group);
  controls.append(label);
}

const liftLabel = document.createElement('label');
const liftBox = document.createElement('input');
liftBox.type = 'checkbox';
liftBox.checked = true;
liftLabel.append(liftBox, "compare to each tag's average");
controls.append(liftLabel);

const sizeLabel = document.createElement('label');
const sizeSelect = document.createElement('select');
for (const size of [100, 150, 300, 500]) {
  const option = document.createElement('option');
  option.value = size;
  option.textContent = `${size} levels per column`;
  option.selected = size === 150;
  sizeSelect.append(option);
}
sizeLabel.append(sizeSelect);
controls.append(sizeLabel);


function draw() {
  const groups = [...controls.querySelectorAll('input[data-group]:checked')].map((b) => b.value);

  if (groups.length === 0) {
    chart.textContent = 'Pick at least one tag group.';
    return;
  }

  chart.replaceChildren(
    renderHeatmap(levels, groups, {
      perTag: liftBox.checked,
      bucketSize: Number(sizeSelect.value),
    }),
  );
}


controls.addEventListener('change', draw);
draw();