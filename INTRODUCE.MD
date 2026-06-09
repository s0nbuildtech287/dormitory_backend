# GIỚI THIỆU TỔNG QUAN DỰ ÁN

## 1. Tên dự án

**Dormitory Management System** là hệ thống quản lý ký túc xá dành cho Trường Đại học Thủy Lợi, được xây dựng để số hóa toàn bộ quy trình vận hành giữa ban quản lý ký túc xá và sinh viên.

Dự án gồm 2 phần chính:

- **Frontend**: ứng dụng web cho admin và sinh viên tại thư mục `../dormitory-frontend`
- **Backend**: API server và lớp nghiệp vụ tại thư mục hiện tại `dormitory_backend`

Ngoài ra, backend còn phục vụ luôn bản build frontend thông qua thư mục `dist/`, cho phép triển khai thành một hệ thống web thống nhất.

## 2. Mục tiêu của hệ thống

Hệ thống được xây dựng nhằm giải quyết các bài toán quản lý ký túc xá theo hướng tập trung, minh bạch và tự động hóa:

- Quản lý hồ sơ đăng ký ở ký túc xá
- Quản lý phòng ở, sức chứa và chỉ số điện nước
- Quản lý hợp đồng lưu trú của sinh viên
- Quản lý hóa đơn, thanh toán và công nợ
- Quản lý thông báo, phản ánh và xử lý sự vụ
- Quản lý cơ sở vật chất và kỷ luật nội trú
- Hỗ trợ sinh viên bằng chatbot AI và dữ liệu thời gian thực

## 3. Đối tượng sử dụng

Hệ thống phục vụ 2 nhóm người dùng chính:

### 3.1. Quản trị viên / Ban quản lý ký túc xá

Admin có thể:

- Theo dõi dashboard tổng quan
- Xét duyệt hồ sơ đăng ký của sinh viên
- Quản lý phòng, hợp đồng, tài sản, hóa đơn
- Gửi thông báo đến toàn bộ sinh viên hoặc từng nhóm cụ thể
- Theo dõi phản ánh, cảm xúc phản hồi và cảnh báo ưu tiên cao
- Xử lý kỷ luật, theo dõi điểm rèn luyện và lịch sử vi phạm
- Xem log hệ thống để truy vết thao tác

### 3.2. Sinh viên

Sinh viên có thể:

- Đăng nhập và xem hồ sơ cá nhân
- Theo dõi hợp đồng lưu trú
- Xem hóa đơn, gửi chỉ số điện nước và thanh toán qua VNPay
- Nhận thông báo từ ban quản lý
- Gửi phản ánh, theo dõi kết quả xử lý
- Xem nội quy ký túc xá và tin tức từ Trường Đại học Thủy Lợi
- Tra cứu thông tin qua chatbot AI

## 4. Kiến trúc tổng thể

Dự án được tổ chức theo mô hình tách lớp rõ ràng giữa giao diện, xử lý nghiệp vụ và lưu trữ dữ liệu.

### 4.1. Frontend

Frontend được xây dựng bằng **React + Vite**, sử dụng:

- `react-router-dom` để phân quyền và điều hướng theo vai trò
- Context API để quản lý trạng thái đăng nhập, thông báo, chatbot và điều hướng nội bộ
- Các module giao diện riêng cho admin và sinh viên
- Giao tiếp với backend qua REST API và Socket.IO

Frontend chia thành nhiều phân hệ giao diện tương ứng với nghiệp vụ thực tế:

- Dashboard tổng quan
- Quản lý hồ sơ đăng ký
- Quản lý phòng
- Quản lý hợp đồng
- Quản lý hóa đơn
- Quản lý thông báo
- Quản lý phản ánh
- Quản lý tài sản
- Quản lý kỷ luật
- Cổng sinh viên

### 4.2. Backend

Backend được xây dựng bằng **Node.js + Express**, theo kiến trúc nhiều lớp:

- `routers/`: định nghĩa endpoint
- `controllers/`: tiếp nhận request và trả response
- `services/`: xử lý nghiệp vụ
- `dao/`: truy cập dữ liệu theo DAO Pattern
- `middlewares/`: xác thực, upload, xử lý lỗi
- `config/`: cấu hình hệ thống và cơ sở dữ liệu

Kiến trúc này giúp mã nguồn dễ bảo trì, dễ mở rộng, và tách bạch rõ:

- giao diện API
- logic nghiệp vụ
- truy cập dữ liệu

### 4.3. Cơ sở dữ liệu

