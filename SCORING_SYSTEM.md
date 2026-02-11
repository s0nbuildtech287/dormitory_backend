# Hệ Thống Tính Điểm AI - Tài Liệu Kỹ Thuật

## Tổng Quan

Hệ thống tính điểm AI mới sử dụng **3 thành phần chính** với các trọng số được cấu hình linh hoạt để đánh giá hồ sơ đăng ký nội trú.

---

## Công Thức Chính

```
aiScore = (PriorityScore × W₁) + (YearScore × W₂) + (GPAScore × W₃) + BasketBonus

Điều kiện: W₁ + W₂ + W₃ = 1.0
```

### Basket Bonus System (Đảm bảo thứ tự ưu tiên)

| Rổ | Tên | Điều kiện | Basket Bonus | Kết quả |
|----|-----|-----------|--------------|---------|
| **Rổ 1** | Chính sách | Có priority_reasons | **+200 điểm** | Luôn top 1 |
| **Rổ 2** | Tân sinh viên | Year = 1, không có chính sách | **+100 điểm** | Ưu tiên thứ 2 |
| **Rổ 3** | Khóa cũ | Year > 1, không có chính sách | **+0 điểm** | Cạnh tranh GPA |

**Ví dụ thực tế:**

**SV A - Tân SV (Rổ 2):**
- Priority=0, Year=100, GPA=50
- Base Score = (0×0.25) + (100×0.35) + (50×0.40) = 55
- **Final Score = 55 + 100 (Bonus Rổ 2) = 155** ✅

**SV B - Khóa cũ giỏi (Rổ 3):**  
- Priority=0, Year=40, GPA=100
- Base Score = (0×0.25) + (40×0.35) + (100×0.40) = 54
- **Final Score = 54 + 0 (Rổ 3) = 54** ❌

**SV C - Chính sách (Rổ 1):**
- Priority=100, Year=40, GPA=30
- Base Score = (100×0.25) + (40×0.35) + (30×0.40) = 51
- **Final Score = 51 + 200 (Bonus Rổ 1) = 251** 🏆

→ **Thứ tự cuối cùng: C (251) > A (155) > B (54)** - Đúng logic 3 rổ!

### Logic Sắp xếp Danh sách

**Thứ tự ưu tiên:**
1. **Rổ 1** (Chính sách) - Bonus +200
2. **Rổ 2** (Tân sinh viên) - Bonus +100  
3. **Rổ 3** (Khóa cũ) - Bonus +0
4. Trong mỗi rổ: sắp xếp theo **AI Score** (cao → thấp)

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

**Trường hợp đặc biệt:** Sinh viên năm 1 với GPA = 0 (chưa học môn nào) → GPAScore = 50 (điểm trung bình)

### Ví Dụ

- GPA = 4.0 → GPAScore = 100
- GPA = 3.5 → GPAScore = 87.5 → làm tròn = 88
- GPA = 2.0 → GPAScore = 50
- GPA = 1.5 (Năm 2, 3, 4) → **FILTERED** (Bị loại)
- GPA = 0 (Năm 1) → GPAScore = 50 (Chưa có điểm, tính điểm trung bình)

### Cách Tính

```javascript
calculateGPAScore(gpa, year) {
  // Trường hợp đặc biệt: SV năm 1 với GPA = 0 → score = 50
  if (year === 1 && gpa === 0) return { score: 50, isFiltered: false }
  
  // Nếu gpa < 2.0 → trả về { score: 0, isFiltered: true, reason: "GPA < 2.0" }
  // Còn lại → trả về { score: Math.round(gpa * 25), isFiltered: false }
  // Code xem ở dòng 135-178 trong RegistrationService.js
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

### Sinh Viên A: Năm 1, GPA 0, Không ưu tiên (Tân sinh viên - Rổ 2)

```
Rổ            = 2       (Tân sinh viên)
PriorityScore = 0       (không ưu tiên)
YearScore     = 100     (năm 1)
GPAScore      = 50      (năm 1, chưa có điểm → điểm trung bình)

Base Score = (0 × 0.25) + (100 × 0.35) + (50 × 0.40)
           = 0 + 35 + 20 = 55

Final Score (AI Score) = 55 + 100 (Bonus Rổ 2) = 155

→ Đề xuất: "Không ưu tiên" (vì Base Score 55 < 60)
→ Thứ tự: Ưu tiên sau Rổ 1, trước Rổ 3 (vì Final Score = 155)
```

### Sinh Viên B: Năm 3, GPA 4.0, Không ưu tiên (Khóa cũ giỏi - Rổ 3)

```
Rổ            = 3       (Khóa cũ)
PriorityScore = 0       (không ưu tiên)
YearScore     = 40      (năm 3)
GPAScore      = 100     (4.0 × 25)

Base Score = (0 × 0.25) + (40 × 0.35) + (100 × 0.40)
           = 0 + 14 + 40 = 54

Final Score (AI Score) = 54 + 0 (Rổ 3) = 54

