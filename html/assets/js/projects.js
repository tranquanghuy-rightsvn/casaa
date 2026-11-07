import { currentLang, t } from './lang.js';
import { TITLES_EN, catEn } from './projects-en.js';
import { PROJECTS } from './projects-data.js';
import { initReveal } from './reveal.js';
import { lockScroll, unlockScroll } from './lock.js';
import { isFavorite, toggleFavorite, onFavoritesChange } from './favorites.js';

export function initProjects() {
  const list = document.querySelector('[data-projects]');
  if (!list) return;

  // The pins are already in the HTML (built by the prerenderProjects plugin);
  // this module only binds the lightbox and the expand/collapse toggle.
  const pins = [...list.querySelectorAll('.pin')];
  if (!pins.length) return;
  const items = pins.map((btn) => PROJECTS[Number(btn.dataset.index)]);

  initReveal(list);

  const collapse = document.querySelector('[data-projects-collapse]');
  const toggleBtn = document.querySelector('[data-projects-toggle]');
  if (collapse && toggleBtn) {
    toggleBtn.addEventListener('click', () => {
      const isCollapsed = collapse.classList.toggle('is-collapsed');
      toggleBtn.setAttribute('aria-expanded', String(!isCollapsed));
      toggleBtn.textContent = isCollapsed ? t('Xem thêm', 'View more') : t('Thu gọn', 'Collapse');
      if (isCollapsed) {
        const sec = document.getElementById('du-an');
        if (sec && sec.getBoundingClientRect().top < -120) {
          const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
          sec.scrollIntoView({ behavior: reduce ? 'instant' : 'smooth', block: 'start' });
        }
      }
    });
  }

  initLightbox(items, list);
}

function initLightbox(items, list) {
  const dlg = document.querySelector('[data-lightbox]');
  if (!dlg || typeof dlg.showModal !== 'function') return;

  const img = dlg.querySelector('[data-lb-img]');
  const cat = dlg.querySelector('[data-lb-cat]');
  const title = dlg.querySelector('[data-lb-title]');
  const note = dlg.querySelector('[data-lb-note]');
  const link = dlg.querySelector('[data-lb-link]');
  const pin = dlg.querySelector('[data-lb-pin]');
  const count = dlg.querySelector('[data-lb-count]');
  const favBtn = dlg.querySelector('[data-lb-fav]');
  const favLabel = dlg.querySelector('[data-lb-fav-label]');
  const figure = dlg.querySelector('.lightbox__figure');
  const reduce = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  let index = 0;
  let projectIndex = 0;
  let opener = null;

  const paintFav = () => {
    if (!favBtn) return;
    const on = isFavorite(projectIndex);
    favBtn.classList.toggle('is-on', on);
    favBtn.setAttribute('aria-pressed', String(on));
    favBtn.setAttribute('aria-label', on ? t('Bỏ yêu thích dự án này', 'Remove this project from favourites') : t('Lưu dự án này vào thư viện yêu thích', 'Save this project to favourites'));
    if (favLabel) favLabel.textContent = on ? t('Đã lưu vào thư viện yêu thích', 'Saved to favourites') : t('Lưu vào thư viện yêu thích', 'Save to favourites library');
  };

  const fill = (i) => {
    index = (i + items.length) % items.length;
    const p = items[index];
    projectIndex = PROJECTS.indexOf(p);
    img.src = p.img;
    img.width = p.w;
    img.height = p.h;
    const en = currentLang() === 'en';
    const name = en ? (TITLES_EN[projectIndex] || p.title) : p.title;
    img.alt = name;
    cat.textContent = en ? catEn(p.cat) : p.cat;
    title.textContent = name;
    note.textContent = p.note ? `${t('Nguồn', 'Source')}: ${p.note}` : '';
    link.hidden = !p.link;
    if (p.link) { link.href = p.link; link.textContent = p.domain ? `${t('Xem nguồn gốc', 'View source')} (${p.domain})` : t('Xem nguồn gốc', 'View source'); }
    pin.href = p.pin;
    count.textContent = `${index + 1} / ${items.length}`;
    paintFav();
  };

  const show = (i, dir = 0) => {
    if (reduce() || !dir) { fill(i); return; }
    gsap.to(figure, {
      opacity: 0, x: -24 * dir, duration: .18, ease: 'power1.in',
      onComplete: () => {
        fill(i);
        gsap.fromTo(figure, { opacity: 0, x: 24 * dir }, { opacity: 1, x: 0, duration: .35, ease: 'power3.out' });
      },
    });
  };

  const open = (i, from) => {
    opener = from;
    fill(i);
    dlg.showModal();
    lockScroll();
    if (!reduce()) gsap.fromTo(figure, { opacity: 0, scale: .96 }, { opacity: 1, scale: 1, duration: .45, ease: 'power3.out' });
  };

  const close = () => {
    const done = () => { dlg.close(); unlockScroll(); opener?.focus({ preventScroll: true }); };
    if (reduce()) return done();
    gsap.to(figure, { opacity: 0, scale: .97, duration: .2, ease: 'power1.in', onComplete: () => { gsap.set(figure, { clearProps: 'all' }); done(); } });
  };

  list.addEventListener('click', (e) => {
    const btn = e.target.closest('.pin');
    if (btn) open(Number(btn.dataset.index), btn);
  });
  dlg.querySelector('[data-lb-close]').addEventListener('click', close);
  dlg.querySelector('[data-lb-prev]').addEventListener('click', () => show(index - 1, -1));
  dlg.querySelector('[data-lb-next]').addEventListener('click', () => show(index + 1, 1));
  favBtn?.addEventListener('click', () => { toggleFavorite(projectIndex); paintFav(); });
  onFavoritesChange(paintFav);
  dlg.addEventListener('cancel', (e) => { e.preventDefault(); close(); }); // Esc
  dlg.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') { e.preventDefault(); show(index - 1, -1); }
    if (e.key === 'ArrowRight') { e.preventDefault(); show(index + 1, 1); }
  });
  // Click on the dark area (outside the content) closes.
  dlg.addEventListener('click', (e) => {
    if (e.target === dlg || e.target.classList.contains('lightbox__inner')) close();
  });

  // Swipe left/right on touch screens.
  let x0 = null;
  dlg.addEventListener('touchstart', (e) => { x0 = e.touches[0].clientX; }, { passive: true });
  dlg.addEventListener('touchend', (e) => {
    if (x0 === null) return;
    const dx = e.changedTouches[0].clientX - x0;
    x0 = null;
    if (Math.abs(dx) > 50) show(index + (dx < 0 ? 1 : -1), dx < 0 ? 1 : -1);
  }, { passive: true });
}
