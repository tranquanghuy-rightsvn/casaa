// VI / EN switch. Mark a leaf element with data-i18n="key"; the Vietnamese
// text already in the HTML is remembered on first run, so no copy is lost.
// Longer prose is translated by exact text-node matching (i18n-phrases.js).
import { PHRASES } from './i18n-phrases.js';
import { PROJECTS } from './projects-data.js';
import { TITLES_EN, catEn } from './projects-en.js';

const STORAGE = 'casa:lang';

const EN = {
  'nav.home': 'Home',
  'nav.solutions': '3D ceramic solutions',
  'nav.products': 'Products',
  'nav.process': 'Process',
  'nav.projects': 'Featured projects',
  'nav.favorites': 'Favourites',
  'nav.services': 'Design & production services',
  'nav.about': 'About Casa',

  'hero.title1': 'Ceramic Bricks',
  'hero.title2': 'for Architecture',
  'hero.lead': 'Researching, designing and crafting ceramics with 3D printing — from the first sample tile to the building facade.',

  'story.title': 'The Casa⁺ Story',
  'story.sub': 'In Living Spaces',
  'story.lead': 'Traditional values in a modern style',
  'story.cta': 'Discover more',

  'featured.title': '5 Featured Services & Products',
  'featured.title1': '5 Services &',
  'featured.title2': 'Featured Products',
  'featured.all': 'View all',
  'featured.go': 'View details',
  'cta.detail': 'Discover more',
  'cta.contact': 'Contact us',

  'process.title': 'Process',
  'process.lead': 'Five steps from the story of a project to the installed tile. Choose a step to read the details.',

  'projects.title': 'Featured Projects',
  'projects.lead': '3D-printed ceramic, concrete and glazed brick across architecture, interiors and products. Curated from Đông xưởng’s Pinterest board, with the source noted on every image.',
  'projects.more': 'View more',
  'projects.less': 'Collapse',
  'projects.hint': 'Tap the pin icon on any image to save it to your favourites.',

  'services.title': 'Design & Production Services',
  'services.consult': 'Book a consultation',
  'services.sample': 'Get a free sample',
  'services.contact': 'Contact us',

  'footer.explore': 'Explore',
  'footer.contact': 'Contact',
  'footer.follow': 'Follow',
  'footer.rights': 'All rights reserved.',
  'footer.top': 'Back to top',
};

function readLang() {
  try {
    return localStorage.getItem(STORAGE) === 'en' ? 'en' : 'vi';
  } catch {
    return 'vi';
  }
}

function storeLang(lang) {
  try {
    localStorage.setItem(STORAGE, lang);
  } catch {
    /* ignore */
  }
}

const originals = new WeakMap();
const SKIP = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEXTAREA']);

// Walks text nodes and swaps exact matches from PHRASES, keeping the
// original string (and surrounding whitespace) so VI can be restored.
function translateText(lang) {
  if (!document.body) return;
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const parent = node.parentElement;
      if (!parent || SKIP.has(parent.tagName)) return NodeFilter.FILTER_REJECT;
      if (parent.closest('[data-i18n]')) return NodeFilter.FILTER_REJECT;
      if (!node.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    },
  });

  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);

  for (const node of nodes) {
    let original = originals.get(node);
    if (original === undefined) {
      original = node.nodeValue;
      originals.set(node, original);
    }
    const key = original.trim();
    const english = lang === 'en' ? PHRASES[key] : null;
    const next = english
      ? original.replace(key, english)
      : original;
    if (node.nodeValue !== next) node.nodeValue = next;
  }
}

function apply(lang) {
  document.documentElement.lang = lang;

  document.querySelectorAll('[data-i18n]').forEach((el) => {
    if (!el.dataset.vi) el.dataset.vi = el.textContent;
    const vi = el.dataset.vi;
    el.textContent = lang === 'en' ? (EN[el.dataset.i18n] || vi) : vi;
  });

  document.querySelectorAll('[data-lang-btn]').forEach((btn) => {
    btn.setAttribute('aria-pressed', String(btn.dataset.langBtn === lang));
  });
  document.querySelectorAll('[data-lang-flag]').forEach((img) => {
    img.src = lang === 'en' ? '/assets/figma/flag-en.svg' : '/assets/figma/flag-vn.svg';
  });

  translateText(lang);
  relabelPins(lang);

  document.dispatchEvent(new CustomEvent('casa:lang', { detail: { lang } }));
}

// The 34 masonry pins carry their label in static markup; rewrite it from
// PROJECTS so English titles stay index-aligned.
function relabelPins(lang) {
  document.querySelectorAll('.pin[data-index]').forEach((pin) => {
    const index = Number(pin.dataset.index);
    const item = PROJECTS[index];
    const info = pin.querySelector('.pin__info');
    if (!item || !info) return;
    const title = lang === 'en' ? (TITLES_EN[index] || item.title) : item.title;
    const cat = lang === 'en' ? catEn(item.cat) : item.cat;
    info.innerHTML = `${title}<small>${cat}${item.domain ? ` · ${item.domain}` : ''}</small>`;
  });
}

export function initLang() {
  const buttons = [...document.querySelectorAll('[data-lang-btn]')];
  if (!buttons.length) return;

  let lang = readLang();
  if (lang === 'en') apply(lang);

  // The flag opens a small list with both languages; picking one closes it.
  const closeAll = () => document.querySelectorAll('[data-lang-switch]').forEach((box) => {
    box.querySelector('.lang-switch__list').hidden = true;
    box.querySelector('[data-lang-toggle]').setAttribute('aria-expanded', 'false');
  });
  document.querySelectorAll('[data-lang-toggle]').forEach((toggle) => {
    toggle.addEventListener('click', (e) => {
      e.stopPropagation();
      const list = toggle.parentElement.querySelector('.lang-switch__list');
      const open = list.hidden;
      closeAll();
      list.hidden = !open;
      toggle.setAttribute('aria-expanded', String(open));
    });
  });
  document.addEventListener('click', closeAll);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeAll(); });

  buttons.forEach((btn) => {
    btn.addEventListener('click', () => {
      lang = btn.dataset.langBtn === 'en' ? 'en' : 'vi';
      storeLang(lang);
      apply(lang);
      closeAll();
    });
  });
}

export function currentLang() {
  return readLang();
}
