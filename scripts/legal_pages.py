#!/usr/bin/env python3
"""Tạo 3 trang: /chinh-sach-bao-mat/, /dieu-khoan/, /404.html từ khung trang /gioi-thieu/
(giữ header, menu, tìm kiếm, footer). Sửa nội dung ở đây rồi chạy lại:

    python3 scripts/legal_pages.py && python3 scripts/seo.py

⚠️ Từ khi có CMS (GAS.md): nội dung 2 trang pháp lý + 404 có thể đã được sửa qua CMS trên
GitHub. Chạy lại script này sẽ GHI ĐÈ các sửa đổi đó — chỉ chạy khi chủ ý dựng lại từ đầu, rồi
chạy tiếp `python3 scripts/cms_tag.py`.
"""
import re
from pathlib import Path

HTML = Path(__file__).resolve().parent.parent / "html"
UPDATED = "01/11/2026"
COMPANY = "Công ty Cổ phần Dịch vụ và Giáo dục C.A.S"
CONTACT = ('<ul class="legal__contact">'
           f"<li><strong>{COMPANY}</strong> (Casa+)</li>"
           "<li>Địa chỉ: 76/50B Phan Tây Hồ, Phường Cầu Kiệu, TP Hồ Chí Minh, Việt Nam</li>"
           '<li>Email: <a href="mailto:dongxuong@casa-evolution.com">dongxuong@casa-evolution.com</a></li>'
           '<li>Hotline: <a href="tel:0763161286">0763 161 286</a> (9:00 – 18:30)</li></ul>')

