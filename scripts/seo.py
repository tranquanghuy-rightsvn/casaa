#!/usr/bin/env python3
"""Chèn meta SEO (canonical, Open Graph, Twitter, robots) + JSON-LD vào <head> mọi trang, rồi ghi
sitemap.xml và robots.txt. Chạy lại an toàn: khối giữa 2 dấu <!-- seo:start/end --> được thay mới.

    python3 scripts/seo.py
"""
import html
import json
import re
from datetime import date
from pathlib import Path

SITE = "https://3d-printedfacade.com"  # canonical: root, không www
HTML = Path(__file__).resolve().parent.parent / "html"
TODAY = date.today().isoformat()
OG_IMAGE = f"{SITE}/assets/img/og-cover.jpg"
ORG_ID = f"{SITE}/#organization"
SITE_ID = f"{SITE}/#website"

ORG = {
    "@type": ["Organization", "HomeAndConstructionBusiness"],
    "@id": ORG_ID,
    "name": "Casa+",
    "alternateName": ["Casa Evolution", "Đồng Xưởng powered by Casa"],
    "legalName": "Công ty Cổ phần Dịch vụ và Giáo dục C.A.S",
    "url": f"{SITE}/",
    "logo": {"@type": "ImageObject", "url": f"{SITE}/assets/logo/casa-red.png", "width": 767, "height": 337},
    "image": OG_IMAGE,
    "description": "Casa+ nghiên cứu, thiết kế và chế tác gạch gốm kiến trúc bằng công nghệ in 3D: "
                   "gạch ốp tường, gạch lát sàn, lam hoa gió, gốm sứ và tranh phù điêu.",
    "telephone": "+84763161286",
    "email": "dongxuong@casa-evolution.com",
    "address": {
        "@type": "PostalAddress",
        "streetAddress": "76/50B Phan Tây Hồ",
        "addressLocality": "Phường Cầu Kiệu",
        "addressRegion": "TP Hồ Chí Minh",
        "addressCountry": "VN",
    },
    "openingHoursSpecification": [{
        "@type": "OpeningHoursSpecification",
        "dayOfWeek": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
        "opens": "09:00", "closes": "18:30",
    }],
    "areaServed": "VN",
    "contactPoint": [{
        "@type": "ContactPoint", "telephone": "+84763161286", "email": "dongxuong@casa-evolution.com",
        "contactType": "customer service", "availableLanguage": ["vi", "en"],
    }],
    "sameAs": [
        "https://www.facebook.com/Dongxuongpoweredbycasa",
        "https://www.youtube.com/@Dongxuongpoweredbycasa",
        "https://www.pinterest.com/Dongxuongcasa/",
        "https://zalo.me/0763161286",
    ],
}

WEBSITE = {
    "@type": "WebSite", "@id": SITE_ID, "url": f"{SITE}/", "name": "Casa+",
    "inLanguage": "vi-VN", "publisher": {"@id": ORG_ID},
}

PRODUCT_LINES = [
    ("Tranh phù điêu gốm in 3D", "phu-dieu"),
    ("Gạch nung ốp tường in 3D", "op-tuong"),
    ("Lam hoa gió gốm in 3D", "lam-hoa-gio"),
    ("Đồ decor gốm sứ in 3D", "do-decor"),
    ("Cấu trúc rạn san hô in 3D", "ran-san-ho"),
]

