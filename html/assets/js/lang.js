// Ngôn ngữ: mỗi trang có 2 bản TĨNH — tiếng Việt ở /x/, tiếng Anh ở /en/<slug-tiếng-Anh>/ (routes.js, html/en/**,
// sinh lần đầu bởi scripts/build_en.py, sau đó sửa qua CMS). Không dịch bằng JS nữa.
// Ngôn ngữ hiện tại = <html lang>. Nút cờ chỉ chuyển sang URL bản kia của cùng trang.
import { EN_ROUTES, VI_ROUTES } from './routes.js';

export function currentLang() {
  return document.documentElement.lang === 'en' ? 'en' : 'vi';
}

const withSlash = (p) => (p.endsWith('/') ? p : p + '/');

/** Đường dẫn "/x/" (tiếng Việt) -> bản ngôn ngữ `lang` theo routes.js; giữ ?query và #hash. */
export function routeFor(href, lang) {
  const m = /^([^?#]*)(.*)$/.exec(href);
  const path = withSlash(m[1] || '/');
  const vi = VI_ROUTES[path] || (EN_ROUTES[path] ? path : null);
  if (!vi) return href; // không có trong bảng (vd /404.html) -> giữ nguyên
  return (lang === 'en' ? EN_ROUTES[vi] : vi) + m[2];
}

/** URL bản ngôn ngữ `lang` của trang hiện tại. */
export function langUrl(lang, loc = location) {
  return routeFor(loc.pathname + loc.search + loc.hash, lang);
}

/** Link nội bộ "/x/" theo ngôn ngữ trang hiện tại (cho chữ/link do JS sinh ra). */
export function localPath(path) {
  return path.startsWith('/') ? routeFor(path, currentLang()) : path;
}

export function initLang() {
  const boxes = [...document.querySelectorAll('[data-lang-switch]')];
  if (!boxes.length) return;

  // Cờ mở danh sách 2 ngôn ngữ; chọn ngôn ngữ khác thì chuyển trang.
  const closeAll = () => boxes.forEach((box) => {
    box.querySelector('.lang-switch__list').hidden = true;
    box.querySelector('[data-lang-toggle]').setAttribute('aria-expanded', 'false');
  });
  boxes.forEach((box) => {
    const toggle = box.querySelector('[data-lang-toggle]');
    toggle.addEventListener('click', (e) => {
      e.stopPropagation();
      const list = box.querySelector('.lang-switch__list');
      const open = list.hidden;
      closeAll();
      list.hidden = !open;
      toggle.setAttribute('aria-expanded', String(open));
    });
  });
  document.addEventListener('click', closeAll);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeAll(); });

  const now = currentLang();
  document.querySelectorAll('[data-lang-btn]').forEach((btn) => {
    const lang = btn.dataset.langBtn === 'en' ? 'en' : 'vi';
    btn.setAttribute('aria-pressed', String(lang === now));
    btn.addEventListener('click', () => {
      closeAll();
      if (lang === now) return;
      // Trong CMS (iframe soạn trực quan) không rời trang — đổi ngôn ngữ bằng nút VI/EN của CMS.
      if (document.documentElement.classList.contains('cms-mode')) return;
      location.href = langUrl(lang);
    });
  });
}

/** Chọn chuỗi theo ngôn ngữ trang: t('Tiếng Việt', 'English'). */
export function t(vi, en) {
  return currentLang() === 'en' ? en : vi;
}
