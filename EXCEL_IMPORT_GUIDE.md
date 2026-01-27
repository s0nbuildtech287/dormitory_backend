# 📋 HƯỚNG DẪN IMPORT EXCEL - ĐỒNG BỘ HỒ SƠ ĐĂNG KÝ

## 📑 Mục lục
1. [Tổng quan](#tổng-quan)
2. [Format file Excel](#format-file-excel)
3. [Luồng xử lý chi tiết](#luồng-xử-lý-chi-tiết)
4. [Xử lý lỗi và cảnh báo](#xử-lý-lỗi-và-cảnh-báo)
5. [Ví dụ cụ thể](#ví-dụ-cụ-thể)

---

## 🎯 Tổng quan

### Mục đích
Import hồ sơ đăng ký từ Google Form (đã export ra Excel/CSV) vào database PostgreSQL

### Công nghệ sử dụng
- **xlsx**: Thư viện đọc file Excel
- **PostgreSQL**: Database lưu trữ
- **DAO Pattern**: Tách biệt logic data access

### Endpoint API
```
POST /api/registrations/import
Content-Type: multipart/form-data
Header: Authorization: Bearer <admin_token>
Body: file (Excel/CSV file)
```

---

## 📝 Format file Excel

### Các cột bắt buộc
| Tên cột (Tiếng Việt) | Tên cột (English) | Kiểu dữ liệu | Mô tả |
|----------------------|-------------------|--------------|-------|
| Họ tên | student_name | Text | Họ và tên đầy đủ sinh viên |
| Email | email | Text | Email sinh viên (unique) |
| Số điện thoại | phone | Text/Number | Số điện thoại liên lạc |
| Giới tính | gender | Text | Nam/Nữ hoặc M/F |

### Các cột tùy chọn
| Tên cột (Tiếng Việt) | Tên cột (English) | Kiểu dữ liệu | Mô tả |
|----------------------|-------------------|--------------|-------|
| Mã SV | student_id | Text | Mã sinh viên (unique nếu có) |
| Ngày sinh | dob | Date/Text | Ngày sinh (DD/MM/YYYY hoặc YYYY-MM-DD) |
| Địa chỉ | address | Text | Địa chỉ thường trú |
| Khoa | faculty | Text | Tên khoa |
| Lớp | class | Text | Lớp học |
| Năm học | year | Number | Năm học (1, 2, 3, 4) |
| GPA | gpa | Number | Điểm GPA (0.0 - 4.0) |
| Khoảng cách | distance | Number | Khoảng cách từ nhà đến trường (km) |
| Điểm ưu tiên | priority_points | Number | Điểm ưu tiên (0-100) |

### Ví dụ file Excel mẫu

| Họ tên | Email | Số điện thoại | Giới tính | Mã SV | Ngày sinh | Khoa | Lớp | Năm học | GPA | Khoảng cách | Điểm ưu tiên |
|--------|-------|---------------|-----------|-------|-----------|------|-----|---------|-----|-------------|--------------|
| Nguyễn Văn A | nguyenvana@example.com | 0912345678 | Nam | SV001 | 01/01/2003 | CNTT | IT01 | 1 | 3.5 | 150 | 10 |
| Trần Thị B | tranthib@example.com | 0987654321 | Nữ | SV002 | 15/05/2003 | Kinh tế | KT02 | 2 | 3.2 | 80 | 0 |

---

## 🔄 Luồng xử lý chi tiết

### BƯỚC 1: Đọc file Excel
```javascript
const workbook = xlsx.readFile(filePath);
const sheet = workbook.Sheets[workbook.SheetNames[0]];
const rawData = xlsx.utils.sheet_to_json(sheet);
```

**Giải thích:**
- `xlsx.readFile()`: Đọc file Excel từ đường dẫn
- `sheet_to_json()`: Chuyển đổi sheet thành array of objects
- Header row (dòng đầu tiên) trở thành key của object

**Output:**
```javascript
[
  {
    "Họ tên": "Nguyễn Văn A",
    "Email": "nguyenvana@example.com",
    "Số điện thoại": "0912345678",
    ...
  },
  ...
]
```

---

### BƯỚC 2: Xử lý từng dòng

#### BƯỚC 2.1: Validate dữ liệu bắt buộc
```javascript
const validationErrors = [];

if (!row['Họ tên'] && !row['student_name']) {
    validationErrors.push('Thiếu họ tên');
}
if (!row['Email'] && !row['email']) {
    validationErrors.push('Thiếu email');
}
// ... các trường khác

if (validationErrors.length > 0) {
    throw new Error(`Dữ liệu không hợp lệ: ${validationErrors.join(', ')}`);
}
```

**Giải thích:**
- Kiểm tra cả tên Tiếng Việt và English (linh hoạt)
- Collect tất cả lỗi trước khi throw error (user experience tốt hơn)
- Nếu thiếu trường bắt buộc → skip dòng này và ghi vào errors array

---

#### BƯỚC 2.2: Chuẩn hóa dữ liệu

##### 2.2.1. Email
```javascript
const email = (row['Email'] || row['email'])
    .toString()        // Chuyển sang string (case Excel format là number)
    .trim()            // Loại bỏ khoảng trắng đầu cuối
    .toLowerCase();    // Chuyển thành chữ thường (tránh trùng lặp)
```

**Ví dụ:**
- Input: `  NguYenVanA@EXAMPLE.com  `
- Output: `nguyenvana@example.com`

##### 2.2.2. Giới tính
```javascript
let gender = (row['Giới tính'] || row['gender']).toString().trim();
if (['Nam', 'M', 'Male', 'nam', 'male'].includes(gender)) {
    gender = 'Nam';
} else if (['Nữ', 'F', 'Female', 'nữ', 'female', 'Nu'].includes(gender)) {
    gender = 'Nữ';
} else {
    throw new Error(`Giới tính không hợp lệ: ${gender}`);
}
```

**Chấp nhận nhiều format:**
- Nam: "Nam", "M", "Male", "nam", "male"
- Nữ: "Nữ", "F", "Female", "nữ", "female", "Nu"

##### 2.2.3. Số điện thoại
```javascript
const phone = (row['Số điện thoại'] || row['phone'])
    .toString()
    .replace(/[\s-]/g, '');  // Loại bỏ khoảng trắng và dấu gạch ngang
```

**Ví dụ:**
- Input: `091-234-5678` hoặc `091 234 5678`
- Output: `0912345678`

##### 2.2.4. Ngày sinh
```javascript
let dob = null;
if (row['Ngày sinh'] || row['dob']) {
    const dobStr = row['Ngày sinh'] || row['dob'];
    
    // Case 1: Excel trả về Date object
    if (dobStr instanceof Date) {
        dob = dobStr.toISOString().split('T')[0];
    } 
    // Case 2: String (DD/MM/YYYY hoặc YYYY-MM-DD)
    else {
        const parts = dobStr.toString().split(/[-/]/);
        if (parts.length === 3) {
            // Nếu phần đầu <= 31 → DD/MM/YYYY
            if (parseInt(parts[0]) <= 31) {
                dob = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
            } 
            // Ngược lại → YYYY-MM-DD
            else {
                dob = dobStr;
            }
        }
    }
}
```

**Chấp nhận format:**
- `01/01/2003` → `2003-01-01`
- `2003-01-01` → `2003-01-01`
- Excel Date object → `2003-01-01`

---

#### BƯỚC 2.3: Kiểm tra trùng lặp

```javascript
// Check email
const existingByEmail = await RegisterFormDAO.findOne({ email });
if (existingByEmail) {
    throw new Error(`Email đã tồn tại: ${email}`);
}

// Check mã sinh viên (nếu có)
if (studentId) {
    const existingByStudentId = await RegisterFormDAO.findByStudentId(studentId);
    if (existingByStudentId.length > 0) {
        throw new Error(`Mã sinh viên đã tồn tại: ${studentId}`);
    }
}
```

**Giải thích:**
- Query database để check email và mã SV
- Nếu trùng → skip dòng này và ghi lỗi
- Tránh duplicate entries

---

#### BƯỚC 2.4: Tính điểm AI Suggestion

```javascript
if (gpa !== null && distance !== null) {
    // 1. Điểm GPA (0-100)
    const gpaScore = Math.min((gpa / 4.0) * 100, 100);
    
    // 2. Điểm khoảng cách (càng xa càng cao điểm)
    const distanceScore = Math.min((distance / 500) * 100, 100);
    
    // 3. Điểm năm học (năm 1 ưu tiên cao)
    const year = row['Năm học'] || 1;
    const yearScore = year === 1 ? 100 : year === 2 ? 80 : year === 3 ? 60 : 40;
    
    // 4. Điểm ưu tiên (chính sách)
    const circumstanceScore = priorityPoints;

    // Tính điểm tổng (weighted average)
    aiScore = Math.round(
        (gpaScore * 0.3) +        // GPA chiếm 30%
        (distanceScore * 0.3) +   // Khoảng cách 30%
        (yearScore * 0.2) +       // Năm học 20%
        (circumstanceScore * 0.2) // Ưu tiên 20%
    );

    // Phân loại
    if (aiScore >= 80) {
        aiSuggestion = 'Nên duyệt';
    } else if (aiScore >= 60) {
        aiSuggestion = 'Cân nhắc';
    } else {
        aiSuggestion = 'Không ưu tiên';
    }
}
```

**Công thức tính điểm:**

| Tiêu chí | Trọng số | Cách tính |
|----------|----------|-----------|
| GPA | 30% | `(gpa / 4.0) * 100` |
| Khoảng cách | 30% | `(distance / 500) * 100` (max 100) |
| Năm học | 20% | Năm 1: 100, Năm 2: 80, Năm 3: 60, Năm 4: 40 |
| Điểm ưu tiên | 20% | Trực tiếp từ input (0-100) |

**Phân loại:**
- **Nên duyệt**: aiScore >= 80
- **Cân nhắc**: 60 <= aiScore < 80
- **Không ưu tiên**: aiScore < 60

**Ví dụ:**
```
Input: GPA=3.5, distance=150km, year=1, priority=10

gpaScore = (3.5/4.0)*100 = 87.5
distanceScore = (150/500)*100 = 30
yearScore = 100
circumstanceScore = 10

aiScore = (87.5*0.3) + (30*0.3) + (100*0.2) + (10*0.2)
        = 26.25 + 9 + 20 + 2
        = 57.25 ≈ 57

→ aiSuggestion = "Cân nhắc"
```

---

#### BƯỚC 2.5: Tạo object hồ sơ

```javascript
const registrationId = `reg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

const registration = {
    id: registrationId,
    student_name: (row['Họ tên'] || row['student_name']).toString().trim(),
    student_id: studentId || null,
    email: email,
    phone: phone,
    gender: gender,
    dob: dob,
    address: (row['Địa chỉ'] || row['address'] || '').toString().trim(),
    faculty: (row['Khoa'] || row['faculty'] || '').toString().trim(),
    class: (row['Lớp'] || row['class'] || '').toString().trim(),
    year: parseInt(row['Năm học'] || row['year'] || 1),
    gpa: gpa,
    distance: distance,
    priority_points: priorityPoints,
    ai_suggestion: aiSuggestion,
    ai_score: aiScore,
    ai_reasoning: JSON.stringify({
        priority: Math.round(gpaScore),
        distance: Math.round(distanceScore),
        year: yearScore,
        circumstance: circumstanceScore
    }),
    status: 'Chờ duyệt'
};
```

**Giải thích ID:**
- Format: `reg-{timestamp}-{random}`
- Ví dụ: `reg-1704096000000-k7j2n4m1p`
- Đảm bảo unique vì có timestamp + random string

---

#### BƯỚC 2.6: Lưu vào database

```javascript
await RegisterFormDAO.create(registration);
registrations.push(registration);
```

**SQL được thực thi:**
```sql
INSERT INTO register_forms (
    id, student_name, student_id, email, phone, gender, 
    dob, address, faculty, class, year, gpa, distance, 
    priority_points, ai_suggestion, ai_score, ai_reasoning, status
) VALUES (
    $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 
    $11, $12, $13, $14, $15, $16, $17, $18
) RETURNING *
```

---

### BƯỚC 3: Tổng kết và ghi log

```javascript
await LogSystemDAO.log(
    adminId,
    'IMPORT_REGISTRATIONS',
    'register_forms',
    null,
    null,
    { 
        total: rawData.length,
        imported: registrations.length, 
        failed: errors.length,
        warnings: warnings.length 
    },
    req
);

return { 
    success: registrations.length, 
    failed: errors.length,
    total: rawData.length,
    errors,
    warnings 
};
```

**Log được lưu vào bảng `log_systems`:**
```sql
INSERT INTO log_systems (
    user_id,           -- ID của admin thực hiện import
    action,            -- 'IMPORT_REGISTRATIONS'
    table_name,        -- 'register_forms'
    details,           -- JSON chứa total, imported, failed, warnings
    ip_address,        -- IP từ request
    user_agent         -- Browser info
) VALUES (...)
```

---

## ⚠️ Xử lý lỗi và cảnh báo

### Các loại lỗi

#### 1. Lỗi dữ liệu bắt buộc
```javascript
Error: "Dữ liệu không hợp lệ: Thiếu họ tên, Thiếu email"
```
**Xử lý:** Skip dòng này, thêm vào errors array

#### 2. Lỗi trùng lặp
```javascript
Error: "Email đã tồn tại: nguyenvana@example.com"
Error: "Mã sinh viên đã tồn tại: SV001"
```
**Xử lý:** Skip dòng này, thêm vào errors array

#### 3. Lỗi format dữ liệu
```javascript
Error: "Giới tính không hợp lệ: Khác"
```
**Xử lý:** Skip dòng này, thêm vào errors array

#### 4. Lỗi database
```javascript
Error: "Database connection failed"
```
**Xử lý:** Throw error, dừng toàn bộ import

---

### Cảnh báo (Warnings)

Không block import nhưng ghi lại để admin xem xét:

```javascript
warnings.push({ 
    row: rowNumber, 
    message: 'Không parse được ngày sinh, bỏ qua trường này' 
});
```

**Các case cảnh báo:**
- Không parse được ngày sinh
- GPA hoặc distance không có → không tính AI score
- Các trường optional bị thiếu

---

## 📊 Ví dụ cụ thể

### Ví dụ 1: Import thành công

**Input Excel:**
```
| Họ tên | Email | Số điện thoại | Giới tính | GPA | Khoảng cách |
|--------|-------|---------------|-----------|-----|-------------|
| Nguyễn Văn A | nguyenvana@example.com | 0912345678 | Nam | 3.5 | 150 |
```

**Output:**
```javascript
{
    success: 1,
    failed: 0,
    total: 1,
    errors: [],
    warnings: []
}
```

**Database:**
```sql
SELECT * FROM register_forms WHERE email='nguyenvana@example.com';
```
```
id: reg-1704096000000-k7j2n4m1p
student_name: Nguyễn Văn A
email: nguyenvana@example.com
phone: 0912345678
gender: Nam
gpa: 3.5
distance: 150
ai_score: 57
ai_suggestion: Cân nhắc
status: Chờ duyệt
created_at: 2024-01-01 10:00:00
```

---

### Ví dụ 2: Import với lỗi

**Input Excel:**
```
| Họ tên | Email | Số điện thoại | Giới tính |
|--------|-------|---------------|-----------|
| Nguyễn Văn A | nguyenvana@example.com | 0912345678 | Nam |
| Trần Thị B | | 0987654321 | Nữ |
| Lê Văn C | nguyenvana@example.com | 0911111111 | Nam |
```

**Output:**
```javascript
{
    success: 1,
    failed: 2,
    total: 3,
    errors: [
        { 
            row: 3, 
            studentName: 'Trần Thị B',
            error: 'Dữ liệu không hợp lệ: Thiếu email' 
        },
        { 
            row: 4, 
            studentName: 'Lê Văn C',
            error: 'Email đã tồn tại: nguyenvana@example.com' 
        }
    ],
    warnings: []
}
```

**Giải thích:**
- Dòng 2: ✅ Import thành công
- Dòng 3: ❌ Thiếu email (bắt buộc)
- Dòng 4: ❌ Email trùng với dòng 2

---

### Ví dụ 3: Import với cảnh báo

**Input Excel:**
```
| Họ tên | Email | Số điện thoại | Giới tính | Ngày sinh | GPA |
|--------|-------|---------------|-----------|-----------|-----|
| Nguyễn Văn A | nguyenvana@example.com | 0912345678 | Nam | 32/13/2003 | 3.5 |
```

**Output:**
```javascript
{
    success: 1,
    failed: 0,
    total: 1,
    errors: [],
    warnings: [
        { 
            row: 2, 
            message: 'Không parse được ngày sinh, bỏ qua trường này' 
        }
    ]
}
```

**Giải thích:**
- Import vẫn thành công vì ngày sinh không bắt buộc
- Nhưng có warning vì format ngày không hợp lệ (32/13/2003)
- dob sẽ là NULL trong database

---

## 🔧 Testing

### Test với Postman

1. **Tạo file Excel test:**
   - Tải file mẫu: [registration_sample.xlsx](./registration_sample.xlsx)
   - Hoặc tạo file mới theo format ở trên

2. **Login admin:**
```
POST http://localhost:5000/api/auth/login
Body: {
    "email": "admin@dormitory.vn",
    "password": "Admin@123"
}
```

3. **Import file:**
```
POST http://localhost:5000/api/registrations/import
Headers:
    Authorization: Bearer <admin_token>
Content-Type: multipart/form-data
Body:
    file: [Choose Excel file]
```

4. **Kiểm tra kết quả:**
```
GET http://localhost:5000/api/registrations
Headers:
    Authorization: Bearer <admin_token>
```

---

## 📌 Lưu ý quan trọng

### 1. Performance
- Mỗi dòng = 2-3 queries (check duplicate + insert)
- File 100 dòng ≈ 200-300 queries
- Cân nhắc batch insert nếu file > 1000 dòng

### 2. Transaction
- Hiện tại KHÔNG dùng transaction
- Nếu dòng 50 lỗi → dòng 1-49 vẫn được lưu
- Có thể thêm transaction nếu cần "all or nothing"

### 3. Validation nâng cao
Có thể thêm:
- Email format validation (regex)
- Phone format validation (10-11 số)
- GPA range (0.0 - 4.0)
- Year range (1-4)

### 4. Bảo mật
- Chỉ admin được import
- File size limit: 10MB (trong upload.js)
- File type: .xlsx, .xls, .csv only

---

## 🚀 Cải tiến trong tương lai

1. **Batch insert**: Group 100 records → 1 query
2. **Transaction**: Rollback nếu có lỗi nghiêm trọng
3. **Background job**: Import file lớn không block request
4. **Preview**: Hiển thị preview trước khi import thật
5. **Duplicate handling**: Cho phép update thay vì skip
6. **Email notification**: Gửi email khi import xong

---

## 📞 Support

Nếu có vấn đề:
1. Check console log (có emoji dễ nhìn)
2. Check errors array trong response
3. Check bảng log_systems trong database
4. Liên hệ team dev

---

**Tài liệu được tạo bởi: SonBX**  
**Version: 1.0**  
**Last updated: 2024**
