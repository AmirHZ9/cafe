import './styles.css';
import { createLightbox } from './lightbox.js';

const gallery = document.getElementById('gallery');
const panelsWrap = document.querySelector('.panels');
const statusEl = gallery.querySelector('[data-gallery-status]');

/* ---------- Image registry (used by the full-screen viewer) ---------- */

const designs = {};

document.querySelectorAll('.shot').forEach((shot) => {
  const image = shot.querySelector('img');
  const title = shot.querySelector('.shot__title');
  if (!image || !title || !shot.dataset.design) return;

  designs[shot.dataset.design] = {
    title: title.textContent.replace(/\s+/g, ' ').trim(),
    src: image.getAttribute('src'),
    alt: image.alt,
    concept: shot.dataset.shotConcept,
  };
});

const lightbox = createLightbox(designs);

document.addEventListener('click', (event) => {
  const trigger = event.target.closest('[data-open]');
  if (!trigger) return;

  const design = designs[trigger.dataset.open];
  if (!design) return;

  lightbox.open(trigger.dataset.open, trigger);
});

/* ---------- Short fade when the shown content changes ---------- */

let refreshTimer = 0;

function refresh() {
  panelsWrap.classList.remove('is-refreshing');
  void panelsWrap.offsetWidth;
  panelsWrap.classList.add('is-refreshing');

  window.clearTimeout(refreshTimer);
  refreshTimer = window.setTimeout(() => {
    panelsWrap.classList.remove('is-refreshing');
  }, 400);
}

/* ---------- Status message for screen readers ---------- */

const CONCEPT_NAMES = { light: 'روشن و آرام', dark: 'دارک و گرم' };
let announceTimer = 0;

function activePanel() {
  return document.querySelector('[role="tabpanel"]:not([hidden])');
}

function announce({ quiet = false } = {}) {
  if (quiet) return;

  const page = activePanel()?.dataset.page || '';
  const inCompare = gallery.dataset.compare === 'true';

  statusEl.textContent = '';
  window.clearTimeout(announceTimer);
  announceTimer = window.setTimeout(() => {
    statusEl.textContent = inCompare
      ? `نمایش مقایسه‌ای صفحه ${page} در دو سبک روشن و دارک.`
      : `کانسپت ${CONCEPT_NAMES[gallery.dataset.concept]}، صفحه ${page}.`;
  }, 160);
}

/*
 * Images stay lazy so the first paint only pays for the visible screen. As soon as
 * the visitor shows intent (hover, focus or a tab click), the images of the target
 * page start loading early, so the short fade rarely reveals an empty frame.
 */
function warmImages(root = document) {
  if (!root || typeof root.querySelectorAll !== 'function') return;
  root.querySelectorAll('img[loading="lazy"]').forEach((image) => {
    if (image.complete) return;
    image.loading = 'eager';
    image.fetchPriority = 'low';
  });
}

function panelImages(tab) {
  const panel = document.getElementById(tab.getAttribute('aria-controls'));
  return panel ? panel.querySelectorAll('.shot img') : [];
}

function warmOnIntent(element, getImages) {
  const run = () => warmImages({ querySelectorAll: () => getImages() });

  element.addEventListener('pointerenter', run, { once: true });
  element.addEventListener('focus', run, { once: true });
  element.addEventListener('pointerdown', run, { once: true });
}

/* ---------- Concept selector (radio group) ---------- */

const conceptButtons = Array.from(document.querySelectorAll('.concept'));

function setConcept(name, { focus = false } = {}) {
  if (!CONCEPT_NAMES[name]) return;

  gallery.dataset.concept = name;

  conceptButtons.forEach((button) => {
    const isActive = button.dataset.concept === name;
    button.setAttribute('aria-checked', String(isActive));
    button.tabIndex = isActive ? 0 : -1;
    if (focus && isActive) button.focus();
  });
}

