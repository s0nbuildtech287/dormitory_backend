# Requirements Document

## Introduction

Tính năng này tích hợp Google Cloud Vision API vào hệ thống quản lý ký túc xá để tự động xác thực ảnh minh chứng mà sinh viên nộp qua Google Forms. Khi admin đồng bộ dữ liệu từ Google Sheets, hệ thống sẽ tự động quét các ảnh minh chứng được lưu trên Google Drive, phân tích nội dung bằng Vision API theo bộ luật MVP, và phân loại ảnh thành 3 mức: `VALID`, `SUSPECT`, hoặc `INVALID`. Mục tiêu là giảm tải công việc kiểm tra thủ công cho admin và tăng độ tin cậy của hồ sơ đăng ký KTX.

## Glossary

- **Vision_Service**: Service Node.js tích hợp Google Cloud Vision API, chịu trách nhiệm phân tích nội dung ảnh và áp dụng bộ luật MVP.
- **Image_Validator**: Module xác thực ảnh minh chứng, điều phối luồng tải ảnh từ Google Drive và gọi Vision_Service.
- **Drive_Client**: Module sử dụng Google Drive API (qua service account) để tải ảnh từ Google Drive về dạng buffer.
- **Registration_Importer**: Luồng xử lý hiện tại trong RegistrationService.js, chịu trách nhiệm import dữ liệu từ Google Sheets vào database.
- **Evidence_Image**: Ảnh minh chứng sinh viên nộp qua Google Forms, được lưu tự động vào Google Drive folder. Các loại hợp lệ trong nghiệp vụ KTX bao gồm: CCCD mặt trước/sau, thẻ sinh viên, biên lai nộp tiền/ảnh chụp màn hình thanh toán, giấy xác nhận (hộ nghèo, chính sách, vùng sâu vùng xa), và các giấy tờ ưu tiên khác.
- **Validation_Result**: Kết quả xác thực một ảnh, bao gồm trạng thái (`VALID`/`SUSPECT`/`INVALID`/`PENDING`/`ERROR`), điểm tin cậy, và danh sách lý do.
- **Vision_Status**: Trạng thái tổng hợp xác thực ảnh của một hồ sơ: `VALID`, `SUSPECT`, `INVALID`, `PENDING`, hoặc `ERROR`.
- **Admin_Dashboard**: Giao diện quản trị React hiện tại, nơi admin xem và duyệt hồ sơ đăng ký.
- **Google_Forms_URL**: URL ảnh minh chứng được Google Forms lưu vào cột dữ liệu Google Sheets, thường có dạng `https://drive.google.com/open?id=FILE_ID`.
- **MVP_Rules**: Bộ 5 luật kiểm tra tối thiểu được áp dụng tuần tự để phân loại ảnh.

## Requirements

### Requirement 1: Trích xuất URL ảnh từ dữ liệu Google Sheets

**User Story:** As an admin, I want the system to automatically extract evidence image URLs from imported Google Sheets data, so that I don't have to manually identify which column contains image links.

#### Acceptance Criteria

1. WHEN dữ liệu được import từ Google Sheets, THE Registration_Importer SHALL quét tất cả các cột để tìm các giá trị có dạng URL Google Drive (`https://drive.google.com/` hoặc `https://docs.google.com/`).
2. WHEN một cột chứa URL Google Drive được phát hiện, THE Registration_Importer SHALL lưu danh sách URL đó vào trường `evidence_images` (JSONB) của bản ghi `register_forms`.
3. IF một hồ sơ không có cột nào chứa URL Google Drive, THEN THE Registration_Importer SHALL lưu `evidence_images` là mảng rỗng `[]` và đặt `vision_status` là `PENDING`.
4. THE Registration_Importer SHALL hỗ trợ nhiều URL ảnh trên cùng một hồ sơ (sinh viên nộp nhiều ảnh minh chứng).

---

### Requirement 2: Tải ảnh từ Google Drive

**User Story:** As a system, I want to download evidence images from Google Drive using service accounts, so that I can pass image data to Vision API for analysis.