Schema dữ liệu cho thấy hệ thống đang được thiết kế theo **PostgreSQL**, với các bảng nghiệp vụ chính:

- `users`
- `register_forms`
- `rooms`
- `student_contracts`
- `invoices`
- `notifications`
- `feedbacks`
- `assets`
- `disciplinary_records`
- `log_system`
- `settings`

Thiết kế dữ liệu có sử dụng:

- enum cho các trạng thái nghiệp vụ
- trigger tự cập nhật `updated_at`
- JSONB cho dữ liệu linh hoạt
- index phục vụ truy vấn và thống kê
- audit log để truy vết thao tác hệ thống

## 5. Các phân hệ nghiệp vụ nổi bật

### 5.1. Quản lý hồ sơ đăng ký ký túc xá

Hệ thống tiếp nhận hồ sơ đăng ký của sinh viên và hỗ trợ:

- nhập dữ liệu từ CSV hoặc Google Sheets
- lưu thông tin cá nhân, học tập và lý do ưu tiên
- kiểm tra ảnh minh chứng
- chấm điểm và gợi ý xét duyệt
- duyệt hoặc từ chối hồ sơ

Đây là phân hệ mở đầu của toàn bộ vòng đời lưu trú trong ký túc xá.

### 5.2. Quản lý phòng ở

Phân hệ phòng hỗ trợ:

- quản lý tòa nhà, tầng, số phòng
- sức chứa và số lượng sinh viên đang ở
- phân loại phòng theo giới tính
- giá thuê và các khoản phí cố định
- chỉ số điện, nước
- trạng thái hoạt động hoặc bảo trì

### 5.3. Quản lý hợp đồng sinh viên

Sau khi hồ sơ được duyệt, hệ thống có thể:

- tạo hợp đồng lưu trú
- gán sinh viên vào phòng
- theo dõi thời hạn hợp đồng
- quản lý các trạng thái như chờ gán phòng, đang ở, hết hạn, chấm dứt

### 5.4. Quản lý hóa đơn và thanh toán

Hóa đơn được xây dựng theo mô hình chi tiết, bao gồm:

- tiền phòng theo đầu người
- điện, nước theo chỉ số
- phí rác, internet, gửi xe
- hạn thanh toán và trạng thái công nợ

Hệ thống có tích hợp **VNPay** để hỗ trợ thanh toán trực tuyến, đồng thời vẫn hỗ trợ xác nhận thanh toán thủ công.

### 5.5. Thông báo và phản ánh

Ban quản lý có thể gửi thông báo theo nhiều đối tượng:

- toàn bộ người dùng
- toàn bộ sinh viên
- nhóm sinh viên cụ thể

Sinh viên có thể gửi phản ánh về:

- sửa chữa
- vệ sinh
- an ninh
- thiết bị
- các vấn đề phát sinh khác

### 5.6. Quản lý tài sản và cơ sở vật chất

Hệ thống có phân hệ quản lý tài sản nội trú:

- mã tài sản
- loại tài sản
- vị trí, phòng sử dụng
- trạng thái sử dụng
- giá mua, nhà cung cấp
- mô tả kỹ thuật

Đây là điểm mở rộng quan trọng giúp dự án không chỉ quản lý chỗ ở mà còn quản lý vận hành cơ sở vật chất.

### 5.7. Kỷ luật và điểm rèn luyện

Phân hệ kỷ luật quản lý:

- loại vi phạm
- mức độ xử lý
- tiền phạt
- số điểm rèn luyện bị trừ
- số lần tái phạm
- trạng thái xử lý và khiếu nại

Đây là phân hệ phù hợp với môi trường nội trú, giúp quản lý được cả hành vi và lịch sử vi phạm của sinh viên.

## 6. Tích hợp và tính năng thông minh

Một trong những điểm nổi bật của dự án là không chỉ dừng ở CRUD quản lý, mà còn mở rộng sang các tính năng hỗ trợ vận hành thông minh.

### 6.1. Chatbot AI

Frontend có chatbot dành cho sinh viên và backend cung cấp API AI tại `/api/ai`.

Chatbot hỗ trợ:

- trả lời câu hỏi về quy trình ở ký túc xá
- giải đáp nội quy
- hướng dẫn thanh toán
- hỗ trợ tra cứu thông tin cơ bản

Backend đang tích hợp **OpenAI** để:

- lấy danh sách model khả dụng
- tạo phản hồi hội thoại
- kiểm soát rate limit
- ước tính token và chi phí sử dụng

### 6.2. AI phân tích phản ánh sinh viên

