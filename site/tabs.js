export function setupTabs(mounters) {
  const buttons = [...document.querySelectorAll('[role="tab"]')];
  const mounted = new Set();

  function show(name) {
    if (!(name in mounters)) name = 'classic';

    for (const button of buttons) {
      const on = button.dataset.tab === name;
      button.setAttribute('aria-selected', String(on));
      document.getElementById(`tab-${button.dataset.tab}`).hidden = !on;
    }

    if (!mounted.has(name)) {
      mounted.add(name);
      mounters[name]();
    }
  }

  for (const button of buttons) {
    button.addEventListener('click', () => {
      location.hash = button.dataset.tab;
    });
  }

  window.addEventListener('hashchange', () => show(location.hash.slice(1)));
  show(location.hash.slice(1));
}