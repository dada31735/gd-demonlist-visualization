import { TAG_GROUPS } from '../src/tags.js';

export function addGroupToggles(controls, defaultOn) {
  for (const group of Object.keys(TAG_GROUPS)) {
    const label = document.createElement('label');
    const box = document.createElement('input');
    box.type = 'checkbox';
    box.value = group;
    box.dataset.group = group;
    box.checked = defaultOn.has(group);
    label.append(box, group);
    controls.append(label);
  }
}

export function checkedGroups(controls) {
  return [...controls.querySelectorAll('input[data-group]:checked')].map((b) => b.value);
}