// Bảng đường dẫn tiếng Việt -> tiếng Anh (slug tiếng Anh cho SEO). NGUỒN DUY NHẤT: lang.js,
// scripts/build_en.py, scripts/seo.py, worker (chuyển hướng URL cũ) và CMS (gas/Code.js — chép
// tay EN_PATHS_) đều theo bảng này. Thêm trang mới: thêm 1 dòng ở đây + các nơi trên.
// Giữ đúng dạng JSON giữa 2 dấu ROUTES:start/end (script Python đọc trực tiếp).
export const EN_ROUTES = /* ROUTES:start */ {
  "/": "/en/",
  "/giai-phap/": "/en/solutions/",
  "/san-pham/": "/en/products/",
  "/san-pham/lam-che-nang/": "/en/products/sun-louvers/",
  "/san-pham/gach-op-chuyen-mau/": "/en/products/gradient-glaze-tiles/",
  "/san-pham/gach-phu-dieu/": "/en/products/relief-tiles/",
  "/san-pham/artwork-decor/": "/en/products/artwork-decor/",
  "/san-pham/ran-san-ho/": "/en/products/coral-reef/",
  "/tien-trinh/": "/en/process/",
  "/tien-trinh/cau-chuyen/": "/en/process/story/",
  "/tien-trinh/nghien-cuu/": "/en/process/research/",
  "/tien-trinh/thiet-ke/": "/en/process/design/",
  "/tien-trinh/san-xuat/": "/en/process/production/",
  "/tien-trinh/lap-dat/": "/en/process/installation/",
  "/dich-vu/": "/en/services/",
  "/gioi-thieu/": "/en/about/",
  "/thu-vien-yeu-thich/": "/en/favourites/",
  "/tai-khoan/": "/en/account/",
  "/chinh-sach-bao-mat/": "/en/privacy-policy/",
  "/dieu-khoan/": "/en/terms/"
} /* ROUTES:end */;

export const VI_ROUTES = Object.fromEntries(Object.entries(EN_ROUTES).map(([vi, en]) => [en, vi]));
