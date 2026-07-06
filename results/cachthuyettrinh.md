# HƯỚNG DẪN THUYẾT TRÌNH ĐỒ ÁN TỐT NGHIỆP
## ĐỀ TÀI: XÂY DỰNG HỆ THỐNG THÔNG TIN KÝ TÚC XÁ TRƯỜNG ĐẠI HỌC THỦY LỢI
Sinh viên thực hiện: Bùi Xuân Sơn | Lớp: 64HTTT4 | GVHD: ThS. Kiều Tuấn Dũng

---

### Slide 1: Trang bìa (Giới thiệu đề tài)
Nội dung hiển thị: Tên đề tài, thông tin sinh viên, mã SV, lớp, tên giảng viên hướng dẫn.
Lời thoại thuyết trình:
  "Kính thưa quý thầy cô trong Hội đồng chấm đồ án tốt nghiệp, em tên là Bùi Xuân Sơn, sinh viên lớp 64HTTT4 chuyên ngành Hệ thống thông tin. Hôm nay, dưới sự hướng dẫn khoa học của Thầy ThS. Kiều Tuấn Dũng, em xin phép được trình bày báo cáo đồ án tốt nghiệp của mình với đề tài: Xây dựng hệ thống thông tin quản lý ký túc xá Trường Đại học Thủy Lợi."

---

### Slide 2: Nội dung báo cáo (Chương trình nghị sự)
Nội dung hiển thị: 5 phần chính: 1. Tổng quan đề tài | 2. Cơ sở lý thuyết | 3. Phân tích thiết kế | 4. Kết quả thực nghiệm | 5. Kết luận & Hướng phát triển.
Lời thoại thuyết trình:
  "Nội dung báo cáo của em ngày hôm nay sẽ đi qua 5 phần chính:
  Thứ nhất là Tổng quan về đề tài.
  Thứ hai là Cơ sở lý thuyết công nghệ sử dụng.
  Thứ ba là Phân tích thiết kế hệ thống.
  Thứ tư là Kết quả thực nghiệm đạt được.
  Và cuối cùng là Kết luận cùng Hướng phát triển tương lai của đề tài.
  Sau đây, em xin đi vào phần đầu tiên: Tổng quan về đề tài."

---

### Slide 3: 1. Tổng quan về đề tài (Giới thiệu mục con)
Nội dung hiển thị: Các mục con 1.1 đến 1.4 (Giới thiệu bài toán, Khảo sát, Mục tiêu, Phạm vi).
Lời thoại thuyết trình:
  "Trong chương mở đầu này, em xin trình bày 4 khía cạnh: Lý do lựa chọn đề tài thông qua bài toán thực tế, kết quả khảo sát thực trạng tại ký túc xá, mục tiêu đề tài cần đạt được và phạm vi giới hạn xây dựng phần mềm."

---

### Slide 4: 1.1. Giới thiệu bài toán & 1.2. Khảo sát thực tế
Nội dung hiển thị: Các bất cập hiện tại: Quy trình thủ công, dữ liệu phân tán (Zalo, giấy tờ), sinh viên bị động, hóa đơn dễ sai sót, phân bổ phòng chưa tối ưu.
Lời thoại thuyết trình:
  "Đầu tiên về giới thiệu bài toán: Chuyển đổi số đang là xu hướng tất yếu trong giáo dục. Trường Đại học Thủy Lợi chúng ta có quy mô đào tạo lớn và lượng sinh viên nội trú rất đông, tuy nhiên công tác quản lý hiện nay tại ký túc xá vẫn gặp nhiều khó khăn trong vận hành do tính thủ công và dữ liệu bị phân tán.
  Qua khảo sát thực tế, em nhận thấy hệ thống quản lý hiện hành còn nhiều bất cập: Các quy trình nộp đơn đăng ký, làm hợp đồng, tính hóa đơn chủ yếu làm trên giấy tờ hoặc excel riêng lẻ; thông báo đẩy thì gửi qua Zalo khiến sinh viên khó theo dõi; sinh viên chưa có một nền tảng chuyên biệt để tự tra cứu. Hơn nữa, nhu cầu ở luôn vượt quá nguồn cung phòng, dẫn đến áp lực xét duyệt và phân bổ phòng chưa tối ưu. Hóa đơn điện nước tính thủ công dễ phát sinh sai sót, và các phản ánh, kỷ luật của sinh viên chưa có công cụ ghi nhận khoa học."

