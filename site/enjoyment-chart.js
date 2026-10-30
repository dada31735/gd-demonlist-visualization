import * as Plot from 'https://cdn.jsdelivr.net/npm/@observablehq/plot@0.6.17/+esm';
import { enjoymentByTag } from '../src/enjoyment.js';
import { addGroupToggles, checkedGroups } from './ui.js';
import { CLASSIC } from '../src/datasets.js';

const css = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
const signed = (n) => `${n >= 0 ? '+' : ''}${n.toFixed(1)}`;

export function renderEnjoyment(levels, options) {
  const { overall, ratedCount, rows } = enjoymentByTag(levels, options);

  const data = rows.map((r) => ({ ...r, label: `${r.tag} (${r.count})` }));
  const title = (d) =>
    `${d.tag}\nAverage enjoyment: ${d.mean.toFixed(1)}\nvs overall: ${signed(d.diff)}\nRated levels: ${d.count}`;
  const bars = (subset, fill) => Plot.barX(subset, { y: 'label', x: 'diff', fill, title });

  return Plot.plot({
    width: 1000,
    height: data.length * 24 + 90,
    marginLeft: 150,
    marginBottom: 50,
    style: { background: 'transparent', color: css('--tea-green'), fontSize: '12px' },
    caption: `Overall average: ${overall.toFixed(1)}, from ${ratedCount} rated levels.`,
    x: {
      label: 'Average enjoyment compared to all levels',
      grid: true,
      tickFormat: (d) => (d > 0 ? `+${d}` : `${d}`),
    },
    y: { domain: data.map((d) => d.label), label: null, tickSize: 0 },
    marks: [
      bars(data.filter((d) => d.diff >= 0), css('--amber-glow')),
      bars(data.filter((d) => d.diff < 0), css('--pacific-blue')),
      Plot.ruleX([0], { stroke: css('--tea-green') }),
    ],
  });
}

export function mountEnjoyment(levels, ds = CLASSIC) {
  const controls = document.getElementById(`${ds.prefix}enjoyment-controls`);
  const chart = document.getElementById(`${ds.prefix}enjoyment-chart`);

  addGroupToggles(controls, new Set(['gamemode', 'style']), ds.tagGroups);

  const pendingLabel = document.createElement('label');
  const pendingBox = document.createElement('input');
  pendingBox.type = 'checkbox';
  pendingLabel.append(pendingBox, 'include pending ratings');
  controls.append(pendingLabel);

  const minLabel = document.createElement('label');
  const minSelect = document.createElement('select');
  for (const n of ds.minCounts) {
    const option = document.createElement('option');
    option.value = n;
    option.textContent = `at least ${n} levels per tag`;
    option.selected = n === ds.minCountDefault;
    minSelect.append(option);
  }
  minLabel.append(minSelect);
  controls.append(minLabel);

  function draw() {
    const groups = checkedGroups(controls);
    if (groups.length === 0) {
      chart.textContent = 'Pick at least one tag group.';
      return;
    }
    chart.replaceChildren(
      renderEnjoyment(levels, {
        groups,
        includePending: pendingBox.checked,
        minCount: Number(minSelect.value),
        tagGroups: ds.tagGroups,
      }),
    );
  }

  controls.addEventListener('change', draw);
  draw();
}