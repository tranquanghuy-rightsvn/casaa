// "Ghim" (favourite) projects.
// - Chưa đăng nhập: lưu trên trình duyệt (localStorage `casa:favorites:v1`).
// - Đã đăng nhập: lưu theo tài khoản (API /api/me/favorites, bảng D1 `favorites`);
//   bản sao gần nhất giữ ở `casa:favorites:acct:v1` để vẽ ngay khi tải trang.
// - Đăng nhập khi trình duyệt còn mục đã ghim: hỏi có đồng bộ vào tài khoản không.
import { PROJECTS } from './projects-data.js';
import { TITLES_EN, catEn } from './projects-en.js';
import { currentLang, localPath } from './lang.js';
import { api, cachedUser, fetchUser, onUserChange } from './session.js';

const KEY = 'casa:favorites:v1';
const ACCT_KEY = 'casa:favorites:acct:v1';
const DECLINED_KEY = 'casa:favorites:sync-declined:v1';
const listeners = new Set();

const clean = (arr) => (Array.isArray(arr)
  ? [...new Set(arr.filter((n) => Number.isInteger(n) && PROJECTS[n]))]
  : []);

function load(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function save(key, value) {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* private mode / quota — the UI still works for this session */
  }
}

const readLocal = () => clean(load(KEY, []));

// Trạng thái kho: user = null -> trình duyệt; user = {id,...} -> tài khoản.
let user = cachedUser();
let acct = (() => {
  const c = load(ACCT_KEY, null);
  return user && c && c.uid === user.id ? clean(c.items) : [];
})();

function emit() {
  const list = readFavorites();
  listeners.forEach((fn) => fn(list));
}

function setAcct(items) {
  acct = clean(items);
  if (user) save(ACCT_KEY, { uid: user.id, items: acct });
  emit();
}

export function favoritesUser() {
  return user;
}

export function readFavorites() {
  return user ? [...acct] : readLocal();
}

export function isFavorite(index) {
  return readFavorites().includes(index);
}

export function toggleFavorite(index) {
  if (!user) {
    const list = readLocal();
    const at = list.indexOf(index);
    if (at === -1) list.push(index);
    else list.splice(at, 1);
    save(KEY, list);
    emit();
    return at === -1;
  }

  // Theo tài khoản: đổi ngay trên giao diện, gọi API, lỗi thì trả lại như cũ.
  const before = [...acct];
  const on = !before.includes(index);
  setAcct(on ? [...before, index] : before.filter((n) => n !== index));
  const uid = user.id;
  api(`/me/favorites/${index}`, { method: on ? 'PUT' : 'DELETE' }).catch((err) => {
    if (!user || user.id !== uid) return;
    setAcct(before);
    say(err.status === 401
      ? (currentLang() === 'en' ? 'Your session has expired. Please sign in again.' : 'Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại.')
      : (currentLang() === 'en' ? 'Could not save to your account. Please try again.' : 'Chưa lưu được vào tài khoản, vui lòng thử lại.'));
    if (err.status === 401) fetchUser();
  });
  return on;
}

export function onFavoritesChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

// ----- Đăng nhập / đăng xuất -----

async function applyUser(next) {
  const prevId = user?.id ?? null;
  user = next ? { id: next.id, email: next.email, name: next.name } : null;
  if (!user) {
    acct = [];
    save(ACCT_KEY, null);
    if (prevId !== null) emit();
    return;
  }
  if (prevId !== user.id) {
    acct = [];
    emit();
  }
  try {
    const { items } = await api('/me/favorites');
    if (user?.id !== next.id) return;
    setAcct(items);
    offerSync();
  } catch {
    /* giữ bản sao gần nhất */
  }
}

/** Gọi một lần trên mọi trang: xác nhận phiên rồi nạp thư viện theo tài khoản. */
export function initFavoritesStore() {
  let handled = false;
  onUserChange((u) => { handled = true; applyUser(u); });
  // onUserChange chỉ báo khi người dùng đổi; lần tải trang vẫn cần nạp danh sách mới nhất.
  fetchUser().then((u) => { if (!handled) applyUser(u); });
}

// ----- Hỏi đồng bộ mục đã ghim trên trình duyệt vào tài khoản -----

function offerSync() {
  if (!user) return;
  const local = readLocal();
  const missing = local.filter((n) => !acct.includes(n));
  if (!missing.length) {
    if (local.length) save(KEY, []); // đã có hết trong tài khoản
    return;
  }
  const sig = [...missing].sort((a, b) => a - b).join(',');
  const declined = load(DECLINED_KEY, null);
  if (declined && declined.uid === user.id && declined.sig === sig) return;
  if (document.querySelector('[data-fav-sync]')) return;
  showSyncDialog(missing, sig);
}