---

### Slide 5: 1.3. Mục tiêu & 1.4. Phạm vi đề tài
Nội dung hiển thị: Nền tảng quản lý tập trung, tự động xếp phòng, minh bạch tài chính, chatbot AI hỗ trợ sinh viên. Đối tượng: BQL (Giám đốc, trưởng tòa, kế toán) và sinh viên. Hệ thống phần mềm Web (chưa IoT phần cứng, thanh toán Sandbox).
Lời thoại thuyết trình:
  "Từ thực tiễn khảo sát, đề tài đặt ra mục tiêu: Xây dựng một nền tảng quản lý tập trung đồng bộ dữ liệu; ứng dụng thuật toán để tự động hóa xét duyệt hồ sơ và xếp phòng công bằng; giúp sinh viên chủ động tra cứu thông tin; đồng thời tích hợp các công nghệ AI (như chatbot, phân tích cảm xúc phản ánh) để phục vụ sinh viên tốt hơn.
  Về phạm vi, hệ thống tập trung phục vụ ban quản lý (gồm Ban giám đốc trung tâm, các Trưởng tòa nhà, Kế toán) và Sinh viên nội trú. Hệ thống được xây dựng dưới dạng ứng dụng Web hoàn chỉnh. Trong phạm vi đồ án này, hệ thống chưa triển khai phần cứng IoT thực tế và kết nối thanh toán qua cổng VNPay ở mức thử nghiệm Sandbox."

---

### Slide 6: 2. Cơ sở lý thuyết về công nghệ
Nội dung hiển thị: Mô hình Client-Server (React - Node/Express), mô hình 3 tầng (Controller-Service-DAO), bảo mật JWT, các công nghệ chính (PostgreSQL, Socket.io, OpenAI API, Google Vision API, VNPAY, Nginx, Cloudflare).
Lời thoại thuyết trình:
  "Về mặt công nghệ, hệ thống được thiết kế theo kiến trúc Client-Server độc lập, giao tiếp thông qua REST API chuẩn JSON. Frontend sử dụng thư viện React 19 kết hợp Tailwind CSS 4, Backend sử dụng Node.js với Express 5.
  Ở tầng Backend, em áp dụng cấu trúc 3 tầng: Controller tiếp nhận request, Service xử lý logic nghiệp vụ và DAO đảm nhiệm truy vấn cơ sở dữ liệu PostgreSQL. Hệ thống sử dụng JWT để bảo mật phân quyền nghiêm ngặt hai nhóm vai trò. Các công nghệ nâng cao được tích hợp gồm: Socket.io để truyền tin thời gian thực; Google Cloud Vision API để nhận dạng chữ viết ảnh (OCR); OpenAI API để xử lý ngôn ngữ tự nhiên; và VNPay làm cổng thanh toán trực tuyến."

---

### Slide 7: 3. Phân tích thiết kế hệ thống (Giới thiệu mục con)
Nội dung hiển thị: Danh sách các khâu phân tích thiết kế (3.1 đến 3.6).
Lời thoại thuyết trình:
  "Tiếp theo, em xin trình bày về phần Phân tích thiết kế hệ thống, bao gồm cấu trúc phân hệ người dùng, quy trình xét duyệt gán phòng tự động, cơ chế hóa đơn, tích hợp AI và thiết kế cơ sở dữ liệu."

---

