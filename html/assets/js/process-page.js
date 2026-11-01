// Tiến trình page: arriving with #cau-chuyen / #nghien-cuu / … lands on that step
// (below the fixed header and sticky step bar) and briefly highlights it.
export function initProcessPage() {
  const stepnav = document.querySelector('[data-stepnav]');
  const links = stepnav ? [...stepnav.querySelectorAll('a[href^="#"]')] : [];
  const steps = [...document.querySelectorAll('[data-step]')];
  const reduce = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

  const offset = () => {
    const bar = document.querySelector('.site-header__bar')?.offsetHeight || 52;
    const nav = stepnav?.offsetHeight || 0;
    return bar + nav + 16;
  };

  const setActive = (id) => {
    links.forEach((a) => {
      const on = a.getAttribute('href') === `#${id}`;
      a.classList.toggle('is-active', on);
      if (on) {
        a.setAttribute('aria-current', 'step');
        // Keep the active chip visible in the horizontal bar without moving the page.
        const list = a.parentElement.parentElement;
        const left = a.offsetLeft - (list.clientWidth - a.offsetWidth) / 2;
        list.scrollTo({ left, behavior: reduce() ? 'instant' : 'smooth' });
      } else {
        a.removeAttribute('aria-current');
      }
    });
  };

  const highlight = (el) => {
    el.classList.remove('is-target');
    void el.offsetWidth; // restart the animation
    el.classList.add('is-target');
    el.querySelectorAll('[data-reveal]').forEach((r) => r.classList.add('is-in'));
  };

  const goTo = (id, smooth) => {
    const el = document.getElementById(id);
    if (!el) return;
    const top = el.getBoundingClientRect().top + window.scrollY - offset();
    window.scrollTo({ top: Math.max(0, top), behavior: smooth && !reduce() ? 'smooth' : 'instant' });
    setActive(id);
    highlight(el);
    // Move focus to the heading for keyboard and screen-reader users.
    const h = el.querySelector('h2');
    if (h) { h.setAttribute('tabindex', '-1'); h.focus({ preventScroll: true }); }
  };

  // In-page chips.
  links.forEach((a) => a.addEventListener('click', (e) => {
    e.preventDefault();
    const id = a.getAttribute('href').slice(1);
    history.pushState(null, '', `#${id}`);
    goTo(id, true);
  }));

  // Arriving from the home page cards.
  const initial = decodeURIComponent(location.hash.slice(1));
  if (initial && document.getElementById(initial)) {
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
    // Jump now, then again once fonts/images settle so the position is exact.
    goTo(initial, false);
    const settle = () => requestAnimationFrame(() => {
      const el = document.getElementById(initial);
      const delta = el.getBoundingClientRect().top - offset();
      if (Math.abs(delta) > 2) window.scrollTo({ top: window.scrollY + delta, behavior: 'instant' });
    });
    document.fonts?.ready.then(settle);
    window.addEventListener('load', settle, { once: true });
  } else if (steps[0]) {
    setActive(steps[0].id);
  }

  window.addEventListener('popstate', () => {
    const id = location.hash.slice(1);
    if (id) goTo(id, true);
  });

  // Highlight the chip of the step currently in view.
  if ('IntersectionObserver' in window && steps.length) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => { if (en.isIntersecting) setActive(en.target.id); });
    }, { rootMargin: '-45% 0px -50% 0px' });
    steps.forEach((s) => io.observe(s));
  }
}
