# AGENTS.md — Dormitory Backend

> Tài liệu hướng dẫn dành cho AI Agent khi làm việc với dự án backend.
> Xưng hô với chủ dự án là **master Xuân Sơn**.

---

## 1. Tổng quan dự án

Hệ thống quản lý ký túc xá Đại học Thủy Lợi (TLU). Backend cung cấp REST API và WebSocket cho hai nhóm người dùng: **Admin** (Ban quản lý) và **Student** (Sinh viên).

- **Runtime:** Node.js (CommonJS)
- **Framework:** Express 5
- **Database:** PostgreSQL (thông qua `pg`)
- **Auth:** JWT (`jsonwebtoken`) + bcrypt
- **Realtime:** Socket.IO 4
- **File upload:** Multer
- **Email:** Nodemailer
- **AI:** OpenAI API + Google Cloud Vision
- **Google APIs:** Drive, Sheets
- **Payment:** VNPay
- **Scheduler:** node-cron (custom scheduler trong `untils/`)
- **Port mặc định:** `1234`

---

## 2. Cấu trúc thư mục

```
dormitory_backend/
├── src/
│   ├── server.js              # Entry point, khởi tạo Express + Socket.IO + scheduler
│   ├── socket.js              # Khởi tạo Socket.IO, xử lý sự kiện realtime
│   │
│   ├── config/
│   │   ├── database.js        # Kết nối PostgreSQL (pool)
│   │   ├── disciplinaryConfig.js  # Cấu hình điểm kỷ luật
│   │   └── accounts/          # File JSON tài khoản mẫu (seed)
│   │
│   ├── controllers/           # Xử lý request/response, gọi Service
│   │   ├── AiController.js
│   │   ├── AssetController.js
│   │   ├── AuthController.js
│   │   ├── ContractController.js
│   │   ├── DisciplinaryController.js
│   │   ├── EmailController.js
│   │   ├── FeedbackController.js
│   │   ├── InvoiceController.js
│   │   ├── LogController.js
│   │   ├── NewsController.js
│   │   ├── NotificationController.js
│   │   ├── RegistrationController.js
│   │   ├── RoomController.js
│   │   ├── StudentController.js
│   │   └── VNPayController.js
│   │
│   ├── services/              # Business logic, không trực tiếp query DB
│   │   ├── AssetService.js
│   │   ├── AuthService.js
│   │   ├── ContractService.js
│   │   ├── DisciplinaryService.js
│   │   ├── DriveService.js        # Google Drive
│   │   ├── EmailService.js        # Nodemailer
│   │   ├── FeedbackService.js
│   │   ├── GoogleSheetsService.js # Google Sheets import
│   │   ├── ImageValidatorService.js
│   │   ├── InvoiceService.js
│   │   ├── NewsService.js
│   │   ├── NotificationService.js
│   │   ├── openaiService.js       # OpenAI Chat
│   │   ├── RegistrationService.js
│   │   ├── RoomService.js
│   │   ├── VisionService.js       # Google Cloud Vision OCR
│   │   └── VNPayService.js
│   │
│   ├── dao/                   # Data Access Objects — tất cả query SQL
│   │   ├── BaseDAO.js         # Class cơ sở: findAll, findOne, create, update, delete
│   │   ├── AssetDAO.js
│   │   ├── DisciplinaryDAO.js
│   │   ├── FeedbackDAO.js
│   │   ├── InvoiceDAO.js
│   │   ├── LogSystemDAO.js
│   │   ├── NotificationDAO.js
│   │   ├── RegisterFormDAO.js
│   │   ├── RoomDAO.js
│   │   ├── StudentContractDAO.js
│   │   ├── StudentDAO.js
│   │   └── UserDAO.js
│   │
│   ├── middlewares/
│   │   ├── auth.js            # authenticate, requireAdmin, requireStudent
│   │   ├── errorHandler.js    # notFound + errorHandler middleware
│   │   └── upload.js          # Multer config
│   │
│   ├── routers/               # Định nghĩa route, áp middleware auth
│   │   ├── aiRoutes.js
│   │   ├── assetRoutes.js
│   │   ├── authRoutes.js
│   │   ├── contractRoutes.js
│   │   ├── disciplinaryRoutes.js
│   │   ├── emailRoutes.js
│   │   ├── feedbackRoutes.js
│   │   ├── invoiceRoutes.js
│   │   ├── logRoutes.js
│   │   ├── newsRoutes.js
│   │   ├── notificationRoutes.js
│   │   ├── registrationRoutes.js
│   │   ├── roomRoutes.js
│   │   ├── studentRoutes.js   # Routes dành riêng cho sinh viên
│   │   └── vnpayRoutes.js
│   │
│   └── untils/                # Utilities (chú ý: typo "untils" là tên thư mục hiện tại)
│       ├── otpStore.js        # Lưu OTP tạm thời trong bộ nhớ
│       └── scheduler.js       # Cron job kiểm tra hợp đồng quá hạn
│
├── database/                  # SQL migration scripts
├── scripts/                   # Script setup/reset DB
├── uploads/                   # File upload từ Multer
├── dist/                      # Frontend build (được serve static)
├── .env                       # Biến môi trường
└── package.json
```