### Slide 8: 3.1. Tổng quan hệ thống: Phân hệ & Vai trò người dùng
Nội dung hiển thị: 4 vai trò người dùng. Phân hệ BQL (9 nhóm chức năng) và Sinh viên (4 nhóm chức năng). Biểu đồ Use Case tổng quát.
Lời thoại thuyết trình:
  "Hệ thống phục vụ 4 vai trò: Sinh viên, Quản lý tòa nhà, Kế toán và Quản trị hệ thống. Như trên biểu đồ Use Case tổng quát, phân hệ Ban quản lý quản trị toàn diện thông qua 9 nhóm chức năng: từ duyệt hồ sơ, xếp phòng, hợp đồng, lập hóa đơn, quản lý tài sản, xử lý kỷ luật đến tiếp nhận phản ánh và theo dõi dashboard thống kê. Phân hệ Sinh viên cung cấp cổng thông tin riêng giúp các bạn chủ động quản lý thông tin cá nhân, hợp đồng, hóa đơn, nộp chỉ số điện nước, gửi phản ánh và tương tác trực tiếp với Trợ lý ảo AI."

---

### Slide 9: 3.2. Xét duyệt hồ sơ và xếp phòng tự động (Trang chuyển tiếp)
Nội dung hiển thị: Tiêu đề mục 3.2.
Lời thoại thuyết trình:
  "Sau đây, em xin đi sâu vào một trong những quy trình cốt lõi và phức tạp nhất của hệ thống: Quy trình xét duyệt hồ sơ và xếp phòng tự động. Quy trình này được liên thông khép kín thông qua ba khâu chính:
  Khâu thứ nhất là tiếp nhận và đối soát hồ sơ để tính điểm xét tuyển. Ở khâu này, ban quản lý trước tiên sẽ mở đợt đăng ký mới dưới dạng thống kê số liệu để cân đối chỉ tiêu phòng trống. Để tránh tình trạng quá tải hệ thống khi có lượng đăng ký lớn cùng lúc, đồ án đề xuất cho phép sinh viên đăng ký qua Google Forms rồi ban quản lý chỉ cần nhập dữ liệu từ Google Sheets hoặc CSV vào hệ thống, kết hợp công nghệ OCR để đối soát tự động ảnh minh chứng.
  Khâu thứ hai là duyệt hồ sơ tự động, hệ thống sắp xếp danh sách từ cao xuống thấp theo chỉ tiêu đã định và tự động gửi email thông báo kết quả.
  Khâu thứ ba là gán phòng tự động, hệ thống sử dụng thuật toán thông minh để gán phòng dựa trên tính tương đồng về khóa học, khoa ngành và giới tính của sinh viên."

---

### Slide 10: 3.2.1. Khâu xét duyệt tính điểm và đối soát hồ sơ
Nội dung hiển thị: Biểu đồ hoạt động (Activity) và tuần tự (Sequence) của khâu nhập hồ sơ đăng ký.
Lời thoại thuyết trình:
  "Tại khâu tiếp nhận hồ sơ, sinh viên điền thông tin đăng ký và tải ảnh minh chứng lên hệ thống. Biểu đồ hoạt động và biểu đồ tuần tự ở đây mô tả quá trình dữ liệu được truyền tải: Khi sinh viên gửi đơn, Backend sẽ tiếp nhận hình ảnh minh chứng chính sách ưu tiên và chuyển sang Google Cloud Vision API để xử lý bằng công nghệ OCR. OCR là viết tắt của Optical Character Recognition, tức là nhận dạng ký tự quang học. Công nghệ này giúp tự động quét và nhận diện chữ viết từ ảnh chụp minh chứng ưu tiên của sinh viên, chuyển thành dạng văn bản để hệ thống tự động đối soát thông tin và gợi ý xác thực trước khi tính điểm ưu tiên."

---

### Slide 11: Quy chế xét tuyển và cấu trúc điểm số
Nội dung hiển thị: Các bảng điểm quy đổi cho chính sách ưu tiên, học lực GPA, năm học, bảng trọng số và công thức tính điểm xét tuyển.
Lời thoại thuyết trình:
  "Để quá trình xét duyệt công bằng, hệ thống áp dụng công thức tính điểm tự động dựa trên 3 cột điểm chính được trình bày trên các bảng số liệu ở đây:
  Thứ nhất, Điểm ưu tiên chính sách (Tối đa 100 điểm cho diện nghèo/khuyết tật, 70 điểm cho vùng sâu vùng xa).
  Thứ hai, Điểm quy đổi năm học (Tân sinh viên năm nhất được ưu tiên 100 điểm, giảm dần theo các năm học sau).
  Thứ ba, Điểm GPA học lực quy đổi từ thang 4 về thang 100 (GPA dưới 2.0 sẽ bị loại trực tiếp).
  Tổng điểm xét tuyển được tính bằng tổng của ba điểm này nhân với trọng số tương ứng (Chính sách: 0.5 | Năm học: 0.3 | Học lực: 0.2). Các hệ số này Ban quản lý hoàn toàn có thể điều chỉnh linh hoạt trên UI."