function showSyncDialog(missing, sig) {
  const en = currentLang() === 'en';
  const uid = user.id;
  const n = missing.length;
  const dlg = document.createElement('dialog');
  dlg.className = 'fav-sync';
  dlg.setAttribute('data-fav-sync', '');
  dlg.setAttribute('aria-labelledby', 'fav-sync-title');
  const thumbs = missing.slice(0, 4).map((i) => {
    const p = PROJECTS[i];
    return `<li><img src="${p.img}" width="${p.w}" height="${p.h}" alt="" loading="lazy"></li>`;
  }).join('');
  const email = escapeHtml(user.email || '');
  dlg.innerHTML = `
    <div class="fav-sync__inner">
      <h2 class="fav-sync__title" id="fav-sync-title">${en ? 'Sync your favourites?' : 'Đồng bộ thư viện yêu thích?'}</h2>
      <p class="fav-sync__text">${en
        ? `This browser has <strong>${n} pinned project${n > 1 ? 's' : ''}</strong> saved before you signed in. Add ${n > 1 ? 'them' : 'it'} to <strong>${email}</strong> so you can see ${n > 1 ? 'them' : 'it'} on any device?`
        : `Trình duyệt này đang có <strong>${n} dự án đã ghim</strong> từ lúc chưa đăng nhập. Thêm vào tài khoản <strong>${email}</strong> để xem lại trên mọi thiết bị?`}</p>
      <ul class="fav-sync__thumbs">${thumbs}</ul>
      <p class="fav-sync__status" role="status" aria-live="polite" data-fav-sync-status></p>
      <div class="fav-sync__actions">
        <button class="account-btn account-btn--primary" type="button" data-fav-sync-yes>${en ? 'Sync to my account' : 'Đồng bộ vào tài khoản'}</button>
        <button class="account-btn account-btn--secondary" type="button" data-fav-sync-no>${en ? 'Not now' : 'Để sau'}</button>
      </div>
    </div>`;
  document.body.appendChild(dlg);

  const close = () => { dlg.close(); dlg.remove(); };
  const decline = () => { save(DECLINED_KEY, { uid, sig }); close(); };
  dlg.addEventListener('cancel', (e) => { e.preventDefault(); decline(); });
  dlg.querySelector('[data-fav-sync-no]').addEventListener('click', decline);
  dlg.querySelector('[data-fav-sync-yes]').addEventListener('click', async (e) => {
    const btns = dlg.querySelectorAll('button');
    btns.forEach((b) => { b.disabled = true; });
    try {
      const { items } = await api('/me/favorites/merge', { method: 'POST', body: { items: readLocal() } });
      if (user?.id !== uid) return close();
      save(KEY, []);
      save(DECLINED_KEY, null);
      setAcct(items);
      close();
      say(en ? 'Favourites synced to your account.' : 'Đã đồng bộ thư viện yêu thích vào tài khoản.');
    } catch (err) {
      dlg.querySelector('[data-fav-sync-status]').textContent = err.message;
      btns.forEach((b) => { b.disabled = false; });
      e.currentTarget.focus();
    }
  });
  dlg.showModal();
}

function escapeHtml(s) {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

const PIN_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21.2l7.8-7.8 1-1a5.5 5.5 0 0 0 0-7.8Z"/></svg>';

function paint(btn, index) {
  const on = isFavorite(index);
  btn.classList.toggle('is-on', on);
  btn.setAttribute('aria-pressed', String(on));
  const en = currentLang() === 'en';
  btn.setAttribute('aria-label', on ? (en ? 'Remove project from favourites' : 'Bỏ yêu thích dự án') : (en ? 'Add project to favourites' : 'Thêm dự án vào thư viện yêu thích'));
  btn.title = on ? (en ? 'Remove from favourites' : 'Bỏ yêu thích') : (en ? 'Add to favourites' : 'Thêm vào thư viện yêu thích');
}

// Thông báo cho trình đọc màn hình; `toast` = hiện thêm một dòng nhỏ trên màn hình.
let toastTimer = 0;
function say(text, toast = true) {
  let el = document.querySelector('[data-fav-live]');
  if (!el) {
    el = document.createElement('p');
    el.setAttribute('data-fav-live', '');
    el.setAttribute('aria-live', 'polite');
    document.body.appendChild(el);
  }
  el.className = toast ? 'fav-toast is-on' : 'visually-hidden';
  el.textContent = text;
  clearTimeout(toastTimer);
  if (toast) toastTimer = setTimeout(() => { el.className = 'visually-hidden'; }, 4000);
}

function announce(on) {
  const en = currentLang() === 'en';
  say(on ? (en ? 'Added to favourites.' : 'Đã thêm vào thư viện yêu thích.') : (en ? 'Removed from favourites.' : 'Đã bỏ khỏi thư viện yêu thích.'), false);
}

// Wraps each .pin so the favourite button can sit next to it (a button
// cannot be nested inside the pin button itself).
export function initPinFavorites(scope = document) {
  scope.querySelectorAll('.pin[data-index]').forEach((pin) => {
    if (pin.parentElement?.classList.contains('pin-wrap')) return;

    const wrap = document.createElement('div');
    wrap.className = 'pin-wrap';
    pin.parentNode.insertBefore(wrap, pin);
    wrap.appendChild(pin);

    const index = Number(pin.dataset.index);
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'pin__fav';
    btn.dataset.favIndex = String(index);
    btn.innerHTML = PIN_SVG;
    wrap.appendChild(btn);
    paint(btn, index);

    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const on = toggleFavorite(index);
      paint(btn, index);
      announce(on);
    });
  });

  onFavoritesChange(() => {
    scope.querySelectorAll('.pin__fav').forEach((b) => paint(b, Number(b.dataset.favIndex)));
  });
}

