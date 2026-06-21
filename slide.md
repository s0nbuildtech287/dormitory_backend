# Đề Cương Slide Bảo Vệ Đồ Án Tốt Nghiệp (Đã Tối Ưu Theo Góp Ý)
**Đề tài:** Xây dựng hệ thống thông tin quản lý ký túc xá trường Đại học Thủy Lợi  
**Sinh viên thực hiện:** Bùi Xuân Sơn  
**Độ dài:** 16 slides (Tập trung vào biểu đồ tổng quan, các nghiệp vụ chính và tinh giản chức năng phụ)

---

## Slide 1: Trang bìa (Tiêu đề báo cáo)
* **Nội dung:**
  * Trường Đại học Thủy Lợi - Khoa Công nghệ thông tin.
  * Tên đề tài: **XÂY DỰNG HỆ THỐNG THÔNG TIN QUẢN LÝ KÝ TÚC XÁ TRƯỜNG ĐẠI HỌC THUỶ LỢI**.
  * Đồ án tốt nghiệp đại học hệ chính quy.
  * Sinh viên thực hiện: **Bùi Xuân Sơn** - Lớp: **64HTTT4** - MSV: **2251162139**.
  * Giảng viên hướng dẫn: **ThS. Kiều Tuấn Dũng**, **ThS. Tạ Chí Hiếu**.
  * Hà Nội, Năm 2026.
* **Hình ảnh:** Logo Đại học Thủy Lợi.

---

## Slide 2: Nội dung báo cáo (Agenda)
* **Nội dung:**
  1. Lý do chọn đề tài & Khảo sát thực tế
  2. Mục tiêu và Phạm vi nghiên cứu
  3. Cơ sở lý thuyết & Công nghệ sử dụng
  4. Phân tích & Thiết kế logic hệ thống
  5. Xây dựng chương trình & Đánh giá kết quả
  6. Kết luận & Hướng phát triển đề tài

---

## Slide 3: Lý do chọn đề tài & Khảo sát thực tế (Introduction)
* **Nội dung:**
  * **Thực trạng tại TLU:** Số lượng sinh viên nội trú tăng nhanh nhưng công tác quản lý chủ yếu thủ công (giấy tờ, Excel rời rạc).
  * **Hạn chế chính:** 
    * Dữ liệu phân tán, dễ sai sót và mất thời gian khi thống kê báo cáo.
    * Xét duyệt hồ sơ đăng ký và xếp phòng thiếu khách quan do bất cân đối cung - cầu lớn.
    * Phản hồi ý kiến và quản lý kỷ luật sinh viên lỏng lẻo.
    * Chỉ số điện nước và hóa đơn tính thủ công, dễ phát sinh thắc mắc.
  * **Giải pháp:** Số hóa quy trình quản lý tập trung và tích hợp công nghệ thông minh.

---

## Slide 4: Mục tiêu & Phạm vi nghiên cứu (Objectives & Scope)
* **Nội dung:**
  * **Mục tiêu cốt lõi:**
    * Xây dựng nền tảng quản lý tập trung thời gian thực (buồng phòng, hợp đồng, hóa đơn).
    * Tự động hóa khâu xét duyệt hồ sơ (qua AI OCR) và xếp phòng thông minh.
    * Tự động hóa hóa đơn và giám sát bất thường chỉ số điện nước.
    * Tích hợp AI Chatbot và AI phân tích cảm xúc phản ánh để tăng tính tương tác.
  * **Phạm vi:** Web App dành cho Ban quản lý (Admin/Staff) và Sinh viên trường Đại học Thủy Lợi.

---

## Slide 5: Cơ sở lý thuyết & Công nghệ sử dụng (Tech Stack)
* **Nội dung:**
  * **Kiến trúc hệ thống:** Client - Server (RESTful API), mẫu thiết kế 3 lớp tại Backend (Router --> Controller --> Service --> DAO).
  * **Backend:** Node.js (Express), xác thực phân quyền JWT, mã hóa bcrypt.
  * **Frontend:** React 19 (Vite 6), styling Tailwind CSS 4, biểu đồ Recharts.
  * **Cơ sở dữ liệu:** PostgreSQL 16 (sử dụng JSONB lưu kết quả AI, ENUM cho trạng thái).
  * **Tích hợp bên thứ ba:** Google Cloud Vision API (OCR), OpenAI API (Sentiment/Chatbot), VNPAY Sandbox (Thanh toán), Socket.IO (Realtime).

---