---

### Slide 12: 3.2.2. Khâu duyệt hồ sơ tự động
Nội dung hiển thị: Biểu đồ hoạt động và biểu đồ tuần tự duyệt hồ sơ tự động.
Lời thoại thuyết trình:
  "Sau khi tính điểm, hệ thống sẽ thực hiện khâu duyệt tự động dựa trên chỉ tiêu phòng trống của từng đợt đăng ký. Hệ thống tự động sắp xếp danh sách hồ sơ từ điểm cao xuống thấp, duyệt tự động theo đúng chỉ tiêu đã thiết lập. Những hồ sơ nằm trong chỉ tiêu sẽ chuyển trạng thái 'Đã duyệt' và hệ thống sẽ tự động gửi email thông báo kèm mật khẩu đăng nhập (mặc định là số CCCD) cho sinh viên; các hồ sơ vượt chỉ tiêu sẽ chuyển sang danh sách chờ duyệt hoặc từ chối kèm lý do."

---

### Slide 13: 3.2.3. Khâu gán phòng tự động
Nội dung hiển thị: Biểu đồ hoạt động và biểu đồ tuần tự gán phòng.
Lời thoại thuyết trình:
  "Sau khi hồ sơ được duyệt và chuyển sang hợp đồng ở trạng thái chờ gán phòng, hệ thống sẽ chạy thuật toán gán phòng tự động. Thuật toán hoạt động bằng cách lọc các phòng trống phù hợp theo giới tính của sinh viên, sau đó ưu tiên xếp các sinh viên cùng khóa học và cùng khoa vào chung phòng để hỗ trợ tốt nhất cho sinh viên trong học tập. Nếu tìm được phòng phù hợp, hệ thống tự động gán phòng và cập nhật trạng thái hợp đồng, sẵn sàng để sinh viên đóng tiền cọc nhận phòng."

---

### Slide 14: 3.3. Quản lý hoá đơn và thanh toán trực tuyến
Nội dung hiển thị: Biểu đồ hoạt động kiểm tra hóa đơn (Anomaly Detection) và biểu đồ hoạt động thanh toán hóa đơn.
Lời thoại thuyết trình:
  "Đối với module Tài chính, hệ thống tự động hóa khép kín: Đầu tháng sinh viên khai báo số điện nước online (ngày 1-5). Nếu quá hạn, hệ thống tự điền số mặc định vào ngày 6. Trước khi ban hành, kế toán kích hoạt tính năng tự động phát hiện hóa đơn bất thường — hệ thống sẽ tính lượng tiêu thụ trung bình 3 tháng trước đó, nếu lượng tiêu thụ tháng này tăng vượt quá 50%, hệ thống sẽ lập tức gắn cờ cảnh báo đỏ để kế toán rà soát. Sinh viên sau khi nhận email thông báo chốt số sẽ thực hiện thanh toán online qua mã VietQR động tự động điền số tiền và nội dung, hoặc qua cổng VNPay. Khi thanh toán thành công, hệ thống tự động cập nhật trạng thái hóa đơn và hợp đồng sang Active."

---

