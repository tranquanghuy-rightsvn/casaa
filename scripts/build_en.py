#!/usr/bin/env python3
"""Sinh bản tiếng Anh TĨNH cho mọi trang: html/<slug>/index.html -> html/en/<slug-tiếng-Anh>/index.html
(bảng đường dẫn: html/assets/js/routes.js).

Chạy MỘT LẦN để khởi tạo. Sau đó file trong html/en/ là nguồn chân lý của bản tiếng Anh và
được sửa qua CMS (tab Giao diện website, nút EN) — chạy lại sẽ GHI ĐÈ, nên script từ chối nếu
file đã có, trừ khi thêm --force (hoặc --only <slug> để sinh riêng trang mới).

Dịch bằng từ điển từng dùng ở runtime (scripts/i18n/dict.json, xuất bởi export.mjs):
  - thẻ có data-i18n="key"  -> EN[key]
  - đoạn chữ khớp nguyên văn câu trong PHRASES -> bản dịch
  - thuộc tính alt / aria-label / title / placeholder khớp PHRASES
  - 34 thẻ dự án (.pin) -> tên + danh mục tiếng Anh
  - <title>, meta description -> bảng META_EN bên dưới
  - link nội bộ "/x/" -> "/en/x/" (trừ /assets, /api, /admin, file tĩnh)

    node scripts/i18n/export.mjs && python3 scripts/build_en.py [--force] [--only slug]
    python3 scripts/site_chrome.py && python3 scripts/seo.py && python3 scripts/cms_tag.py
"""
import html as htmllib
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
HTML = ROOT / "html"
DICT = json.loads((ROOT / "scripts/i18n/dict.json").read_text(encoding="utf-8"))
EN, PHRASES, PINS = DICT["EN"], DICT["PHRASES"], DICT["pins"]
# Bản dịch bổ sung (câu từ điển runtime chưa có, chủ yếu trang pháp lý) — ưu tiên hơn PHRASES
PHRASES.update(json.loads((ROOT / "scripts/i18n/extra.json").read_text(encoding="utf-8")))

# path VI -> (title, description) tiếng Anh
META_EN = {
    "/": ("Casa+ | 3D-printed architectural ceramics",
          "Casa+ researches, designs and crafts architectural ceramic bricks with 3D printing: wall cladding, floor tiles, breeze blocks, ceramics and relief panels."),
    "/giai-phap/": ("3D printing solutions for real-world ceramics | Casa+",
                    "Casa+'s closed loop: material research, parametric design, 3D printing and 1200°C firing to create architectural ceramics for facades, interiors and landscapes."),
    "/san-pham/": ("Products | Casa+",
                   "3D-printed ceramic products by Casa+: relief art, wall cladding, breeze blocks, decor and coral reef structures."),
    "/san-pham/lam-che-nang/": ("3D-printed ceramic sun louvers | Casa+",
                                "Material research, parametric design, robotic 3D printing and 1200°C firing for Casa⁺ ceramic sun-shading louvers."),
    "/san-pham/gach-op-chuyen-mau/": ("Gradient-glaze cladding tiles | Casa+",
                                      "Flowing glazes fired at 1200°C on parametric 3D-printed cladding tiles by Casa⁺."),
    "/san-pham/gach-phu-dieu/": ("3D-printed relief tiles | Casa+",
                                 "Relief tiles that create depth and shadow, designed parametrically and 3D printed in terracotta by Casa⁺."),
    "/san-pham/artwork-decor/": ("Ceramic artwork & decor | Casa+",
                                 "Sculptural ceramic artwork and decor for interiors and landscapes, 3D printed by Casa⁺."),
    "/san-pham/ran-san-ho/": ("3D-printed coral reef structures | Casa+",
                              "Porous terracotta reef substrates 3D printed by Casa⁺ to support coral restoration."),
    "/tien-trinh/": ("Process | Casa+",
                     "From the story of a project to the installed tile: the five steps of Casa+'s 3D-printed ceramic process."),
    "/tien-trinh/cau-chuyen/": ("Project story | Casa+",
                                "Every Casa⁺ project starts with listening: the space, the culture and the story behind the facade."),
    "/tien-trinh/nghien-cuu/": ("Material research | Casa+",
                                "Clay bodies, glazes and firing tests that make Casa⁺ 3D-printed ceramics durable and beautiful."),
    "/tien-trinh/thiet-ke/": ("Parametric design | Casa+",
                              "Parametric design and 1:1 mock-ups that turn ideas into printable ceramic modules."),
    "/tien-trinh/san-xuat/": ("Production | Casa+",
                              "Robotic 3D printing, drying and firing at 1200°C in the Casa⁺ workshop."),
    "/tien-trinh/lap-dat/": ("Installation & handover | Casa+",
                             "Installing 3D-printed ceramics on 304 stainless frames, aligning joints and handing over with the contractor."),
    "/dich-vu/": ("Design & production services | Casa+",
                  "Consultation, 1:1 mock-ups and production of 3D-printed architectural ceramics for homes and businesses. Contact Casa+ for a free sample."),
    "/gioi-thieu/": ("About Casa | Casa+",
                     "Casa+ is a brand of C.A.S JSC, providing creative technology solutions for architecture, interiors and design education."),
    "/thu-vien-yeu-thich/": ("Favourites | Casa+",
                             "The 3D-printed ceramic, concrete and glazed brick projects you have pinned."),
    "/tai-khoan/": ("Account | Casa+",
                    "Sign in or create a Casa+ account to save favourite projects and follow your consultation requests."),
    "/chinh-sach-bao-mat/": ("Privacy policy | Casa+",
                             "How Casa+ collects, uses and protects personal data when you use the website, create an account or send a consultation request."),
    "/dieu-khoan/": ("Terms of use | Casa+",
                     "Terms of use for the Casa+ website and accounts."),
}

