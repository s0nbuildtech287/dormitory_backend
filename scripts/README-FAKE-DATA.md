# Hướng dẫn tạo Fake Data cho Hệ thống Quản lý Ký túc xá

## 📋 Tổng quan

Thư mục này chứa các script để tạo dữ liệu giả (fake data) cho hệ thống, bao gồm:

1. **fake-rooms.js** - Tạo 400 phòng ký túc xá
2. **fake-student-contracts.js** - Tạo 1000 hồ sơ đăng ký + 1000 hợp đồng + 1000 tài khoản
3. **fake-invoices.js** - Tạo ~200 hóa đơn (1 hóa đơn/phòng)

## 🚀 Cách sử dụng

### Bước 1: Tạo phòng (nếu chưa có)

```bash
cd backend
node scripts/fake-rooms.js
```

**Kết quả:**
- 400 phòng ở 4 tòa nhà (A, B, C, D)
- Mỗi tòa: 10 tầng × 10 phòng = 100 phòng
- Tòa A, C: Nam | Tòa B, D: Nữ
- Mỗi phòng: 5 chỗ, giá 500,000 VNĐ/tháng

### Bước 2: Tạo hợp đồng sinh viên + tài khoản

```bash
node scripts/fake-student-contracts.js
```

**Kết quả:**
- 1000 tài khoản sinh viên (mật khẩu: `123456`)
- 1000 hợp đồng Active
- 200 phòng đầu tiên đã được gán sinh viên (tối đa 5 sinh viên/phòng)
- 200 phòng còn lại để test hồ sơ đăng ký mới
- Thời gian hợp đồng: 6 tháng (bắt đầu từ 6 tháng trước)
- ID format: `contract-1772528512456-abc123xyz`
- T??i kho???n `xu4ns0n@gmail.com` n???m s???n trong 1000 sinh vi??n, m???t kh???u: `123`
- **Phân bổ theo 3 rổ:**
  - Rổ 1 (Chính sách): 120 sinh viên (12%) - có lý do ưu tiên
  - Rổ 2 (Tân sinh viên): 550 sinh viên (55%) - năm 1, không ưu tiên
  - Rổ 3 (Khóa cũ): 330 sinh viên (33%) - năm 2,3,4, GPA cao

**Lưu ý quan trọng:**
- Script này tự động tạo tài khoản user cho mỗi sinh viên
- Mật khẩu mặc định: `123456`
- Email format: `{firstname}{lastname_initial}{student_id}@student.edu.vn`
- Ví dụ: `minhn2020001@student.edu.vn`
- **Lý do ưu tiên (Rổ 1):** Hộ nghèo cận nghèo, Vùng sâu vùng xa, Con thương binh liệt sỹ, Sinh viên khuyết tật, Lưu học sinh (Lào/Campuchia)

### Bước 3: Tạo hóa đơn

```bash
node scripts/fake-invoices.js
```

**Kết quả:**
- 20 hóa đơn cho tháng hiện tại
- ~6 hóa đơn đã thanh toán (30%)
- ~8 hóa đơn chưa thanh toán - sắp hết hạn (40%)
- ~6 hóa đơn quá hạn (30%)
- Bao gồm: Tiền phòng + Điện + Nước + Phí dịch vụ
- ID format: `invoice-1772528567890-xyz789abc`

## 📊 Dữ liệu chi tiết

### Hợp đồng sinh viên (student_contracts)

- **Tổng số:** 1000 hợp đồng
- **Trạng thái:** Active
- **Phòng:** 200 phòng đầu tiên (tối đa 5 sinh viên/phòng)
- **Thời gian:** 6 tháng (bắt đầu từ 6 tháng trước)
- **Phân bổ theo 3 rổ:**
  - **Rổ 1 (Chính sách - 12%):** 120 sinh viên
    - Có lý do ưu tiên: Hộ nghèo cận nghèo, Vùng sâu vùng xa, Con thương binh liệt sỹ, Sinh viên khuyết tật, Lưu học sinh
    - Năm học: Ngẫu nhiên 1-4
    - GPA: Năm 1 = 0, Năm 2-4 = 2.0-4.0
  - **Rổ 2 (Tân sinh viên - 55%):** 550 sinh viên
    - Không có lý do ưu tiên
    - Năm học: 1 (tân sinh viên)
    - GPA: 0 (chưa có điểm)
  - **Rổ 3 (Khóa cũ - 33%):** 330 sinh viên
    - Không có lý do ưu tiên
    - Năm học: 2, 3, 4
    - GPA: 2.5-4.0 (GPA cao để cạnh tranh)