### Slide 15: 3.4. Tích hợp trí tuệ nhân tạo (OpenAI API)
Nội dung hiển thị: Sơ đồ tích hợp AI: Trợ lý ảo tư vấn 24/7, phân tích cảm xúc phản ánh (AI Sentiment), và tự động tóm tắt tin tức.
Lời thoại thuyết trình:
  "Điểm đột phá của đề tài là việc ứng dụng OpenAI API trực tiếp vào hệ thống thông tin. Thứ nhất, Trợ lý ảo AI hoạt động 24/7 trong khung chat của sinh viên, có khả năng ghi nhớ ngữ cảnh xuất sắc để giải đáp mọi câu hỏi về nội quy, thủ tục hành chính. Thứ hai, AI tự động phân tích cảm xúc các ticket phản ánh của sinh viên, nhận diện trạng thái cảm xúc (tiêu cực, bức xúc, khẩn cấp) để tự động gán độ ưu tiên cao cho Admin xử lý. Thứ ba, hệ thống tự động cào tin tức từ web trường Thủy Lợi và tích hợp tính năng tóm tắt nhanh bài viết bằng AI ngay tại khung chat để sinh viên nắm bắt thông tin nhanh chóng."

---

### Slide 16: 3.5. Các chức năng phụ trợ khác
Nội dung hiển thị: Các tính năng phụ: Quản lý thiết bị tài sản trong phòng, Quản lý sinh viên xung kích trực tòa nhà, Ghi nhận kỷ luật trừ điểm, Gửi thông báo realtime qua Socket.IO.
Lời thoại thuyết trình:
  "Bên cạnh các nghiệp vụ chính, hệ thống còn xây dựng các chức năng phụ trợ thiết thực khác:
  - Quản lý tài sản thiết bị: Theo dõi chi tiết tình trạng hỏng hóc, lịch sử xuất/nhập kho của từng phòng.
  - Phân công sinh viên xung kích: Hỗ trợ gán và theo dõi lịch trực của tình nguyện viên tại các tòa nhà.
  - Quản lý kỷ luật: Ghi nhận vi phạm, trừ điểm rèn luyện và tự động gửi email cảnh báo khi sinh viên vi phạm cùng một lỗi quá 3 lần.
  - Gửi thông báo đẩy: Sử dụng Socket.IO giúp ban quản lý gửi thông báo đến toàn bộ sinh viên đang online với độ trễ cực thấp dưới 200ms."

---

### Slide 17: 3.6. Thiết kế cơ sở dữ liệu
Nội dung hiển thị: Sơ đồ quan hệ thực thể (ERD) với 11 bảng cơ sở dữ liệu chính.
Lời thoại thuyết trình:
  "Về mặt dữ liệu, cơ sở dữ liệu hệ thống được thiết kế tối ưu hóa dạng chuẩn, gồm 11 bảng dữ liệu chính tương tác chặt chẽ với nhau: bảng người dùng (users), phòng ở (rooms), hồ sơ đăng ký (register_forms), hợp đồng (student_contracts), hóa đơn (invoices), phản ánh (feedbacks), kỷ luật (disciplinary), tài sản (assets), thông báo (notifications), cấu hình (settings) và nhật ký hoạt động (system_logs). Sơ đồ thực thể liên kết ERD ở đây thể hiện rõ ràng các liên kết khóa chính, khóa ngoại, đảm bảo tính toàn vẹn và không dư thừa dữ liệu."

---

### Slide 18: 4. Kết quả đạt được, kết luận và hướng phát triển (Trang chuyển tiếp)
Nội dung hiển thị: Tiêu đề phần 4.
Lời thoại thuyết trình:
  "Sau đây, em xin trình bày kết quả thực nghiệm đạt được sau khi chạy thử nghiệm hệ thống, cùng với những kết luận rút ra và hướng phát triển tương lai của đề tài."

---

### Slide 19: 4.1. Kết quả đạt được (Trang 1)
Nội dung hiển thị: Sản phẩm hoàn chỉnh (React 19 + Express 5), website chạy thực tế kytucxatlu.site, kiểm thử hộp đen đạt 100% PASS (30 kịch bản).
Lời thoại thuyết trình:
  "Về kết quả đạt được, thứ nhất, em đã hoàn thành một sản phẩm phần mềm hoàn chỉnh cả 2 phân hệ ban quản lý và sinh viên hoạt động ổn định.
  Thứ hai, hệ thống đã được triển khai chạy thử nghiệm thực tế tại địa chỉ: kytucxatlu.site với tốc độ phản hồi nhanh.
  Thứ ba, hệ thống đã được kiểm thử hộp đen thông qua 30 kịch bản kiểm thử bao phủ toàn bộ các module nghiệp vụ phức tạp nhất và đạt kết quả 100% PASS (30/30 kịch bản thành công)."