→ Đề xuất: "Không ưu tiên" (vì Base Score 54 < 60)
→ Thứ tự: Sau tất cả SV Rổ 1 và Rổ 2
→ Cạnh tranh với nhau trong Rổ 3 bằng GPA
```

### Sinh Viên C: Năm 2, GPA 1.8, Hộ nghèo (Chính sách - Rổ 1)

```
Rổ            = 1       (Chính sách)
PriorityScore = 100     (hộ nghèo)
YearScore     = 60      (năm 2)
GPAScore      = ❌      (1.8 < 2.0)

→ Kết quả: LOẠI (GPA < 2.0)
→ Đề xuất: "Loại (GPA < 2.0)"
→ Bị loại dù thuộc Rổ 1 vì không đạt điều kiện GPA tối thiểu
```

### Sinh Viên D: Năm 4, GPA 3.2, Vùng sâu, vùng xa (Chính sách - Rổ 1)

```
Rổ            = 1       (Chính sách - vùng sâu vùng xa)
PriorityScore = 70      (vùng sâu vùng xa)
YearScore     = 20      (năm 4)
GPAScore      = 80      (3.2 × 25)

Base Score = (70 × 0.25) + (20 × 0.35) + (80 × 0.40)
           = 17.5 + 7 + 32 = 56.5 → làm tròn = 57

Final Score (AI Score) = 57 + 200 (Bonus Rổ 1) = 257

→ Đề xuất: "Không ưu tiên" (vì Base Score 57 < 60)
→ Thứ tự: Ưu tiên tuyệt đối (Rổ 1, Final Score = 257)
→ Mặc dù Base Score thấp và năm 4, nhưng vì thuộc Rổ 1 nên vẫn được xếp trước tất cả
```

### Tóm Tắt Thứ Tự Duyệt

| Thứ Tự | SV  | Rổ  | Base Score | Final Score | Đề Xuất         | Lý Do                          |
| ------- | --- | --- | ---------- | ----------- | --------------- | ------------------------------ |
| 1       | D   | 1   | 57         | **257**     | Không ưu tiên   | Rổ 1 (Chính sách) + Bonus 200  |
| 2       | A   | 2   | 55         | **155**     | Không ưu tiên   | Rổ 2 (Tân SV) + Bonus 100      |
| 3       | B   | 3   | 54         | **54**      | Không ưu tiên   | Rổ 3 (Khóa cũ) + Bonus 0       |
| -       | C   | 1   | -          | **LOẠI**    | Loại (GPA<2.0)  | Không đạt GPA tối thiểu        |

**Nhận xét:**
- SV D được duyệt đầu tiên mặc dù Base Score thấp nhất (57), vì thuộc Rổ 1 (Chính sách)
- SV A được ưu tiên hơn SV B mặc dù Base Score tương đương (55 vs 54), vì thuộc Rổ 2 (Tân sinh viên)
- SV B có GPA cao nhất (4.0) nhưng xếp cuối vì thuộc Rổ 3 (Khóa cũ)
- SV C bị loại ngay dù thuộc Rổ 1 vì GPA < 2.0

→ **Kết luận:** Basket Bonus đảm bảo hierarchy Chính sách > Tân SV > Khóa cũ, trong khi Base Score đánh giá chất lượng hồ sơ

---

## 6. Phân Loại Đề Xuất

**Lưu ý:** Đề xuất dựa trên **Base Score** (điểm trước khi cộng Basket Bonus) để đánh giá chất lượng hồ sơ. Thứ tự duyệt dựa trên **Final Score** (AI Score = Base Score + Basket Bonus).

### Đánh Giá Chất Lượng Hồ Sơ (Base Score)

| Base Score | Đề Xuất                        | Ý Nghĩa                       |
| ---------- | ------------------------------ | ----------------------------- |
| ≥ 80       | "Nên duyệt" (RECOMMENDED)      | Hồ sơ tốt, ưu tiên duyệt      |
| 60-79      | "Cân nhắc" (CONSIDER)          | Hồ sơ trung bình, cần xem xét |
| < 60       | "Không ưu tiên" (LOW_PRIORITY) | Hồ sơ yếu, xem xét sau        |
| GPA < 2.0  | "Loại (GPA < 2.0)"             | Bị loại trực tiếp             |

### Thứ Tự Duyệt (Final Score = Base Score + Basket Bonus)

Thứ tự sắp xếp theo:
1. **Basket** (Rổ 1 → Rổ 2 → Rổ 3)
2. **Final Score** (AI Score) trong cùng một Basket

**Ví dụ thực tế:**
- SV A (Rổ 2): Base Score = 55 → Final Score = 155 → Đề xuất "Không ưu tiên" nhưng vẫn được duyệt trước SV B
- SV B (Rổ 3): Base Score = 54 → Final Score = 54 → Đề xuất "Không ưu tiên"

→ Thứ tự: A > B (vì Rổ 2 > Rổ 3), mặc dù cả hai đều có đề xuất "Không ưu tiên"

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
