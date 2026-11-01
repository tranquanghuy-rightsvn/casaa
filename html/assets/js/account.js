// Trang /tai-khoan/: đăng nhập, đăng ký (email/mật khẩu hoặc Google) và hồ sơ người dùng.
// API ở Worker (worker/src/account.js), phiên lưu trong cookie HttpOnly.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const GOOGLE_ERRORS = {
  google_unconfigured: 'Đăng nhập Google chưa được bật. Vui lòng dùng email hoặc liên hệ hotline 0763 161 286.',
  google_cancelled: 'Bạn đã huỷ đăng nhập bằng Google.',
  google_state: 'Phiên đăng nhập Google đã hết hạn, vui lòng thử lại.',
  google_failed: 'Không đăng nhập được bằng Google, vui lòng thử lại.',
  google_unverified: 'Email Google của bạn chưa được xác minh.',
  locked: 'Tài khoản đã bị khoá. Vui lòng liên hệ hotline 0763 161 286.',
};

async function api(path, { method = 'GET', body } = {}) {
  const res = await fetch('/api' + path, {
    method,
    credentials: 'same-origin',
    headers: body ? { 'content-type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Có lỗi xảy ra, vui lòng thử lại.');
  return data;
}

function setErr(input, msg) {
  const err = document.getElementById(input.getAttribute('aria-describedby'));
  if (msg) input.setAttribute('aria-invalid', 'true');
  else input.removeAttribute('aria-invalid');
  if (err) err.textContent = msg || '';
}

function setStatus(el, msg, kind = 'notice') {
  if (!el) return;
  el.className = 'account-form__status' + (msg ? ` is-${kind}` : '');
  el.textContent = msg || '';
}

function busy(form, on) {
  form.querySelectorAll('button').forEach((b) => { b.disabled = on; });
  form.setAttribute('aria-busy', on ? 'true' : 'false');
}

export function initAccount() {
  const root = document.querySelector('[data-account-root]');
  if (!root) return;

  const authView = root.querySelector('[data-view="auth"]');
  const profileView = root.querySelector('[data-view="profile"]');
  const form = root.querySelector('[data-account-form]');
  const status = form.querySelector('[data-account-status]');
  const { name, email, password } = form.elements;

  // ----- Đăng nhập / đăng ký -----

  const setMode = (mode) => {
    form.dataset.mode = mode;
    const reg = mode === 'register';
    form.querySelectorAll('[data-only="register"]').forEach((el) => { el.hidden = !reg; });
    form.querySelector('[data-submit-label]').textContent = reg ? 'Tạo Tài Khoản' : 'Đăng Nhập';
    form.querySelector('[data-switch-mode]').textContent = reg ? 'Đã Có Tài Khoản' : 'Đăng Ký';
    root.querySelector('[data-auth-title]').textContent = reg ? 'Tạo tài khoản Casa+' : 'Hi! Please enter your Account';
    root.querySelector('[data-google-label]').textContent = reg ? 'Đăng ký bằng Google' : 'Đăng nhập bằng Google';
    password.autocomplete = reg ? 'new-password' : 'current-password';
    [name, email, password].forEach((i) => setErr(i, ''));
    setStatus(status, '');
  };

  form.querySelector('[data-switch-mode]').addEventListener('click', () => {
    setMode(form.dataset.mode === 'register' ? 'login' : 'register');
    (form.dataset.mode === 'register' ? name : email).focus();
  });

  [name, email, password].forEach((input) => {
    input.addEventListener('input', () => { setErr(input, ''); setStatus(status, ''); });
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const reg = form.dataset.mode === 'register';
    [name, email, password].forEach((i) => setErr(i, ''));

    let bad = null;
    if (reg && !name.value.trim()) { setErr(name, 'Vui lòng nhập họ tên.'); bad = bad || name; }
    if (!email.value.trim()) { setErr(email, 'Vui lòng nhập địa chỉ email.'); bad = bad || email; }
    else if (!EMAIL_RE.test(email.value.trim())) { setErr(email, 'Địa chỉ email chưa đúng định dạng.'); bad = bad || email; }
    if (!password.value) { setErr(password, 'Vui lòng nhập mật khẩu.'); bad = bad || password; }
    else if (reg && password.value.length < 8) { setErr(password, 'Mật khẩu cần ít nhất 8 ký tự.'); bad = bad || password; }
    if (bad) { bad.focus(); return; }

    busy(form, true);
    try {
      const body = { email: email.value.trim(), password: password.value };
      if (reg) body.name = name.value.trim();
      const { user } = await api(reg ? '/auth/register' : '/auth/login', { method: 'POST', body });
      form.reset();
      showProfile(user);
    } catch (err) {
      setStatus(status, err.message);
    } finally {
      busy(form, false);
    }
  });

  // ----- Hồ sơ -----

  const pForm = root.querySelector('[data-profile-form]');
  const pStatus = root.querySelector('[data-profile-status]');
  const pwForm = root.querySelector('[data-password-form]');
  const pwStatus = root.querySelector('[data-password-status]');

  function showProfile(user) {
    authView.hidden = true;
    profileView.hidden = false;
    root.querySelector('[data-profile-title]').textContent = `Xin chào, ${user.name || user.email}`;
    root.querySelector('[data-profile-email]').textContent =
      user.email + (user.google_linked ? ' · đã liên kết Google' : '');
    const avatar = root.querySelector('[data-profile-avatar]');
    avatar.hidden = !user.avatar_url;
    if (user.avatar_url) { avatar.referrerPolicy = 'no-referrer'; avatar.src = user.avatar_url; }
    pForm.elements.name.value = user.name || '';
    pForm.elements.phone.value = user.phone || '';
    // Tài khoản chỉ có Google: đặt mật khẩu lần đầu, không cần mật khẩu cũ
    root.querySelector('[data-current-password]').hidden = !user.has_password;
    root.querySelector('[data-password-summary]').textContent = user.has_password ? 'Đổi mật khẩu' : 'Đặt mật khẩu (để đăng nhập bằng email)';
    setStatus(pStatus, '');
  }

  function showAuth() {
    profileView.hidden = true;
    authView.hidden = false;
    setMode('login');
  }

  pForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const n = pForm.elements.name;
    setErr(n, ''); setErr(pForm.elements.phone, '');
    if (!n.value.trim()) { setErr(n, 'Vui lòng nhập họ tên.'); n.focus(); return; }
    busy(pForm, true);
    try {
      const { user } = await api('/me', { method: 'PATCH', body: { name: n.value.trim(), phone: pForm.elements.phone.value.trim() } });
      showProfile(user);
      setStatus(pStatus, 'Đã lưu thông tin.', 'success');
    } catch (err) {
      setStatus(pStatus, err.message);
    } finally {
      busy(pForm, false);
    }
  });

  root.querySelector('[data-logout]').addEventListener('click', async () => {
    busy(pForm, true);
    try { await api('/auth/logout', { method: 'POST' }); } catch { /* vẫn về màn đăng nhập */ }
    busy(pForm, false);
    showAuth();
  });

  pwForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const cur = pwForm.elements.current_password;
    const nw = pwForm.elements.new_password;
    setErr(cur, ''); setErr(nw, '');
    const needCur = !root.querySelector('[data-current-password]').hidden;
    if (needCur && !cur.value) { setErr(cur, 'Vui lòng nhập mật khẩu hiện tại.'); cur.focus(); return; }
    if (nw.value.length < 8) { setErr(nw, 'Mật khẩu cần ít nhất 8 ký tự.'); nw.focus(); return; }
    busy(pwForm, true);
    try {
      await api('/me/password', { method: 'POST', body: { current_password: cur.value, new_password: nw.value } });
      pwForm.reset();
      const { user } = await api('/me');
      if (user) showProfile(user);
      setStatus(pwStatus, 'Đã cập nhật mật khẩu. Các thiết bị khác đã được đăng xuất.', 'success');
    } catch (err) {
      setStatus(pwStatus, err.message);
    } finally {
      busy(pwForm, false);
    }
  });

  // ----- Khởi động -----

  const params = new URLSearchParams(location.search);
  const errCode = params.get('error');
  if (errCode) {
    setStatus(status, GOOGLE_ERRORS[errCode] || 'Không đăng nhập được, vui lòng thử lại.');
    history.replaceState(null, '', location.pathname);
  }
  if (params.get('mode') === 'register') setMode('register');

  api('/me')
    .then(({ user }) => { if (user) showProfile(user); })
    .catch(() => { /* chưa có API (chạy tĩnh) — giữ màn đăng nhập */ });
}