---

### Slide 20: 4.1. Kết quả đạt được (Trang 2)
Nội dung hiển thị: Tự động hóa 90% quy trình, tối ưu hiệu năng xếp phòng tự động trong vài phút, tích hợp AI OCR & OpenAI API thành công.
Lời thoại thuyết trình:
  "Tiếp theo, hệ thống đã đạt tỷ lệ tự động hóa quy trình lên tới 90%, giúp luồng dữ liệu kế thừa khép kín và hạn chế tối đa việc can thiệp thủ công từ lúc nộp đơn cho tới khi thanh toán hóa đơn.
  Nhờ tự động hóa, hiệu năng xếp phòng được tối ưu vượt trội, các tác vụ xếp phòng tự động, tính điểm ưu tiên và xếp phòng thông minh chỉ mất vài phút để hoàn thành.
  Đồ án cũng đã tích hợp thành công công nghệ AI OCR của Google để đối soát giấy tờ và OpenAI API để phân tích cảm xúc phản ánh, chạy chatbot tư vấn 24/7."

---

### Slide 21: 4.2. Hạn chế kỹ thuật & Kết luận & 4.3. Hướng phát triển tương lai
Nội dung hiển thị: Hạn chế: cổng VNPay Sandbox, thu thập điện nước vẫn cần sinh viên khai báo. Kết luận: Hoàn thành 100% mục tiêu, số hóa toàn diện KTX TLU. Hướng phát triển: Tích hợp thiết bị IoT (khóa thông minh, công tơ điện nước tự động), Mobile App, liên kết dịch vụ căng tin/giặt là.
Lời thoại thuyết trình:
  "Bên cạnh kết quả đạt được, đồ án vẫn có một số hạn chế kỹ thuật: Cổng thanh toán VNPay hiện chạy ở môi trường Sandbox do thủ tục pháp lý kinh doanh của nhà trường; quy trình chốt điện nước vẫn cần sinh viên khai báo online thay vì tự động đồng bộ từ thiết bị đo.
  Kết luận: Đề tài đã hoàn thành 100% mục tiêu nghiên cứu và các tính năng đề ra, xây dựng thành công giải pháp số hóa toàn diện giúp hiện đại hóa công tác quản lý KTX Đại học Thủy Lợi, nâng cao tính công bằng và minh bạch tài chính.
  Hướng phát triển tương lai: Em hướng tới tích hợp phần cứng và thiết bị IoT (như công tơ điện nước thông minh để đồng bộ số liệu thời gian thực tự động, khóa vân tay/khuôn mặt quản lý ra vào các tòa nhà) và xây dựng phiên bản ứng dụng di động Mobile App đa nền tảng để tối ưu trải nghiệm cho sinh viên."

---

### Slide 22: Lời cảm ơn (Slide cuối)
Nội dung hiển thị: Lời cảm ơn GVHD ThS. Kiều Tuấn Dũng và quý thầy cô Hội đồng chấm đồ án.
Lời thoại thuyết trình:
  "Để hoàn thành được đề tài này, em xin phép được gửi lời cảm ơn sâu sắc nhất tới Thầy ThS. Kiều Tuấn Dũng, người đã luôn tận tình hướng dẫn, định hướng và giúp đỡ em trong suốt quá trình nghiên cứu và xây dựng hệ thống.
  Đồng thời, em cũng xin chân thành cảm ơn các Thầy, các Cô trong Hội đồng đã dành thời gian quý báu để lắng nghe phần trình bày của em ngày hôm nay. Em rất mong sẽ nhận được những ý kiến đóng góp, nhận xét và câu hỏi từ quý Thầy Cô để giúp đề tài của em ngày càng hoàn thiện hơn.
  Em xin chân thành cảm ơn quý Thầy Cô!"