function cardMarkup(item, index) {
  const en = currentLang() === 'en';
  const title = en ? (TITLES_EN[index] || item.title) : item.title;
  const cat = en ? catEn(item.cat) : item.cat;
  const href = item.link || item.img;
  return `
    <div class="pin-wrap">
      <a class="pin" href="${href}" target="_blank" rel="noopener">
        <img src="${item.img}" width="${item.w}" height="${item.h}" loading="lazy" decoding="async" alt="${title}">
        <span class="pin__info">${title}<small>${cat}${item.domain ? ` · ${item.domain}` : ''}</small></span>
      </a>
      <button class="fav-card__remove" type="button" data-fav-remove="${index}" aria-label="${en ? 'Remove' : 'Bỏ yêu thích'} ${title}">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 5l14 14M19 5 5 19" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
      </button>
    </div>`;
}

export function initFavoritesPage() {
  const grid = document.querySelector('[data-fav-grid]');
  if (!grid) return;

  const count = document.querySelector('[data-fav-count]');
  const empty = document.querySelector('[data-fav-empty]');
  const where = document.querySelector('[data-fav-where]');
  const guestHint = document.querySelectorAll('[data-fav-guest]');

  const render = () => {
    const list = readFavorites();
    const en = currentLang() === 'en';
    if (where) {
      where.textContent = user
        ? (en ? `Saved to account ${user.email}` : `Đã lưu theo tài khoản ${user.email}`)
        : (en ? 'Saved in this browser' : 'Lưu trên trình duyệt này');
    }
    guestHint.forEach((el) => { el.hidden = Boolean(user); });
    grid.innerHTML = list.map((i) => `<li>${cardMarkup(PROJECTS[i], i)}</li>`).join('');
    grid.hidden = list.length === 0;
    if (empty) empty.hidden = list.length !== 0;
    if (count) count.textContent = en
      ? `${String(list.length).padStart(2, '0')} pinned items`
      : `${String(list.length).padStart(2, '0')} mục đã ghim`;
  };

  grid.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-fav-remove]');
    if (!btn) return;
    e.preventDefault();
    toggleFavorite(Number(btn.dataset.favRemove));
    render();
  });

  onFavoritesChange(render);
  document.addEventListener('casa:lang', render);
  render();
}

// Small preview used by the account dashboard.
export function initFavoritesPreview() {
  const box = document.querySelector('[data-fav-preview]');
  if (!box) return;
  const empty = document.querySelector('[data-fav-preview-empty]');
  const link = document.querySelector('[data-fav-preview-link]');
  const note = document.querySelector('[data-fav-preview-count]');

  const render = () => {
    const list = readFavorites();
    const en = currentLang() === 'en';
    box.innerHTML = list.slice(0, 8).map((i) => {
      const p = PROJECTS[i];
      return `<li><img src="${p.img}" width="${p.w}" height="${p.h}" loading="lazy" alt="${en ? (TITLES_EN[i] || p.title) : p.title}"></li>`;
    }).join('');
    box.hidden = list.length === 0;
    if (empty) empty.hidden = list.length !== 0;
    if (link) {
      link.textContent = list.length
        ? (en ? 'View favourites' : 'Xem thư viện yêu thích')
        : (en ? 'Explore projects' : 'Khám phá dự án');
      link.href = localPath(list.length ? '/thu-vien-yeu-thich/' : '/#du-an');
    }
    if (note) {
      const n = String(list.length).padStart(2, '0');
      note.textContent = en ? `${n} pinned · saved to your account` : `${n} mục đã ghim · lưu theo tài khoản`;
      note.hidden = !user;
    }
  };

  onFavoritesChange(render);
  document.addEventListener('casa:lang', render);
  render();
}
