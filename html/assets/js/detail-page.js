// Scroll-spy for the sticky table of contents on the solution detail page.
export function initDetailPage() {
  const nav = document.querySelector('[data-detail-nav]');
  if (!nav) return;

  const links = [...nav.querySelectorAll('a[href^="#"]')];
  const pairs = links
    .map((link) => ({ link, section: document.getElementById(link.hash.slice(1)) }))
    .filter((p) => p.section);
  if (!pairs.length) return;

  const setActive = (id) => {
    links.forEach((l) => l.classList.toggle('is-active', l.hash === `#${id}`));
  };

  const onScroll = () => {
    const line = window.scrollY + window.innerHeight * 0.32;
    let current = pairs[0];
    for (const p of pairs) {
      if (p.section.offsetTop <= line) current = p;
    }
    setActive(current.section.id);
  };

  let frame = 0;
  const schedule = () => {
    if (frame) return;
    frame = requestAnimationFrame(() => {
      frame = 0;
      onScroll();
    });
  };

  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', schedule);
  onScroll();

  links.forEach((link) => {
    link.addEventListener('click', () => setActive(link.hash.slice(1)));
  });
}
