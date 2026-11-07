#!/usr/bin/env python3
"""Đảm bảo mọi trang trong html/ có Google Analytics (gtag) đầu <head> và link pháp lý ở footer.
Chạy lại an toàn (bỏ qua trang đã có). Dùng khi thêm trang mới:

    python3 scripts/site_chrome.py && python3 scripts/seo.py
"""
from pathlib import Path

HTML = Path(__file__).resolve().parent.parent / "html"
GTAG = """  <!-- Google tag (gtag.js) -->
  <script async src="https://www.googletagmanager.com/gtag/js?id=G-G2K3XETHKD"></script>
  <script>
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());

    gtag('config', 'G-G2K3XETHKD');
  </script>
"""
LEGAL = """      <nav class="site-footer__legal" aria-label="Pháp lý">
        <a href="/chinh-sach-bao-mat/">Chính sách bảo mật</a>
        <a href="/dieu-khoan/">Điều khoản sử dụng</a>
      </nav>
"""


def main():
    for f in sorted(HTML.rglob("*.html")):
        if "drive" in f.relative_to(HTML).parts:
            continue
        s = f.read_text(encoding="utf-8")
        before = s
        if "G-G2K3XETHKD" not in s:
            s = s.replace("<head>\n", "<head>\n" + GTAG, 1)
        if "site-footer__legal" not in s:
            i = s.find('      <a class="to-top"')
            if i != -1:
                s = s[:i] + LEGAL + s[i:]
        if s != before:
            f.write_text(s, encoding="utf-8")
            print("ok", f.relative_to(HTML))


if __name__ == "__main__":
    main()