# path -> (tên trong breadcrumb, loại trang, có index không, priority, changefreq)
PAGES = {
    "/": ("Trang chủ", "WebPage", True, "1.0", "weekly"),
    "/san-pham/": ("Sản phẩm", "CollectionPage", True, "0.9", "monthly"),
    "/dich-vu/": ("Dịch vụ", "WebPage", True, "0.9", "monthly"),
    "/tien-trinh/": ("Sơ đồ tiến trình", "WebPage", True, "0.7", "monthly"),
    "/gioi-thieu/": ("Casa xin chào", "AboutPage", True, "0.7", "monthly"),
    "/giai-phap/": ("Giải pháp in 3D gốm", "WebPage", True, "0.8", "monthly"),
    "/san-pham/lam-che-nang/": ("Lam che nắng", "WebPage", True, "0.8", "monthly"),
    "/san-pham/gach-op-chuyen-mau/": ("Gạch ốp chuyển màu", "WebPage", True, "0.8", "monthly"),
    "/san-pham/gach-phu-dieu/": ("Gạch phù điêu", "WebPage", True, "0.8", "monthly"),
    "/san-pham/artwork-decor/": ("Artwork & decor", "WebPage", True, "0.8", "monthly"),
    "/san-pham/ran-san-ho/": ("Rạn san hô", "WebPage", True, "0.8", "monthly"),
    "/tien-trinh/cau-chuyen/": ("Câu chuyện", "WebPage", True, "0.6", "monthly"),
    "/tien-trinh/nghien-cuu/": ("Nghiên cứu", "WebPage", True, "0.6", "monthly"),
    "/tien-trinh/thiet-ke/": ("Thiết kế", "WebPage", True, "0.6", "monthly"),
    "/tien-trinh/san-xuat/": ("Sản xuất", "WebPage", True, "0.6", "monthly"),
    "/tien-trinh/lap-dat/": ("Lắp đặt", "WebPage", True, "0.6", "monthly"),
    "/thu-vien-yeu-thich/": ("Thư viện yêu thích", "CollectionPage", False, None, None),
    "/tai-khoan/": ("Tài khoản", "WebPage", False, None, None),
    "/chinh-sach-bao-mat/": ("Chính sách bảo mật", "WebPage", True, "0.3", "yearly"),
    "/dieu-khoan/": ("Điều khoản sử dụng", "WebPage", True, "0.3", "yearly"),
}


# Tên trang tiếng Anh (breadcrumb / JSON-LD của bản /en/)
NAMES_EN = {
    "/": "Home", "/san-pham/": "Products", "/dich-vu/": "Services", "/tien-trinh/": "Process",
    "/gioi-thieu/": "About Casa", "/tai-khoan/": "Account", "/chinh-sach-bao-mat/": "Privacy policy",
    "/dieu-khoan/": "Terms of use", "/giai-phap/": "3D ceramic solutions",
    "/san-pham/lam-che-nang/": "Sun louvers", "/san-pham/gach-op-chuyen-mau/": "Gradient-glaze tiles",
    "/san-pham/gach-phu-dieu/": "Relief tiles", "/san-pham/artwork-decor/": "Artwork & decor",
    "/san-pham/ran-san-ho/": "Coral reef", "/tien-trinh/cau-chuyen/": "Story",
    "/tien-trinh/nghien-cuu/": "Research", "/tien-trinh/thiet-ke/": "Design",
    "/tien-trinh/san-xuat/": "Production", "/tien-trinh/lap-dat/": "Installation",
    "/thu-vien-yeu-thich/": "Favourites",
}
PRODUCT_LINES_EN = ["3D-printed ceramic relief art", "3D-printed terracotta wall cladding",
                    "3D-printed ceramic breeze blocks", "3D-printed ceramic decor", "3D-printed coral reef structures"]



def load_routes():
    """Bảng VI -> EN từ html/assets/js/routes.js (nguồn duy nhất)."""
    src = (HTML / "assets/js/routes.js").read_text(encoding="utf-8")
    return json.loads(src.split("/* ROUTES:start */")[1].split("/* ROUTES:end */")[0])


EN_ROUTES = load_routes()


def _page_name(f):
    """Tên ngắn của trang = phần trước " | " trong <title>."""
    m = re.search(r"<title>(.*?)</title>", f.read_text(encoding="utf-8"), re.S)
    return html.unescape(m.group(1)).split(" | ")[0].strip() if m else ""


# Sản phẩm thêm qua CMS (mục Sản phẩm) có trong routes.js nhưng không có trong PAGES -> tự thêm
for _vi, _en in EN_ROUTES.items():
    if re.fullmatch(r"/san-pham/[a-z0-9-]+/", _vi) and _vi not in PAGES:
        _f = HTML / _vi.strip("/") / "index.html"
        if _f.exists():
            PAGES[_vi] = (_page_name(_f), "WebPage", True, "0.8", "monthly")
            _fe = HTML / _en.strip("/") / "index.html"
            if _fe.exists():
                NAMES_EN[_vi] = _page_name(_fe)