SKIP_PREFIX = ("/assets/", "/api/", "/admin", "/favicon", "/drive/", "/robots", "/sitemap", "/en/", "/404")



def load_routes():
    """Bảng VI -> EN từ html/assets/js/routes.js (nguồn duy nhất)."""
    src = (HTML / "assets/js/routes.js").read_text(encoding="utf-8")
    return json.loads(src.split("/* ROUTES:start */")[1].split("/* ROUTES:end */")[0])


EN_ROUTES = load_routes()


def file_for(path):
    return HTML / "index.html" if path == "/" else HTML / path.strip("/") / "index.html"


def en_file_for(path):
    en = EN_ROUTES[path]
    return HTML / ("index.html" if en == "/" else en.strip("/") + "/index.html")


def en_href(href):
    """Link nội bộ "/x/#y" -> bản tiếng Anh theo routes.js (slug tiếng Anh); ngoài bảng thì giữ nguyên."""
    if not href.startswith("/") or href.startswith("//") or href.startswith(SKIP_PREFIX):
        return href
    path, rest = re.match(r"([^?#]*)(.*)", href).groups()
    path = path if path.endswith("/") else path + "/"
    return EN_ROUTES[path] + rest if path in EN_ROUTES else href


def tr_text(seg, stats):
    key = htmllib.unescape(seg).strip()
    if not key:
        return seg
    en = PHRASES.get(key)
    if en is None:
        if re.search(r"[À-ỹĐđ]", key):
            stats["miss"].append(key)
        return seg
    stats["hit"] += 1
    return seg.replace(seg.strip(), htmllib.escape(en, quote=False))


