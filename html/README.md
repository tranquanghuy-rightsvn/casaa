# Casa+ — website gạch gốm kiến trúc in 3D

Site HTML/CSS/JS tĩnh, không cần Node, không cần build. Chỉ cần đưa toàn bộ thư mục lên hosting tĩnh (Nginx, Apache, GitHub Pages, Cloudflare Pages…).

## Cấu trúc

| Trang | File |
|---|---|
| Trang chủ | `index.html` |
| Giải pháp công nghệ in 3D | `giai-phap/index.html` → `/giai-phap/` (neo: `#cau-chuyen`, `#he-sinh-thai`, `#lam-che-nang`, `#gach-op-chuyen-mau`, `#gach-phu-dieu`, `#artwork-decor`, `#ran-san-ho`, `#nghien-cuu`, `#san-xuat`, `#ket-luan`) |
| Sơ đồ tiến trình (tổng quan) | `tien-trinh/index.html` → `/tien-trinh/` |
| Tiến trình — 5 trang con | `tien-trinh/{cau-chuyen,nghien-cuu,thiet-ke,san-xuat,lap-dat}/index.html` |
| Casa xin chào | `gioi-thieu/index.html` → `/gioi-thieu/` |
| Dịch vụ + form liên hệ | `dich-vu/index.html` → `/dich-vu/` |
| Sản phẩm | `san-pham/index.html` → `/san-pham/` (neo: `#phu-dieu`, `#op-tuong`, `#lam-hoa-gio`, `#do-decor`, `#ran-san-ho`) |
| Chi tiết sản phẩm — 5 trang | `san-pham/{lam-che-nang,gach-op-chuyen-mau,gach-phu-dieu,artwork-decor,ran-san-ho}/index.html` |
| Thư viện yêu thích (dự án đã ghim) | `thu-vien-yeu-thich/index.html` → `/thu-vien-yeu-thich/` |
| Tài khoản | `tai-khoan/index.html` → `/tai-khoan/` (đăng nhập email/Google; dashboard: thông tin, đổi mật khẩu, thư viện đã ghim) |

```
assets/
  css/main.css          toàn bộ giao diện
  js/                   mã trang (ES module, không cần biên dịch)
  img/ hero/ projects/  ảnh đã tối ưu
  logo/ figma/
index.html              các trang con nằm trong thư mục riêng
```

- Mỗi trang là một file HTML đầy đủ: header, menu, tìm kiếm và footer được chép trực tiếp vào từng trang (không dùng partial, không có bước build).
- Thư viện ngoài lấy qua CDN: GSAP + ScrollTrigger 3.15.0 (jsDelivr), font Google Fonts.
- `assets/js/projects-data.js` giữ tiêu đề/nguồn của 34 dự án cho lightbox; danh sách 34 thẻ dự án đã nằm sẵn trong `index.html`.
- Ghim dự án: `assets/js/favorites.js`. Chưa đăng nhập → lưu `localStorage` (`casa:favorites:v1`); đã đăng nhập → lưu theo tài khoản (API `/api/me/favorites`, bảng D1 `favorites`, migration `0002_favorites.sql`). Khi đăng nhập mà trình duyệt còn mục đã ghim, hiện hộp hỏi "Đồng bộ vào tài khoản" (đồng ý = gộp vào tài khoản và xoá bản trên trình duyệt; "Để sau" = không hỏi lại cho đến khi danh sách đổi). Trạng thái đăng nhập dùng chung ở `assets/js/session.js`.
- Thêm trang mới: chạy `python3 scripts/site_chrome.py` (gắn Google Analytics + link pháp lý ở footer), thêm đường dẫn vào `PAGES` trong `scripts/seo.py` rồi chạy `python3 scripts/seo.py`.
- Đổi ngôn ngữ VI/EN: `assets/js/lang.js` đọc `data-i18n` trên từng phần tử, lưu lựa chọn ở `localStorage` (`casa:lang`). Muốn dịch thêm, gắn `data-i18n="key"` và bổ sung key vào từ điển `EN` trong file này.
- Ảnh/video gốc từ Drive và Figma nằm trong `drive/` (không đưa lên hosting).

## Chạy thử

Không cần cài đặt gì. Mở thư mục bằng một static server bất kỳ, ví dụ:

```bash
python3 -m http.server 8123
# http://localhost:8123
```

(Không mở trực tiếp bằng `file://` vì các module JS và đường dẫn `/assets/...` cần chạy qua HTTP.)

## Ghi chú

- URL sạch dạng `/slug/`: mỗi trang là thư mục chứa `index.html`, host tĩnh tự phục vụ `/slug/`. Không dùng redirect `.html` và không cần cấu hình rewrite.
- Form liên hệ: đặt URL nhận dữ liệu (Formspree, Google Apps Script…) vào `data-endpoint` trong `dich-vu/index.html`. Khi để trống, nút "Gửi thông tin" mở ứng dụng email với nội dung điền sẵn gửi tới dongxuong@casa-evolution.com.
- Trang tài khoản dùng API của Worker (`worker/src`, cấu hình `wrangler.jsonc` ở thư mục gốc repo): đăng ký/đăng nhập bằng email + mật khẩu hoặc Google, sửa hồ sơ, đổi mật khẩu. Dữ liệu ở D1 `casaa`. API quản trị người dùng: `/api/admin/users` (Bearer `ADMIN_KEY` hoặc tài khoản có `role = 'admin'`).
  - Chạy ở máy: copy `.dev.vars.example` thành `.dev.vars`, `npm run db:migrate:local`, `npm run dev`.
  - `html/.assetsignore` loại `drive/`, README và ảnh chụp màn hình khỏi bản deploy.
- Hero trang chủ tua video theo cuộn: 120 khung WebP trong `assets/hero/d` (ngang, 1280×720) và `assets/hero/m` (dọc, 432×720); logic ở `assets/js/forge.js`.
  Đổi video: cắt lại bằng `ffmpeg -i video.mp4 -vf "select='not(mod(n\,3))'" -fps_mode vfr -start_number 0 d/%03d.png` (chỉnh hệ số 3 để ra đúng 120 khung) rồi chuyển sang WebP bằng `cwebp -q 70`.
