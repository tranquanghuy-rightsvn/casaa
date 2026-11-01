// Fades [data-reveal] elements in once as they enter the viewport.
export function initReveal(scope = document) {
  const els = [...scope.querySelectorAll('[data-reveal]:not(.is-in)')];
  if (!els.length) return;

  if (!('IntersectionObserver' in window) || matchMedia('(prefers-reduced-motion: reduce)').matches) {
    els.forEach((el) => el.classList.add('is-in'));
    return;
  }

  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-in');
      io.unobserve(entry.target);
    });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });

  els.forEach((el) => {
    // Anything already above the fold (e.g. after a hash jump) shows immediately.
    const r = el.getBoundingClientRect();
    if (r.bottom < 0) el.classList.add('is-in');
    else io.observe(el);
  });
}