## Slide 6: Phân tích & Thiết kế: Use Case tổng quát (Overall Use Case)
* **Nội dung:**
  * Trình chiếu **Hình 3.1: Biểu đồ use case tổng quát**.
  * Làm rõ vai trò và quyền hạn của 4 tác nhân chính:
    * *Sinh viên (Student)*: Đăng ký, thanh toán hóa đơn, phản ánh, chat AI.
    * *Quản lý tòa nhà (Staff)*: Duyệt hồ sơ, gán phòng, gửi thông báo.
    * *Kế toán (Accountant)*: Quản lý hóa đơn điện nước, doanh thu.
    * *Quản trị viên (Admin)*: Quản lý tài khoản, cấu hình hệ thống.

---

## Slide 7: Nghiệp vụ chính 1: Đăng ký & Xét duyệt tự động (Vision AI & Scoring)
* **Nội dung:**
  * **Quy trình đăng ký:** Sinh viên nộp đơn trực tuyến, đính kèm ảnh thẻ SV/minh chứng chính sách.
  * **Xác thực bằng Google Cloud Vision API (AI OCR):** Tự động nhận diện và trích xuất chữ viết từ ảnh, đối soát từ khóa chính sách ưu tiên và tự động gán trạng thái xác thực.
  * **Thuật toán tính điểm ưu tiên (Scoring System):** Tự động cộng điểm ưu tiên theo 3 nhóm đối tượng kết hợp điểm GPA học tập và khoảng cách địa lý (Km) để xếp thứ tự xét duyệt khách quan nhất.

---

## Slide 8: Nghiệp vụ chính 2: Xếp phòng tự động & Quản lý hợp đồng (Rooming)
* **Nội dung:**
  * **Duyệt theo chỉ tiêu (Quotas):** BQL thiết lập chỉ tiêu cho từng khoa/khóa học. Hệ thống duyệt tự động từ điểm cao xuống thấp cho đến khi hết chỉ tiêu.
  * **Thuật toán xếp phòng thông minh:** Tự động gán phòng trống phù hợp giới tính, ưu tiên xếp sinh viên cùng khoa/khóa học vào cùng một phòng để tối ưu sinh hoạt nhóm.
  * **Tạo hợp đồng & Cấp tài khoản:** Tự động chuyển trạng thái hợp đồng, tạo tài khoản và gửi email thông báo số phòng/ngày nhận phòng đến sinh viên.

---

## Slide 9: Nghiệp vụ chính 3: Lập hóa đơn & Phát hiện bất thường chỉ số
* **Nội dung:**
  * **Tính toán chi phí:** Tự động tính tiền điện nước, phí dịch vụ hàng tháng theo cấu hình bảng giá.
  * **Thuật toán phát hiện bất thường:** Đối chiếu chỉ số tiêu thụ tháng hiện tại với trung bình 3 tháng gần nhất của phòng đó. Nếu lượng dùng **tăng đột biến > 50%**, hệ thống sẽ tự động gắn cờ cảnh báo đỏ để kế toán rà soát lỗi đồng hồ hoặc rò rỉ trước khi xuất hóa đơn.
  * **Thanh toán trực tuyến:** Tự động sinh mã VietQR theo số tiền hóa đơn hoặc chuyển hướng thanh toán qua cổng VNPay.

---

## Slide 10: Nghiệp vụ chính 4: Phản ánh dịch vụ & AI Sentiment Analysis
* **Nội dung:**
  * **Quy trình gửi phản ánh:** Sinh viên gửi yêu cầu sửa chữa, an ninh hoặc vệ sinh lên hệ thống.
  * **AI Sentiment Analysis (OpenAI API):** Tự động phân tích ngôn ngữ tự nhiên trong phản ánh để xác định thái độ (Tích cực, Tiêu cực, Bức xúc) và tự động gán mức độ ưu tiên xử lý (Thấp, Trung bình, Khẩn cấp) --> Cảnh báo tức thì lên Dashboard của BQL.
  * **Trợ lý ảo AI Chatbot 24/7:** Hỏi đáp quy chế, giá phòng, thủ tục hành chính và tự động tóm tắt tin tức TLU.

---

## Slide 11: Các chức năng phụ trợ (Minor Use Cases Overview)
* **Nội dung:**
  * Tổng quát các chức năng phụ trợ quan trọng hỗ trợ vận hành:
    * **Quản lý tài sản:** Nhập/xuất kho thiết bị, gán tài sản cố định cho từng phòng, theo dõi hao mòn/hư hỏng.
    * **Quản lý kỷ luật:** Lập biên bản vi phạm, tự động trừ điểm rèn luyện và gửi email cảnh báo về gia đình.
    * **Gửi thông báo & Realtime:** Tạo và gửi thông báo đẩy nhanh qua Socket.IO (đồng bộ tức khắc < 200ms) đến toàn bộ sinh viên hoặc nhóm tòa nhà cụ thể.
    * **Bảo mật:** Đăng nhập mã OTP qua email khi đăng ký tài khoản mới hoặc đổi mật khẩu.

