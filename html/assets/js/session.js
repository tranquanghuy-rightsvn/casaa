// Phiên đăng nhập dùng chung cho mọi trang. Phiên thật nằm trong cookie HttpOnly
// (Worker, /api/*); ở đây chỉ nhớ "lần trước đang đăng nhập ai" để trang vẽ đúng
// ngay từ đầu (thư viện yêu thích theo tài khoản), rồi xác nhận lại với /api/me.
const HINT = 'casa:session:v1';
const listeners = new Set();
let pending = null;

export async function api(path, { method = 'GET', body } = {}) {
  const res = await fetch('/api' + path, {
    method,
    credentials: 'same-origin',
    headers: body ? { 'content-type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => null);
  if (!res.ok || data === null) {
    const err = new Error(data?.error || 'Có lỗi xảy ra, vui lòng thử lại.');
    err.status = res.status;
    throw err;
  }
  return data;
}

/** Người dùng lần gần nhất (chỉ id/email/name) hoặc null — đọc đồng bộ. */
export function cachedUser() {
  try {
    const u = JSON.parse(localStorage.getItem(HINT) || 'null');
    return u && Number.isInteger(u.id) ? u : null;
  } catch {
    return null;
  }
}

/** Ghi nhận trạng thái đăng nhập mới (sau login/logout/me) và báo cho các module khác. */
export function setUser(user) {
  const prev = cachedUser();
  try {
    if (user) localStorage.setItem(HINT, JSON.stringify({ id: user.id, email: user.email, name: user.name }));
    else localStorage.removeItem(HINT);
  } catch { /* ignore */ }
  pending = Promise.resolve(user || null);
  if ((prev?.id ?? null) !== (user?.id ?? null) || prev?.name !== user?.name) {
    listeners.forEach((fn) => fn(user || null));
  }
}

/** Hỏi /api/me một lần cho mỗi lần tải trang. Lỗi mạng: giữ trạng thái đã nhớ. */
export function fetchUser() {
  if (!pending) {
    pending = api('/me')
      .then(({ user }) => { setUser(user); return user || null; })
      .catch((err) => {
        // Có phản hồi từ máy chủ (vd. chạy tĩnh không có API -> 404) = coi như chưa đăng nhập
        if (err.status) { setUser(null); return null; }
        return cachedUser();
      });
  }
  return pending;
}

export function onUserChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
