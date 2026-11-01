// Contact form: validates in Vietnamese, then sends to data-endpoint (JSON POST)
// or, when no endpoint is configured, opens the visitor's email app with the details filled in.
const TO = 'dongxuong@casa-evolution.com';

export function initContactForm() {
  const form = document.querySelector('[data-contact-form]');
  if (!form) return;
  const status = form.querySelector('[data-form-status]');
  const submit = form.querySelector('[type="submit"]');

  // Preselect "cá nhân" / "doanh nghiệp" when coming from the home page cards.
  const need = new URLSearchParams(location.search).get('nhu-cau');
  if (need) {
    const radio = form.querySelector(`input[name="nhu_cau"][value="${CSS.escape(need)}"]`);
    if (radio) radio.checked = true;
  }
  if (location.hash === '#lien-he') {
    requestAnimationFrame(() => form.querySelector('#f-name')?.focus({ preventScroll: true }));
  }

  const rules = {
    ho_ten: (v) => (v.trim().length >= 2 ? '' : 'Vui lòng nhập họ và tên.'),
    so_dien_thoai: (v) => {
      const digits = v.replace(/[\s.\-()]/g, '');
      if (!digits) return 'Vui lòng nhập số điện thoại.';
      return /^(\+?84|0)\d{9,10}$/.test(digits) ? '' : 'Số điện thoại chưa đúng, ví dụ: 0763 161 286.';
    },
    email: (v) => (!v.trim() || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()) ? '' : 'Email chưa đúng định dạng, ví dụ: ten@congty.vn.'),
  };

  const check = (input) => {
    const rule = rules[input.name];
    if (!rule) return true;
    const msg = rule(input.value);
    const err = document.getElementById(input.getAttribute('aria-describedby'));
    if (err) err.textContent = msg;
    input.setAttribute('aria-invalid', msg ? 'true' : 'false');
    return !msg;
  };

  form.querySelectorAll('input[name]').forEach((input) => {
    input.addEventListener('blur', () => { if (input.value) check(input); });
    input.addEventListener('input', () => { if (input.getAttribute('aria-invalid') === 'true') check(input); });
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    status.className = 'contact-form__status';
    status.textContent = '';
    const inputs = [...form.querySelectorAll('input[name]:not([type="radio"])')];
    const results = inputs.map(check);
    if (results.includes(false)) {
      inputs[results.indexOf(false)].focus();
      return;
    }

    const data = Object.fromEntries(new FormData(form));
    const kind = data.nhu_cau === 'doanh-nghiep' ? 'Doanh nghiệp' : 'Cá nhân';
    const endpoint = form.dataset.endpoint;

    if (endpoint) {
      submit.disabled = true;
      submit.textContent = 'Đang gửi…';
      try {
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({ ...data, nhu_cau: kind }),
        });
        if (!res.ok) throw new Error(String(res.status));
        form.reset();
        status.classList.add('is-ok');
        status.textContent = 'Đã gửi thông tin. Casa+ sẽ gọi lại cho bạn trong giờ làm việc.';
      } catch {
        status.classList.add('is-error');
        status.textContent = 'Chưa gửi được thông tin. Kiểm tra kết nối mạng rồi thử lại, hoặc gọi 0763 161 286.';
      } finally {
        submit.disabled = false;
        submit.textContent = 'Gửi thông tin';
      }
      return;
    }

    const subject = `Đăng ký tư vấn (${kind}) – ${data.ho_ten.trim()}`;
    const body = [
      `Họ và tên: ${data.ho_ten.trim()}`,
      `Số điện thoại: ${data.so_dien_thoai.trim()}`,
      `Email: ${data.email.trim() || '(không có)'}`,
      `Khách hàng: ${kind}`,
    ].join('\n');
    location.href = `mailto:${TO}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    status.classList.add('is-ok');
    status.textContent = 'Đã mở ứng dụng email với thông tin của bạn. Bấm Gửi trong email để hoàn tất.';
  });
}