PRIVACY = f"""
<p>Chính sách này giải thích Casa+ ({COMPANY}, “chúng tôi”) thu thập, sử dụng và bảo vệ thông tin cá nhân của bạn như thế nào khi bạn truy cập website <a href="/">3d-printedfacade.com</a>, tạo tài khoản hoặc gửi yêu cầu tư vấn.</p>

<h2 id="thong-tin-thu-thap">1. Thông tin chúng tôi thu thập</h2>
<h3>Khi bạn tạo tài khoản bằng email</h3>
<ul>
  <li>Họ tên, địa chỉ email và mật khẩu. Mật khẩu được mã hoá một chiều trước khi lưu; chúng tôi không xem được mật khẩu gốc của bạn.</li>
  <li>Số điện thoại, nếu bạn tự bổ sung trong trang tài khoản.</li>
</ul>
<h3>Khi bạn đăng nhập bằng Google</h3>
<ul>
  <li>Chúng tôi chỉ nhận từ Google: họ tên, địa chỉ email (đã được Google xác minh), ảnh đại diện và mã định danh tài khoản Google.</li>
  <li>Chúng tôi <strong>không</strong> truy cập Gmail, Google Drive, danh bạ hay bất kỳ dữ liệu nào khác trong tài khoản Google của bạn, và không bao giờ biết mật khẩu Google của bạn.</li>
</ul>
<h3>Khi bạn gửi yêu cầu tư vấn</h3>
<ul>
  <li>Nhu cầu (cá nhân hoặc doanh nghiệp), họ tên, số điện thoại, email và nội dung bạn nhập vào form liên hệ.</li>
</ul>
<h3>Thông tin kỹ thuật</h3>
<ul>
  <li>Khi bạn truy cập website, hệ thống máy chủ ghi nhận tự động một số thông tin kỹ thuật như địa chỉ IP, loại trình duyệt và thời điểm truy cập, phục vụ vận hành, chống lạm dụng và khắc phục lỗi.</li>
  <li>Website dùng <strong>Google Analytics</strong> để thống kê lượt truy cập: trang được xem, thời gian xem, nguồn truy cập, loại thiết bị và khu vực gần đúng. Dữ liệu này dùng để hiểu và cải thiện website, không dùng để xác định danh tính từng người.</li>
  <li>Website <strong>không</strong> dùng công cụ quảng cáo.</li>
</ul>

<h2 id="muc-dich">2. Mục đích sử dụng</h2>
<ul>
  <li>Tạo và duy trì tài khoản, xác thực khi bạn đăng nhập.</li>
  <li>Liên hệ tư vấn, báo giá và thực hiện dịch vụ thiết kế, sản xuất theo yêu cầu của bạn.</li>
  <li>Bảo vệ an toàn tài khoản và hệ thống: giới hạn số lần đăng nhập sai, phát hiện truy cập bất thường.</li>
  <li>Thực hiện nghĩa vụ theo quy định của pháp luật.</li>
</ul>
<p>Chúng tôi <strong>không bán, không cho thuê</strong> thông tin cá nhân của bạn cho bên thứ ba.</p>

<h2 id="cookie">3. Cookie</h2>
<p>Website dùng hai loại cookie:</p>
<h3>Cookie cần thiết</h3>
<ul>
  <li><strong>Cookie phiên đăng nhập</strong> (casa_session): giữ trạng thái đăng nhập của bạn trong tối đa 30 ngày. Cookie này không đọc được bằng mã JavaScript và chỉ được gửi qua kết nối bảo mật HTTPS.</li>
  <li><strong>Cookie đăng nhập Google</strong> (casa_oauth): tồn tại tối đa 10 phút trong lúc bạn đăng nhập bằng Google, dùng để chống giả mạo yêu cầu.</li>
</ul>
<h3>Cookie thống kê</h3>
<ul>
  <li><strong>Cookie Google Analytics</strong> (_ga, _ga_*): phân biệt lượt truy cập để thống kê, lưu tối đa 2 năm. Bạn có thể chặn bằng cài đặt trình duyệt hoặc tiện ích <a href="https://tools.google.com/dlpage/gaoptout" target="_blank" rel="noopener">Google Analytics Opt-out</a>.</li>
</ul>
<p>Bạn có thể xoá cookie bất cứ lúc nào trong cài đặt trình duyệt; nếu xoá cookie phiên đăng nhập, bạn sẽ cần đăng nhập lại.</p>

<h2 id="chia-se">4. Chia sẻ thông tin với bên cung cấp dịch vụ</h2>
<p>Để vận hành website, chúng tôi sử dụng một số dịch vụ hạ tầng. Các bên này chỉ xử lý dữ liệu trong phạm vi cung cấp dịch vụ cho chúng tôi:</p>
<ul>
  <li><strong>Cloudflare</strong>: lưu trữ website và cơ sở dữ liệu tài khoản, bảo vệ chống tấn công.</li>
  <li><strong>Google</strong>: xác thực khi bạn chọn đăng nhập bằng Google; thống kê truy cập (Google Analytics); cung cấp phông chữ (Google Fonts).</li>
  <li><strong>jsDelivr</strong>: cung cấp thư viện hiệu ứng hiển thị trang.</li>
</ul>
<p>Chúng tôi chỉ cung cấp thông tin cho cơ quan nhà nước có thẩm quyền khi có yêu cầu hợp pháp theo quy định của pháp luật.</p>

<h2 id="luu-tru">5. Lưu trữ và bảo mật</h2>
<ul>
  <li>Thông tin tài khoản được lưu trong suốt thời gian tài khoản còn hoạt động, và được xoá khi bạn yêu cầu xoá tài khoản.</li>
  <li>Thông tin yêu cầu tư vấn được lưu trong thời gian cần thiết để tư vấn, thực hiện hợp đồng và theo quy định về lưu trữ chứng từ.</li>
  <li>Mọi kết nối tới website đều được mã hoá bằng HTTPS; mật khẩu được mã hoá một chiều; quyền truy cập dữ liệu trong nội bộ được giới hạn cho người có trách nhiệm.</li>
</ul>
<p>Không có hệ thống nào an toàn tuyệt đối. Nếu phát hiện sự cố ảnh hưởng tới dữ liệu của bạn, chúng tôi sẽ thông báo và xử lý theo quy định của pháp luật.</p>

<h2 id="quyen">6. Quyền của bạn</h2>
<ul>
  <li><strong>Xem và chỉnh sửa</strong> họ tên, số điện thoại trong <a href="/tai-khoan/">trang tài khoản</a>.</li>
  <li><strong>Yêu cầu cung cấp bản sao</strong> dữ liệu cá nhân chúng tôi đang lưu về bạn.</li>
  <li><strong>Yêu cầu xoá tài khoản</strong> và dữ liệu liên quan, hoặc rút lại sự đồng ý xử lý dữ liệu.</li>
  <li><strong>Ngắt liên kết Google</strong>: bạn có thể gỡ quyền truy cập của Casa+ tại trang quản lý tài khoản Google (myaccount.google.com → Bảo mật → Ứng dụng bên thứ ba).</li>
</ul>
<p>Để thực hiện các quyền trên, hãy gửi email từ địa chỉ đã đăng ký tới chúng tôi. Chúng tôi sẽ phản hồi trong vòng 7 ngày làm việc.</p>

<h2 id="tre-em">7. Trẻ em</h2>
<p>Website không hướng tới trẻ em dưới 16 tuổi. Nếu bạn là cha mẹ hoặc người giám hộ và biết trẻ đã cung cấp thông tin cho chúng tôi, vui lòng liên hệ để chúng tôi xoá thông tin đó.</p>

<h2 id="thay-doi">8. Thay đổi chính sách</h2>
<p>Chúng tôi có thể cập nhật chính sách này khi thay đổi cách vận hành website hoặc theo quy định mới của pháp luật. Ngày cập nhật được ghi ở đầu trang; với thay đổi quan trọng, chúng tôi sẽ thông báo trên website.</p>

<h2 id="lien-he">9. Liên hệ</h2>
<p>Mọi câu hỏi về chính sách bảo mật và dữ liệu cá nhân, vui lòng liên hệ:</p>
{CONTACT}
"""