conceptButtons.forEach((button) => {
  warmOnIntent(button, () =>
    Array.from(document.querySelectorAll(`.shot[data-shot-concept="${button.dataset.concept}"] img`))
  );

  button.addEventListener('click', () => {
    // Choosing a style is a single-view decision: leave compare mode if needed.
    if (gallery.dataset.compare === 'true') setCompare(false, { silent: true });
    setConcept(button.dataset.concept);
    refresh();
    announce();
  });
});

const conceptGroup = document.querySelector('.concepts');

conceptGroup.addEventListener('keydown', (event) => {
  const index = conceptButtons.indexOf(document.activeElement);
  if (index === -1) return;

  let nextIndex = null;

  // In RTL, the left arrow moves forward.
  if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') {
    nextIndex = (index + 1) % conceptButtons.length;
  } else if (event.key === 'ArrowRight' || event.key === 'ArrowUp') {
    nextIndex = (index - 1 + conceptButtons.length) % conceptButtons.length;
  } else if (event.key === 'Home') {
    nextIndex = 0;
  } else if (event.key === 'End') {
    nextIndex = conceptButtons.length - 1;
  }

  if (nextIndex === null) return;
  event.preventDefault();

  const nextButton = conceptButtons[nextIndex];
  if (gallery.dataset.compare === 'true') setCompare(false, { silent: true });
  setConcept(nextButton.dataset.concept, { focus: true });
  refresh();
  announce();
});

/* ---------- Tabs ---------- */

const tabs = Array.from(document.querySelectorAll('[role="tab"]'));
const tablist = document.querySelector('[role="tablist"]');
let activeTab = tabs.find((tab) => tab.getAttribute('aria-selected') === 'true') || tabs[0];

function activateTab(tab, { focus = false } = {}) {
  if (!tab) return;

  const changed = tab !== activeTab;

  tabs.forEach((item) => {
    const isActive = item === tab;
    item.setAttribute('aria-selected', String(isActive));
    item.tabIndex = isActive ? 0 : -1;

    const panel = document.getElementById(item.getAttribute('aria-controls'));
    if (panel) panel.hidden = !isActive;
  });

  activeTab = tab;
  if (focus) tab.focus();

  if (changed) {
    warmImages(document.getElementById(tab.getAttribute('aria-controls')) || document);
    refresh();
  }
  announce({ quiet: !changed && !focus });
}

tabs.forEach((tab) => {
  tab.addEventListener('click', () => activateTab(tab));
  warmOnIntent(tab, () => panelImages(tab));
});

tablist.addEventListener('keydown', (event) => {
  const index = tabs.indexOf(document.activeElement);
  if (index === -1) return;

  let nextIndex = null;

  // In RTL, the left arrow moves forward.
  if (event.key === 'ArrowLeft') nextIndex = (index + 1) % tabs.length;
  if (event.key === 'ArrowRight') nextIndex = (index - 1 + tabs.length) % tabs.length;
  if (event.key === 'Home') nextIndex = 0;
  if (event.key === 'End') nextIndex = tabs.length - 1;

  if (nextIndex === null) return;
  event.preventDefault();
  activateTab(tabs[nextIndex], { focus: true });
});

/* ---------- Compare mode ---------- */

const compareBtn = document.getElementById('compare-toggle');
const compareLabel = compareBtn.querySelector('[data-compare-label]');

function setCompare(isOn, { silent = false } = {}) {
  gallery.dataset.compare = isOn ? 'true' : 'false';
  compareBtn.setAttribute('aria-pressed', String(isOn));
  compareLabel.textContent = isOn ? 'بازگشت به نمایش تکی' : 'مقایسه دو سبک';

  if (!silent) {
    refresh();
    announce();
  }
}

warmOnIntent(compareBtn, () => {
  const panel = activePanel();
  return panel ? panel.querySelectorAll('.shot img') : [];
});

compareBtn.addEventListener('click', () => {
  setCompare(gallery.dataset.compare !== 'true');
});

/* ---------- Initial state ---------- */

setConcept(gallery.dataset.concept || 'light');

// The initial status is already present in the markup; keep the live region silent on load.
announce({ quiet: true });
