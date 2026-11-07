// Cầu nối soạn trực quan cho CMS (GAS). KHÔNG làm gì với khách truy cập bình thường —
// main.js chỉ nạp file này khi trang nằm trong iframe của CMS và có ?cms=1.
// Bắt sửa chữ (contenteditable) / đổi ảnh trên các mốc data-cms-t / data-cms-h / data-cms-img
// (gắn bởi scripts/cms_tag.py), gửi thay đổi ra cửa sổ cha bằng postMessage. Không tự lưu gì
// ở đây — lưu thật diễn ra ở GAS (commit lên GitHub).
const SOURCE = 'casa-cms';

function post(msg) {
  window.parent.postMessage({ source: SOURCE, ...msg }, '*');
}

function injectStyle() {
  const style = document.createElement('style');
  style.textContent = `
    html.cms-mode [data-reveal] { opacity: 1 !important; transform: none !important; }
    .cms-editable { outline: 1px dashed transparent; outline-offset: 2px; cursor: text; transition: outline-color .15s; }
    .cms-editable:hover { outline-color: rgba(214, 40, 40, .9); }
    .cms-editing { outline: 2px solid #d62828 !important; }
    .cms-dirty { outline: 2px dashed #f59e0b !important; }
    .cms-img-wrap { position: relative; }
    .cms-img-btn {
      position: absolute; z-index: 30; display: none; transform: translate(-50%, -50%);
      background: #d62828; color: #fff; border: 0; border-radius: 6px; padding: 8px 14px;
      font: 600 13px/1 -apple-system, Arial, sans-serif; cursor: pointer; box-shadow: 0 4px 14px rgba(0,0,0,.35);
    }
    .cms-img-btn.is-on { display: block; }
    .cms-img-target { outline: 2px solid #d62828 !important; outline-offset: -2px; }
  `;
  document.head.appendChild(style);
}

// ----- Chữ -----

function insertPlain(text) {
  document.execCommand('insertText', false, text);
}

// HTML "sạch" của mốc data-cms-h: bỏ những gì JS của trang tự gắn lúc chạy (GSAP style,
// data-vi của lang.js, class cms-*) — không để chúng lọt vào file khi lưu.
function cleanHtml(el) {
  const clone = el.cloneNode(true);
  clone.querySelectorAll('*').forEach((n) => {
    ['style', 'data-vi', 'contenteditable', 'spellcheck'].forEach((a) => n.removeAttribute(a));
    [...n.classList].filter((c) => c.startsWith('cms-')).forEach((c) => n.classList.remove(c));
    if (n.hasAttribute('class') && !n.getAttribute('class').trim()) n.removeAttribute('class');
  });
  return clone.innerHTML;
}

// Dấu vân tay nội dung người dùng có thể đổi: chữ + số lần xuống dòng (Shift+Enter).
// Không so innerHTML thô vì JS của trang (GSAP, lang.js, bộ đếm) tự đổi nó.
function fingerprint(el) {
  return el.textContent.replace(/\s+/g, ' ').trim() + '|' + el.querySelectorAll('br').length;
}

function markText(el, mode, key) {
  const original = fingerprint(el);
  let dirty = false;   // đang nằm trong danh sách chờ lưu
  let typed = false;   // có gõ/dán/xoá thật trong lần sửa này
  el.classList.add('cms-editable');
  el.setAttribute('contenteditable', 'true');
  el.spellcheck = false;

  el.addEventListener('focus', () => { typed = false; el.classList.add('cms-editing'); });
  el.addEventListener('input', () => { typed = true; });
  el.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    if (mode === 'h' && e.shiftKey) document.execCommand('insertLineBreak');
  });
  // Dán luôn ở dạng chữ thuần — không mang định dạng/HTML lạ từ Word, web khác vào trang.
  el.addEventListener('paste', (e) => {
    e.preventDefault();
    insertPlain((e.clipboardData || window.clipboardData).getData('text/plain').replace(/\s*\n\s*/g, ' '));
  });
  el.addEventListener('drop', (e) => e.preventDefault());
  el.addEventListener('blur', () => {
    el.classList.remove('cms-editing');
    // Chỉ bấm vào rồi bấm ra (không gõ gì) -> không phải thay đổi.
    if (!typed) return;
    typed = false;
    // Sửa rồi trả lại y như cũ -> bỏ khỏi danh sách chờ.
    if (fingerprint(el) === original) {
      if (dirty) { dirty = false; el.classList.remove('cms-dirty'); post({ type: 'text-clear', key }); }
      return;
    }
    dirty = true;
    el.classList.add('cms-dirty');
    post({ type: 'text', key, mode, value: mode === 't' ? el.textContent : cleanHtml(el) });
  });
}