TERMS = f"""
<p>Chào mừng bạn đến với website <a href="/">3d-printedfacade.com</a> của Casa+, thương hiệu trực thuộc {COMPANY} (“Casa+”, “chúng tôi”). Khi truy cập website hoặc tạo tài khoản, bạn đồng ý với các điều khoản dưới đây. Nếu không đồng ý, vui lòng ngừng sử dụng website.</p>

<h2 id="pham-vi">1. Phạm vi</h2>
<p>Website giới thiệu giải pháp, sản phẩm gốm kiến trúc in 3D và dịch vụ thiết kế, sản xuất của Casa+; cho phép bạn gửi yêu cầu tư vấn và tạo tài khoản. Việc mua bán, thiết kế hay sản xuất cụ thể được thực hiện theo báo giá hoặc hợp đồng riêng giữa bạn và Casa+; khi đó điều khoản của hợp đồng được ưu tiên áp dụng.</p>

<h2 id="tai-khoan">2. Tài khoản</h2>
<ul>
  <li>Bạn cần cung cấp thông tin chính xác khi đăng ký và cập nhật khi có thay đổi.</li>
  <li>Bạn có trách nhiệm giữ bí mật mật khẩu và chịu trách nhiệm với các hoạt động diễn ra dưới tài khoản của mình. Hãy báo ngay cho chúng tôi nếu nghi ngờ tài khoản bị truy cập trái phép.</li>
  <li>Mỗi tài khoản dành cho một người hoặc một tổ chức; không chuyển nhượng tài khoản cho người khác.</li>
  <li>Bạn có thể đăng nhập bằng email và mật khẩu hoặc bằng tài khoản Google. Việc đăng nhập bằng Google cũng chịu điều khoản của Google.</li>
  <li>Chúng tôi có quyền tạm khoá hoặc chấm dứt tài khoản vi phạm điều khoản này hoặc quy định của pháp luật.</li>
</ul>

<h2 id="su-dung">3. Sử dụng website</h2>
<p>Khi sử dụng website, bạn không được:</p>
<ul>
  <li>Truy cập trái phép, dò quét lỗ hổng, gây quá tải hoặc làm gián đoạn hoạt động của website.</li>
  <li>Dùng công cụ tự động để đăng ký hàng loạt, thu thập dữ liệu hoặc gửi yêu cầu giả mạo.</li>
  <li>Mạo danh người khác hoặc cung cấp thông tin sai lệch.</li>
  <li>Sử dụng website vào mục đích trái pháp luật.</li>
</ul>

<h2 id="so-huu-tri-tue">4. Sở hữu trí tuệ</h2>
<p>Toàn bộ nội dung trên website — bao gồm hình ảnh, video, mẫu thiết kế, hoa văn, bài viết, logo và nhãn hiệu Casa+ — thuộc quyền sở hữu của Casa+ hoặc đối tác đã cấp phép cho chúng tôi. Bạn được xem và chia sẻ đường dẫn cho mục đích cá nhân, phi thương mại. Mọi hình thức sao chép, chỉnh sửa, sản xuất lại mẫu thiết kế hay sử dụng cho mục đích thương mại cần có sự đồng ý bằng văn bản của Casa+.</p>

<h2 id="thong-tin">5. Thông tin trên website</h2>
<p>Hình ảnh, mô tả sản phẩm và dự án mang tính tham khảo. Màu sắc, bề mặt và kích thước của sản phẩm gốm thực tế có thể khác đôi chút do đặc tính thủ công của vật liệu đất nung, quá trình nung và thiết bị hiển thị. Thông số, tiến độ và chi phí chính xác được xác nhận trong báo giá hoặc hợp đồng.</p>

<h2 id="lien-ket">6. Liên kết tới website khác</h2>
<p>Website có thể dẫn tới trang của bên thứ ba (Facebook, YouTube, Pinterest, Zalo…). Chúng tôi không kiểm soát và không chịu trách nhiệm về nội dung hay chính sách của các trang đó.</p>

<h2 id="trach-nhiem">7. Giới hạn trách nhiệm</h2>
<p>Chúng tôi nỗ lực duy trì website hoạt động ổn định và chính xác, nhưng không bảo đảm website luôn không gián đoạn hay không có lỗi. Trong phạm vi pháp luật cho phép, Casa+ không chịu trách nhiệm với thiệt hại gián tiếp phát sinh từ việc sử dụng hoặc không thể sử dụng website.</p>

<h2 id="du-lieu">8. Dữ liệu cá nhân</h2>
<p>Cách chúng tôi thu thập và xử lý thông tin cá nhân được trình bày trong <a href="/chinh-sach-bao-mat/">Chính sách bảo mật</a>.</p>

<h2 id="thay-doi">9. Thay đổi điều khoản</h2>
<p>Chúng tôi có thể cập nhật điều khoản này; ngày cập nhật được ghi ở đầu trang. Việc bạn tiếp tục sử dụng website sau khi điều khoản thay đổi đồng nghĩa với việc bạn chấp nhận điều khoản mới.</p>

<h2 id="luat">10. Luật áp dụng</h2>
<p>Điều khoản này được điều chỉnh theo pháp luật Việt Nam. Tranh chấp phát sinh trước hết được giải quyết bằng thương lượng; nếu không thành, sẽ được đưa ra cơ quan có thẩm quyền tại TP Hồ Chí Minh.</p>

<h2 id="lien-he">11. Liên hệ</h2>
{CONTACT}
"""