---

## 3. Kiến trúc luồng dữ liệu

```
Request → Router → Middleware (auth) → Controller → Service → DAO → PostgreSQL
```

- **Router:** Chỉ định nghĩa path và gắn middleware
- **Controller:** Parse req, gọi Service, trả res — không chứa business logic
- **Service:** Xử lý logic nghiệp vụ, gọi DAO, có thể gọi các Service khác
- **DAO:** Chỉ chứa SQL query, extend `BaseDAO`

---

## 4. Quy tắc API

| Prefix | Mô tả |
|--------|-------|
| `GET /api/auth/...` | Xác thực, đăng nhập, OTP |
| `GET /api/rooms/...` | Quản lý phòng |
| `GET /api/registrations/...` | Hồ sơ đăng ký |
| `GET /api/contracts/...` | Hợp đồng |
| `GET /api/invoices/...` | Hóa đơn |
| `GET /api/feedbacks/...` | Phản ánh |
| `GET /api/notifications/...` | Thông báo |
| `GET /api/assets/...` | Tài sản |
| `GET /api/disciplinary/...` | Kỷ luật |
| `GET /api/student/...` | API dành riêng sinh viên |
| `GET /api/logs/...` | Nhật ký hệ thống |
| `GET /api/email/...` | Gửi email |
| `GET /api/vnpay/...` | Thanh toán VNPay |
| `GET /api/ai/...` | Chatbot AI |
| `GET /api/news/...` | Tin tức |

**Response format chuẩn:**
```json
{ "success": true, "data": ..., "message": "..." }
{ "success": false, "message": "Lỗi..." }
```

---

## 5. Xác thực & phân quyền

- JWT Bearer token trong header `Authorization: Bearer <token>`
- Middleware `authenticate` → giải mã token → gắn `req.user`
- `requireAdmin` → chỉ cho role `ADMIN`
- `requireStudent` → chỉ cho role `STUDENT`
- Hai role: `ADMIN` | `STUDENT`

---

## 6. Quy tắc khi code

### ✅ BẮT BUỘC
- Mọi DAO mới phải **extend `BaseDAO`** và dùng parameterized queries
- Mọi logic nghiệp vụ nằm trong **Service**, không viết SQL trong Controller
- Mọi route mới phải thêm vào `server.js` với prefix `/api/...`
- Dùng `try/catch` và ném lỗi rõ ràng từ DAO/Service lên Controller
- Middleware `authenticate` phải được áp trước các route cần bảo vệ

### ❌ TUYỆT ĐỐI KHÔNG
- Không viết raw SQL trực tiếp trong Controller hoặc Service
- Không bypass middleware auth trên các endpoint nhạy cảm
- Không sửa `BaseDAO.js` trừ khi có yêu cầu rõ ràng từ master Xuân Sơn
- Không thay đổi cấu trúc response format (`success`, `data`, `message`)
- Không xóa hoặc sửa logic các module khác khi thêm tính năng mới

### 🔒 Bảo mật
- Luôn dùng parameterized queries (`$1, $2, ...`), không nối chuỗi SQL
- Không log token, password, hoặc thông tin nhạy cảm
- Validate input trước khi đưa vào DAO

---

## 7. Biến môi trường (.env)

