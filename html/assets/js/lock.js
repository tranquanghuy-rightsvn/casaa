// Shared scroll lock that keeps the page from jumping when the scrollbar disappears.
let locks = 0;

export function lockScroll() {
  locks += 1;
  if (locks > 1) return;
  const bar = window.innerWidth - document.documentElement.clientWidth;
  document.documentElement.style.setProperty('--scrollbar', `${bar}px`);
  document.body.style.paddingRight = bar ? `${bar}px` : '';
  document.documentElement.classList.add('is-locked');
}

export function unlockScroll() {
  locks = Math.max(0, locks - 1);
  if (locks) return;
  document.body.style.paddingRight = '';
  document.documentElement.classList.remove('is-locked');
}

// Keeps Tab focus inside an open overlay.
export function trapFocus(container, event) {
  if (event.key !== 'Tab') return;
  const items = [...container.querySelectorAll('a[href], button:not([disabled]), input, [tabindex]:not([tabindex="-1"])')]
    .filter((el) => el.offsetParent !== null || el === document.activeElement);
  if (!items.length) return;
  const first = items[0];
  const last = items[items.length - 1];
  if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
  else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
}
