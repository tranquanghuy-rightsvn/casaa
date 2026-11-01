# Casa+ — website gạch gốm kiến trúc in 3D

Site HTML/CSS/JS tĩnh, không cần Node, không cần build. Chỉ cần đưa toàn bộ thư mục lên hosting tĩnh (Nginx, Apache, GitHub Pages, Cloudflare Pages…).

## Cấu trúc

| Trang | File |
|---|---|
| Trang chủ | `index.html` |
| Sơ đồ tiến trình | `tien-trinh/index.html` → `/tien-trinh/` (neo: `#cau-chuyen`, `#nghien-cuu`, `#thiet-ke`, `#san-xuat`, `#lap-dat`, `#phu-dieu`, `#op-tuong`, `#lam-hoa-gio`, `#do-decor`, `#ran-san-ho`) |
| Casa xin chào | `gioi-thieu/index.html` → `/gioi-thieu/` |
| Dịch vụ + form liên hệ | `dich-vu/index.html` → `/dich-vu/` |
| Sản phẩm | `san-pham/index.html` → `/san-pham/` (neo: `#phu-dieu`, `#op-tuong`, `#lam-hoa-gio`, `#do-decor`, `#ran-san-ho`) |
| Tài khoản (đăng nhập / đăng ký) | `tai-khoan/index.html` → `/tai-khoan/` |

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
- Trang tài khoản chỉ kiểm tra dữ liệu phía trình duyệt và hiện thông báo hotline; chưa kết nối backend.
- Hero trang chủ tua video theo cuộn: 120 khung WebP trong `assets/hero/d` (ngang, 1280×720) và `assets/hero/m` (dọc, 432×720); logic ở `assets/js/forge.js`.
  Đổi video: cắt lại bằng `ffmpeg -i video.mp4 -vf "select='not(mod(n\,3))'" -fps_mode vfr -start_number 0 d/%03d.png` (chỉnh hệ số 3 để ra đúng 120 khung) rồi chuyển sang WebP bằng `cwebp -q 70`.