#### Acceptance Criteria

1. WHEN Image_Validator nhận một Google Drive URL, THE Drive_Client SHALL trích xuất `FILE_ID` từ URL theo các định dạng: `open?id=FILE_ID`, `/file/d/FILE_ID/`, và `id=FILE_ID`.
2. WHEN Drive_Client tải ảnh, THE Drive_Client SHALL sử dụng service account hiện có (round-robin từ `GoogleSheetsService`) với scope `https://www.googleapis.com/auth/drive.readonly`.
3. IF file không tồn tại hoặc không có quyền truy cập, THEN THE Drive_Client SHALL trả về lỗi có mã `DRIVE_ACCESS_ERROR` kèm thông báo mô tả.
4. IF kích thước ảnh vượt quá 20MB, THEN THE Drive_Client SHALL từ chối tải và trả về lỗi `IMAGE_TOO_LARGE`.
5. THE Drive_Client SHALL hỗ trợ các định dạng ảnh: JPEG, PNG, GIF, BMP, WEBP, PDF (trang đầu tiên).

---

### Requirement 3: Phân tích ảnh bằng bộ luật MVP (Google Cloud Vision API)

**User Story:** As a system, I want to analyze image content using a set of MVP rules via Vision API to classify images as VALID, SUSPECT, or INVALID, so that invalid images can be flagged automatically.

#### Acceptance Criteria

1. WHEN Vision_Service nhận dữ liệu ảnh (buffer), THE Vision_Service SHALL gọi Google Cloud Vision API với các tính năng: `TEXT_DETECTION`, `LABEL_DETECTION`, và `SAFE_SEARCH_DETECTION`.

2. THE Vision_Service SHALL áp dụng 5 luật MVP theo thứ tự sau:
   - **Rule 1 – OCR Text**: Dùng `TEXT_DETECTION`; ảnh hợp lệ phải có tổng số ký tự text phát hiện được >= 15 ký tự.
   - **Rule 2 – Keyword Matching**: Tìm kiếm (không phân biệt hoa thường) các từ khóa sau trong text OCR: `sinh viên`, `student`, `CCCD`, `căn cước`, `biên lai`, `xác nhận`, `trường`, `đại học`, `mã số`, `ID`, `họ tên`, `ngày sinh`, `TLU`, `Thủy Lợi`.
   - **Rule 3 – Label Context**: Dùng `LABEL_DETECTION`; ảnh hợp lệ phải có ít nhất 1 nhãn liên quan: `document`, `identity document`, `card`, `text`, `paper`, `certificate`, `receipt`.
   - **Rule 4 – Negative Labels**: Nếu `LABEL_DETECTION` phát hiện bất kỳ nhãn nào trong danh sách: `food`, `animal`, `pet`, `selfie`, `landscape`, `nature`, `meme` → đánh dấu INVALID ngay lập tức.
   - **Rule 5 – Safe Search**: Nếu `SAFE_SEARCH_DETECTION` phát hiện nội dung `adult` hoặc `violence` ở mức `LIKELY` hoặc `VERY_LIKELY` → đánh dấu INVALID ngay lập tức.

3. WHEN Vision_Service áp dụng xong 5 luật MVP, THE Vision_Service SHALL phân loại ảnh theo logic sau:
   - **VALID**: Rule 1 pass (>= 15 ký tự) VÀ (Rule 2 có >= 1 keyword HOẶC Rule 3 có >= 1 label hợp lệ) VÀ Rule 4 không trigger VÀ Rule 5 pass.
   - **SUSPECT**: Rule 1 pass nhưng không đủ keyword/label để xác nhận (Rule 2 = 0 keyword VÀ Rule 3 = 0 label hợp lệ), hoặc có text nhưng context không rõ ràng.
   - **INVALID**: Rule 1 fail (< 15 ký tự) VÀ Rule 3 không có label hợp lệ, HOẶC Rule 4 trigger, HOẶC Rule 5 trigger.

4. IF Vision API trả về lỗi HTTP hoặc timeout sau 30 giây, THEN THE Vision_Service SHALL trả về `Validation_Result` với trạng thái `ERROR` và ghi lại thông báo lỗi.

