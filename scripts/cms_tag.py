#!/usr/bin/env python3
"""Gắn MỐC cho CMS (GAS) vào mọi trang trong html/ — chạy lại an toàn (idempotent).

1) Mốc DÙNG CHUNG toàn site (header, menu, footer, nút liên hệ nổi, banner trích dẫn, favicon):
     data-cms-g="KEY"        -> nội dung chữ của thẻ là giá trị KEY
     data-cms-g-href="KEY"   -> href của thẻ suy ra từ KEY (tel:, mailto:, zalo.me/...)
     data-cms-g-src="KEY"    -> src của ảnh là KEY (logo, banner)
     data-cms-g-aria="KEY"   -> aria-label suy ra từ KEY (nút gọi/Zalo nổi)
   CMS tab "Quản lý chung" đọc/ghi các mốc này trên TẤT CẢ trang cùng lúc.

2) Mốc RIÊNG từng trang, chỉ trong <main>:
     data-cms-t="N"   chữ thuần (thẻ không có thẻ con)
     data-cms-h="N"   chữ có định dạng nội tuyến (strong, span, br, a...) — sửa innerHTML
     data-cms-img="N" ảnh
   N là số duy nhất trong 1 file; mốc đã có giữ nguyên số, phần tử mới nhận số tiếp theo.
   CMS tab "Giao diện website" sửa trực quan các mốc này (html/assets/js/cms-edit.js).

Bỏ qua: nội dung do JS sinh ra (lưới dự án .masonry, thư viện yêu thích, form tài khoản,
lightbox...), form, nút bấm, svg, phần tử ẩn cho trình đọc màn hình.

    python3 scripts/cms_tag.py
"""
import re
from html.parser import HTMLParser
from pathlib import Path

HTML = Path(__file__).resolve().parent.parent / "html"

# ---------------------------------------------------------------- 1) mốc dùng chung

