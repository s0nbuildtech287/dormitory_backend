# Hệ Thống Tính Điểm AI - Tài Liệu Kỹ Thuật

## Tổng Quan

Hệ thống tính điểm AI mới sử dụng **3 thành phần chính** với các trọng số được cấu hình linh hoạt để đánh giá hồ sơ đăng ký nội trú.

---

## Công Thức Chính

```
aiScore = (PriorityScore × W₁) + (YearScore × W₂) + (GPAScore × W₃)

Điều kiện: W₁ + W₂ + W₃ = 1.0
```

---

## 1. Thành Phần 1: Điểm Ưu tiên (PriorityScore)

### Thang Điểm: 0-100

| Đối Tượng                | Điểm | Điều Kiện                                                                                          |
| ------------------------ | ---- | -------------------------------------------------------------------------------------------------- |
| **Chính sách tuyệt đối** | 100  | Hộ nghèo, cận nghèo, con thương binh, con liệt sỹ, SVKT, lưu học sinh, hoàn cảnh khó khăn đặc biệt |
| **Khu vực ưu tiên**      | 70   | Vùng sâu, vùng xa, hải đảo, có điều kiện kinh tế đặc biệt khó khăn                                 |
| **Đối tượng khác**       | 30   | Có giấy xác nhận ưu tiên từ địa phương/nhà trường                                                  |
| **Không ưu tiên**        | 0    | Không có điều kiện ưu tiên                                                                         |

### Cách Tính

```javascript
calculatePriorityScore(priorityReasons) {
  // Kiểm tra priority_reasons field và trả về điểm tương ứng
  // Code xem ở dòng 75-112 trong RegistrationService.js
}
```

---

## 2. Thành Phần 2: Điểm Năm Học (YearScore)

### Thang Điểm: 0-100

| Năm Học   | Điểm | Lý Do                 |
| --------- | ---- | --------------------- |
| **Năm 1** | 100  | Ưu tiên SV mới xa nhà |
| **Năm 2** | 60   | SV cập nhật           |
| **Năm 3** | 40   | SV tiếp tục           |
| **Năm 4** | 20   | SV sắp tốt nghiệp     |

### Cách Tính

```javascript
calculateYearScore(year) {
  // Nhập: số năm học (1-4)
  // Xuất: điểm năm học (100, 60, 40, 20)
  // Code xem ở dòng 114-131 trong RegistrationService.js
}
```

---

## 3. Thành Phần 3: Điểm Học Tập (GPAScore)

### Thang Điểm: 0-100

**Công thức:** `GPAScore = GPA × 25` (cho hệ 4.0)

**Lọc:** Nếu GPA < 2.0 → **Loại trực tiếp** (Rejected)

### Ví Dụ

- GPA = 4.0 → GPAScore = 100
- GPA = 3.5 → GPAScore = 87.5 → làm tròn = 88
- GPA = 2.0 → GPAScore = 50
- GPA = 1.5 → **FILTERED** (Bị loại)

### Cách Tính

```javascript
calculateGPAScore(gpa) {
  // Nếu gpa < 2.0 → trả về { score: 0, isFiltered: true, reason: "GPA < 2.0" }
  // Còn lại → trả về { score: Math.round(gpa * 25), isFiltered: false }
  // Code xem ở dòng 135-158 trong RegistrationService.js
}
```

---

## 4. Trọng Số (Weighting Factors)

### Mặc Định

```javascript
W₁ (Priority/Ưu tiên):  0.25 (25%)
W₂ (Year/Năm học):      0.35 (35%)
W₃ (GPA/Học tập):       0.40 (40%)
```

### Cách Fetch

- Trọng số được lưu trong bảng `settings` với `name = 'scoring_weights'`
- Nếu không tìm thấy → sử dụng giá trị mặc định
- Admin có thể thay đổi qua UI trang **RegistrationSettings.jsx**

---

## 5. Ví Dụ Tính Toán Chi Tiết

### Sinh Viên A: Năm 1, GPA 3.5, Không ưu tiên

```
PriorityScore  = 0      (không ưu tiên)
YearScore      = 100    (năm 1)
GPAScore       = 87.5   (3.5 × 25)

aiScore = (0 × 0.25) + (100 × 0.35) + (87.5 × 0.40)
        = 0 + 35 + 35
        = 70

→ Đề xuất: "Cân nhắc" (vì 60 ≤ 70 < 80)
```

### Sinh Viên B: Năm 2, GPA 1.8, Hộ nghèo

```
PriorityScore  = 100    (hộ nghèo)
YearScore      = 60     (năm 2)
GPAScore       = ❌     (1.8 < 2.0)

→ Kết quả: LOẠI (GPA < 2.0)
→ Đề xuất: "Loại (GPA < 2.0)"
```