def file_for(path, lang="vi"):
    if lang == "en":
        path = EN_ROUTES[path]
    return HTML / "index.html" if path == "/" else HTML / path.strip("/") / "index.html"


def url_for(path, lang="vi"):
    return SITE + (EN_ROUTES[path] if lang == "en" else path)


def has_en(path):
    return path in EN_ROUTES and file_for(path, "en").exists()


def esc(s):
    return s.replace("&", "&amp;").replace('"', "&quot;").replace("<", "&lt;")


def name_for(path, lang):
    return NAMES_EN.get(path, PAGES[path][0]) if lang == "en" else PAGES[path][0]


def crumbs(path, lang="vi"):
    """Trang chủ > các trang cha có trong PAGES > trang hiện tại."""
    out = [(name_for("/", lang) if lang == "en" else "Trang chủ", "/")]
    segs = path.strip("/").split("/")
    for i in range(1, len(segs) + 1):
        p = "/" + "/".join(segs[:i]) + "/"
        if p in PAGES:
            out.append((name_for(p, lang), p))
    return out


def graph_for(path, title, desc, lang="vi"):
    name, kind, *_ = PAGES[path]
    url = url_for(path, lang)
    page = {
        "@type": kind, "@id": f"{url}#webpage", "url": url, "name": title, "description": desc,
        "inLanguage": "en-US" if lang == "en" else "vi-VN", "isPartOf": {"@id": SITE_ID}, "about": {"@id": ORG_ID},
        "primaryImageOfPage": {"@type": "ImageObject", "url": OG_IMAGE},
        "dateModified": TODAY,
    }
    graph = [ORG, WEBSITE, page]
    if path != "/":
        page["breadcrumb"] = {"@id": f"{url}#breadcrumb"}
        graph.append({
            "@type": "BreadcrumbList", "@id": f"{url}#breadcrumb",
            "itemListElement": [
                {"@type": "ListItem", "position": i + 1, "name": n, "item": url_for(p, lang)}
                for i, (n, p) in enumerate(crumbs(path, lang))
            ],
        })
    if path == "/san-pham/":
        names = PRODUCT_LINES_EN if lang == "en" else [n for n, _ in PRODUCT_LINES]
        page["mainEntity"] = {
            "@type": "ItemList",
            "itemListElement": [
                {"@type": "ListItem", "position": i + 1, "name": names[i], "url": f"{url}#{a}"}
                for i, (_, a) in enumerate(PRODUCT_LINES)
            ],
        }
    if path == "/dich-vu/":
        graph.append({
            "@type": "Service", "@id": f"{url}#service",
            "name": "3D-printed architectural ceramic design and production" if lang == "en"
            else "Thiết kế và sản xuất gạch gốm kiến trúc in 3D",
            "serviceType": "Design consultation, 1:1 mock-ups and production of 3D-printed architectural ceramics" if lang == "en"
            else "Tư vấn thiết kế, chế tác mock-up 1:1 và sản xuất gạch gốm kiến trúc in 3D",
            "description": desc, "provider": {"@id": ORG_ID}, "areaServed": "VN", "url": url,
        })
    return {"@context": "https://schema.org", "@graph": graph}


