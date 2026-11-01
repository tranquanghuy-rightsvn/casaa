// Header: transparent while the page top (hero video / image) sits under it,
// solid once scrolled; hides on scroll down and returns on scroll up.
export function initHeader() {
  const header = document.querySelector('[data-header]');
  if (!header) return;

  const root = document.documentElement;
  const SOLID_AT = 40;
  const HIDE_AFTER = 320;
  let lastY = window.scrollY;
  let ticking = false;

  const update = () => {
    ticking = false;
    const y = Math.max(0, window.scrollY);
    const menuOpen = root.classList.contains('menu-open');

    const forge = document.querySelector('[data-forge]');
    const solidAt = forge ? forge.offsetTop + forge.offsetHeight - header.offsetHeight : SOLID_AT;
    header.classList.toggle('is-solid', y > solidAt);

    if (!menuOpen && !root.classList.contains('is-locked')) {
      const delta = y - lastY;
      if (y < HIDE_AFTER) header.classList.remove('is-hidden');
      else if (delta > 6) header.classList.add('is-hidden');
      else if (delta < -6) header.classList.remove('is-hidden');
    }
    lastY = y;
  };

  window.addEventListener('scroll', () => {
    if (!ticking) { ticking = true; requestAnimationFrame(update); }
  }, { passive: true });

  // Keyboard users tabbing into a hidden header must see it.
  header.addEventListener('focusin', () => header.classList.remove('is-hidden'));

  update();
}