- **Thông tin:**
  - Số hợp đồng: `HD-2024-XXXXXX`
  - Giá thuê: Theo giá phòng (500,000 VNĐ)
  - Đặt cọc: 2 tháng tiền phòng (1,000,000 VNĐ)
  - Đã nhận bản cứng hợp đồng
  - Snapshot thông tin sinh viên (MSSV, CCCD, giới tính, năm học, khoa, SĐT)

### Tài khoản sinh viên (users)

- **Tổng số:** 1000 tài khoản
- **Role:** STUDENT
- **Mật khẩu:** `123456` (đã hash bcrypt)
- **Email:** `{firstname}{lastname_initial}{student_id}@student.edu.vn`
- **Trạng thái:** Active
- **Giới tính:** Phù hợp với giới tính phòng (Tòa A,C: Nam | Tòa B,D: Nữ)

### Hóa đơn (invoices)

- **Tổng số:** ~200 hóa đơn (1 hóa đơn/phòng)
- **Tháng:** Tháng hiện tại
- **Trạng thái:**
  - 30% Đã thanh toán (~60 hóa đơn)
  - 40% Chưa thanh toán - sắp hết hạn 1-3 ngày (~80 hóa đơn)
  - 30% Quá hạn 1-10 ngày (~60 hóa đơn)
- **Chi phí:**
  - Tiền phòng: 500,000 VNĐ
  - Điện: 50-100 kWh × 3,500 VNĐ/kWh = 175,000-350,000 VNĐ
  - Nước: 3-8 m³ × 15,000 VNĐ/m³ = 45,000-120,000 VNĐ
  - Phí khác: Rác (20,000) + Mạng (50,000) + Gửi xe (30,000) = 100,000 VNĐ
  - Giảm giá: 10% hóa đơn có giảm giá 50,000-100,000 VNĐ
  - Phạt: Chỉ áp dụng cho hóa đơn quá hạn 50,000-150,000 VNĐ
- **Lưu ý:** Mỗi phòng có 1 hóa đơn chung cho tất cả sinh viên trong phòng

## 🔑 Thông tin đăng nhập

### Admin
- Email: `admin`
- Password: `admin`

### Sinh viên (ví dụ)
- Email: `minhn2020001@student.edu.vn`
- Password: `123456`

## ⚠️ Lưu ý

1. **Thứ tự chạy script:**
   - Phải chạy `fake-rooms.js` trước
   - Sau đó chạy `fake-student-contracts.js`
   - Cuối cùng chạy `fake-invoices.js`

2. **Xóa dữ liệu cũ:**
   - Script sử dụng `ON CONFLICT DO NOTHING`
   - Nếu muốn tạo lại, xóa dữ liệu cũ trong database trước

3. **Database:**
   - Đảm bảo đã tạo database và chạy schema.sql
   - Kiểm tra kết nối database trong `src/config/database.js`

4. **Dependencies:**
   - Script sử dụng `bcryptjs` để hash password
   - Đảm bảo đã cài đặt: `npm install bcryptjs`

## 🎯 Mục đích sử dụng

- **fake-student-contracts.js:** Tạo 1000 sinh viên đang ở KTX với phân bổ đúng theo 3 rổ (Chính sách 12%, Tân SV 55%, Khóa cũ 33%)
- **fake-invoices.js:** Test chức năng quản lý hóa đơn, thanh toán, nhắc nhở

## 📝 Format ID

Tất cả ID đều tuân theo format chuẩn của hệ thống:

- **Hợp đồng:** `contract-{timestamp}-{randomstring}`
  - Ví dụ: `contract-1772528512456-abc123xyz`

- **Hóa đơn:** `invoice-{timestamp}-{randomstring}`
  - Ví dụ: `invoice-1772528567890-xyz789abc`

- **User:** `user-{timestamp}`
  - Ví dụ: `user-1772528456640`

## 🐛 Troubleshooting

### Lỗi: "Cannot find module"
```bash
cd backend
npm install
```

### Lỗi: "Connection refused"
- Kiểm tra PostgreSQL đang chạy
- Kiểm tra file `.env` có đúng thông tin kết nối

### Lỗi: "Không tìm thấy phòng"
- Chạy `fake-rooms.js` trước khi chạy các script khác

### Lỗi: "Duplicate key"
- Xóa dữ liệu cũ hoặc thay đổi timestamp trong script