Phản ánh của sinh viên được phân tích tự động để xác định:

- cảm xúc: tích cực, trung tính, tiêu cực
- độ ưu tiên: cao, trung bình, thấp
- danh mục gợi ý
- từ khóa và tóm tắt ngắn

Nhờ đó, ban quản lý có thể phát hiện sớm các phản ánh khẩn cấp.

### 6.3. Xác thực ảnh minh chứng bằng Google Vision

Hệ thống có dịch vụ kiểm tra ảnh minh chứng của hồ sơ đăng ký bằng **Google Cloud Vision**:

- OCR nội dung trên giấy tờ
- nhận diện nhãn nội dung ảnh
- phát hiện ảnh không phù hợp
- phân loại `VALID`, `SUSPECT`, `INVALID`

Điều này giúp giảm tải cho admin khi xét duyệt thủ công.

### 6.4. Tích hợp Google Sheets và Google Drive

Backend có các service hỗ trợ:

- đọc dữ liệu đăng ký từ Google Sheets
- tải ảnh minh chứng từ Google Drive

Đây là tính năng rất thực tế trong bối cảnh nhà trường thường thu thập dữ liệu qua biểu mẫu và bảng tính.

### 6.5. Tin tức từ website TLU

Hệ thống có module cào tin tức từ `tlu.edu.vn`, phân loại theo:

- hoạt động chung
- công tác sinh viên
- thông báo
- sự kiện

Ngoài việc hiển thị tin, backend còn có thể cào nội dung bài viết và dùng AI để tóm tắt, phân tích ý nghĩa đối với sinh viên ở ký túc xá.

### 6.6. Giao tiếp thời gian thực bằng Socket.IO

Backend tích hợp **Socket.IO** để:

- gửi thông báo realtime
- cảnh báo admin khi có hồ sơ mới hoặc phản ánh mới
- phát cảnh báo phản ánh nghiêm trọng

Điều này làm hệ thống phản ứng nhanh hơn với các tình huống phát sinh.

## 7. Công nghệ sử dụng

### Frontend

- React
- Vite
- React Router
- Tailwind CSS
- Recharts
- Socket.IO Client

### Backend

- Node.js
- Express
- JWT Authentication
- Multer
- Socket.IO
- Nodemailer
- OpenAI SDK
- Google APIs
- Google Cloud Vision
- Axios
- Cheerio

### Dữ liệu và hạ tầng

- PostgreSQL
- REST API
- Static file serving cho frontend build

## 8. Giá trị thực tiễn của dự án

So với một hệ thống quản lý nội trú cơ bản, dự án này có giá trị ở các điểm sau:

- Bao phủ gần như trọn vẹn quy trình vận hành ký túc xá
- Phân quyền rõ ràng giữa admin và sinh viên
- Có chiều sâu nghiệp vụ với hợp đồng, hóa đơn, tài sản, kỷ luật
- Có hỗ trợ AI và tự động hóa ở nhiều điểm quan trọng
- Có khả năng triển khai thực tế theo mô hình web tập trung

Đây là một đồ án có hướng tiếp cận tương đối đầy đủ: không chỉ xây giao diện và API, mà còn xử lý cả dữ liệu, thông báo realtime, thanh toán, tích hợp dịch vụ bên ngoài và các bài toán hỗ trợ quyết định.

## 9. Nhận xét tổng quan

Từ source code hiện có, có thể xem đây là một **nền tảng quản lý ký túc xá toàn diện**, được thiết kế theo hướng:

- phục vụ vận hành thực tế
- hỗ trợ người dùng theo vai trò
- dễ mở rộng thêm chức năng
- có tư duy tích hợp công nghệ mới vào bài toán quản lý truyền thống

Nếu tiếp tục phát triển, dự án có thể mở rộng thêm sang:

- báo cáo nâng cao
- quản lý bảo trì theo lịch
- đối soát thanh toán
- phân tích dữ liệu vận hành
- cổng hỗ trợ sinh viên thông minh hơn

## 10. Kết luận

`Dormitory Management System` là dự án quản lý ký túc xá được đầu tư tương đối đầy đủ về cả kiến trúc phần mềm lẫn nghiệp vụ thực tế. Hệ thống không chỉ giải quyết các thao tác quản trị cơ bản mà còn tích hợp thanh toán, AI, xác thực giấy tờ, dữ liệu thời gian thực và thông tin nhà trường, tạo nên một giải pháp có tính ứng dụng cao cho môi trường ký túc xá đại học.