CHROME = [
    # (chuỗi gốc, chuỗi thay) — áp dụng mọi chỗ khớp; bỏ qua nếu đã gắn
    ('<img class="logo-light" src=', '<img class="logo-light" data-cms-g-src="logo" src='),
    ('<img src="/assets/logo/casa-white.png" width="765" height="337" alt="Casa+" class="site-footer__logo"',
     '<img data-cms-g-src="logo" src="/assets/logo/casa-white.png" width="765" height="337" alt="Casa+" class="site-footer__logo"'),
    ('<link rel="icon" type="image/png" href=', '<link rel="icon" type="image/png" data-cms-g-href="favicon" href='),
    ('<a href="tel:0763161286">0763 161 286</a>',
     '<a href="tel:0763161286" data-cms-g-href="phone" data-cms-g="phone">0763 161 286</a>'),
    ('<a href="tel:0763161286">Hotline 0763 161 286</a>',
     '<a href="tel:0763161286" data-cms-g-href="phone">Hotline <span data-cms-g="phone">0763 161 286</span></a>'),
    ('<a href="mailto:dongxuong@casa-evolution.com">dongxuong@casa-evolution.com</a>',
     '<a href="mailto:dongxuong@casa-evolution.com" data-cms-g-href="email" data-cms-g="email">dongxuong@casa-evolution.com</a>'),
    ('<p class="menu__muted">76/50B Phan Tây Hồ, Phường Cầu Kiệu, TP Hồ Chí Minh</p>',
     '<p class="menu__muted" data-cms-g="address">76/50B Phan Tây Hồ, Phường Cầu Kiệu, TP Hồ Chí Minh</p>'),
    ('<p class="muted">76/50B Phan Tây Hồ, Phường Cầu Kiệu, TP Hồ Chí Minh, Việt Nam</p>',
     '<p class="muted"><span data-cms-g="address">76/50B Phan Tây Hồ, Phường Cầu Kiệu, TP Hồ Chí Minh</span>, Việt Nam</p>'),
    ('<p class="menu__muted">Mở cửa 9:00 – 18:30</p>', '<p class="menu__muted" data-cms-g="hours">Mở cửa 9:00 – 18:30</p>'),
    ('<li class="muted">Mở cửa 9:00 – 18:30</li>', '<li class="muted" data-cms-g="hours">Mở cửa 9:00 – 18:30</li>'),
    ('<p>Công ty Cổ phần Dịch vụ và Giáo dục C.A.S</p>', '<p data-cms-g="company">Công ty Cổ phần Dịch vụ và Giáo dục C.A.S</p>'),
    ('<a href="https://www.facebook.com/Dongxuongpoweredbycasa" target="_blank" rel="noopener">Facebook</a>',
     '<a href="https://www.facebook.com/Dongxuongpoweredbycasa" data-cms-g-href="facebook" target="_blank" rel="noopener">Facebook</a>'),
    ('<a href="https://www.youtube.com/@Dongxuongpoweredbycasa" target="_blank" rel="noopener">YouTube</a>',
     '<a href="https://www.youtube.com/@Dongxuongpoweredbycasa" data-cms-g-href="youtube" target="_blank" rel="noopener">YouTube</a>'),
    ('<a href="https://www.pinterest.com/Dongxuongcasa/case-study-in3d-g%E1%BB%91m/" target="_blank" rel="noopener">Pinterest</a>',
     '<a href="https://www.pinterest.com/Dongxuongcasa/case-study-in3d-g%E1%BB%91m/" data-cms-g-href="pinterest" target="_blank" rel="noopener">Pinterest</a>'),
    ('<a href="https://zalo.me/0763161286" target="_blank" rel="noopener">Zalo</a>',
     '<a href="https://zalo.me/0763161286" data-cms-g-href="zalo" target="_blank" rel="noopener">Zalo</a>'),
    ('<a class="float-contact__btn float-contact__btn--phone" href="tel:0765161286" aria-label="Gọi 0765 161 286">',
     '<a class="float-contact__btn float-contact__btn--phone" data-cms-g-href="float_phone" data-cms-g-aria="float_phone" href="tel:0765161286" aria-label="Gọi 0765 161 286">'),
    ('<a class="float-contact__btn float-contact__btn--zalo" href="https://zalo.me/0765161286" target="_blank" rel="noopener" aria-label="Nhắn Zalo 0765 161 286">',
     '<a class="float-contact__btn float-contact__btn--zalo" data-cms-g-href="float_zalo" data-cms-g-aria="float_zalo" href="https://zalo.me/0765161286" target="_blank" rel="noopener" aria-label="Nhắn Zalo 0765 161 286">'),
    ('<img src="/assets/img/quote-banner.webp"', '<img data-cms-g-src="quote_banner" src="/assets/img/quote-banner.webp"'),
]


def tag_chrome(s):
    for old, new in CHROME:
        if old in s:
            s = s.replace(old, new)
    return s


# ---------------------------------------------------------------- 2) mốc từng trang

