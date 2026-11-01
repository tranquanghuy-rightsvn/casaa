import { lockScroll, unlockScroll, trapFocus } from './lock.js';

// Small built-in index of the site's pages and sections.
const INDEX = [
  { title: 'Giải pháp công nghệ in 3D chế tác gốm thực tế', desc: 'Gạch ốp tường, gạch lát sàn, lam hoa gió, gốm sứ, tranh phù điêu', url: '/#giai-phap' },
  { title: 'Gạch nung ốp tường', desc: 'Giải pháp in 3D gốm', url: '/#giai-phap' },
  { title: 'Gạch lát sàn đất nung thủ công', desc: 'Giải pháp in 3D gốm', url: '/#giai-phap' },
  { title: 'Lam hoa gió', desc: 'Giải pháp in 3D gốm', url: '/#giai-phap' },
  { title: 'Tranh phù điêu gốm', desc: 'Giải pháp in 3D gốm', url: '/#giai-phap' },
  { title: 'Rạn san hô', desc: 'Giải pháp in 3D gốm', url: '/#giai-phap' },
  { title: 'Sản phẩm', desc: 'Phù điêu, ốp tường, lam hoa gió, đồ decor, rạn san hô', url: '/san-pham/' },
  { title: 'Phù điêu', desc: 'Nghệ thuật từ đất và lửa', url: '/san-pham/#phu-dieu' },
  { title: 'Ốp tường', desc: 'Vẻ đẹp truyền thống trong không gian hiện đại', url: '/san-pham/#op-tuong' },
  { title: 'Lam hoa gió', desc: 'Hơi thở từ thiên nhiên', url: '/san-pham/#lam-hoa-gio' },
  { title: 'Đồ decor', desc: 'Gốm sứ trong không gian sống', url: '/san-pham/#do-decor' },
  { title: 'Rạn san hô', desc: 'Kết cấu gốm in 3D', url: '/san-pham/#ran-san-ho' },
  { title: 'Tài khoản', desc: 'Đăng nhập, đăng ký tài khoản Casa', url: '/tai-khoan/' },
  { title: 'Sơ đồ tiến trình', desc: '5 bước từ câu chuyện đến lắp đặt', url: '/tien-trinh/' },
  { title: 'Câu chuyện', desc: 'Bước 1 – Sơ đồ tiến trình', url: '/tien-trinh/#cau-chuyen' },
  { title: 'Nghiên cứu', desc: 'Bước 2 – Đông xưởng, trung tâm R&D', url: '/tien-trinh/#nghien-cuu' },
  { title: 'Thiết kế', desc: 'Bước 3 – Văn phòng tư vấn thiết kế Nam xưởng', url: '/tien-trinh/#thiet-ke' },
  { title: 'Sản xuất', desc: 'Bước 4 – Tây xưởng, máy in 3D gốm', url: '/tien-trinh/#san-xuat' },
  { title: 'Lắp đặt', desc: 'Bước 5 – Thi công tại công trình', url: '/tien-trinh/#lap-dat' },
  { title: 'Dự án tiêu biểu', desc: 'In 3D gốm, bê tông, gạch tráng men', url: '/#du-an' },
  { title: 'Hệ thống dịch vụ thiết kế và sản xuất', desc: 'Tư vấn thiết kế mẫu độc bản, gia công gạch mẫu in 3D', url: '/#dich-vu' },
  { title: 'Đăng ký tư vấn', desc: 'Để lại thông tin khách hàng', url: '/dich-vu/#lien-he' },
  { title: 'Liên hệ', desc: 'Hotline 0763 161 286, dongxuong@casa-evolution.com', url: '/dich-vu/' },
  { title: 'Casa xin chào', desc: 'Về chúng tôi, tầm nhìn, sứ mệnh, giá trị cốt lõi', url: '/gioi-thieu/' },
  { title: 'Tầm nhìn', desc: 'Casa xin chào', url: '/gioi-thieu/#tam-nhin' },
  { title: 'Sứ mệnh', desc: 'Casa xin chào', url: '/gioi-thieu/#su-menh' },
  { title: 'Giá trị cốt lõi', desc: 'Casa xin chào', url: '/gioi-thieu/#gia-tri' },
];

// Vietnamese-insensitive matching: "lat san" finds "lát sàn".
const fold = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd');
const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export function initSearch() {
  const box = document.querySelector('[data-search]');
  const toggle = document.querySelector('[data-search-toggle]');
  if (!box || !toggle) return;

  const panel = box.querySelector('.search__panel');
  const input = box.querySelector('[data-search-input]');
  const list = box.querySelector('[data-search-results]');
  const form = box.querySelector('[data-search-form]');
  let isOpen = false;
  let active = -1;

  const render = () => {
    const q = fold(input.value.trim());
    const terms = q.split(/\s+/).filter(Boolean);
    const hits = terms.length
      ? INDEX.filter((it) => { const hay = fold(`${it.title} ${it.desc}`); return terms.every((t) => hay.includes(t)); })
      : INDEX.slice(0, 6);
    active = -1;
    list.innerHTML = hits.length
      ? hits.map((it) => `<li><a href="${it.url}"><b>${esc(it.title)}</b><small>${esc(it.desc)}</small></a></li>`).join('')
      : `<li class="search__empty">Không tìm thấy kết quả cho “${esc(input.value.trim())}”. Thử từ khoá khác, ví dụ “gạch lát sàn”.</li>`;
  };

  const setActive = (i) => {
    const items = [...list.querySelectorAll('a')];
    if (!items.length) return;
    active = (i + items.length) % items.length;
    items.forEach((a, k) => a.classList.toggle('is-active', k === active));
    items[active].scrollIntoView({ block: 'nearest' });
  };

  const open = () => {
    if (isOpen) return;
    isOpen = true;
    box.hidden = false;
    lockScroll();
    toggle.setAttribute('aria-expanded', 'true');
    render();
    gsap.fromTo(panel, { yPercent: -100 }, { yPercent: 0, duration: .5, ease: 'expo.out' });
    gsap.fromTo(box.querySelector('.search__backdrop'), { opacity: 0 }, { opacity: 1, duration: .3 });
    requestAnimationFrame(() => input.focus());
  };

  const close = () => {
    if (!isOpen) return;
    isOpen = false;
    toggle.setAttribute('aria-expanded', 'false');
    gsap.to(box.querySelector('.search__backdrop'), { opacity: 0, duration: .25 });
    gsap.to(panel, {
      yPercent: -100, duration: .35, ease: 'power2.in',
      onComplete: () => { box.hidden = true; input.value = ''; unlockScroll(); toggle.focus({ preventScroll: true }); },
    });
  };

  toggle.addEventListener('click', open);
  box.querySelectorAll('[data-search-close]').forEach((el) => el.addEventListener('click', close));
  input.addEventListener('input', render);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive(active + 1); }
    if (e.key === 'ArrowUp') { e.preventDefault(); setActive(active - 1); }
  });
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const items = list.querySelectorAll('a');
    const pick = items[Math.max(active, 0)];
    if (pick) { box.hidden = true; unlockScroll(); location.href = pick.href; }
  });
  list.addEventListener('click', (e) => {
    if (e.target.closest('a')) { box.hidden = true; isOpen = false; unlockScroll(); }
  });
  box.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { e.preventDefault(); close(); }
    trapFocus(box, e);
  });
}
