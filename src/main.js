import './styles.css';
import { createLightbox } from './lightbox.js';

/* Collect the panel data once; the lightbox reuses the same image sources. */
const designs = {};

document.querySelectorAll('[data-panel]').forEach((panel) => {
  const image = panel.querySelector('img');
  const title = panel.querySelector('h3');
  if (!image || !title) return;

  designs[panel.dataset.panel] = {
    title: title.textContent.trim(),
    src: image.getAttribute('src'),
    alt: image.getAttribute('alt') || '',
  };
});

const lightbox = createLightbox(designs);

document.addEventListener('click', (event) => {
  const trigger = event.target.closest('[data-open]');
  if (!trigger) return;

  const designId = trigger.dataset.open;
  if (!designs[designId]) return;

  lightbox.open(designId, trigger);
});

/* Tabs */
const tablist = document.querySelector('[role="tablist"]');
const tabs = tablist ? Array.from(tablist.querySelectorAll('[role="tab"]')) : [];

let activeTab = tabs.find((tab) => tab.getAttribute('aria-selected') === 'true') || tabs[0] || null;

function panelFor(tab) {
  return document.getElementById(tab.getAttribute('aria-controls'));
}

function activateTab(tab, { focus = false } = {}) {
  if (!tab || tab === activeTab) {
    if (tab && focus) tab.focus();
    return;
  }

  tabs.forEach((item) => {
    const isActive = item === tab;
    item.setAttribute('aria-selected', String(isActive));
    item.tabIndex = isActive ? 0 : -1;
    item.classList.toggle('is-active', isActive);

    const panel = panelFor(item);
    if (!panel) return;

    if (isActive) {
      panel.hidden = false;
      panel.classList.remove('is-entering');
      // Restart the short fade even when returning to a previously opened tab.
      void panel.offsetWidth;
      panel.classList.add('is-entering');
    } else {
      panel.hidden = true;
      panel.classList.remove('is-entering');
    }
  });

  activeTab = tab;
  if (focus) tab.focus();
}

tabs.forEach((tab) => {
  tab.addEventListener('click', () => activateTab(tab));
});

if (tablist) {
  tablist.addEventListener('keydown', (event) => {
    const index = tabs.indexOf(document.activeElement);
    if (index === -1) return;

    let nextIndex = null;

    // In RTL layouts the left arrow moves forward and the right arrow moves back.
    if (event.key === 'ArrowLeft') nextIndex = (index + 1) % tabs.length;
    if (event.key === 'ArrowRight') nextIndex = (index - 1 + tabs.length) % tabs.length;
    if (event.key === 'Home') nextIndex = 0;
    if (event.key === 'End') nextIndex = tabs.length - 1;

    if (nextIndex === null) return;
    event.preventDefault();
    activateTab(tabs[nextIndex], { focus: true });
  });
}

/* Drop the entering class once the fade finishes so it can run again later. */
document.querySelectorAll('.panel').forEach((panel) => {
  panel.addEventListener('animationend', (event) => {
    if (event.animationName === 'panel-in') {
      panel.classList.remove('is-entering');
    }
  });
});
