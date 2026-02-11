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

## 4. Trọng Số Theo Rổ (Basket-Specific Weights)

Mỗi rổ có công thức tính điểm riêng với trọng số khác nhau:

### Rổ 1: Chính Sách (Policy Priority)

**Ưu tiên:** Hoàn cảnh > Năm học > Điểm GPA

```javascript
W₁ (Priority/Ưu tiên):  0.60 (60%)
W₂ (Year/Năm học):      0.25 (25%)
W₃ (GPA/Học tập):       0.15 (15%)
```

### Rổ 2: Tân Sinh Viên (Freshmen)

**Ưu tiên:** Năm học > Hoàn cảnh, GPA ít quan trọng

```javascript
W₁ (Priority/Ưu tiên):  0.20 (20%)
W₂ (Year/Năm học):      0.70 (70%)
W₃ (GPA/Học tập):       0.10 (10%)
```

### Rổ 3: Khóa Cũ (Upper-class Students)

**Ưu tiên:** GPA > Năm học > Hoàn cảnh

```javascript
W₁ (Priority/Ưu tiên):  0.15 (15%)
W₂ (Year/Năm học):      0.25 (25%)
W₃ (GPA/Học tập):       0.60 (60%)
```

### Lưu Ý Quan Trọng

- **Điểm cuối cùng luôn trong thang 0-100**
- **Xác định rổ trước:** Có lý do ưu tiên → Rổ 1, ngay cả khi là tân sinh viên
- **Sắp xếp:** Rổ 1 → Rổ 2 → Rổ 3, trong mỗi rổ sắp theo điểm từ cao xuống thấp

---

## 5. Ví Dụ Tính Toán Chi Tiết

### Sinh Viên A: Năm 1, GPA 0, Không ưu tiên (Tân sinh viên - Rổ 2)

```
Rổ            = 2       (Tân sinh viên)
Weights       = Priority 0.20, Year 0.70, GPA 0.10

PriorityScore = 0       (không ưu tiên)
YearScore     = 100     (năm 1)
GPAScore      = 50      (năm 1, chưa có điểm → điểm trung bình)

AI Score = (0 × 0.20) + (100 × 0.70) + (50 × 0.10)
         = 0 + 70 + 5 = 75

→ Đề xuất: "Nên duyệt" (vì 75 ≥ 75 cho Rổ 2)
→ Thứ tự: Ưu tiên sau Rổ 1, trước Rổ 3
```

### Sinh Viên B: Năm 3, GPA 4.0, Không ưu tiên (Khóa cũ giỏi - Rổ 3)

```
Rổ            = 3       (Khóa cũ)
Weights       = Priority 0.15, Year 0.25, GPA 0.60

PriorityScore = 0       (không ưu tiên)
YearScore     = 40      (năm 3)
GPAScore      = 100     (4.0 × 25)

AI Score = (0 × 0.15) + (40 × 0.25) + (100 × 0.60)
         = 0 + 10 + 60 = 70

→ Đề xuất: "Cân nhắc" (vì 65 ≤ 70 < 80 cho Rổ 3)
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
Weights       = Priority 0.60, Year 0.25, GPA 0.15

PriorityScore = 70      (vùng sâu vùng xa)
YearScore     = 20      (năm 4)
GPAScore      = 80      (3.2 × 25)

AI Score = (70 × 0.60) + (20 × 0.25) + (80 × 0.15)
         = 42 + 5 + 12 = 59

→ Đề xuất: "Cân nhắc" (vì 50 ≤ 59 < 70 cho Rổ 1)
→ Thứ tự: Ưu tiên tuyệt đối (Rổ 1)
→ Mặc dù điểm không cao, nhưng vì thuộc Rổ 1 nên vẫn được xếp trước tất cả
```

### Sinh Viên E: Năm 1, GPA 0, Hộ nghèo (Chính sách + Tân SV - Rổ 1)

```
Rổ            = 1       (Có lý do ưu tiên → luôn Rổ 1, dù là năm 1)
Weights       = Priority 0.60, Year 0.25, GPA 0.15

PriorityScore = 100     (hộ nghèo)
YearScore     = 100     (năm 1)
GPAScore      = 50      (năm 1, chưa có điểm)

AI Score = (100 × 0.60) + (100 × 0.25) + (50 × 0.15)
         = 60 + 25 + 7.5 = 92.5 → làm tròn = 93

→ Đề xuất: "Nên duyệt" (vì 93 ≥ 70 cho Rổ 1)
→ Thứ tự: Top priority (Rổ 1 + điểm cao)
→ Trường hợp lý tưởng: Vừa có chính sách, vừa là tân sinh viên
```

