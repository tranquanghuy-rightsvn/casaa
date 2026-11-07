// Trang /tai-khoan/: đăng nhập, đăng ký (email/mật khẩu hoặc Google) và dashboard người dùng.
// API ở Worker (worker/src/account.js), phiên lưu trong cookie HttpOnly.
import { api, fetchUser, setUser } from './session.js';
import { currentLang, t } from './lang.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const GOOGLE_ERRORS = {
  google_unconfigured: ['Đăng nhập Google chưa được bật. Vui lòng dùng email hoặc liên hệ hotline 0763 161 286.', 'Google sign-in is not enabled. Please use email or call +84 763 161 286.'],
  google_cancelled: ['Bạn đã huỷ đăng nhập bằng Google.', 'You cancelled Google sign-in.'],
  google_state: ['Phiên đăng nhập Google đã hết hạn, vui lòng thử lại.', 'The Google sign-in session expired, please try again.'],
  google_failed: ['Không đăng nhập được bằng Google, vui lòng thử lại.', 'Could not sign in with Google, please try again.'],
  google_unverified: ['Email Google của bạn chưa được xác minh.', 'Your Google email is not verified.'],
  locked: ['Tài khoản đã bị khoá. Vui lòng liên hệ hotline 0763 161 286.', 'This account is locked. Please call +84 763 161 286.'],
};

// Nhãn đổi theo chế độ đăng nhập / đăng ký (VI, EN).
const LABELS = {
  login: {
    title: ['Đăng nhập Casa⁺', 'Sign in to Casa⁺'],
    submit: ['Đăng nhập', 'Sign in'],
    switch: ['Đăng ký', 'Create account'],
    google: ['Đăng nhập bằng Google', 'Sign in with Google'],
  },
  register: {
    title: ['Tạo tài khoản Casa⁺', 'Create a Casa⁺ account'],
    submit: ['Tạo tài khoản', 'Create account'],
    switch: ['Đã có tài khoản', 'I have an account'],
    google: ['Đăng ký bằng Google', 'Sign up with Google'],
  },
};

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

function busy(scope, on) {
  scope.querySelectorAll('button').forEach((b) => { b.disabled = on; });
  scope.setAttribute('aria-busy', on ? 'true' : 'false');
}

