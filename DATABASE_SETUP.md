# 🚀 HƯỚNG DẪN TẠO DATABASE

## Cách 1: Dùng Script (KHUYẾN NGHỊ - Nhanh nhất)

### Bước 1: Tạo database trước
```bash
# Kết nối PostgreSQL
psql -U postgres

# Tạo database mới
CREATE DATABASE dormitory_db;

# Thoát
\q
```

### Bước 2: Chạy script setup
```bash
# Tạo database schema lần đầu
npm run setup-db

# Hoặc reset toàn bộ (XÓA dữ liệu cũ)
npm run reset-db
```

### ✅ Xong! Database đã sẵn sàng sử dụng

---

## Cách 2: Dùng lệnh psql trực tiếp

```bash
# Chạy toàn bộ file SQL
psql -U postgres -d dormitory_db -f database/schema.sql
```

---

## Cách 3: Dùng PowerShell (Windows)

```powershell
# Vào thư mục backend
cd backend

# Chạy file SQL
Get-Content database\schema.sql | psql -U postgres -d dormitory_db
```

---

## Cấu hình Database

Tạo file `.env` trong thư mục backend:

```env
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=your_password
DB_NAME=dormitory_db
```

---

## Kiểm tra kết quả

```bash
# Vào database
psql -U postgres -d dormitory_db

# Xem danh sách bảng
\dt

# Xem dữ liệu admin
SELECT * FROM users WHERE role = 'ADMIN';

# Thoát
\q
```

---

## Thông tin đăng nhập mặc định

- **Email:** admin@ktx.edu.vn
- **Password:** admin123

---

## Lỗi thường gặp

### 1. "database does not exist"
→ Tạo database trước: `CREATE DATABASE dormitory_db;`

### 2. "connection refused"
→ Kiểm tra PostgreSQL đã chạy chưa

### 3. "permission denied"
→ Kiểm tra user và password trong .env

---

## Scripts có sẵn

- `npm run setup-db` - Tạo database lần đầu
- `npm run reset-db` - Xóa và tạo lại (CẨN THẬN!)
- `npm run dev` - Chạy server development
- `npm start` - Chạy server production
