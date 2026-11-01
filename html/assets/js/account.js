// Account / login placeholder handler (no backend configured yet).
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function initAccount() {
  const form = document.querySelector('[data-account-form]');
  if (!form) return;

  const email = form.elements.email;
  const password = form.elements.password;
  const status = form.querySelector('[data-account-status]');
  const actions = document.querySelectorAll('[data-account-action]');

  const setErr = (input, msg) => {
    const err = document.getElementById(input.getAttribute('aria-describedby'));
    if (msg) input.setAttribute('aria-invalid', 'true');
    else input.removeAttribute('aria-invalid');
    if (err) err.textContent = msg;
  };

  [email, password].forEach((input) => {
    input?.addEventListener('input', () => {
      setErr(input, '');
      if (status) {
        status.textContent = '';
        status.className = 'account-form__status';
      }
    });
  });

  const showNotice = (msg) => {
    if (!status) return;
    status.className = 'account-form__status is-notice';
    status.textContent = msg;
  };

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    setErr(email, '');
    setErr(password, '');

    let bad = null;
    if (!email.value.trim()) {
      setErr(email, 'Vui lòng nhập địa chỉ email.');
      bad = bad || email;
    } else if (!EMAIL_RE.test(email.value.trim())) {
      setErr(email, 'Địa chỉ email chưa đúng định dạng.');
      bad = bad || email;
    }

    if (!password.value.trim()) {
      setErr(password, 'Vui lòng nhập mật khẩu.');
      bad = bad || password;
    }

    if (bad) {
      bad.focus();
      return;
    }

    showNotice('Hệ thống tài khoản đang được kết nối. Vui lòng liên hệ hotline 0763 161 286 để được hỗ trợ.');
  });

  actions.forEach((btn) => {
    btn.addEventListener('click', () => {
      const kind = btn.dataset.accountAction;
      if (kind === 'google') {
        showNotice('Đăng nhập bằng Google đang được kết nối. Vui lòng liên hệ hotline 0763 161 286 để được hỗ trợ.');
      } else if (kind === 'register') {
        showNotice('Tính năng đăng ký tài khoản đang được kết nối. Vui lòng liên hệ hotline 0763 161 286 để được hỗ trợ.');
      }
    });
  });
}