export function initAccount() {
  const root = document.querySelector('[data-account-root]');
  if (!root) return;

  const authView = root.querySelector('[data-view="auth"]');
  const profileView = root.querySelector('[data-view="profile"]');
  const form = root.querySelector('[data-account-form]');
  const status = form.querySelector('[data-account-status]');
  const { name, email, password } = form.elements;
  let me = null;

  // ----- Đăng nhập / đăng ký -----

  const paintMode = () => {
    const L = LABELS[form.dataset.mode];
    const i = currentLang() === 'en' ? 1 : 0;
    root.querySelector('[data-auth-title]').textContent = L.title[i];
    form.querySelector('[data-submit-label]').textContent = L.submit[i];
    form.querySelector('[data-switch-mode]').textContent = L.switch[i];
    root.querySelector('[data-google-label]').textContent = L.google[i];
  };

  const setMode = (mode) => {
    form.dataset.mode = mode;
    const reg = mode === 'register';
    form.querySelectorAll('[data-only="register"]').forEach((el) => { el.hidden = !reg; });
    password.autocomplete = reg ? 'new-password' : 'current-password';
    [name, email, password].forEach((input) => setErr(input, ''));
    setStatus(status, '');
    paintMode();
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
    [name, email, password].forEach((input) => setErr(input, ''));

    let bad = null;
    if (reg && !name.value.trim()) { setErr(name, t('Vui lòng nhập họ tên.', 'Please enter your name.')); bad = bad || name; }
    if (!email.value.trim()) { setErr(email, t('Vui lòng nhập địa chỉ email.', 'Please enter your email address.')); bad = bad || email; }
    else if (!EMAIL_RE.test(email.value.trim())) { setErr(email, t('Địa chỉ email chưa đúng định dạng.', 'Invalid email address.')); bad = bad || email; }
    if (!password.value) { setErr(password, t('Vui lòng nhập mật khẩu.', 'Please enter your password.')); bad = bad || password; }
    else if (reg && password.value.length < 8) { setErr(password, t('Mật khẩu cần ít nhất 8 ký tự.', 'Password must be at least 8 characters.')); bad = bad || password; }
    if (bad) { bad.focus(); return; }

    busy(form, true);
    try {
      const body = { email: email.value.trim(), password: password.value };
      if (reg) body.name = name.value.trim();
      const { user } = await api(reg ? '/auth/register' : '/auth/login', { method: 'POST', body });
      form.reset();
      showProfile(user);
      setUser(user); // thư viện yêu thích chuyển sang theo tài khoản (và hỏi đồng bộ nếu cần)
      window.scrollTo({ top: 0 });
    } catch (err) {
      setStatus(status, err.message);
    } finally {
      busy(form, false);
    }
  });

  // ----- Dashboard -----

  const infoView = root.querySelector('[data-info-view]');
  const infoStatus = root.querySelector('[data-profile-status]');
  const pForm = root.querySelector('[data-profile-form]');
  const pStatus = root.querySelector('[data-profile-form-status]');
  const pwForm = root.querySelector('[data-password-form]');
  const pwStatus = root.querySelector('[data-password-status]');

  const setText = (sel, value) => root.querySelectorAll(sel).forEach((el) => { el.textContent = value; });

  function showProfile(user) {
    me = user;
    authView.hidden = true;
    profileView.hidden = false;
    setText('[data-user-name]', user.name || user.email);
    setText('[data-user-phone]', user.phone || '—');
    setText('[data-user-email]', user.email);
    root.querySelector('[data-user-google]').hidden = !user.google_linked;
    const avatar = root.querySelector('[data-profile-avatar]');
    avatar.hidden = !user.avatar_url;
    if (user.avatar_url) { avatar.referrerPolicy = 'no-referrer'; avatar.src = user.avatar_url; }
    // Tài khoản chỉ có Google: đặt mật khẩu lần đầu, không cần mật khẩu cũ
    root.querySelector('[data-current-password]').hidden = !user.has_password;
    root.querySelector('[data-password-summary]').textContent = user.has_password
      ? t('Đổi mật khẩu', 'Change password')
      : t('Đặt mật khẩu (để đăng nhập bằng email)', 'Set a password (to sign in with email)');
    closeEdit();
  }

  function showAuth() {
    me = null;
    profileView.hidden = true;
    authView.hidden = false;
    setMode('login');
  }

  function openEdit() {
    pForm.elements.name.value = me?.name || '';
    pForm.elements.phone.value = me?.phone || '';
    setErr(pForm.elements.name, ''); setErr(pForm.elements.phone, '');
    setStatus(pStatus, ''); setStatus(infoStatus, '');
    infoView.hidden = true;
    pForm.hidden = false;
    pForm.elements.name.focus();
  }

  function closeEdit() {
    pForm.hidden = true;
    infoView.hidden = false;
  }

  root.querySelector('[data-edit-profile]').addEventListener('click', openEdit);
  root.querySelector('[data-cancel-edit]').addEventListener('click', () => {
    closeEdit();
    root.querySelector('[data-edit-profile]').focus();
  });

  pForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const n = pForm.elements.name;
    setErr(n, ''); setErr(pForm.elements.phone, '');
    if (!n.value.trim()) { setErr(n, t('Vui lòng nhập họ tên.', 'Please enter your name.')); n.focus(); return; }
    busy(pForm, true);
    try {
      const { user } = await api('/me', { method: 'PATCH', body: { name: n.value.trim(), phone: pForm.elements.phone.value.trim() } });
      showProfile(user);
      setUser(user);
      setStatus(infoStatus, t('Đã lưu thông tin.', 'Details saved.'), 'success');
      root.querySelector('[data-edit-profile]').focus();
    } catch (err) {
      setStatus(pStatus, err.message);
    } finally {
      busy(pForm, false);
    }
  });

  root.querySelector('[data-logout]').addEventListener('click', async () => {
    busy(infoView, true);
    try { await api('/auth/logout', { method: 'POST' }); } catch { /* vẫn về màn đăng nhập */ }
    busy(infoView, false);
    setUser(null);
    showAuth();
    window.scrollTo({ top: 0 });
  });

  pwForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const cur = pwForm.elements.current_password;
    const nw = pwForm.elements.new_password;
    setErr(cur, ''); setErr(nw, '');
    const needCur = !root.querySelector('[data-current-password]').hidden;
    if (needCur && !cur.value) { setErr(cur, t('Vui lòng nhập mật khẩu hiện tại.', 'Please enter your current password.')); cur.focus(); return; }
    if (nw.value.length < 8) { setErr(nw, t('Mật khẩu cần ít nhất 8 ký tự.', 'Password must be at least 8 characters.')); nw.focus(); return; }
    busy(pwForm, true);
    try {
      await api('/me/password', { method: 'POST', body: { current_password: cur.value, new_password: nw.value } });
      pwForm.reset();
      const { user } = await api('/me');
      if (user) showProfile(user);
      root.querySelector('.account-password').open = true;
      setStatus(pwStatus, t('Đã cập nhật mật khẩu. Các thiết bị khác đã được đăng xuất.', 'Password updated. Other devices have been signed out.'), 'success');
    } catch (err) {
      setStatus(pwStatus, err.message);
    } finally {
      busy(pwForm, false);
    }
  });

  document.addEventListener('casa:lang', paintMode);

  // ----- Khởi động -----

  const params = new URLSearchParams(location.search);
  const errCode = params.get('error');
  if (errCode) {
    setStatus(status, GOOGLE_ERRORS[errCode] ? t(...GOOGLE_ERRORS[errCode]) : t('Không đăng nhập được, vui lòng thử lại.', 'Could not sign in, please try again.'));
    history.replaceState(null, '', location.pathname);
  }
  setMode(params.get('mode') === 'register' ? 'register' : 'login');

  // Dùng chung lần gọi /api/me với thư viện yêu thích (session.js). Lỗi mạng chỉ trả về
  // bản nhớ tạm (không có has_password) — khi đó giữ màn đăng nhập.
  fetchUser().then((user) => {
    if (user && 'has_password' in user) showProfile(user);
  });
}