// ----- Ảnh -----

function compressImage(file, keepPng) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const maxSide = 1920;
      const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      if (keepPng) return resolve({ dataUrl: canvas.toDataURL('image/png'), ext: 'png', w: canvas.width, h: canvas.height });
      let dataUrl = canvas.toDataURL('image/webp', 0.82);
      let ext = 'webp';
      if (!dataUrl.startsWith('data:image/webp')) { dataUrl = canvas.toDataURL('image/jpeg', 0.85); ext = 'jpg'; }
      resolve({ dataUrl, ext, w: canvas.width, h: canvas.height });
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Không đọc được ảnh')); };
    img.src = url;
  });
}

function initImages() {
  const imgs = [...document.querySelectorAll('img[data-cms-img]')];
  if (!imgs.length) return;

  // Một nút "Đổi ảnh" dùng chung, đặt giữa ảnh đang rê chuột (ảnh có thể nằm dưới lớp phủ
  // chữ/gradient nên không gắn overlay vào từng ảnh).
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'cms-img-btn';
  btn.textContent = 'Đổi ảnh';
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  input.hidden = true;
  document.body.append(btn, input);
  let current = null;
  let hideTimer = 0;

  const place = (img) => {
    const r = img.getBoundingClientRect();
    if (r.width < 24 || r.height < 24) return;
    current?.classList.remove('cms-img-target');
    current = img;
    img.classList.add('cms-img-target');
    btn.style.left = `${r.left + r.width / 2 + window.scrollX}px`;
    btn.style.top = `${r.top + r.height / 2 + window.scrollY}px`;
    btn.classList.add('is-on');
  };
  const hide = () => {
    hideTimer = setTimeout(() => {
      btn.classList.remove('is-on');
      current?.classList.remove('cms-img-target');
      current = null;
    }, 250);
  };

  // Ảnh hay bị lớp chữ/khung đè lên: tìm ảnh nằm dưới con trỏ theo toạ độ thay vì mouseover.
  document.addEventListener('mousemove', (e) => {
    if (e.target === btn) { clearTimeout(hideTimer); return; }
    const hit = document.elementsFromPoint(e.clientX, e.clientY)
      .find((el) => el.matches?.('img[data-cms-img]'));
    if (hit) { clearTimeout(hideTimer); place(hit); }
    else if (current) hide();
  }, { passive: true });

  btn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (current) { input.dataset.key = current.dataset.cmsImg; input.click(); }
  });

  input.addEventListener('change', async () => {
    const file = input.files[0];
    input.value = '';
    const img = imgs.find((i) => i.dataset.cmsImg === input.dataset.key);
    if (!file || !img) return;
    try {
      const keepPng = /\.png($|\?)/i.test(img.getAttribute('src') || '') && file.type === 'image/png';
      const out = await compressImage(file, keepPng);
      img.removeAttribute('srcset');
      img.removeAttribute('sizes');
      img.closest('picture')?.querySelectorAll('source').forEach((s) => s.remove());
      img.src = out.dataUrl;
      img.classList.add('cms-dirty');
      post({ type: 'image', key: img.dataset.cmsImg, dataUrl: out.dataUrl, ext: out.ext, name: file.name, w: out.w, h: out.h });
    } catch (err) {
      post({ type: 'error', message: err.message });
    }
  });
}

// ----- Khởi động -----

export function initCmsEdit() {
  injectStyle();

  // Trong CMS, bấm link/gửi form sẽ đưa iframe rời trang đang sửa và mất thay đổi chưa lưu —
  // chặn hẳn; chuyển trang phải qua tab trang trong CMS.
  document.addEventListener('click', (e) => {
    const a = e.target.closest?.('a[href]');
    if (a && !a.getAttribute('href').startsWith('#')) e.preventDefault();
    if (a && a.closest('[contenteditable]')) e.preventDefault();
  }, true);
  document.addEventListener('submit', (e) => e.preventDefault(), true);

  const run = () => {
    document.querySelectorAll('[data-cms-t]').forEach((el) => markText(el, 't', el.dataset.cmsT));
    document.querySelectorAll('[data-cms-h]').forEach((el) => markText(el, 'h', el.dataset.cmsH));
    initImages();
    post({
      type: 'ready',
      path: location.pathname,
      texts: document.querySelectorAll('[data-cms-t],[data-cms-h]').length,
      images: document.querySelectorAll('img[data-cms-img]').length,
    });
  };
  // Đợi các module trang chạy xong (GSAP, slider...) rồi mới chụp "bản gốc" của từng mốc.
  if (document.readyState === 'complete') setTimeout(run, 300);
  else window.addEventListener('load', () => setTimeout(run, 300), { once: true });
}
