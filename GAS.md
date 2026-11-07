# GAS.md — Guideline CMS Casa+ (3d-printedfacade.com)

Nguồn chân lý cho mọi quyết định nghiệp vụ của CMS. Đọc TOÀN BỘ trước khi sửa bất kỳ file nào
trong `gas/`. Code lệch guideline → sửa code hoặc hỏi lại chủ dự án, KHÔNG tự đổi guideline.
Dựng theo skill `free-cms-static-site-pipeline`, mô hình soạn trực quan của dự án
kynghenguyenminh (nguyenminhltd.vn).

## 0. Kiến trúc

```
/admin/ (html/admin/index.html, iframe) ──► GAS web app (gas/, đẩy bằng clasp)
   GAS ── GitHub Git Data API ──► repo tranquanghuy-rightsvn/casaa, nhánh master (html/**)
                                     └─► Cloudflare Workers Builds tự `wrangler deploy` (~1 phút)
   GAS ── Worker API /api/admin/users (Bearer SITE_API_KEY = secret ADMIN_KEY của Worker)
         └─► D1 `casaa` (tài khoản khách của website)
```

- **File HTML trong `html/` trên GitHub LÀ nguồn chân lý nội dung.** Không có data/*.json, không
  có bước build. CMS đọc file HTML, thay đúng vùng có mốc, commit lại.
- Mỗi lần Lưu = **1 commit** (Git Data API: blob → tree → commit → cập nhật ref), kể cả khi có
  nhiều file/ảnh — tránh mỗi ảnh 1 lần build.
- Workers Builds chỉ deploy Worker + html/. Migration D1 vẫn chạy tay (`npm run db:migrate`).
- `gas/` và `.clasp.json` gitignore, không track git. Project Apps Script: scriptId
  `10arPAWtObacoqjP4BnwEBIyLZXWEgthzjVlv9QSBsG7QJ1gfwy1Ky4Mt`, deployment `/exec`:
  `AKfycbxV8YNx7ati6_cFAEnyMITRvpo3scwdBayVV7D0AMEjXSAQepZLPIuK6AjuhEZNn8Fm` (deploy lại
  bằng `clasp deploy -i <deploymentId>` để GIỮ nguyên URL).

## I. Đăng nhập

1. OTP qua email (MailApp) → token UUID lưu Script Properties (`tok_<uuid>`), sống 30 ngày,
   client giữ ở localStorage. Dọn token hết hạn mỗi lần verifyOtp; Đăng xuất thu hồi token
   trên server rồi mới reload.
2. Chỉ email có trong sheet `Admins` (hoặc chủ script) mới được gửi OTP.
3. Chủ script (`Session.getEffectiveUser()`, hiện là web100.vn@gmail.com) là **root đặc biệt**:
   luôn có toàn quyền, không nằm trong sheet, **không hiện trong danh sách Quản trị viên** (lỡ ghi
   vào sheet cũng bị lọc), không ai thêm/sửa/xoá được.
4. OTP sống 10 phút, cooldown 60 giây/email, sai 5 lần phải xin mã mới.
5. Server tự `requireRole_` ở MỌI hàm — ẩn tab trên UI không phải bảo mật.

## II. Phân quyền (chốt 07/11/2026)

`ROLE_RANK = { editor: 1, admin: 2, root: 3 }`

| Quyền | root | admin | editor |
|---|---|---|---|
| Giao diện website (soạn trực quan từng trang) | ✅ | — | — |
| Quản lý chung (logo, liên hệ, mạng xã hội, banner, video hero, tiêu đề/H1/banner từng trang) | ✅ | — | — |
| Người dùng website — xem danh sách | ✅ | ✅ | ✅ |
| Người dùng website — sửa tên/SĐT/ghi chú, khoá/mở, đăng xuất mọi thiết bị, xoá | ✅ | ✅ | — |
| Liên hệ — xem danh sách | ✅ | ✅ | ✅ |
| Liên hệ — đánh dấu đã xử lý, ghi chú, xoá | ✅ | ✅ | — |
| Quản trị viên — xem | ✅ | ✅ | — |
| Quản trị viên — thêm/đổi vai trò/xoá | mọi vai trò (root/admin/editor) | chỉ editor | — |

- Không ai tự đổi vai trò/xoá chính mình; không ai đụng được chủ script.
- "Người dùng website" = tài khoản khách đăng ký trên site (D1 `users`), khác hẳn quản trị viên
  CMS (sheet `Admins`). Cột `role` của D1 KHÔNG chỉnh qua CMS.

## III-a. Ngôn ngữ (chốt 07/11/2026)

- Mỗi trang có 2 file TĨNH: tiếng Việt `html/<slug>/index.html` (URL `/<slug>/`) và tiếng Anh
  với **slug tiếng Anh** cho SEO, vd `/tai-khoan/` ↔ `/en/account/`, `/dich-vu/` ↔ `/en/services/`
  (file `html/en/account/index.html`). Bảng đường dẫn duy nhất: `html/assets/js/routes.js`
  (dùng bởi `lang.js`, `build_en.py`, `seo.py`, Worker); CMS chép lại ở `EN_PATHS_` trong
  `gas/Code.js` — thêm trang mới phải sửa cả 2. Trang 404 chỉ có bản VI.
- URL tiếng Anh đời đầu `/en/<slug-việt>/` được Worker chuyển hướng 301 sang slug tiếng Anh.
- Không dịch bằng JS nữa. `lang.js`: ngôn ngữ = `<html lang>`, nút cờ chuyển sang URL bản kia;
  chữ do JS sinh ra dùng `t('vi', 'en')` / `localPath()`.
- Bản EN khởi tạo 1 lần bằng `scripts/build_en.py` (từ điển `scripts/i18n/dict.json` +
  `extra.json`). Từ đó **file EN là nguồn chân lý**, sửa qua CMS; KHÔNG chạy lại build_en (có
  `--force` mới ghi đè). Trang mới: `python3 scripts/build_en.py --only <slug>`.
- Hai bản dùng CHUNG số mốc `data-cms-*` (EN sinh từ VI). **Chữ sửa riêng** từng ngôn ngữ.
  **Ảnh mặc định ĐỒNG BỘ** (chốt 07/11/2026): đổi ảnh trong nội dung (`saveContent`) hoặc banner
  đầu trang (`savePageMeta`) ở bản nào thì bản kia nhận cùng file ảnh, trong cùng 1 commit; bản
  kia thiếu mốc thì bỏ qua. Ô "Chỉ đổi ảnh ở bản này" / "Chỉ bản này" (`imagesThisLangOnly`,
  `bannerThisLangOnly`) để tắt — khi đó ảnh bản EN có hậu tố `-en`.
- SEO: canonical riêng, `hreflang` vi/en/x-default, `og:locale`, sitemap có cả 2 bản (`seo.py`).

## III. Giao diện website (soạn trực quan)

- Nút **🇻🇳 Tiếng Việt | 🇬🇧 English** chọn bản đang sửa (iframe nạp URL VI hoặc URL EN theo `EN_PATHS_`).
  Đổi ngôn ngữ khi còn thay đổi chưa lưu → hỏi.

- Tab con theo nhóm trang: Trang chủ · Giải pháp · Sản phẩm (+5 trang chi tiết) · Tiến trình (+5
  trang con) · Dịch vụ · Giới thiệu · Thư viện yêu thích · Tài khoản · Pháp lý (2) · Trang 404.
  Danh sách nằm ở `PAGES` trong `gas/Code.js`.
- Iframe nạp trang thật `SITE_BASE_URL + url + ?cms=1`. `html/assets/js/main.js` thấy `?cms=1`
  + đang trong iframe → nạp `cms-edit.js`, ép tiếng Việt, hiện hết khối `data-reveal`, chặn
  link/submit.
- Mốc sửa được do `scripts/cms_tag.py` gắn (chạy lại an toàn, số mốc cũ giữ nguyên):
  - `data-cms-t="N"` chữ thuần · `data-cms-h="N"` chữ có định dạng nội tuyến (sửa innerHTML,
    Shift+Enter xuống dòng) · `data-cms-img="N"` ảnh. N duy nhất trong 1 file.
  - Chỉ trong `<main>`. Bỏ qua phần JS sinh ra (lưới dự án `.masonry`, thư viện yêu thích, form
    tài khoản, lightbox), form, nút, svg, icon < 64px.
  - **Thêm trang/khối mới → chạy `python3 scripts/cms_tag.py`** rồi commit.
- Dán chữ luôn ở dạng thuần. Server lọc HTML của mốc `-h`: chỉ giữ a, span, strong, em, b, i,
  u, br, small, sup, sub, mark; bỏ thuộc tính `on*`, `style`, link `javascript:`.
- Ảnh: nén phía trình duyệt (cạnh dài ≤1920px, WebP 0.82; PNG giữ PNG nếu ảnh gốc là PNG). Mỗi
  ảnh mới là **file mới** `html/assets/img/cms/<slug>-<key>-<timestamp>.<ext>` — KHÔNG ghi đè ảnh
  cũ vì ảnh dùng chung nhiều trang. Lưu thay `src`, bỏ `srcset/sizes`, cập nhật width/height.
- Bản tiếng Anh dịch theo câu VI chính xác (`i18n-phrases.js`): sửa câu VI qua CMS thì bản EN
  của câu đó hiện tiếng Việt cho tới khi dev bổ sung bản dịch.

## IV. Quản lý chung (áp dụng TẤT CẢ trang VI + EN trong 1 commit)

Tiêu đề/H1/banner từng trang có nút VI/EN riêng (`savePageMeta(token, slug, lang, data)`).

Mốc `data-cms-g*` (gắn bởi `cms_tag.py`):

| Field | Mốc | Ghi chú |
|---|---|---|
| Logo header + footer | `data-cms-g-src="logo"` | ảnh mới → `assets/img/cms/logo-<ts>.<ext>` |
| Favicon | `data-cms-g-href="favicon"` | PNG |
| Banner trích dẫn (cuối trang) | `data-cms-g-src="quote_banner"` | |
| Ảnh chia sẻ MXH | ghi đè `html/assets/img/og-cover.jpg` | JPEG 1200px |
| Tên công ty, địa chỉ, giờ mở cửa | `data-cms-g="company|address|hours"` | chữ, **2 ô VI/EN** (áp cho file VI / file EN) |
| Hotline | `data-cms-g="phone"` + `data-cms-g-href="phone"` | href `tel:<số>` |
| Email | `data-cms-g="email"` + `data-cms-g-href="email"` | href `mailto:` |
| Facebook, YouTube, Pinterest | `data-cms-g-href="facebook|youtube|pinterest"` | phải http(s) |
| Zalo (menu/footer) | `data-cms-g-href="zalo"` | nhập số → `https://zalo.me/<số>` |
| Nút gọi nổi, nút Zalo nổi | `data-cms-g-href/aria="float_phone|float_zalo"` | aria-label "Gọi…" / "Call…" theo ngôn ngữ file |
| Video hero trang chủ | ghi đè `html/assets/hero/{d,m}/000–119.webp` | xem dưới |
| Tiêu đề, mô tả, H1, banner từng trang | `<title>`, meta description, og/twitter, JSON-LD; H1 = mốc trang của thẻ h1; banner = ảnh `data-cms-img` đầu tiên trong `<main>` | 1 commit/trang. H1 có thẻ con (vd 2 dòng hero trang chủ) hiện thành từng ô "Phần 1, 2…" — KHÔNG hiện HTML; lưu chỉ thay chữ, giữ nguyên thẻ |

- Thông tin liên hệ nằm TRONG nội dung trang (vd khối liên hệ /dich-vu/, trang pháp lý) là mốc
  riêng của trang — sửa ở tab Giao diện, không tự đồng bộ theo Quản lý chung.
- JSON-LD tổ chức (telephone/email/address) trong `<!-- seo -->` chỉ sinh lại khi dev chạy
  `scripts/seo.py`.
- **Video hero**: chọn file video → trình duyệt tự cắt 120 khung đều nhau, vẽ 1280×720 (ngang,
  phủ kín) và 432×720 (dọc, cắt giữa), WebP 0.7 → tải blob lên theo lô 10 khung → 1 commit 240
  file.

## V. Người dùng website (qua Worker)

- `GET/PATCH/DELETE /api/admin/users[/<id>]`, `POST /api/admin/users/<id>/logout`, header
  `Authorization: Bearer <SITE_API_KEY>`. Worker tự đăng xuất người bị khoá.
- Danh sách 50/trang, tìm theo email/tên/SĐT.

## V-b. Liên hệ (form /dich-vu/)

- Form `[data-contact-form]` có `data-endpoint` = URL `/exec` của CMS; `contact-form.js` gửi
  `fetch POST` với `Content-Type: text/plain;charset=utf-8` (tránh CORS preflight), thân JSON
  `{ nhu_cau, ho_ten, so_dien_thoai, email, trang, website }`.
- `doPost` → `handleLead_`: honeypot `website` (khác rỗng = bot, trả ok nhưng bỏ qua); kiểm tra
  họ tên ≥2 ký tự, SĐT VN, email (không bắt buộc); giới hạn 1 lần/120 giây/số điện thoại;
  LockService khi ghi sheet `Leads`.
- Gửi mail báo tới **đúng 1 email** ở Script Property `NOTIFY_EMAIL` (chỉ đổi trong Project
  Settings → Script Properties, KHÔNG có ô sửa trong CMS). Chưa có / sai định dạng / nhiều email
  → không gửi mail (lead vẫn lưu), CMS mục Liên hệ và log `setup()` báo rõ. replyTo = email
  khách. Dùng chung quota MailApp (~100/ngày) với OTP đăng nhập.
- CMS mục **Liên hệ**: lọc Chưa xử lý / Đã xử lý / Tất cả, tìm kiếm, badge số chưa xử lý ở sidebar.

## VI. UX chung

- Bố cục theo CMS adzo: sidebar tối cố định bên trái (logo + email + vai trò, các mục
  Giao diện website · Quản lý chung · Người dùng · Quản trị viên, cuối là Xem website · Đăng
  xuất); mục không thuộc quyền bị ẩn. Màn hình < 760px: sidebar chuyển lên trên.

- Modal xác nhận (Huỷ/Đồng ý) và modal thông báo (Đóng) riêng, không alert()/confirm() native.
- Mọi nút async: disable + spinner, tự phục hồi khi lỗi.
- Sau lưu: thông báo kèm "Cần khoảng 1 phút để website cập nhật".
- Rời trang/đổi tab con khi còn thay đổi chưa lưu → hỏi xác nhận.

## VII. Lưu trữ

- Spreadsheet `Casa+ — CMS Data` (tự tạo lần đầu, id ở `SPREADSHEET_ID`):
  - sheet `Admins`: cột `email | role | added_by | added_at`, role ∈ `root|admin|editor`.
  - sheet `Leads`: cột `id | timestamp | nhu_cau | ho_ten | so_dien_thoai | email | trang | da_xu_ly | ghi_chu | xu_ly_boi`.
- GitHub: `html/**/*.html`, `html/assets/img/cms/*`, `html/assets/img/og-cover.jpg`,
  `html/assets/hero/{d,m}/*.webp`.

## VIII. Script Properties (tên CỐ ĐỊNH)

| Key | Bắt buộc | Giá trị |
|---|---|---|
| `GITHUB_TOKEN` | ✅ | PAT quyền `repo` (Contents read/write) trên `tranquanghuy-rightsvn/casaa` |
| `SITE_API_KEY` | ✅ | trùng secret `ADMIN_KEY` của Worker `casaa`. Đang để trong `gas/Secrets.js` (chỉ nằm trong project Apps Script, không track git); Script Property cùng tên sẽ ghi đè. Đổi key: `wrangler secret put ADMIN_KEY` + sửa `gas/Secrets.js` + `clasp push`. |
| `GITHUB_OWNER` / `GITHUB_REPO` / `GITHUB_BRANCH` | — | mặc định `tranquanghuy-rightsvn` / `casaa` / `master` |
| `SITE_BASE_URL` | — | mặc định `https://3d-printedfacade.com` |
| `NOTIFY_EMAIL` | nên có | đúng 1 email nhận thông báo khi có liên hệ mới |
| `SPREADSHEET_ID` | tự sinh | |

## IX. Cài đặt / deploy

1. `cd gas && npx @google/clasp@3 push -f && npx @google/clasp@3 deploy -i AKfycbxV8YNx7ati6_cFAEnyMITRvpo3scwdBayVV7D0AMEjXSAQepZLPIuK6AjuhEZNn8Fm -d "<mô tả>"`
   (giữ nguyên URL `/exec`; `.clasp.json` trong `gas/` chứa scriptId).
2. Lần đầu: chủ script mở trình soạn thảo Apps Script → chọn hàm `setup` → Run → cấp quyền. Log
   in ra Spreadsheet, tình trạng GITHUB_TOKEN, GitHub, API người dùng website.
3. Project Settings → Script Properties → thêm `GITHUB_TOKEN`.
4. Cloudflare dashboard → Workers & Pages → `casaa` → Settings → Builds → kết nối repo
   `tranquanghuy-rightsvn/casaa`, nhánh `master`, deploy command `npx wrangler deploy`.
5. Kiểm tra client trước khi push: `node scripts/check_gas_client.mjs`.