### Tóm Tắt Thứ Tự Duyệt

| Thứ Tự | SV  | Rổ  | AI Score | Đề Xuất         | Lý Do                                      |
| ------- | --- | --- | -------- | --------------- | ------------------------------------------ |
| 1       | E   | 1   | **93**   | Nên duyệt       | Chính sách + Năm 1, điểm cao               |
| 2       | D   | 1   | **59**   | Cân nhắc        | Chính sách, dù điểm thấp vẫn ưu tiên       |
| 3       | A   | 2   | **75**   | Nên duyệt       | Tân SV, trọng số Year cao                  |
| 4       | B   | 3   | **70**   | Cân nhắc        | Khóa cũ GPA 4.0, nhưng thuộc Rổ 3          |
| -       | C   | 1   | **LOẠI** | Loại (GPA<2.0)  | Không đạt GPA tối thiểu                    |

**Nhận xét:**
- SV E (Rổ 1, điểm 93) được duyệt đầu tiên - chính sách + tân SV là combo tốt nhất
- SV D (Rổ 1, điểm 59) vẫn ưu tiên hơn SV A và B dù điểm thấp hơn  
- SV A (Rổ 2, điểm 75) được ưu tiên hơn SV B (Rổ 3, điểm 70)
- SV B có GPA cao nhất (4.0) nhưng xếp cuối vì thuộc Rổ 3
- SV C bị loại ngay dù thuộc Rổ 1 vì GPA < 2.0

→ **Kết luận:** Sắp xếp theo Rổ trước (1→2→3), sau đó theo điểm trong rổ. Mỗi rổ có công thức riêng phù hợp với đặc điểm đối tượng.

---

## 6. Phân Loại Đề Xuất Theo Rổ

Mỗi rổ có ngưỡng đánh giá khác nhau phù hợp với đặc điểm đối tượng:

### Rổ 1 (Chính Sách) - Nới lỏng vì ưu tiên hoàn cảnh

| Điểm AI | Đề Xuất                        | Ý Nghĩa                              |
| ------- | ------------------------------ | ------------------------------------ |
| ≥ 70    | "Nên duyệt" (RECOMMENDED)      | Hồ sơ tốt, ưu tiên hoàn cảnh rõ ràng |
| 50-69   | "Cân nhắc" (CONSIDER)          | Hồ sơ trung bình, cần xem xét        |
| < 50    | "Không ưu tiên" (LOW_PRIORITY) | Hồ sơ yếu về hoàn cảnh               |

### Rổ 2 (Tân Sinh Viên) - Nới lỏng vì chưa có GPA

| Điểm AI | Đề Xuất                        | Ý Nghĩa                          |
| ------- | ------------------------------ | -------------------------------- |
| ≥ 75    | "Nên duyệt" (RECOMMENDED)      | Tân SV năm 1, nên ưu tiên        |
| 55-74   | "Cân nhắc" (CONSIDER)          | Tân SV nhưng có yếu tố khác      |
| < 55    | "Không ưu tiên" (LOW_PRIORITY) | Hồ sơ yếu, cần xem xét kỹ        |

### Rổ 3 (Khóa Cũ) - Chặt chẽ hơn vì có GPA

| Điểm AI | Đề Xuất                        | Ý Nghĩa                        |
| ------- | ------------------------------ | ------------------------------ |
| ≥ 80    | "Nên duyệt" (RECOMMENDED)      | GPA cao, học tập tốt           |
| 65-79   | "Cân nhắc" (CONSIDER)          | GPA trung bình                 |
| < 65    | "Không ưu tiên" (LOW_PRIORITY) | GPA thấp, ưu tiên cho SV khác  |

### Lưu Ý

- **GPA < 2.0:** Tự động loại cho tất cả các rổ (trừ năm 1 chưa có điểm)
- **Thứ tự duyệt:** Luôn ưu tiên theo Rổ (1→2→3) trước, sau đó mới xét điểm trong rổ

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