5. THE Vision_Service SHALL trả về `Validation_Result` bao gồm: `status` (VALID/SUSPECT/INVALID/ERROR), `vision_score` (số thực 0.0–1.0 biểu thị độ tin cậy tổng hợp), và `vision_reasons` (mảng string giải thích lý do, ví dụ: `["Phát hiện text: 45 ký tự", "Keyword match: sinh viên, CCCD", "Label: identity document"]`).

---

### Requirement 4: Lưu kết quả xác thực vào database

**User Story:** As an admin, I want validation results to be persisted in the database, so that I can review them at any time without re-running the validation.

#### Acceptance Criteria

1. WHEN xác thực hoàn tất cho tất cả ảnh của một hồ sơ, THE Image_Validator SHALL cập nhật trường `evidence_images` trong bảng `register_forms` với mảng JSON chứa `{ url, fileId, validationResult }` cho từng ảnh.

2. THE Image_Validator SHALL lưu 3 trường tổng hợp sau vào bảng `register_forms`:
   - `vision_status`: giá trị enum `VALID` / `SUSPECT` / `INVALID` / `PENDING` / `ERROR`
   - `vision_score`: số thực 0.0–1.0 (điểm tin cậy tổng hợp của toàn bộ ảnh trong hồ sơ)
   - `vision_reasons`: mảng string giải thích lý do phân loại (ví dụ: `["Phát hiện text: 45 ký tự", "Keyword match: sinh viên, CCCD", "Label: identity document"]`)

3. WHEN tất cả ảnh của một hồ sơ đều phân loại là `VALID`, THE Image_Validator SHALL đặt `vision_status` = `VALID`.
4. WHEN ít nhất một ảnh của một hồ sơ là `SUSPECT` và không có ảnh nào là `INVALID`, THE Image_Validator SHALL đặt `vision_status` = `SUSPECT`.
5. WHEN ít nhất một ảnh của một hồ sơ là `INVALID`, THE Image_Validator SHALL đặt `vision_status` = `INVALID`.
6. WHEN tất cả ảnh của một hồ sơ đều có trạng thái `ERROR`, THE Image_Validator SHALL đặt `vision_status` = `ERROR`.
7. THE Image_Validator SHALL lưu timestamp xác thực (`validated_at`) vào trường `evidence_images` metadata của hồ sơ.

---

### Requirement 5: Tích hợp xác thực vào luồng import Google Sheets

**User Story:** As an admin, I want image validation to run automatically when I import data from Google Sheets, so that I get validation results without extra steps.

#### Acceptance Criteria

1. WHEN admin kích hoạt import Google Sheets, THE Registration_Importer SHALL chạy xác thực ảnh bất đồng bộ (async) sau khi lưu hồ sơ vào database, không chặn response trả về cho admin.
2. WHILE xác thực ảnh đang chạy, THE Registration_Importer SHALL đặt `vision_status` = `PENDING` cho các hồ sơ chưa được xác thực.
3. WHEN import hoàn tất, THE Registration_Importer SHALL trả về response bao gồm số lượng hồ sơ được import và thông báo rằng xác thực ảnh đang được xử lý nền.
4. WHERE admin muốn chạy lại xác thực thủ công, THE System SHALL cung cấp API endpoint `POST /api/registrations/:id/validate-images` để kích hoạt xác thực lại cho một hồ sơ cụ thể.

---

### Requirement 6: Hiển thị kết quả xác thực trên Admin Dashboard

**User Story:** As an admin, I want to see image validation results clearly in the registration management UI, so that I can quickly identify suspicious submissions and take appropriate action.

#### Acceptance Criteria