def seo_block(path, title, desc, lang="vi"):
    indexable = PAGES[path][2]
    url = url_for(path, lang)
    en = lang == "en"
    lines = [
        f'<link rel="canonical" href="{url}">',
        f'<meta name="robots" content="{"index, follow, max-image-preview:large" if indexable else "noindex, follow"}">',
    ]
    if has_en(path):
        lines += [
            f'<link rel="alternate" hreflang="vi" href="{url_for(path)}">',
            f'<link rel="alternate" hreflang="en" href="{url_for(path, "en")}">',
            f'<link rel="alternate" hreflang="x-default" href="{url_for(path)}">',
        ]
    lines += [
        '<link rel="apple-touch-icon" href="/favicon.png">',
        '<meta property="og:type" content="website">',
        '<meta property="og:site_name" content="Casa+">',
        f'<meta property="og:locale" content="{"en_US" if en else "vi_VN"}">',
    ]
    if has_en(path):
        lines.append(f'<meta property="og:locale:alternate" content="{"vi_VN" if en else "en_US"}">')
    lines += [
        f'<meta property="og:url" content="{url}">',
        f'<meta property="og:title" content="{esc(title)}">',
        f'<meta property="og:description" content="{esc(desc)}">',
        f'<meta property="og:image" content="{OG_IMAGE}">',
        '<meta property="og:image:width" content="1200">',
        '<meta property="og:image:height" content="630">',
        '<meta property="og:image:alt" content="' + ("Interior clad with Casa+ architectural ceramic tiles" if en
                                                     else "Không gian nội thất ốp gạch gốm kiến trúc Casa+") + '">',
        '<meta name="twitter:card" content="summary_large_image">',
        f'<meta name="twitter:title" content="{esc(title)}">',
        f'<meta name="twitter:description" content="{esc(desc)}">',
        f'<meta name="twitter:image" content="{OG_IMAGE}">',
        '<script type="application/ld+json">'
        + json.dumps(graph_for(path, title, desc, lang), ensure_ascii=False, separators=(",", ":")).replace("</", "<\\/")
        + "</script>",
    ]
    return "  <!-- seo:start -->\n" + "".join(f"  {l}\n" for l in lines) + "  <!-- seo:end -->\n"


def apply(path, lang):
    f = file_for(path, lang)
    s = f.read_text(encoding="utf-8")
    s = re.sub(r"  <!-- seo:start -->.*?<!-- seo:end -->\n", "", s, flags=re.S)
    title = re.search(r"<title>(.*?)</title>", s, re.S).group(1).strip()
    desc = re.search(r'<meta name="description" content="(.*?)">', s, re.S).group(1).strip()
    m = re.search(r'  <meta name="description" content=".*?">\n', s, re.S)
    s = s[: m.end()] + seo_block(path, title, desc, lang) + s[m.end():]
    f.write_text(s, encoding="utf-8")
    print("ok", EN_ROUTES[path] if lang == "en" else path)


def main():
    for path in PAGES:
        apply(path, "vi")
        if has_en(path):
            apply(path, "en")

    # Trang 404: chỉ noindex, không canonical / Open Graph
    f = HTML / "404.html"
    s = re.sub(r"  <!-- seo:start -->.*?<!-- seo:end -->\n", "", f.read_text(encoding="utf-8"), flags=re.S)
    m = re.search(r'  <meta name="description" content=".*?">\n', s, re.S)
    s = s[: m.end()] + '  <!-- seo:start -->\n  <meta name="robots" content="noindex, follow">\n  <!-- seo:end -->\n' + s[m.end():]
    f.write_text(s, encoding="utf-8")
    print("ok /404.html")

    def entry(p, v, lang):
        alt = ""
        if has_en(p):
            alt = (f'    <xhtml:link rel="alternate" hreflang="vi" href="{url_for(p)}"/>\n'
                   f'    <xhtml:link rel="alternate" hreflang="en" href="{url_for(p, "en")}"/>\n')
        return (f"  <url>\n    <loc>{url_for(p, lang)}</loc>\n{alt}    <lastmod>{TODAY}</lastmod>\n"
                f"    <changefreq>{v[4]}</changefreq>\n    <priority>{v[3]}</priority>\n  </url>\n")

    urls = "".join(entry(p, v, "vi") for p, v in PAGES.items() if v[2])
    urls += "".join(entry(p, v, "en") for p, v in PAGES.items() if v[2] and has_en(p))
    (HTML / "sitemap.xml").write_text(
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n'
        + urls + "</urlset>\n",
        encoding="utf-8",
    )
    (HTML / "robots.txt").write_text(
        "User-agent: *\nAllow: /\nDisallow: /api/\nDisallow: /admin/\n\n"
        f"Sitemap: {SITE}/sitemap.xml\n",
        encoding="utf-8",
    )
    print("ok sitemap.xml, robots.txt")


if __name__ == "__main__":
    main()
