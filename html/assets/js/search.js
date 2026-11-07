import { lockScroll, unlockScroll, trapFocus } from './lock.js';
import { currentLang, localPath } from './lang.js';

// Small built-in index of the site's pages and sections.
const INDEX = [
  { title: 'Giải pháp công nghệ in 3D chế tác gốm thực tế', desc: 'Lam che nắng, gạch ốp chuyển màu, gạch phù điêu, artwork, rạn san hô', url: '/giai-phap/', en: ['3D printing solutions for real-world ceramics', 'Sun louvers, gradient-glaze tiles, relief tiles, artwork, coral reef'] },
  { title: 'Lam che nắng gốm 3D', desc: 'Giải nhiệt mặt tiền bằng cấu trúc biết thở', url: '/san-pham/lam-che-nang/', en: ['3D-printed ceramic sun louvers', 'Cooling facades with a breathing structure'] },
  { title: 'Gạch ốp chuyển màu', desc: 'Vũ điệu men chảy 1200°C', url: '/san-pham/gach-op-chuyen-mau/', en: ['Gradient-glaze cladding tiles', 'The dance of glaze flowing at 1200°C'] },
  { title: 'Gạch phù điêu in 3D', desc: 'Kiến tạo chiều sâu bóng đổ', url: '/san-pham/gach-phu-dieu/', en: ['3D-printed relief tiles', 'Creating depth and shadow'] },
  { title: 'Artwork & đồ decor gốm', desc: 'Điêu khắc nội thất, cảnh quan', url: '/san-pham/artwork-decor/', en: ['Ceramic artwork & decor', 'Interior and landscape sculpture'] },
  { title: 'Rạn san hô in 3D', desc: 'Giá thể đất nung xốp', url: '/san-pham/ran-san-ho/', en: ['3D-printed coral reef', 'Porous terracotta substrate'] },
  { title: 'Sản phẩm', desc: 'Phù điêu, ốp tường, lam hoa gió, đồ decor, rạn san hô', url: '/san-pham/', en: ['Products', 'Relief, wall cladding, breeze blocks, decor, coral reef'] },
  { title: 'Phù điêu', desc: 'Nghệ thuật từ đất và lửa', url: '/san-pham/#phu-dieu', en: ['Relief art', 'Art from earth and fire'] },
  { title: 'Ốp tường', desc: 'Vẻ đẹp truyền thống trong không gian hiện đại', url: '/san-pham/#op-tuong', en: ['Wall cladding', 'Traditional beauty in modern spaces'] },
  { title: 'Lam hoa gió', desc: 'Hơi thở từ thiên nhiên', url: '/san-pham/#lam-hoa-gio', en: ['Breeze blocks', 'A breath of nature'] },
  { title: 'Đồ decor', desc: 'Gốm sứ trong không gian sống', url: '/san-pham/#do-decor', en: ['Decor', 'Ceramics in living spaces'] },
  { title: 'Rạn san hô', desc: 'Kết cấu gốm in 3D', url: '/san-pham/#ran-san-ho', en: ['Coral reef', '3D-printed ceramic structures'] },
  { title: 'Tài khoản', desc: 'Đăng nhập, đăng ký tài khoản Casa', url: '/tai-khoan/', en: ['Account', 'Sign in or create a Casa account'] },
  { title: 'Sơ đồ tiến trình', desc: '5 bước từ câu chuyện đến lắp đặt', url: '/tien-trinh/', en: ['Process', '5 steps from story to installation'] },
  { title: 'Câu chuyện', desc: 'Bước 1 – Sơ đồ tiến trình', url: '/tien-trinh/#cau-chuyen', en: ['Story', 'Step 1 – Process'] },
  { title: 'Nghiên cứu', desc: 'Bước 2 – Đông xưởng, trung tâm R&D', url: '/tien-trinh/#nghien-cuu', en: ['Research', 'Step 2 – Đông xưởng R&D centre'] },
  { title: 'Thiết kế', desc: 'Bước 3 – Văn phòng tư vấn thiết kế Nam xưởng', url: '/tien-trinh/#thiet-ke', en: ['Design', 'Step 3 – Nam xưởng design consultancy'] },
  { title: 'Sản xuất', desc: 'Bước 4 – Tây xưởng, máy in 3D gốm', url: '/tien-trinh/#san-xuat', en: ['Production', 'Step 4 – Tây xưởng, ceramic 3D printers'] },
  { title: 'Lắp đặt', desc: 'Bước 5 – Thi công tại công trình', url: '/tien-trinh/#lap-dat', en: ['Installation', 'Step 5 – On-site installation'] },
  { title: 'Dự án tiêu biểu', desc: 'In 3D gốm, bê tông, gạch tráng men', url: '/#du-an', en: ['Featured projects', '3D-printed ceramic, concrete, glazed brick'] },
  { title: 'Hệ thống dịch vụ thiết kế và sản xuất', desc: 'Tư vấn thiết kế mẫu độc bản, gia công gạch mẫu in 3D', url: '/#dich-vu', en: ['Design & production services', 'Bespoke design consultation, 3D-printed sample tiles'] },
  { title: 'Đăng ký tư vấn', desc: 'Để lại thông tin khách hàng', url: '/dich-vu/#lien-he', en: ['Request a consultation', 'Leave your contact details'] },
  { title: 'Liên hệ', desc: 'Hotline 0763 161 286, dongxuong@casa-evolution.com', url: '/dich-vu/', en: ['Contact', 'Hotline +84 763 161 286, dongxuong@casa-evolution.com'] },
  { title: 'Casa xin chào', desc: 'Về chúng tôi, tầm nhìn, sứ mệnh, giá trị cốt lõi', url: '/gioi-thieu/', en: ['About Casa', 'About us, vision, mission, core values'] },
  { title: 'Tầm nhìn', desc: 'Casa xin chào', url: '/gioi-thieu/#tam-nhin', en: ['Vision', 'About Casa'] },
  { title: 'Sứ mệnh', desc: 'Casa xin chào', url: '/gioi-thieu/#su-menh', en: ['Mission', 'About Casa'] },
  { title: 'Giá trị cốt lõi', desc: 'Casa xin chào', url: '/gioi-thieu/#gia-tri', en: ['Core values', 'About Casa'] },
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

  // Trang tiếng Anh: tiêu đề/mô tả tiếng Anh, link trỏ về bản /en/ của trang.
  const en = currentLang() === 'en';
  const items = INDEX.map((it) => (en
    ? { title: it.en[0], desc: it.en[1], url: localPath(it.url) }
    : it));

  const render = () => {
    const q = fold(input.value.trim());
    const terms = q.split(/\s+/).filter(Boolean);
    const hits = terms.length
      ? items.filter((it) => { const hay = fold(`${it.title} ${it.desc}`); return terms.every((t) => hay.includes(t)); })
      : items.slice(0, 6);
    active = -1;
    list.innerHTML = hits.length
      ? hits.map((it) => `<li><a href="${it.url}"><b>${esc(it.title)}</b><small>${esc(it.desc)}</small></a></li>`).join('')
      : (en
        ? `<li class="search__empty">No results for “${esc(input.value.trim())}”. Try another keyword, e.g. “relief tiles”.</li>`
        : `<li class="search__empty">Không tìm thấy kết quả cho “${esc(input.value.trim())}”. Thử từ khoá khác, ví dụ “gạch lát sàn”.</li>`);
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