def translate(s, path, stats):
    title, desc = META_EN[path]

    s = s.replace('<html lang="vi">', '<html lang="en">', 1)
    s = re.sub(r"  <!-- seo:start -->.*?<!-- seo:end -->\n", "", s, flags=re.S)
    s = re.sub(r"<title>.*?</title>", "<title>" + htmllib.escape(title, quote=False) + "</title>", s, count=1, flags=re.S)
    s = re.sub(r'<meta name="description" content="[^"]*">',
               '<meta name="description" content="' + htmllib.escape(desc) + '">', s, count=1)

    # data-i18n="key" (thẻ lá)
    def i18n(m):
        en = EN.get(m.group(3))
        if en is None:
            return m.group(0)
        stats["hit"] += 1
        return m.group(1) + htmllib.escape(en, quote=False) + m.group(5)
    s = re.sub(r'(<([a-zA-Z0-9]+)\b[^>]*\sdata-i18n="([^"]+)"[^>]*>)([^<]*)(</\2>)', i18n, s)

    # 34 thẻ dự án: <span class="pin__info">Tên<small>Danh mục · domain</small></span>
    def pin(m):
        i = int(m.group(2))
        if i >= len(PINS):
            return m.group(0)
        p = PINS[i]
        info = htmllib.escape(p["title"], quote=False) + "<small>" + htmllib.escape(p["cat"], quote=False) + \
            (" · " + p["domain"] if p["domain"] else "") + "</small>"
        out = re.sub(r'(<span class="pin__info">).*?(</span>)', lambda x: x.group(1) + info + x.group(2), m.group(0), count=1, flags=re.S)
        out = re.sub(r'(<img\b[^>]*\salt=")[^"]*(")', lambda x: x.group(1) + htmllib.escape(p["title"]) + x.group(2), out, count=1)
        return out
    s = re.sub(r'<(button|a)\b[^>]*class="pin"[^>]*data-index="(\d+)"[^>]*>.*?</\1>', pin, s, flags=re.S)

    # Đoạn chữ + thuộc tính, bỏ qua <script>/<style>
    parts = re.split(r"(<script\b.*?</script>|<style\b.*?</style>|<[^>]+>)", s, flags=re.S)
    for i, part in enumerate(parts):
        if not part:
            continue
        if part.startswith("<"):
            if part.startswith(("<script", "<style")):
                continue
            def attr(m):
                val = htmllib.unescape(m.group(2)).strip()
                en = PHRASES.get(val)
                if en is None:
                    return m.group(0)
                stats["hit"] += 1
                return m.group(1) + htmllib.escape(en) + m.group(3)
            part = re.sub(r'(\s(?:alt|aria-label|title|placeholder)=")([^"]+)(")', attr, part)
            part = re.sub(r'(\shref=")([^"]+)(")', lambda m: m.group(1) + en_href(m.group(2)) + m.group(3), part)
            parts[i] = part
        else:
            parts[i] = tr_text(part, stats)
    s = "".join(parts)

    # Cờ ngôn ngữ hiện tại + nút đang chọn
    s = s.replace('src="/assets/figma/flag-vn.svg" width="32" height="32" alt="" data-lang-flag',
                  'src="/assets/figma/flag-en.svg" width="32" height="32" alt="" data-lang-flag')
    s = s.replace('data-lang-btn="vi" aria-pressed="true"', 'data-lang-btn="vi" aria-pressed="false"')
    s = s.replace('data-lang-btn="en" aria-pressed="false"', 'data-lang-btn="en" aria-pressed="true"')
    # Đăng nhập Google từ trang EN quay về trang EN
    s = s.replace("/api/auth/google?next=/tai-khoan/", "/api/auth/google?next=" + EN_ROUTES["/tai-khoan/"])
    return s


def main():
    force = "--force" in sys.argv
    only = sys.argv[sys.argv.index("--only") + 1] if "--only" in sys.argv else None
    total_miss = {}
    for path in META_EN:
        if only and path.strip("/") != only.strip("/"):
            continue
        out = en_file_for(path)
        if out.exists() and not force:
            print(f"bỏ qua {path} (đã có {out.relative_to(ROOT)} — dùng --force để ghi đè)")
            continue
        stats = {"hit": 0, "miss": []}
        s = translate(file_for(path).read_text(encoding="utf-8"), path, stats)
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_text(s, encoding="utf-8")
        print(f"ok {EN_ROUTES[path]}: dịch {stats['hit']}, còn tiếng Việt {len(stats['miss'])}")
        for k in stats["miss"]:
            total_miss[k] = total_miss.get(k, 0) + 1
    if total_miss:
        (ROOT / "scripts/i18n/missing.txt").write_text(
            "\n".join(f"{n}\t{k}" for k, n in sorted(total_miss.items(), key=lambda x: -x[1])), encoding="utf-8")
        print(f"{len(total_miss)} câu chưa có bản dịch -> scripts/i18n/missing.txt")


if __name__ == "__main__":
    main()
