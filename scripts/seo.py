#!/usr/bin/env python3
"""Chèn meta SEO (canonical, Open Graph, Twitter, robots) + JSON-LD vào <head> mọi trang, rồi ghi
sitemap.xml và robots.txt. Chạy lại an toàn: khối giữa 2 dấu <!-- seo:start/end --> được thay mới.

    python3 scripts/seo.py
"""
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


def file_for(path):
    return HTML / "index.html" if path == "/" else HTML / path.strip("/") / "index.html"


def esc(s):
    return s.replace("&", "&amp;").replace('"', "&quot;").replace("<", "&lt;")


def crumbs(path):
    """Trang chủ > các trang cha có trong PAGES > trang hiện tại."""
    out = [("Trang chủ", "/")]
    segs = path.strip("/").split("/")
    for i in range(1, len(segs) + 1):
        p = "/" + "/".join(segs[:i]) + "/"
        if p in PAGES:
            out.append((PAGES[p][0], p))
    return out


def graph_for(path, title, desc):
    name, kind, *_ = PAGES[path]
    url = SITE + path
    page = {
        "@type": kind, "@id": f"{url}#webpage", "url": url, "name": title, "description": desc,
        "inLanguage": "vi-VN", "isPartOf": {"@id": SITE_ID}, "about": {"@id": ORG_ID},
        "primaryImageOfPage": {"@type": "ImageObject", "url": OG_IMAGE},
        "dateModified": TODAY,
    }
    graph = [ORG, WEBSITE, page]
    if path != "/":
        page["breadcrumb"] = {"@id": f"{url}#breadcrumb"}
        graph.append({
            "@type": "BreadcrumbList", "@id": f"{url}#breadcrumb",
            "itemListElement": [
                {"@type": "ListItem", "position": i + 1, "name": n, "item": SITE + p}
                for i, (n, p) in enumerate(crumbs(path))
            ],
        })
    if path == "/san-pham/":
        page["mainEntity"] = {
            "@type": "ItemList",
            "itemListElement": [
                {"@type": "ListItem", "position": i + 1, "name": n, "url": f"{url}#{a}"}
                for i, (n, a) in enumerate(PRODUCT_LINES)
            ],
        }
    if path == "/dich-vu/":
        graph.append({
            "@type": "Service", "@id": f"{url}#service",
            "name": "Thiết kế và sản xuất gạch gốm kiến trúc in 3D",
            "serviceType": "Tư vấn thiết kế, chế tác mock-up 1:1 và sản xuất gạch gốm kiến trúc in 3D",
            "description": desc, "provider": {"@id": ORG_ID}, "areaServed": "VN", "url": url,
        })
    return {"@context": "https://schema.org", "@graph": graph}


def seo_block(path, title, desc):
    indexable = PAGES[path][2]
    url = SITE + path
    lines = [
        f'<link rel="canonical" href="{url}">',
        f'<meta name="robots" content="{"index, follow, max-image-preview:large" if indexable else "noindex, follow"}">',
        '<link rel="apple-touch-icon" href="/favicon.png">',
        '<meta property="og:type" content="website">',
        '<meta property="og:site_name" content="Casa+">',
        '<meta property="og:locale" content="vi_VN">',
        f'<meta property="og:url" content="{url}">',
        f'<meta property="og:title" content="{esc(title)}">',
        f'<meta property="og:description" content="{esc(desc)}">',
        f'<meta property="og:image" content="{OG_IMAGE}">',
        '<meta property="og:image:width" content="1200">',
        '<meta property="og:image:height" content="630">',
        '<meta property="og:image:alt" content="Không gian nội thất ốp gạch gốm kiến trúc Casa+">',
        '<meta name="twitter:card" content="summary_large_image">',
        f'<meta name="twitter:title" content="{esc(title)}">',
        f'<meta name="twitter:description" content="{esc(desc)}">',
        f'<meta name="twitter:image" content="{OG_IMAGE}">',
        '<script type="application/ld+json">'
        + json.dumps(graph_for(path, title, desc), ensure_ascii=False, separators=(",", ":")).replace("</", "<\\/")
        + "</script>",
    ]
    return "  <!-- seo:start -->\n" + "".join(f"  {l}\n" for l in lines) + "  <!-- seo:end -->\n"


def main():
    for path in PAGES:
        f = file_for(path)
        s = f.read_text(encoding="utf-8")
        s = re.sub(r"  <!-- seo:start -->.*?<!-- seo:end -->\n", "", s, flags=re.S)
        title = re.search(r"<title>(.*?)</title>", s, re.S).group(1).strip()
        desc = re.search(r'<meta name="description" content="(.*?)">', s, re.S).group(1).strip()
        m = re.search(r'  <meta name="description" content=".*?">\n', s, re.S)
        s = s[: m.end()] + seo_block(path, title, desc) + s[m.end():]
        f.write_text(s, encoding="utf-8")
        print("ok", path)

    # Trang 404: chỉ noindex, không canonical / Open Graph
    f = HTML / "404.html"
    s = re.sub(r"  <!-- seo:start -->.*?<!-- seo:end -->\n", "", f.read_text(encoding="utf-8"), flags=re.S)
    m = re.search(r'  <meta name="description" content=".*?">\n', s, re.S)
    s = s[: m.end()] + '  <!-- seo:start -->\n  <meta name="robots" content="noindex, follow">\n  <!-- seo:end -->\n' + s[m.end():]
    f.write_text(s, encoding="utf-8")
    print("ok /404.html")

    urls = "".join(
        f"  <url>\n    <loc>{SITE}{p}</loc>\n    <lastmod>{TODAY}</lastmod>\n"
        f"    <changefreq>{v[4]}</changefreq>\n    <priority>{v[3]}</priority>\n  </url>\n"
        for p, v in PAGES.items() if v[2]
    )
    (HTML / "sitemap.xml").write_text(
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + urls + "</urlset>\n",
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