VOID = {"area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "source", "track", "wbr"}
INLINE = {"a", "span", "strong", "em", "b", "i", "u", "small", "br", "sup", "sub", "mark", "abbr", "cite",
          "q", "time", "s", "wbr", "code"}
TEXTABLE = {"h1", "h2", "h3", "h4", "h5", "h6", "p", "li", "dt", "dd", "figcaption", "blockquote", "td", "th",
            "a", "span", "strong", "em", "b", "small", "label", "summary", "cite", "q", "time", "div"}
SKIP_TAGS = {"script", "style", "svg", "form", "button", "select", "textarea", "template", "noscript",
             "dialog", "canvas", "video", "picture", "iframe"}
SKIP_CLASS = re.compile(r"\b(masonry|pin|pin-wrap|visually-hidden|fav-[\w-]+|lightbox[\w-]*|search[\w-]*)\b")
SKIP_ATTR = ("data-fav-grid", "data-fav-empty", "data-fav-preview", "data-account-root", "data-lightbox",
             "data-lb-", "data-search", "data-cms-g", "data-year", "data-slide-current", "hidden")
KEY_ATTRS = ("data-cms-t", "data-cms-h", "data-cms-img")


class Node:
    __slots__ = ("tag", "attrs", "start", "start_end", "children", "text", "parent", "skip")

    def __init__(self, tag, attrs, start, start_end, parent):
        self.tag, self.attrs, self.start, self.start_end, self.parent = tag, attrs, start, start_end, parent
        self.children, self.text, self.skip = [], "", False


class Tree(HTMLParser):
    def __init__(self, src):
        super().__init__(convert_charrefs=True)
        self.src = src
        self.lines = [0]
        for m in re.finditer("\n", src):
            self.lines.append(m.end())
        self.root = Node("#root", {}, 0, 0, None)
        self.cur = self.root

    def off(self):
        line, col = self.getpos()
        return self.lines[line - 1] + col

    def handle_starttag(self, tag, attrs):
        start = self.off()
        text = self.get_starttag_text()
        node = Node(tag, dict(attrs), start, start + len(text), self.cur)
        self.cur.children.append(node)
        if tag not in VOID:
            self.cur = node

    def handle_startendtag(self, tag, attrs):
        start = self.off()
        text = self.get_starttag_text()
        self.cur.children.append(Node(tag, dict(attrs), start, start + len(text), self.cur))

    def handle_endtag(self, tag):
        n = self.cur
        while n is not self.root and n.tag != tag:
            n = n.parent
        if n is not self.root:
            self.cur = n.parent

    def handle_data(self, data):
        self.cur.text += data


def skipped(n):
    if n.tag in SKIP_TAGS:
        return True
    if SKIP_CLASS.search(n.attrs.get("class") or ""):
        return True
    return any(k.startswith(p) for k in n.attrs for p in SKIP_ATTR)


def has_text(n):
    return bool(n.text.strip()) or any(has_text(c) for c in n.children)


def only_inline(n):
    # Thẻ con nội tuyến; riêng span .visually-hidden (nhãn cho trình đọc màn hình) vẫn được
    # chấp nhận — nó nằm nguyên trong innerHTML khi sửa.
    def ok(c):
        if c.tag not in INLINE:
            return False
        if skipped(c) and "visually-hidden" not in (c.attrs.get("class") or ""):
            return False
        return only_inline(c)
    return all(ok(c) for c in n.children)


def find_main(n):
    if n.tag == "main":
        return n
    for c in n.children:
        r = find_main(c)
        if r:
            return r
    return None


def tag_page(s):
    tree = Tree(s)
    tree.feed(s)
    main = find_main(tree.root)
    if not main:
        return s, 0

    used = set()
    for m in re.finditer(r'data-cms-(?:t|h|img)="(\d+)"', s):
        used.add(int(m.group(1)))
    counter = [max(used) if used else 0]
    inserts = []  # (vị trí, chuỗi chèn)

    def new_key():
        counter[0] += 1
        return str(counter[0])

    def add(n, attr):
        if any(a in n.attrs for a in KEY_ATTRS):
            return
        end = n.start_end - (2 if s[n.start_end - 2:n.start_end] == "/>" else 1)
        while s[end - 1].isspace():
            end -= 1
        inserts.append((end, f' {attr}="{new_key()}"'))

    def walk(n):
        for c in n.children:
            if skipped(c):
                continue
            if c.tag == "img":
                w = c.attrs.get("width") or ""
                if not (w.isdigit() and int(w) < 64):  # bỏ icon trang trí nhỏ (lá, mũi tên...)
                    add(c, "data-cms-img")
                continue
            if c.tag in TEXTABLE and has_text(c) and only_inline(c):
                add(c, "data-cms-h" if c.children else "data-cms-t")
                continue
            walk(c)

    walk(main)
    for pos, text in sorted(inserts, reverse=True):
        s = s[:pos] + text + s[pos:]
    return s, len(inserts)


def main():
    for f in sorted(HTML.rglob("*.html")):
        rel = f.relative_to(HTML)
        if rel.parts[0] in ("drive", "admin"):
            continue
        s0 = f.read_text(encoding="utf-8")
        s = tag_chrome(s0)
        s, n = tag_page(s)
        if s != s0:
            f.write_text(s, encoding="utf-8")
        print(f"{rel}: +{n} mốc trang, tổng {len(re.findall(r'data-cms-(?:t|h|img)=', s))}, "
              f"chung {len(re.findall(r'data-cms-g', s))}")


if __name__ == "__main__":
    main()