### Sinh Viên C: Năm 1, GPA 3.8, Vùng sâu

```
PriorityScore  = 70     (vùng sâu)
YearScore      = 100    (năm 1)
GPAScore       = 95     (3.8 × 25)

aiScore = (70 × 0.25) + (100 × 0.35) + (95 × 0.40)
        = 17.5 + 35 + 38
        = 90.5 → làm tròn = 91

→ Đề xuất: "Nên duyệt" (vì 91 ≥ 80)
```

---

## 6. Phân Loại Đề Xuất

| Điểm      | Đề Xuất                        | Ý Nghĩa                       |
| --------- | ------------------------------ | ----------------------------- |
| ≥ 80      | "Nên duyệt" (RECOMMENDED)      | Hồ sơ tốt, ưu tiên duyệt      |
| 60-79     | "Cân nhắc" (CONSIDER)          | Hồ sơ trung bình, cần xem xét |
| < 60      | "Không ưu tiên" (LOW_PRIORITY) | Hồ sơ yếu, xem xét sau        |
| GPA < 2.0 | "Loại (GPA < 2.0)"             | Bị loại trực tiếp             |

---

## 7. Hệ Thống 3 Rổ (Quota Baskets)

Các ứng viên được phân vào 3 rổ dựa trên năm học, sau đó áp dụng chỉ tiêu:

| Rổ       | Tên               | Chỉ Tiêu | Ưu Tiên             |
| -------- | ----------------- | -------- | ------------------- |
| **Rổ 1** | Chính sách        | ~12%     | Ưu tiên tuyệt đối   |
| **Rổ 2** | Tân sinh viên     | ~55%     | Năm 1 (xa nhà)      |
| **Rổ 3** | Sinh viên khóa cũ | ~33%     | Năm 2,3,4 (GPA tốt) |

### Thuật Toán Waterfall

Nếu bật **Waterfall**, số chỗ dư từ Rổ 1 sẽ tự động chuyển xuống Rổ 2 → Rổ 3.

---

## 8. Xử Lý GPA Không Hợp Lệ

```javascript
Trường Hợp | Xử Lý
-----------|------
GPA = null | Không tính AI score, setting mặc định GP A = 0
GPA < 2.0  | Tự động LOẠI, không vào danh sách chờ
GPA ≥ 2.0  | Dùng công thức GPAScore = GPA × 25
```

---

## 9. Thay Đổi Trọng Số

Admin có thể cấu hình lại trọng số từ UI:

```
GET  /api/settings/scoring-weights  → Lấy trọng số hiện tại
POST /api/settings/scoring-weights  → Cập nhật trọng số mới
```

Ví dụ nếu muốn ưu tiên SV giỏi trong Rổ 3:

```javascript
{
  w1_priority: 0.15,  // Giảm ưu tiên hoàn cảnh
  w2_year:    0.20,   // Giảm ưu tiên riêngbiệt năm
  w3_gpa:     0.65    // Tăng ưu tiên GPA lên cao
}
```

---

## 10. Log & Audit Trail

Mỗi lần import/tính điểm, hệ thống ghi lại:

- Admin thực hiện
- Thời gian
- Số hồ sơ xử lý
- Lỗi (nếu có)

```javascript
ai_reasoning: {
  description: "Hệ thống tính điểm mới (3 thành phần)",
  priority_score: 70,
  year_score: 100,
  gpa_score: 87,
  weight_priority: 0.25,
  weight_year: 0.35,
  weight_gpa: 0.40,
  formula: "(70 × 0.25) + (100 × 0.35) + (87 × 0.40) = 71"
}
```

---

## 11. File Liên Quan

- **Frontend Config**: `src/pages/registration_management/sections/RegistrationSettings.jsx`
- **Backend Logic**: `src/services/RegistrationService.js`
- **Database**: `settings` table (scoring_weights)
- **DAO Layer**: `src/dao/SettingsDAO.js`, `src/dao/RegisterFormDAO.js`

---

## 12. Khả Năng Mở Rộng

Hệ thống được thiết kế để dễ dàng mở rộng:

- **Thêm thành phần mới**: Tạo hàm `calculate[ComponentName]Score()` mới
- **Thay đổi trọng số**: Cập nhật settings (không cần code)
- **Thay đổi threshold**: Sửa điều kiện trong `determineAISuggestion()`
- **Thêm bộ lọc**: Mở rộng logic trong `calculateGPAScore()` hoặc tương tự

---

**Cập nhật lần cuối:** 08/02/2026
