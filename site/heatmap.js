import * as Plot from 'https://cdn.jsdelivr.net/npm/@observablehq/plot@0.6.17/+esm';
import { tagShareByBucket } from '../src/buckets.js';
import { filterTags } from '../src/tags.js';
import { addGroupToggles, checkedGroups } from './ui.js';

const css = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

// tags sorted by mean position, so tags common near the top come first
function tagOrder(levels, groups) {
  const sum = {};
  const n = {};
  for (const level of levels) {
    for (const tag of new Set(filterTags(level.tags, groups))) {
      sum[tag] = (sum[tag] ?? 0) + level.position;
      n[tag] = (n[tag] ?? 0) + 1;
    }
  }
  return Object.keys(sum).sort((a, b) => sum[a] / n[a] - sum[b] / n[b]);
}


export function renderHeatmap(levels, groups, options = {}) {
  const perTag = options.perTag ?? false;
  const bucketSize = options.bucketSize ?? 150;

  const buckets = tagShareByBucket(levels, {
    groups,
    bucketSize,
  });

  const tags = tagOrder(levels, groups);
  const label = (b) => `${b.start}-${b.end}`;

  const cells = buckets.flatMap((b) =>
    tags.map((tag) => ({
      bucket: label(b),
      tag,
      count: b.counts[tag] ?? 0,
      total: b.total,
      share: b.shares[tag] ?? 0,
    })),
  );

  const rowMax = {};
  for (const c of cells) rowMax[c.tag] = Math.max(rowMax[c.tag] ?? 0, c.share);
  for (const c of cells) {
    c.value = perTag ? (rowMax[c.tag] ? c.share / rowMax[c.tag] : 0) : c.share;
  }
  const maxValue = Math.max(...cells.map((c) => c.value));

  return Plot.plot({
    width: 1000,
    height: tags.length * 22 + 90,
    marginLeft: 110,
    marginBottom: 40,
    style: { background: 'transparent', color: css('--tea-green'), fontSize: '12px' },
    x: { domain: buckets.map(label), label: 'Position on list', tickSize: 0 },
    y: { domain: tags, label: null, tickSize: 0 },
    color: {
        type: 'linear',
        domain: [0, maxValue / 3, (maxValue * 2) / 3, maxValue],
        range: [css('--darker-crimson-violet'), css('--crimson-violet'), css('--amber-glow'), css('--lighter-amber-glowlol')],
        interpolate: 'lab',
        legend: true,
        label: perTag ? "Relative to the tag's own peak" : 'Share of levels with tag',
        tickFormat: '%',
    },
    // color: {
    //   type: 'linear',
    //   domain: [0, maxValue],
    //   range: [css('--crimson-violet'), css('--amber-glow')],
    //   interpolate: 'lab',
    //   legend: true,
    //   label: perTag ? "Relative to the tag's own peak" : 'Share of levels with tag',
    //   tickFormat: '%',
    // },
    marks: [
      Plot.cell(cells, {
        x: 'bucket',
        y: 'tag',
        fill: 'value',
        inset: 1,
        title: (d) =>
          `${d.tag}\n#${d.bucket}: ${(d.share * 100).toFixed(0)}% (${d.count} of ${d.total})`,
      }),
    ],
  });
}

export function mountHeatmap(levels) {
  const controls = document.getElementById('heatmap-controls');
  const chart = document.getElementById('heatmap-chart');

  addGroupToggles(controls, new Set(['gamemode']));

  const perTagLabel = document.createElement('label');
  const perTagBox = document.createElement('input');
  perTagBox.type = 'checkbox';
  perTagBox.checked = true;
  perTagLabel.append(perTagBox, 'scale each tag separately');
  controls.append(perTagLabel);

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
    const groups = checkedGroups(controls);
    if (groups.length === 0) {
      chart.textContent = 'Pick at least one tag group.';
      return;
    }
    chart.replaceChildren(
      renderHeatmap(levels, groups, {
        perTag: perTagBox.checked,
        bucketSize: Number(sizeSelect.value),
      }),
    );
  }

  controls.addEventListener('change', draw);
  draw();
}