1. THE Admin_Dashboard SHALL hiển thị badge trạng thái xác thực ảnh bên cạnh mỗi hồ sơ trong danh sách đăng ký theo quy tắc:
   - `VALID`: badge màu xanh lá, không cần action từ admin.
   - `SUSPECT`: badge màu vàng kèm cảnh báo "Cần xem xét"; admin phải duyệt tay trước khi chấp nhận hồ sơ.
   - `INVALID`: badge màu đỏ kèm cảnh báo nổi bật "Ảnh không hợp lệ"; admin phải xem xét trước khi duyệt hồ sơ.
   - `PENDING`: badge màu xám, đang chờ xử lý.
   - `ERROR`: badge màu cam, xác thực thất bại.

2. WHEN admin mở chi tiết một hồ sơ, THE Admin_Dashboard SHALL hiển thị từng ảnh minh chứng kèm kết quả xác thực chi tiết: trạng thái, `vision_score`, và danh sách `vision_reasons`.

3. WHEN `vision_status` = `SUSPECT`, THE Admin_Dashboard SHALL hiển thị cảnh báo màu vàng "Cần xem xét" và yêu cầu admin xác nhận thủ công trước khi duyệt hồ sơ.

4. WHEN `vision_status` = `INVALID`, THE Admin_Dashboard SHALL hiển thị cảnh báo nổi bật màu đỏ "Ảnh không hợp lệ" và yêu cầu admin xem xét trước khi duyệt hồ sơ.

5. THE Admin_Dashboard SHALL cho phép admin lọc danh sách hồ sơ theo `vision_status` (tất cả / PENDING / VALID / SUSPECT / INVALID / ERROR).

6. WHEN admin nhấn nút "Xác thực lại ảnh" trên chi tiết hồ sơ, THE Admin_Dashboard SHALL gọi API xác thực lại và cập nhật kết quả hiển thị sau khi hoàn tất.

---

### Requirement 7: Cấu hình và quản lý Google Cloud Vision credentials

**User Story:** As an admin, I want Vision API credentials to be configured securely via environment variables, so that sensitive keys are not hardcoded in source code.

#### Acceptance Criteria

1. THE System SHALL đọc Google Cloud Vision API credentials từ biến môi trường `GOOGLE_APPLICATION_CREDENTIALS` (đường dẫn đến file service account JSON của Vision API).
2. THE System SHALL yêu cầu service account Vision API được tạo riêng với quyền tối thiểu (`roles/cloudvision.user`) trên GCP console, tách biệt với các service account dùng cho Google Sheets/Drive.
3. IF biến môi trường `GOOGLE_APPLICATION_CREDENTIALS` không được cấu hình hoặc file không tồn tại, THEN THE Vision_Service SHALL ghi log cảnh báo và bỏ qua bước xác thực ảnh (không throw error làm gián đoạn luồng import).
4. WHERE admin muốn tắt tính năng xác thực ảnh, THE System SHALL hỗ trợ biến môi trường `VISION_VALIDATION_ENABLED=false` để vô hiệu hóa toàn bộ tính năng mà không cần thay đổi code.
5. THE System SHALL ghi log mỗi lần gọi Vision API (vào `log_system` table) để theo dõi quota, bao gồm: `registration_id`, `image_url`, `status`, `duration_ms`, và `error_message` (nếu có).

---

### Requirement 8: Xử lý lỗi và giới hạn API

**User Story:** As a system, I want robust error handling for Vision API calls, so that failures don't break the import process or cause data loss.

#### Acceptance Criteria

1. IF Vision API trả về lỗi quota exceeded (HTTP 429), THEN THE Vision_Service SHALL thực hiện retry tối đa 3 lần với exponential backoff (1s, 2s, 4s) trước khi trả về lỗi.
2. WHEN xác thực một batch hồ sơ, THE Image_Validator SHALL xử lý tối đa 5 hồ sơ song song (concurrent) để tránh vượt quota Vision API.
3. IF xác thực ảnh của một hồ sơ thất bại hoàn toàn, THEN THE Image_Validator SHALL tiếp tục xác thực các hồ sơ còn lại trong batch mà không dừng toàn bộ quá trình.
4. THE System SHALL ghi log chi tiết (vào `log_system` table) cho mỗi lần gọi Vision API, bao gồm: `registration_id`, `image_url`, `status`, `duration_ms`, và `error_message` (nếu có).