---

## Slide 12: Thiết kế Cơ sở dữ liệu (Database ERD Summary)
* **Nội dung:**
  * Trình chiếu **Hình 3.69: Sơ đồ mô hình quan hệ cơ sở dữ liệu (Database Schema / ERD)**.
  * Trọng tâm thiết kế:
    * 11 bảng được thiết kế chuẩn hóa dữ liệu, tối ưu chỉ mục (Indexes) phục vụ lượng truy cập lớn.
    * Sử dụng kiểu dữ liệu `JSONB` của PostgreSQL để lưu kết quả phân tích AI và lịch sử thay đổi nhằm lưu trữ linh hoạt, giảm tải thiết kế bảng con.

---

## Slide 13: Biểu đồ tổng quan: Sơ đồ liên thông nghiệp vụ tự động hóa
* **Nội dung:**
  * Trình chiếu **Hình 4.15: Sơ đồ quy trình nghiệp vụ liên thông tự động hóa (End-to-End Workflow)**.
  * Thuyết minh luồng dữ liệu khép kín (bằng dạng text rõ ràng):
    * Bắt đầu: Sinh viên đăng ký trực tuyến --> AI OCR xác thực ảnh minh chứng --> Thuật toán tính điểm ưu tiên --> Tự động xếp phòng thông minh --> Khởi tạo hợp đồng (trạng thái Pending).
    * Tiếp tục: Sinh viên gửi chỉ số điện nước --> Tự động chốt hóa đơn tháng --> Sinh viên thanh toán online (qua VNPay hoặc VietQR) --> Kích hoạt hợp đồng chính thức (Active).
  * Chứng minh khả năng tự động hóa và tối ưu của giải pháp.

---

## Slide 14: Biểu đồ tổng quan: Luồng xử lý tích hợp trí tuệ nhân tạo
* **Nội dung:**
  * Trình chiếu **Hình 4.16: Sơ đồ luồng dữ liệu tích hợp Trí tuệ nhân tạo (AI Data Pipeline)**.
  * Thuyết minh chi tiết hai luồng xử lý chính:
    * **Luồng A (Phản ánh sinh viên):** Sinh viên gửi phản ánh --> Server chuyển dữ liệu sang OpenAI API --> Phân loại cảm xúc & gán nhãn ưu tiên --> Cảnh báo đỏ lên Dashboard cho Admin.
    * **Luồng B (Tin tức & Chatbot):** Cào tin tức tự động (Axios + Cheerio) --> Lưu cache bộ nhớ đệm --> AI tóm tắt bài báo & Chatbot AI hỗ trợ giải đáp 24/7.

---

## Slide 15: Kiểm thử hệ thống & Đánh giá hiệu năng
* **Nội dung:**
  * Trình chiếu **Hình 4.13 (Biểu đồ tròn kiểm thử)** và **Hình 4.14 (Biểu đồ hiệu suất)**.
  * **Kiểm thử chức năng:** 30 kịch bản kiểm thử hộp đen (Black-box testing) bao quát toàn bộ hệ thống --> Đạt **100% PASS** (30/30).
  * **Hiệu năng hệ thống:**
    * Thời gian phản hồi trung bình của hệ thống đối với hầu hết các nghiệp vụ cốt lõi đều dưới 30 - 60ms.
    * Tác vụ OCR giấy tờ (sử dụng Vision API) chạy song song non-blocking I/O không làm nghẽn hệ thống.

---

## Slide 16: Kết luận, Hướng phát triển & Lời cảm ơn (Q&A)
* **Nội dung:**
  * **Kết quả:** Xây dựng hoàn thiện sản phẩm phần mềm KTX đa nền tảng, hoạt động ổn định, bảo mật cao. Số hóa 100% quy trình giấy tờ, cắt giảm 50-70% thời gian tác vụ của BQL.
  * **Hướng phát triển:** Tích hợp thiết bị IoT (khóa cửa vân tay, công tơ điện nước tự động), xây dựng Mobile App.
  * **Lời cảm ơn:** Trân trọng cảm ơn sự lắng nghe và đóng góp ý kiến của thầy cô trong Hội đồng!
  * **Kế hoạch tiếp theo:** Trình diễn chạy thực tế sản phẩm (Live Demo).