```
PORT=1234
DB_HOST / DB_PORT / DB_NAME / DB_USER / DB_PASSWORD
JWT_SECRET
EMAIL_USER / EMAIL_PASS
OPENAI_API_KEY
GOOGLE_CLOUD_VISION_KEY
VNPAY_TMN_CODE / VNPAY_HASH_SECRET
VITE_BACKEND_URL
```

> Không hard-code bất kỳ giá trị nào trong code. Luôn đọc từ `process.env`.

---

## 8. Thêm module mới — checklist

1. Tạo `src/dao/NewDAO.js` (extend BaseDAO)
2. Tạo `src/services/NewService.js` (dùng DAO)
3. Tạo `src/controllers/NewController.js` (gọi Service)
4. Tạo `src/routers/newRoutes.js` (gắn middleware)
5. Đăng ký route trong `src/server.js`: `app.use("/api/new", newRoutes)`
6. Không sửa logic các module hiện có

---

## 9. Lệnh thường dùng

```bash
npm run dev        # Chạy dev với nodemon
npm start          # Chạy production
npm run setup-db   # Khởi tạo database
npm run reset-db   # Reset database
npm test           # Chạy Jest tests
```

---

## 10. Quy tắc chỉnh sửa code

- **Đọc trước khi sửa**: Luôn đọc file đích trước. Không được giả định nội dung.
- **Sửa một lần duy nhất**: Thực hiện tất cả thay đổi trong một lượt. Không thử lại cùng một cách quá một lần.
- **Không giải thích dài dòng**: Không cần nói sắp làm gì. Làm luôn.
- **An toàn với encoding**: Với file có tiếng Việt, dùng Node.js (`fs.readFileSync/writeFileSync` với `'utf8'`) thay vì các công cụ shell (sed, patch, PowerShell string ops).
- **Báo lỗi ngay**: Nếu không tìm thấy đoạn cần thay thế, throw error ngay với tên label. Không được tự đoán hoặc âm thầm bỏ qua.
- **Không lặp lại lỗi**: Nếu cách làm thất bại, nêu nguyên nhân một lần duy nhất và đề xuất một phương án thay thế. Không giải thích lại vấn đề cũ.


---

## 11. Workflow sau khi thay đổi code

### Reset & fake data
Sau mỗi lần thay đổi schema hoặc logic liên quan đến dữ liệu, chạy lại:

```bash
node clean-database.js   # Xóa toàn bộ dữ liệu
node fake-all-data.js    # Tạo lại dữ liệu mẫu
```

### Debug bắt buộc sau khi code
Sau mỗi thay đổi, phải kiểm tra:
1. Chạy lại fake data, đảm bảo không có lỗi khi seed
2. Gọi thử các API liên quan — đặc biệt các module **không được sửa** — để xác nhận không bị ảnh hưởng
3. Kiểm tra log server, không có uncaughtException hoặc query lỗi
4. Nếu có lỗi: đọc lại file gốc, xác định nguyên nhân, sửa một lần duy nhất


---

## 12. Lỗi thường gặp — bắt buộc kiểm tra trước khi hoàn thành

### Import / require thiếu
- Sau khi viết xong module, rà soát **toàn bộ** identifier được dùng trong file
- Mọi DAO, Service, middleware, util đều phải có dòng `require(...)` tương ứng ở đầu file
- Không được để `ReferenceError: X is not defined` do quên require
- Với file nội bộ: dùng đường dẫn tương đối chính xác (`../services/XxxService`)

### Encoding & định dạng chữ tiếng Việt
- Sau khi tạo/sửa file, kiểm tra nội dung tiếng Việt không bị vỡ ký tự (mojibake)
- Luôn dùng `'utf8'` khi đọc/ghi file qua Node.js (`fs.readFileSync/writeFileSync`)
- Không dùng shell command (sed, echo, PowerShell string ops) để ghi nội dung có tiếng Việt


---

## 13. Báo cáo sau khi hoàn thành task

Sau khi chạy xong bất kỳ task nào, **bắt buộc** báo cáo lại với **master Xuân Sơn** theo format:

- Đã làm gì (file nào, thay đổi gì)
- Kết quả kiểm tra (debug, fake data, import, encoding)
- Nếu có vấn đề phát sinh: nêu rõ nguyên nhân và cách đã xử lý
