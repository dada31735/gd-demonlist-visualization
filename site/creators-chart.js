import * as Plot from 'https://cdn.jsdelivr.net/npm/@observablehq/plot@0.6.17/+esm';
import { creatorRanking } from '../src/creators.js';
import { CLASSIC } from '../src/datasets.js';

const css = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

function addSelect(controls, options, selected, format) {
  const label = document.createElement('label');
  const select = document.createElement('select');
  for (const n of options) {
    const option = document.createElement('option');
    option.value = n;
    option.textContent = format(n);
    option.selected = n === selected;
    select.append(option);
  }
  label.append(select);
  controls.append(label);
  return select;
}

export function mountCreators(levels, creators, ds = CLASSIC) {
  const controls = document.getElementById(`${ds.prefix}creators-controls`);
  const chart = document.getElementById(`${ds.prefix}creators-chart`);

  if (!creators) {
    chart.textContent = 'Creator data not found. Run scripts/fetch-creators.js.';
    return;
  }

  const minSelect = addSelect(controls, [2, 3, 5, 10], 3, (n) => `at least ${n} rated levels`);
  const topSelect = addSelect(controls, [10, 20, 30], 20, (n) => `top ${n}`);

  const pendingLabel = document.createElement('label');
  const pendingBox = document.createElement('input');
  pendingBox.type = 'checkbox';
  pendingLabel.append(pendingBox, 'include pending ratings');
  controls.append(pendingLabel);

  function draw() {
    const minLevels = Number(minSelect.value);
    const { rows, eligible } = creatorRanking(levels, creators, {
      minLevels,
      top: Number(topSelect.value),
      includePending: pendingBox.checked,
    });

    if (rows.length === 0) {
      chart.textContent = 'No creators meet that minimum.';
      return;
    }

    const data = rows.map((r) => ({ ...r, label: `${r.creator} (${r.count})` }));
    const lo = Math.floor(Math.min(...data.map((d) => d.mean)) - 3);
    const hi = Math.min(100, Math.ceil(Math.max(...data.map((d) => d.mean)) + 3));

    chart.replaceChildren(
      Plot.plot({
        width: 1000,
        height: data.length * 26 + 90,
        marginLeft: 170,
        marginBottom: 50,
        style: { background: 'transparent', color: css('--tea-green'), fontSize: '12px' },
        caption: `${eligible} creators have at least ${minLevels} rated levels. Showing the top ${data.length}.`,
        x: { domain: [lo, hi], label: 'Average enjoyment', grid: true },
        y: { domain: data.map((d) => d.label), label: null, tickSize: 0 },
        marks: [
          Plot.dot(data, {
            y: 'label',
            x: 'mean',
            r: 5,
            fill: css('--amber-glow'),
            title: (d) =>
              `${d.creator}\nAverage enjoyment: ${d.mean.toFixed(1)}\nRated levels: ${d.count}\nBest: ${d.best.name} (${d.best.enjoyment.toFixed(1)})`,
          }),
          Plot.text(data, {
            y: 'label',
            x: 'mean',
            text: (d) => d.mean.toFixed(1),
            textAnchor: 'start',
            dx: 10,
            fill: css('--tea-green'),
          }),
        ],
      }),
    );
  }

  controls.addEventListener('change', draw);
  draw();
}