import { currentLang, t } from './lang.js';
// Contact form: validates in Vietnamese, then sends to data-endpoint (JSON POST)
// or, when no endpoint is configured, opens the visitor's email app with the details filled in.
const TO = 'dongxuong@casa-evolution.com';

// Mỗi trang có thể có nhiều form (vd /dich-vu/: form tư vấn + form "Trải nghiệm in mẫu 3D").
export function initContactForm() {
  document.querySelectorAll('[data-contact-form]').forEach(setupForm);
}

const KIND = { 'doanh-nghiep': 'Doanh nghiệp', 'trai-nghiem': 'Trải nghiệm in mẫu 3D', 'ca-nhan': 'Cá nhân' };

function setupForm(form) {
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
    ho_ten: (v) => (v.trim().length >= 2 ? '' : t('Vui lòng nhập họ và tên.', 'Please enter your full name.')),
    so_dien_thoai: (v) => {
      const digits = v.replace(/[\s.\-()]/g, '');
      if (!digits) return t('Vui lòng nhập số điện thoại.', 'Please enter your phone number.');
      return /^(\+?84|0)\d{9,10}$/.test(digits) ? '' : t('Số điện thoại chưa đúng, ví dụ: 0763 161 286.', 'Invalid phone number, e.g. 0763 161 286.');
    },
    link: (v) => (/^https?:\/\/\S+\.\S+/i.test(v.trim()) ? '' : t('Vui lòng dán đường link Google Drive (bắt đầu bằng https://).', 'Please paste a Google Drive link (starting with https://).')),
    email: (v) => (!v.trim() || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()) ? '' : t('Email chưa đúng định dạng, ví dụ: ten@congty.vn.', 'Invalid email address, e.g. name@company.com.')),
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
    const inputs = [...form.querySelectorAll('input[name]:not([type="radio"]):not([type="hidden"]):not([name="website"])')];
    const results = inputs.map(check);
    if (results.includes(false)) {
      inputs[results.indexOf(false)].focus();
      return;
    }

    const data = Object.fromEntries(new FormData(form));
    const kind = KIND[data.nhu_cau] || 'Cá nhân';
    const endpoint = form.dataset.endpoint;

    if (endpoint) {
      submit.disabled = true;
      submit.textContent = t('Đang gửi…', 'Sending…');
      try {
        // Endpoint là web app Google Apps Script (CMS): gửi text/plain để không phát sinh
        // CORS preflight (GAS không trả lời OPTIONS); GAS vẫn đọc được JSON trong thân.
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({ ...data, nhu_cau: kind, trang: location.pathname, lang: currentLang() }),
        });
        const out = await res.json().catch(() => ({}));
        if (!res.ok || !out.ok) {
          const err = new Error(out.error || String(res.status));
          err.server = Boolean(out.error);
          throw err;
        }
        form.reset();
        status.classList.add('is-ok');
        status.textContent = data.nhu_cau === 'trai-nghiem'
          ? t('Đã gửi link. Cảm ơn bạn, Casa+ sẽ xem và phản hồi sớm.', 'Link sent. Thank you, Casa+ will review it soon.')
          : t('Đã gửi thông tin. Casa+ sẽ gọi lại cho bạn trong giờ làm việc.', 'Thank you! Casa+ will call you back during working hours.');
      } catch (err) {
        status.classList.add('is-error');
        status.textContent = err.server
          ? err.message
          : t('Chưa gửi được thông tin. Kiểm tra kết nối mạng rồi thử lại, hoặc gọi 0763 161 286.', 'Could not send your details. Check your connection and try again, or call +84 763 161 286.');
      } finally {
        submit.disabled = false;
        submit.textContent = t('Gửi thông tin', 'Send details');
      }
      return;
    }

    const subject = `Đăng ký tư vấn (${kind}) – ${(data.ho_ten || '').trim()}`;
    const body = [
      `Họ và tên: ${(data.ho_ten || '').trim()}`,
      `Số điện thoại: ${(data.so_dien_thoai || '').trim()}`,
      `Email: ${(data.email || '').trim() || '(không có)'}`,
      ...(data.link ? [`Link Google Drive: ${data.link.trim()}`] : []),
      `Khách hàng: ${kind}`,
    ].join('\n');
    location.href = `mailto:${TO}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    status.classList.add('is-ok');
    status.textContent = t('Đã mở ứng dụng email với thông tin của bạn. Bấm Gửi trong email để hoàn tất.', 'Your email app has opened with your details. Press Send to finish.');
  });
}
