# Dormitory Management System - Backend

Backend API cho hệ thống quản lý ký túc xá sử dụng DAO Pattern với Node.js, Express và MySQL.

## 🏗️ Kiến trúc

```
backend/
├── src/
│   ├── config/          # Database configuration
│   ├── dao/             # Data Access Objects (DAO Pattern)
│   ├── services/        # Business logic layer
│   ├── controllers/     # Request handlers
│   ├── routers/         # API routes
│   └── middlewares/     # Custom middlewares
├── database/            # Database schema
└── uploads/            # File uploads
```

## 🔑 Tính năng chính

### 1. Quản lý Hồ sơ Đăng ký
- Import từ Excel/CSV
- Duyệt/Từ chối hồ sơ
- Lọc và tìm kiếm

### 2. Quản lý Phòng
- CRUD phòng ở
- Cập nhật chỉ số điện/nước
- Theo dõi tình trạng phòng

### 3. Quản lý Hợp đồng
- Tạo hợp đồng từ hồ sơ đã duyệt
- Gán sinh viên vào phòng
- Theo dõi hợp đồng sắp hết hạn

### 4. Quản lý Hóa đơn
- Tạo hóa đơn từ chỉ số điện/nước
- Thu phí thủ công
- Báo cáo doanh thu

### 5. Thông báo & Phản ánh
- Gửi thông báo cho sinh viên
- Tiếp nhận và xử lý phản ánh
- Phân loại theo trạng thái

### 6. Nhật ký hệ thống
- Tự động ghi log mọi thao tác
- Truy vết thay đổi
- Báo cáo hoạt động

## 📋 Yêu cầu

- Node.js >= 14.x
- MySQL >= 5.7
- npm hoặc yarn

## 🚀 Cài đặt

### 1. Cài đặt dependencies
```bash
npm install
```

### 2. Cấu hình Database
Tạo database MySQL:
```sql
CREATE DATABASE dormitory_system CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

Import schema:
```bash
mysql -u root -p dormitory_system < database/schema.sql
```

### 3. Cấu hình môi trường
Chỉnh sửa file `.env`:
```env
PORT=5000
DB_HOST=localhost
DB_PORT=3306
DB_NAME=dormitory_system
DB_USER=root
DB_PASSWORD=your_password
JWT_SECRET=your-secret-key
```

### 4. Chạy server
```bash
# Development
npm run dev

# Production
npm start
```

## 📡 API Endpoints

### Authentication
- `POST /api/auth/register` - Đăng ký tài khoản
- `POST /api/auth/login` - Đăng nhập
- `GET /api/auth/me` - Thông tin user hiện tại
- `POST /api/auth/change-password` - Đổi mật khẩu

### Registrations
- `GET /api/registrations` - Danh sách hồ sơ
- `GET /api/registrations/:id` - Chi tiết hồ sơ
- `POST /api/registrations` - Tạo hồ sơ mới
- `PUT /api/registrations/:id` - Cập nhật hồ sơ
- `POST /api/registrations/:id/approve` - Duyệt hồ sơ
- `POST /api/registrations/:id/reject` - Từ chối hồ sơ
- `POST /api/registrations/import/excel` - Import từ Excel

### Rooms
- `GET /api/rooms` - Danh sách phòng
- `GET /api/rooms/available` - Phòng còn trống
- `GET /api/rooms/:id` - Chi tiết phòng
- `POST /api/rooms` - Tạo phòng mới
- `PUT /api/rooms/:id` - Cập nhật phòng
- `DELETE /api/rooms/:id` - Xóa phòng
- `POST /api/rooms/:id/meter-readings` - Cập nhật chỉ số

### Contracts
- `GET /api/contracts` - Danh sách hợp đồng
- `GET /api/contracts/:id` - Chi tiết hợp đồng
- `POST /api/contracts` - Tạo hợp đồng
- `POST /api/contracts/from-registration` - Tạo từ hồ sơ
- `PUT /api/contracts/:id` - Cập nhật hợp đồng
- `POST /api/contracts/:id/terminate` - Kết thúc hợp đồng

### Invoices
- `GET /api/invoices` - Danh sách hóa đơn
- `GET /api/invoices/:id` - Chi tiết hóa đơn
- `POST /api/invoices` - Tạo hóa đơn
- `POST /api/invoices/from-room` - Tạo từ chỉ số phòng
- `PUT /api/invoices/:id` - Cập nhật hóa đơn
- `POST /api/invoices/:id/mark-paid` - Đánh dấu đã thanh toán
- `GET /api/invoices/statistics/revenue` - Thống kê doanh thu

### Notifications
- `GET /api/notifications` - Danh sách thông báo
- `GET /api/notifications/my` - Thông báo của tôi
- `POST /api/notifications` - Tạo thông báo
- `POST /api/notifications/send-all` - Gửi cho tất cả SV
- `PUT /api/notifications/:id` - Cập nhật thông báo
- `DELETE /api/notifications/:id` - Xóa thông báo

### Feedbacks
- `GET /api/feedbacks` - Danh sách phản ánh
- `GET /api/feedbacks/:id` - Chi tiết phản ánh
- `POST /api/feedbacks` - Tạo phản ánh
- `POST /api/feedbacks/:id/status` - Cập nhật trạng thái
- `GET /api/feedbacks/statistics` - Thống kê

### Logs
- `GET /api/logs` - Nhật ký hệ thống
- `GET /api/logs/recent` - Hoạt động gần đây
- `GET /api/logs/user/:userId` - Log theo user
- `GET /api/logs/statistics` - Thống kê hoạt động

## 🔐 Authentication

API sử dụng JWT token. Thêm header:
```
Authorization: Bearer <token>
```

## 🗄️ DAO Pattern

Hệ thống sử dụng DAO Pattern để:
- Tách biệt logic truy cập database
- Dễ dàng thêm/sửa/xóa cột trong bảng
- Tái sử dụng code
- Dễ bảo trì và mở rộng

Ví dụ:
```javascript
// BaseDAO.js - Class cơ sở
class BaseDAO {
  async findAll(conditions = {}) { ... }
  async findById(id) { ... }
  async create(data) { ... }
  async update(id, data) { ... }
  async delete(id) { ... }
}

// UserDAO.js - Kế thừa BaseDAO
class UserDAO extends BaseDAO {
  constructor() {
    super('users');
  }
  
  async findByEmail(email) {
    return this.findOne({ email });
  }
}
```

## 📝 Logging

Mọi thao tác quan trọng đều được ghi log tự động:
- Ai thực hiện
- Thao tác gì
- Lúc nào
- Giá trị cũ/mới

## 🤝 Đóng góp

1. Fork project
2. Tạo branch mới (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Tạo Pull Request

## 📄 License

MIT License

## 👥 Tác giả

SonBX - Dormitory Management System

## 🙏 Lưu ý

- Mật khẩu admin mặc định: `admin123`
- Nên đổi JWT_SECRET trong production
- Backup database định kỳ
- Log được tự động xóa sau 90 ngày