def legal_main(crumb, title, lead, body):
    return f"""  <main id="main">
    <div class="page-top container">
      <nav class="breadcrumb" aria-label="Breadcrumb">
        <ol>
          <li><a href="/">Trang Chủ</a></li>
          <li><span aria-current="page">{crumb}</span></li>
        </ol>
      </nav>
    </div>

    <section class="panel" aria-labelledby="page-title">
      <div class="container">
        <article class="legal">
          <header class="legal__head">
            <h1 class="page-title" id="page-title">{title}</h1>
            <p class="legal__meta">{lead} · Cập nhật ngày {UPDATED}</p>
          </header>
{body.strip()}
        </article>
      </div>
    </section>
  </main>"""


NOT_FOUND_MAIN = """  <main id="main">
    <section class="page-hero page-hero--image not-found" aria-labelledby="page-title">
      <img class="page-hero__bg" src="/assets/img/solution-6.webp" width="1920" height="1072" alt="">
      <div class="container page-hero__inner">
        <p class="not-found__code" aria-hidden="true">404</p>
        <h1 class="page-title" id="page-title">Không tìm thấy trang</h1>
        <p class="page-hero__lead">Đường dẫn có thể đã thay đổi hoặc không còn tồn tại.</p>
        <p class="not-found__actions">
          <a class="btn-glass btn-glass--sans btn-glass--red" href="/">Về trang chủ</a>
          <a class="btn-glass btn-glass--sans" href="/san-pham/">Xem sản phẩm</a>
        </p>
        <nav class="not-found__links" aria-label="Trang gợi ý">
          <a href="/tien-trinh/">Sơ đồ tiến trình</a>
          <a href="/dich-vu/">Dịch vụ</a>
          <a href="/gioi-thieu/">Casa xin chào</a>
          <a href="/dich-vu/#lien-he">Liên hệ</a>
        </nav>
      </div>
    </section>
  </main>"""

PAGES = [
    ("chinh-sach-bao-mat/index.html", "Chính sách bảo mật | Casa+",
     "Cách Casa+ thu thập, sử dụng và bảo vệ thông tin cá nhân khi bạn dùng website, tạo tài khoản, đăng nhập bằng Google hoặc gửi yêu cầu tư vấn.",
     "legal", legal_main("Chính Sách Bảo Mật", "Chính sách bảo mật", "Áp dụng cho website 3d-printedfacade.com", PRIVACY)),
    ("dieu-khoan/index.html", "Điều khoản sử dụng | Casa+",
     "Điều khoản sử dụng website và tài khoản Casa+: phạm vi, trách nhiệm tài khoản, sở hữu trí tuệ, giới hạn trách nhiệm và luật áp dụng.",
     "legal", legal_main("Điều Khoản Sử Dụng", "Điều khoản sử dụng", "Áp dụng cho website 3d-printedfacade.com", TERMS)),
    ("404.html", "Không tìm thấy trang | Casa+",
     "Trang bạn tìm không tồn tại hoặc đã được chuyển. Quay về trang chủ Casa+ hoặc xem sản phẩm gốm kiến trúc in 3D.",
     "notfound", NOT_FOUND_MAIN),
]


def main():
    src = (HTML / "gioi-thieu/index.html").read_text(encoding="utf-8")
    src = re.sub(r"  <!-- seo:start -->.*?<!-- seo:end -->\n", "", src, flags=re.S)
    for path, title, desc, page, main_html in PAGES:
        s = re.sub(r"<title>.*?</title>", f"<title>{title}</title>", src)
        s = re.sub(r'<meta name="description" content="[^"]*">', f'<meta name="description" content="{desc}">', s)
        s = re.sub(r'<body data-page="[a-z]+"', f'<body data-page="{page}"', s)
        s = re.sub(r"  <main id=\"main\">.*?  </main>", lambda m: main_html, s, flags=re.S)
        out = HTML / path
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_text(s, encoding="utf-8")
        print("ok", path)


if __name__ == "__main__":
    main()
