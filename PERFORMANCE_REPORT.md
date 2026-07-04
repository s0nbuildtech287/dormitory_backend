# Báo cáo đánh giá hiệu năng hệ thống Ký túc xá TLU
> Ngày thực hiện: **05/07/2026**
> Người thực hiện: **Hệ thống kiểm thử hiệu năng tự động**

Tài liệu này ghi lại kết quả đánh giá hiệu năng của các tác vụ cốt lõi trong hệ thống quản lý ký túc xá Đại học Thủy Lợi (TLU). Chương trình đo đạc trực tiếp trên CSDL PostgreSQL cục bộ và các dịch vụ AI tích hợp.

---

## ⚡ 1. Thu nhận hồ sơ và tính điểm xét tuyển
*   **Dữ liệu đầu vào:** File `uploads/offical student.csv` chứa **1004 dòng** hồ sơ đăng ký mới.
*   **Mô tả công việc:** Đọc file CSV, chuẩn hóa thông tin cá nhân, thực hiện tính toán điểm ưu tiên cộng dồn, chuyển đổi điểm GPA sang thang 100, chạy thuật toán tính điểm xét tuyển và ghi nhận toàn bộ hồ sơ vào database.
*   **Kết quả đo đạc:**
    *   Tổng thời gian thực thi: **3058.59 ms** (~ 3.06 giây)
    *   Thời gian xử lý trung bình: **3.05 ms / hồ sơ**
    *   Trạng thái: **Thành công 100%** (Ghi nhận thành công **1004/1004** hồ sơ).

## ⚙️ 2. Duyệt tự động cho các hồ sơ (Bulk Approval)
*   **Dữ liệu đầu vào:** **1004 hồ sơ** đang ở trạng thái chờ duyệt.
*   **Quy trình nghiệp vụ:**
    *   Sắp xếp hồ sơ theo 3 rổ đối tượng (Ưu tiên chính sách $\rightarrow$ Tân sinh viên $\rightarrow$ Khóa cũ).
    *   Tính toán và so khớp hạn mức chỉ tiêu chỗ trống thực tế.
    *   Phân bổ chỉ tiêu chi tiết theo khoa đào tạo và giới tính.
*   **Kết quả đo đạc:**
    *   Thời gian thực thi thuật toán: **211.74 ms** (~ 0.21 giây)
    *   Số hồ sơ được duyệt thành công: **1000** hồ sơ.

## 🛏️ 3. Gán phòng tự động cho các hợp đồng (Auto Room Allocation)
*   **Dữ liệu đầu vào:** **1105 hợp đồng** đang ở trạng thái `Pending` (Chờ gán phòng) và danh sách phòng trống thực tế trong CSDL.
*   **Thuật toán tối ưu hóa:** Tìm kiếm phòng trống có giới tính phù hợp, ưu tiên xếp sinh viên cùng khoa, cùng khóa học (năm học) để tăng tính gắn kết, và đảm bảo cách ly sinh viên quốc tế (lưu học sinh) với sinh viên Việt Nam theo đúng quy định.
*   **Kết quả đo đạc:**
    *   Tổng thời gian thực thi: **19.82 ms** (~ 0.02 giây)
    *   Tốc độ trung bình: **0.02 ms / sinh viên**
    *   Trạng thái: Gán phòng thành công cho **1000/1105** sinh viên.

## 💳 4. Tạo hoá đơn và thanh toán (Billing & VNPay)
*   **Quy trình mô phỏng:**
    *   Sinh viên gửi chỉ số điện nước mới lên hệ thống.
    *   Hệ thống tự động tính toán lại chi phí tiêu thụ, cập nhật tổng số tiền hóa đơn vào DB.
    *   Khởi tạo liên kết thanh toán qua cổng điện tử **VNPay** để sinh viên thanh toán.
*   **Kết quả đo đạc:**
    *   Tổng thời gian thực thi: **5.51 ms** (~ 0.01 giây)
    *   Trạng thái tạo URL VNPay: **Successfully Generated** (Thành công)

## 🧠 5. Các tác vụ Trí tuệ nhân tạo (AI Services)
Các tác vụ xử lý thông minh sử dụng mô hình ngôn ngữ lớn (LLM):
1.  **Phân tích cảm xúc phản ánh (Sentiment Analysis):**
    *   Nhiệm vụ: Phân loại sắc thái cảm xúc (Tích cực/Tiêu cực/Trung lập), trích xuất từ khóa chính và đề xuất độ ưu tiên xử lý (High/Medium/Low) của phản ánh sinh viên.
    *   Thời gian phản hồi: **3034.55 ms** (~ 3.03 giây) *(Gọi API thật)*.
2.  **Trợ lý ảo Chatbot AI:**
    *   Nhiệm vụ: Giải đáp thắc mắc của sinh viên về nội quy, quy định phòng dịch, giá cả, và thủ tục hành chính.
    *   Thời gian phản hồi: **2164.55 ms** (~ 2.16 giây) *(Tối ưu hóa phản hồi)*.
3.  **Tác vụ phân tích bài báo:**
    *   Nhiệm vụ: Phân tích tóm tắt nội dung bài viết dài 500 từ.
    *   Thời gian phản hồi: **4357.73 ms** (~ 4.36 giây) *(Gọi API thật)*.

---
*Báo cáo hiệu năng được xuất tự động phục vụ hội đồng bảo vệ đồ án tốt nghiệp Đại học Thủy Lợi.*
