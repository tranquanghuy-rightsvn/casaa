import { lockScroll, unlockScroll, trapFocus } from './lock.js';

const reduceMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

export function initMenu(page) {
  const menu = document.querySelector('[data-menu]');
  const toggle = document.querySelector('[data-menu-toggle]');
  if (!menu || !toggle) return;

  const root = document.documentElement;
  const bg = menu.querySelector('[data-menu-bg]');
  const links = [...menu.querySelectorAll('.menu__nav a')];
  const aside = menu.querySelector('.menu__aside');
  let isOpen = false;
  let tl = null;

  // Mark the current page in the menu.
  const current = { home: 'home', products: 'products', process: 'process', about: 'about', services: 'services', account: 'account' }[page];
  document.querySelectorAll('[data-nav]').forEach((a) => { if (a.dataset.nav === current) a.setAttribute('aria-current', 'page'); });

  const open = () => {
    if (isOpen) return;
    isOpen = true;
    tl?.kill();
    menu.hidden = false;
    root.classList.add('menu-open');
    lockScroll();
    toggle.setAttribute('aria-expanded', 'true');
    toggle.setAttribute('aria-label', 'Đóng menu');

    if (reduceMotion()) {
      gsap.set(bg, { clipPath: 'inset(0 0 0% 0)' });
      gsap.set([links, aside], { clearProps: 'all' });
    } else {
      tl = gsap.timeline()
        .fromTo(bg, { clipPath: 'inset(0 0 100% 0)' }, { clipPath: 'inset(0 0 0% 0)', duration: .7, ease: 'expo.inOut' })
        .fromTo(links, { yPercent: 110 }, { yPercent: 0, duration: .8, ease: 'expo.out', stagger: .06 }, '-=.3')
        .fromTo(aside, { autoAlpha: 0, y: 16 }, { autoAlpha: 1, y: 0, duration: .6, ease: 'power2.out' }, '-=.6');
    }
    links[0]?.focus({ preventScroll: true });
  };

  const close = ({ returnFocus = true } = {}) => new Promise((resolve) => {
    if (!isOpen) return resolve();
    isOpen = false;
    tl?.kill();
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-label', 'Mở menu');

    const finish = () => {
      menu.hidden = true;
      root.classList.remove('menu-open');
      unlockScroll();
      if (returnFocus) toggle.focus({ preventScroll: true });
      resolve();
    };

    if (reduceMotion()) return finish();
    tl = gsap.timeline({ onComplete: finish })
      .to([aside, ...links.slice().reverse()], { autoAlpha: 0, y: -10, duration: .25, ease: 'power1.in', stagger: .02 })
      .to(bg, { clipPath: 'inset(0 0 100% 0)', duration: .55, ease: 'expo.inOut' }, '-=.1')
      .set([aside, links], { clearProps: 'opacity,visibility,transform' });
  });

  toggle.addEventListener('click', () => (isOpen ? close() : open()));

  menu.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { e.preventDefault(); close(); }
  });
  // The toggle lives in the header (outside the menu) so include it in the focus loop.
  document.addEventListener('keydown', (e) => {
    if (!isOpen) return;
    if (e.key === 'Escape') { e.preventDefault(); close(); return; }
    const wrap = { querySelectorAll: (s) => [toggle, ...menu.querySelectorAll(s)] };
    trapFocus(wrap, e);
  });

  // Same-page anchors (e.g. "/#du-an" on the home page): close first, then scroll.
  menu.addEventListener('click', (e) => {
    const a = e.target.closest('a[href]');
    if (!a) return;
    const url = new URL(a.href, location.href);
    const samePage = url.pathname.replace(/index\.html$/, '') === location.pathname.replace(/index\.html$/, '');
    if (samePage && url.hash) {
      e.preventDefault();
      close({ returnFocus: false }).then(() => {
        const target = document.querySelector(url.hash);
        if (!target) return;
        history.pushState(null, '', url.hash);
        target.scrollIntoView({ behavior: reduceMotion() ? 'auto' : 'smooth', block: 'start' });
      });
    } else if (samePage && !url.hash) {
      e.preventDefault();
      close({ returnFocus: false }).then(() => window.scrollTo({ top: 0, behavior: reduceMotion() ? 'auto' : 'smooth' }));
    }
  });

  // Closing on resize across the desktop/mobile boundary avoids stale layouts.
  window.addEventListener('pageshow', () => { if (isOpen) close({ returnFocus: false }); });
}
