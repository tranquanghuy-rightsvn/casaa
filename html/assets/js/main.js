import { initHeader } from './header.js';
import { initMenu } from './menu.js';
import { initSearch } from './search.js';
import { initReveal } from './reveal.js';

gsap.registerPlugin(ScrollTrigger);
// Mobile browsers resize the viewport when the address bar shows/hides; don't re-measure pins for that.
ScrollTrigger.config({ ignoreMobileResize: true });

const page = document.body.dataset.page;

initHeader();
initMenu(page);
initSearch();
initReveal();

document.querySelectorAll('[data-year]').forEach((el) => { el.textContent = new Date().getFullYear(); });

document.querySelectorAll('[data-to-top]').forEach((a) => {
  a.addEventListener('click', (e) => {
    e.preventDefault();
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
    document.querySelector('.site-header__logo')?.focus({ preventScroll: true });
  });
});

// Smooth scrolling for in-page anchors (CSS scroll-behavior would fight ScrollTrigger's snapping).
document.addEventListener('click', (e) => {
  if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
  const a = e.target.closest('a[href*="#"]');
  if (!a) return;
  const url = new URL(a.href, location.href);
  if (url.origin !== location.origin || url.pathname !== location.pathname || url.search !== location.search || !url.hash) return;
  const target = document.getElementById(decodeURIComponent(url.hash.slice(1)));
  if (!target) return;
  e.preventDefault();
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  history.pushState(null, '', url.hash);
  window.scrollTo({ top: target.getBoundingClientRect().top + window.scrollY, behavior: reduce ? 'instant' : 'smooth' });
});

// Page modules are loaded on demand so each page only runs what it needs.
if (page === 'home') {
  import('./home.js').then((m) => m.initHome());
  import('./projects.js').then((m) => m.initProjects());
}
if (page === 'process') import('./process-page.js').then((m) => m.initProcessPage());
if (page === 'products') import('./products.js').then((m) => m.initProducts());
if (page === 'services') import('./contact-form.js').then((m) => m.initContactForm());
if (page === 'account') import('./account.js').then((m) => m.initAccount());

// Images that load late can change page height; keep pinned sections measured correctly.
window.addEventListener('load', () => ScrollTrigger.refresh());
