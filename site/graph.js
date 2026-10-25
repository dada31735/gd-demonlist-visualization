import {
  forceSimulation,
  forceLink,
  forceManyBody,
  forceX,
  forceY,
  scaleLinear,
  select,
  zoom,
  zoomIdentity,
} from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';
import { nearestNeighbors, similarity } from '../src/similarity.js';
import { filterTags } from '../src/tags.js';
import { addGroupToggles, checkedGroups } from './ui.js';

const HEIGHT = 700;
const PANEL_WIDTH = 300;
const GAP = 16;
const TOP_SIMILAR = 10;
const LABEL_ZOOM = 5; // past this zoom level every visible dot gets a label
const UNRATED_GRAY = '#8b90a0';

function cssVar(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

function make(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

// options is a list of [value, label] pairs
function makeSelect(options, selectedValue) {
  const dropdown = document.createElement('select');
  for (const [value, label] of options) {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = label;
    option.selected = value === selectedValue;
    dropdown.append(option);
  }
  return dropdown;
}

function makeLabel(...children) {
  const label = document.createElement('label');
  label.append(...children);
  return label;
}

export function mountGraph(levels) {
  const controls = document.getElementById('graph-controls');
  const chart = document.getElementById('graph-chart');

  const canvas = document.createElement('canvas');
  const tooltip = make('div', 'graph-tooltip');
  tooltip.hidden = true;
  const canvasWrap = make('div', 'canvas-wrap');
  canvasWrap.append(canvas, tooltip);
  const panel = make('aside', 'graph-panel');
  const layout = make('div', 'graph-layout');
  layout.append(canvasWrap, panel);
  const note = make('p', 'hint');
  chart.append(layout, note);

  const total = chart.clientWidth || 1000;
  const width = total > 800 ? total - PANEL_WIDTH - GAP : total;

  const dpr = window.devicePixelRatio || 1;
  canvas.width = width * dpr;
  canvas.height = HEIGHT * dpr;
  canvas.style.width = `${width}px`;
  canvas.style.height = `${HEIGHT}px`;
  const ctx = canvas.getContext('2d');

  addGroupToggles(controls, new Set(['gamemode', 'style']));

  const kSelect = makeSelect(
    [2, 3, 4, 6].map((n) => [n, `${n} links per level`]),
    4,
  );
  const colorSelect = makeSelect([
    ['position', 'color by position'],
    ['enjoyment', 'color by enjoyment'],
  ]);

  const search = document.createElement('input');
  search.type = 'search';
  search.placeholder = 'Find a level...';
  search.setAttribute('list', 'graph-level-names');
  const datalist = document.createElement('datalist');
  datalist.id = 'graph-level-names';
  for (const level of levels) {
    const option = document.createElement('option');
    option.value = level.name;
    datalist.append(option);
  }

  const resetButton = make('button', null, 'Reset view');
  resetButton.type = 'button';

  controls.append(makeLabel(kSelect), makeLabel(colorSelect), makeLabel(search, datalist), resetButton);

  // colors
  const orange = cssVar('--orange-glow');
  const green = cssVar('--tea-green');
  const blue = cssVar('--pacific-blue');

  const maxPosition = Math.max(...levels.map((l) => l.position));
  const positionColor = scaleLinear()
    .domain([1, (1 + maxPosition) / 2, maxPosition])
    .range([orange, green, blue])
    .clamp(true);

  // use the 5th and 95th percentile so a few extreme ratings don't wash out the colors
  const ratings = levels
    .map((l) => l.edel_enjoyment)
    .filter((r) => r != null)
    .sort((a, b) => a - b);
  const lowRating = ratings[Math.floor(ratings.length * 0.05)];
  const highRating = ratings[Math.floor(ratings.length * 0.95)];
  const enjoymentColor = scaleLinear()
    .domain([lowRating, (lowRating + highRating) / 2, highRating])
    .range([blue, green, orange])
    .clamp(true);

  const indexByName = new Map(levels.map((level, i) => [level.name.toLowerCase(), i]));

  // state
  let active = false; // false when no tag groups are checked
  let simulation = null;
  let nodes = [];
  let edges = [];
  let tagSets = []; // one Set of tags per level, after filtering by the checked groups
  let nodeColors = [];
  let selected = -1;
  let hovered = -1;
  let similar = []; // top matches for the selected level
  let highlighted = new Set(); // selected level + its matches

  let transform = zoomIdentity.translate(width / 2, HEIGHT / 2);
  const centered = transform;

  const zoomBehavior = zoom()
    .scaleExtent([0.4, 14])
    .on('zoom', (event) => {
      transform = event.transform;
      draw();
    });

  function updateColors() {
    if (colorSelect.value === 'position') {
      nodeColors = levels.map((l) => positionColor(l.position));
    } else {
      nodeColors = levels.map((l) =>
        l.edel_enjoyment == null ? UNRATED_GRAY : enjoymentColor(l.edel_enjoyment),
      );
    }
  }

  function updateNote() {
    if (colorSelect.value === 'position') {
      note.textContent = 'Color: orange is the top of the list, blue is the bottom.';
    } else {
      note.textContent = 'Color: orange is most enjoyable, blue is least (EDEL ratings). Gray means unrated.';
    }
  }

  function drawRing(node, radius, color, thickness) {
    ctx.strokeStyle = color;
    ctx.lineWidth = thickness;
    ctx.beginPath();
    ctx.arc(node.x, node.y, radius, 0, Math.PI * 2);
    ctx.stroke();
  }

  function draw() {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, HEIGHT);
    if (!active) return;

    const k = transform.k;
    const dimmed = selected >= 0;
    const radius = 3 / Math.sqrt(k); // dots shrink a bit when zoomed in

    ctx.save();
    ctx.translate(transform.x, transform.y);
    ctx.scale(k, k);

    // neighbor links, faded out more when something is selected
    ctx.strokeStyle = green;
    ctx.lineWidth = 1 / k;
    ctx.globalAlpha = dimmed ? 0.04 : 0.12;
    ctx.beginPath();
    for (const edge of edges) {
      ctx.moveTo(edge.source.x, edge.source.y);
      ctx.lineTo(edge.target.x, edge.target.y);
    }
    ctx.stroke();

    // selected level -> its top matches, stronger line = higher score
    if (dimmed) {
      const from = nodes[selected];
      ctx.strokeStyle = orange;
      for (const { i, score } of similar) {
        ctx.globalAlpha = 0.25 + 0.75 * score;
        ctx.lineWidth = (1 + 2 * score) / k;
        ctx.beginPath();
        ctx.moveTo(from.x, from.y);
        ctx.lineTo(nodes[i].x, nodes[i].y);
        ctx.stroke();
      }
    }

    nodes.forEach((node, i) => {
      ctx.globalAlpha = dimmed && !highlighted.has(i) ? 0.15 : 1;
      ctx.fillStyle = nodeColors[i];
      ctx.beginPath();
      ctx.arc(node.x, node.y, radius, 0, Math.PI * 2);
      ctx.fill();
    });

    ctx.globalAlpha = 1;
    if (dimmed) {
      for (const { i } of similar) drawRing(nodes[i], radius * 1.7, green, 1.2 / k);
      drawRing(nodes[selected], radius * 2.4, '#ffffff', 2 / k);
    }
    if (hovered >= 0 && hovered !== selected) {
      drawRing(nodes[hovered], radius * 2, '#ffffff', 1.5 / k);
    }

    // labels: highlighted + hovered, or everything on screen if zoomed in far enough
    const labeled = new Set(highlighted);
    if (hovered >= 0) labeled.add(hovered);
    if (k >= LABEL_ZOOM) {
      nodes.forEach((node, i) => {
        const screenX = node.x * k + transform.x;
        const screenY = node.y * k + transform.y;
        if (screenX > 0 && screenX < width && screenY > 0 && screenY < HEIGHT) labeled.add(i);
      });
    }
    ctx.font = `${12 / k}px system-ui, sans-serif`;
    ctx.fillStyle = green;
    ctx.textBaseline = 'middle';
    for (const i of labeled) {
      ctx.fillText(levels[i].name, nodes[i].x + radius * 2.8, nodes[i].y);
    }

    ctx.restore();
  }

  function renderPanel() {
    panel.replaceChildren();

    if (selected < 0) {
      panel.append(make('p', 'hint', 'Click a dot, or search for a level, to see its tags and its most similar levels.'));
      return;
    }

    const level = levels[selected];
    let enjoyment = 'Enjoyment: not rated';
    if (level.edel_enjoyment != null) {
      enjoyment = `Enjoyment: ${level.edel_enjoyment.toFixed(1)}${level.is_edel_pending ? ' (pending)' : ''}`;
    }

    panel.append(
      make('h3', null, level.name),
      make('p', 'panel-meta', `#${level.position}  ·  ${enjoyment}`),
      make('p', 'panel-tags', level.tags.join(', ') || 'No tags'),
      make('h4', null, 'Most similar levels'),
    );

    const list = make('ol', 'similar-list');
    for (const { i, score } of similar) {
      const button = make('button');
      button.type = 'button';
      button.append(
        make('span', null, `#${levels[i].position} ${levels[i].name}`),
        make('span', null, `${(score * 100).toFixed(0)}%`),
      );
      button.addEventListener('click', () => selectLevel(i, true));

      const item = make('li');
      item.append(button);
      list.append(item);
    }
    panel.append(list);

    if (similar.length === 0) {
      panel.append(make('p', 'hint', 'No similar levels with the current tag groups.'));
    }
  }

  function zoomTo(i) {
    const node = nodes[i];
    const target = zoomIdentity
      .translate(width / 2, HEIGHT / 2)
      .scale(Math.max(transform.k, 3))
      .translate(-node.x, -node.y);
    select(canvas).call(zoomBehavior.transform, target);
  }

  // pass -1 to clear the selection
  function selectLevel(i, shouldZoom = false) {
    selected = i;
    similar = [];
    highlighted = new Set();

    if (i >= 0 && active) {
      for (let j = 0; j < levels.length; j++) {
        if (j === i) continue;
        const score = similarity(tagSets[i], tagSets[j]);
        if (score > 0) {
          const gap = Math.abs(levels[i].position - levels[j].position);
          similar.push({ i: j, score, gap });
        }
      }
      // ties go to whichever level is closer in the list
      similar.sort((a, b) => b.score - a.score || a.gap - b.gap);
      similar = similar.slice(0, TOP_SIMILAR);

      highlighted = new Set([i, ...similar.map((s) => s.i)]);
      if (shouldZoom) zoomTo(i);
    }

    renderPanel();
    draw();
  }

  // runs on first load and whenever the tag groups or link count change
  function rebuild() {
    simulation?.stop();
    const groups = checkedGroups(controls);

    if (groups.length === 0) {
      active = false;
      note.textContent = 'Pick at least one tag group.';
      draw();
      return;
    }

    active = true;
    updateNote();
    tagSets = levels.map((level) => new Set(filterTags(level.tags, groups)));
    nodes = levels.map((level) => ({ level })); // d3 adds x/y to these
    edges = nearestNeighbors(levels, { groups, k: Number(kSelect.value) });

    simulation = forceSimulation(nodes)
      .force(
        'link',
        forceLink(edges)
          .distance((e) => 15 + (1 - e.score) * 40)
          .strength((e) => e.score * 0.5),
      )
      .force('charge', forceManyBody().strength(-14).distanceMax(250))
      .force('x', forceX().strength(0.05))
      .force('y', forceY().strength(0.05))
      .alphaDecay(0.03)
      .on('tick', draw);

    // keep the current selection but recompute its matches for the new groups
    selectLevel(selected);
  }

  // index of the node under the mouse, or -1
  function nodeAt(event) {
    if (!active) return -1;
    const rect = canvas.getBoundingClientRect();
    const [x, y] = transform.invert([event.clientX - rect.left, event.clientY - rect.top]);
    const found = simulation.find(x, y, 8 / transform.k);
    return found ? found.index : -1;
  }

  canvas.addEventListener('mousemove', (event) => {
    const i = nodeAt(event);
    canvas.style.cursor = i >= 0 ? 'pointer' : 'grab';

    if (i < 0) {
      tooltip.hidden = true;
    } else {
      const level = levels[i];
      const enjoyment = level.edel_enjoyment == null ? 'unrated' : level.edel_enjoyment.toFixed(1);
      const rect = canvasWrap.getBoundingClientRect();
      // the \n needs white-space: pre-line on .graph-tooltip
      tooltip.textContent = `${level.name}\n#${level.position}  ·  enjoyment ${enjoyment}`;
      tooltip.style.left = `${event.clientX - rect.left + 14}px`;
      tooltip.style.top = `${event.clientY - rect.top + 14}px`;
      tooltip.hidden = false;
    }

    if (i !== hovered) {
      hovered = i;
      draw();
    }
  });

  canvas.addEventListener('mouseleave', () => {
    tooltip.hidden = true;
    if (hovered !== -1) {
      hovered = -1;
      draw();
    }
  });

  canvas.addEventListener('click', (event) => {
    if (active) selectLevel(nodeAt(event));
  });

  resetButton.addEventListener('click', () => {
    select(canvas).call(zoomBehavior.transform, centered);
  });

  controls.addEventListener('change', (event) => {
    if (event.target === search) return;

    // changing colors doesn't need a new layout
    if (event.target === colorSelect) {
      updateColors();
      updateNote();
      draw();
      return;
    }
    rebuild();
  });

  search.addEventListener('change', () => {
    const i = indexByName.get(search.value.trim().toLowerCase());
    if (i !== undefined && active) selectLevel(i, true);
  });

  select(canvas).call(zoomBehavior).call(zoomBehavior.transform, transform);

  updateColors();
  renderPanel();
  rebuild();
}