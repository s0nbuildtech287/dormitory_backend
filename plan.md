# Kế hoạch & Sơ đồ nâng cấp biểu đồ hệ thống (PlantUML)

Chào **master Xuân Sơn**, dưới đây là nội dung toàn bộ sơ đồ PlantUML nâng cấp và bổ sung cho đề tài Quản lý Ký túc xá, khớp 100% với tính năng vận hành thực tế trong code hiện tại của dự án.

---

## 1. PHÂN NHÓM USE CASE (USECASE DIAGRAMS)

### 1.1. `uc_taikhoan.puml` (Phân rã Quản lý tài khoản & Phân vai BQL chi tiết)
*Đường dẫn lưu:* `dormitory-frontend/diagrams/usecase_phanra/uc_taikhoan.puml`

```puml
@startuml "UC Phân rã - Quản lý tài khoản"
skinparam defaultFontSize 22
skinparam defaultFontName "Times New Roman"
left to right direction
skinparam usecase {
  BackgroundColor White
  BorderColor Black
  ArrowColor Black
}
skinparam actor {
  BackgroundColor White
  BorderColor Black
}

actor "<b>Quản trị viên hệ thống\n(Super Admin)</b>" as SuperAdmin
actor "<b>Quản lý tòa nhà</b>" as BuildingManager
actor "<b>Kế toán</b>" as Accountant
actor "<b>Sinh viên</b>" as SV
actor "<b>Sinh viên xung kích</b>" as Volunteer

Volunteer -|> SV

usecase "<b>Xem thông tin cá nhân</b>" as UC1
usecase "<b>Cập nhật thông tin cá nhân</b>" as UC2
usecase "<b>Đổi mật khẩu</b>" as UC3
usecase "<b>Tạo tài khoản quản trị mới</b>" as UC4
usecase "<b>Khoá / mở chế độ mã OTP</b>" as UC5
usecase "<b>Đăng nhập</b>" as UC6
usecase "<b>Đăng xuất</b>" as UC7
usecase "<b>Quên mật khẩu</b>" as UC8
usecase "<b>Gửi OTP qua email</b>" as UC9
usecase "<b>Xác thực mã OTP</b>" as UC10
usecase "<b>Đặt lại mật khẩu mới</b>" as UC11

SuperAdmin --> UC4
SuperAdmin --> UC5

BuildingManager --> UC1
BuildingManager --> UC2
BuildingManager --> UC3
BuildingManager --> UC6
BuildingManager --> UC7

Accountant --> UC1
Accountant --> UC2
Accountant --> UC3
Accountant --> UC6
Accountant --> UC7

SV --> UC1
SV --> UC2
SV --> UC3
SV --> UC6
SV --> UC7
SV --> UC8

UC8 ..> UC9 : <<include>>
UC8 ..> UC10 : <<include>>
UC8 ..> UC11 : <<include>>
@enduml
```

---

### 1.2. `uc_hosodangky.puml` (Hồ sơ đăng ký: Vận hành đợt, Dự báo cung cầu, Duyệt tự động)
*Đường dẫn lưu:* `dormitory-frontend/diagrams/usecase_phanra/uc_hosodangky.puml`

```puml
@startuml "UC Phân rã - Quản lý hồ sơ đăng ký"
skinparam defaultFontSize 22
skinparam defaultFontName "Times New Roman"
left to right direction
skinparam usecase {
  BackgroundColor White
  BorderColor Black
}
skinparam actor {
  BackgroundColor White
  BorderColor Black
}
skinparam ArrowColor Black
skinparam ArrowThickness 1
skinparam shadowing false

actor "<b>Quản lý tòa nhà</b>" as BuildingManager
actor "<b>Quản trị viên</b>" as SuperAdmin

usecase "<b>Xem danh sách hồ sơ</b>" as UC1
usecase "<b>Xem chi tiết hồ sơ</b>" as UC2
usecase "<b>Nhập hồ sơ thủ công</b>" as UC3
usecase "<b>Import từ Excel</b>" as UC4
usecase "<b>Import từ Google Sheets</b>" as UC5
usecase "<b>Tính điểm xét duyệt tự động</b>" as UC6
usecase "<b>Xác thực ảnh minh chứng\n(Google Vision API)</b>" as UC7
usecase "<b>Điều chỉnh trọng số điểm</b>" as UC8
usecase "<b>Tính lại điểm toàn bộ hồ sơ</b>" as UC9
usecase "<b>Duyệt hồ sơ thủ công</b>" as UC10
usecase "<b>Duyệt hồ sơ tự động theo lô</b>" as UC10a
usecase "<b>Từ chối hồ sơ</b>" as UC11
usecase "<b>Xóa hồ sơ</b>" as UC12
usecase "<b>Xem thống kê hồ sơ</b>" as UC13
usecase "<b>Gửi thông báo kết quả</b>" as UC14
usecase "<b>Tạo tài khoản sinh viên</b>" as UC15
usecase "<b>Dự báo cung cầu chỗ ở</b>" as UC16
usecase "<b>Mở đợt đăng ký mới</b>" as UC17

UC3 ..> UC6 : <<include>>
UC4 ..> UC6 : <<include>>
UC5 ..> UC6 : <<include>>
UC6 ..> UC7 : <<extend>>
UC8 ..> UC9 : <<include>>
UC10 ..> UC14 : <<include>>
UC10a ..> UC14 : <<include>>
UC11 ..> UC14 : <<include>>
UC10 ..> UC15 : <<include>>
UC10a ..> UC15 : <<include>>

SuperAdmin --> UC8
SuperAdmin --> UC9

BuildingManager --> UC1
BuildingManager --> UC2
BuildingManager --> UC3
BuildingManager --> UC4
BuildingManager --> UC5
BuildingManager --> UC10
BuildingManager --> UC10a
BuildingManager --> UC11
BuildingManager --> UC12
BuildingManager --> UC13
BuildingManager --> UC16
BuildingManager --> UC17
@enduml
```

---

### 1.3. `uc_hopdong_phong.puml` (Hợp đồng, Gán phòng tự động, Bổ nhiệm xung kích)
*Đường dẫn lưu:* `dormitory-frontend/diagrams/usecase_phanra/uc_hopdong_phong.puml`

```puml
@startuml "UC Phân rã - Quản lý hợp đồng đăng ký"
skinparam defaultFontSize 22
skinparam defaultFontName "Times New Roman"
left to right direction
skinparam usecase {
  BackgroundColor White
  BorderColor Black
}
skinparam actor {
  BackgroundColor White
  BorderColor Black
}
skinparam ArrowColor Black
skinparam ArrowThickness 1
skinparam shadowing false

actor "<b>Quản lý tòa nhà</b>" as BuildingManager

usecase "<b>Xem danh sách hợp đồng</b>" as UC1
usecase "<b>Xem chi tiết hợp đồng</b>" as UC2
usecase "<b>Tạo hợp đồng từ hồ sơ đã duyệt</b>" as UC3
usecase "<b>Gán phòng thủ công</b>" as UC4
usecase "<b>Gán phòng tự động theo lô</b>" as UC4a
usecase "<b>Gợi ý phòng phù hợp tự động</b>" as UC5
usecase "<b>Chấm dứt hợp đồng</b>" as UC6
usecase "<b>Xem thống kê hợp đồng</b>" as UC7
usecase "<b>Gửi email thông báo hết hạn/gia hạn</b>" as UC8
usecase "<b>Bổ nhiệm/Miễn nhiệm SV xung kích</b>" as UC9

UC4 ..> UC5 : <<extend>>
UC3 ..> UC4 : <<include>>
UC4a ..> UC8 : <<include>>

BuildingManager --> UC1
BuildingManager --> UC2
BuildingManager --> UC3
BuildingManager --> UC4
BuildingManager --> UC4a
BuildingManager --> UC6
BuildingManager --> UC7
BuildingManager --> UC8
BuildingManager --> UC9
@enduml
```

---

### 1.4. `uc_hoadon.puml` (Hóa đơn: Tác nhân chính là Kế toán)
*Đường dẫn lưu:* `dormitory-frontend/diagrams/usecase_phanra/uc_hoadon.puml`

```puml
@startuml "UC Phân rã - Quản lý hóa đơn"
skinparam defaultFontSize 22
skinparam defaultFontName "Times New Roman"
left to right direction
skinparam usecase {
  BackgroundColor White
  BorderColor Black
}
skinparam actor {
  BackgroundColor White
  BorderColor Black
}
skinparam ArrowColor Black
skinparam ArrowThickness 1
skinparam shadowing false

actor "<b>Kế toán</b>" as Accountant

usecase "<b>Xem danh sách hóa đơn</b>" as UC1
usecase "<b>Xem chi tiết hóa đơn</b>" as UC2
usecase "<b>Tạo hóa đơn thủ công</b>" as UC3
usecase "<b>Tự động tạo hóa đơn theo phòng</b>" as UC4
usecase "<b>Cập nhật hóa đơn</b>" as UC5
usecase "<b>Xóa hóa đơn</b>" as UC6
usecase "<b>Phát hiện bất thường điện/nước</b>" as UC7
usecase "<b>Tự động cập nhật hóa đơn quá hạn</b>" as UC8
usecase "<b>Điều chỉnh bảng giá dịch vụ</b>" as UC9
usecase "<b>Xem thống kê doanh thu</b>" as UC10

Accountant --> UC1
Accountant --> UC2
Accountant --> UC3
Accountant --> UC4
Accountant --> UC5
Accountant --> UC6
Accountant --> UC7
Accountant --> UC8
Accountant --> UC9
Accountant --> UC10
@enduml
```

---

## 2. PHÂN NHÓM HỒ SƠ ĐĂNG KÝ (REGISTRATION FLOWS)

### 2.1. `campaign_launcher_activity.puml` (Hoạt động chuẩn bị đợt đăng ký mới)
*Đường dẫn lưu:* `dormitory-frontend/diagrams/nhomhosodangky/campaign_launcher_activity.puml`

```puml
@startuml "Campaign Launcher Activity"
skinparam defaultFontSize 22
skinparam defaultFontName "Times New Roman"
|Quản lý tòa nhà|
start
:Kích hoạt chuẩn bị đợt mới;
|Hệ thống|
:Tính toán Dự báo cung (Room Forecast);
note right
   available_now = tổng số slot trống thực tế
   available_soon = số hợp đồng sắp hết hạn trong X ngày
   total_capacity = available_now + available_soon
end note
:Tính toán Dự báo cầu (Demand Forecast);
note right
   Lấy số lượng hồ sơ năm ngoái + tăng trưởng 10%
end note
:Hiển thị báo cáo đối chiếu Cung-Cầu;
|Quản lý tòa nhà|
:Kiểm tra và xác nhận số liệu;
:Chọn gửi email thông báo hết hạn hợp đồng;
|Hệ thống|
fork
  :Lọc hợp đồng năm cuối (Year 4);
  :Gửi email thông báo kết thúc thuê phòng & yêu cầu trả phòng;
fork again
  :Lọc hợp đồng khóa dưới (Year 1-3);
  :Gửi email nhắc nhở gia hạn hợp đồng mới;
end fork
|Quản lý tòa nhà|
:Thiết lập chỉ tiêu (Quotas) cho Tân SV / Khóa cũ;
:Kích hoạt "Mở đợt đăng ký mới";
stop
@enduml
```

---

### 2.2. `campaign_launcher_sequence.puml` (Tuần tự chuẩn bị đợt đăng ký mới)
*Đường dẫn lưu:* `dormitory-frontend/diagrams/nhomhosodangky/campaign_launcher_sequence.puml`

```puml
@startuml "Campaign Launcher Sequence"
skinparam defaultFontSize 22
skinparam defaultFontName "Times New Roman"
skinparam sequenceMessageSize 22

actor "Quản lý tòa nhà" as Admin
participant "Giao diện" as FE
participant "RegistrationController" as RegC
participant "RegistrationService" as RegS
participant "ContractService" as ConS
participant "EmailService" as MailS
database "CSDL" as DB

== 1. Dự báo Cung - Cầu ==
Admin -> FE: Xem trang chuẩn bị đợt mới
FE -> RegC: GET /api/registrations/room-forecast?days=30
RegC -> RegS: getRoomForecast(30)
RegS -> DB: Query tổng slot trống + HĐ sắp hết hạn
DB --> RegS: Kết quả
RegS --> FE: 200 OK (Room Forecast)

FE -> RegC: GET /api/registrations/demand-forecast
RegC -> RegS: getDemandForecast()
RegS -> DB: Query số lượng hồ sơ năm trước
DB --> RegS: Kết quả
RegS --> FE: 200 OK (Demand Forecast)

== 2. Gửi Email thông báo hết hạn ==
Admin -> FE: Xác nhận gửi email thông báo
FE -> ConS: POST /api/contracts/send-renewal-emails
ConS -> DB: Query thông tin hợp đồng sắp hết hạn + email học sinh
DB --> ConS: Dữ liệu
loop Từng hợp đồng sắp hết hạn
  alt Sinh viên Năm cuối (Year 4)
    ConS -> MailS: sendEmail(thông báo kết thúc thuê & trả phòng)
  else Sinh viên Khóa dưới (Year 1-3)
    ConS -> MailS: sendEmail(thông báo nhắc gia hạn)
  end
end
ConS --> FE: 200 OK (Đã gửi email thành công)
@enduml
```

---

### 2.3. `registration_review_activity.puml` (Hoạt động duyệt hồ sơ: Nhánh tự động duyệt theo lô)
*Đường dẫn lưu:* `dormitory-frontend/diagrams/nhomhosodangky/registration_review_activity.puml`

```puml
@startuml "Registration Review Activity"
skinparam defaultFontSize 22
skinparam defaultFontName "Times New Roman"
|Quản lý tòa nhà|
start
if (Chọn chế độ duyệt?) then (Thủ công từng hồ sơ)
  :Chọn hồ sơ cụ thể;
  if (Duyệt?) then (Duyệt)
    |Hệ thống|
    :Cập nhật trạng thái = Chấp nhận;
    :Tự động tạo tài khoản sinh viên (mật khẩu = CCCD);
    :Tạo hợp đồng trạng thái = Pending;
    :Gửi email thông báo kết quả;
  else (Từ chối)
    |Hệ thống|
    :Cập nhật trạng thái = Từ chối;
    :Gửi email thông báo lý do;
  endif
else (Duyệt tự động theo lô)
  |Quản lý tòa nhà|
  :Chọn Khoa/Ngành (hoặc Tất cả);
  :Kích hoạt Duyệt tự động (auto-allocate);
  |Hệ thống|
  :Lấy cấu hình chỉ tiêu tuyển sinh (Quotas) từ Settings;
  :Sắp xếp hồ sơ Chờ duyệt: Giỏ (1->2->3) + Điểm AI giảm dần;
  loop Từng hồ sơ trong danh sách
    if (Giỏ chỉ tiêu của sinh viên còn chỗ?) then (Còn)
      :Duyệt hồ sơ (status = Chấp nhận);
      :Tạo tài khoản sinh viên (pwd = CCCD);
      :Tạo hợp đồng Pending (Chờ gán phòng);
      :Trừ 1 slot chỉ tiêu trong giỏ;
    else (Đầy)
      :Bỏ qua hồ sơ này (Giữ trạng thái Chờ duyệt / Đánh dấu đầy);
    endif
  endloop
  :Hiển thị kết quả duyệt hàng loạt;
endif
|Quản lý tòa nhà|
stop
@enduml
```

---

### 2.4. `registration_review_sequence.puml` (Tuần tự duyệt tự động theo lô)
*Đường dẫn lưu:* `dormitory-frontend/diagrams/nhomhosodangky/registration_review_sequence.puml`

```puml
@startuml "Registration Review Sequence"
skinparam defaultFontSize 22
skinparam defaultFontName "Times New Roman"
skinparam sequenceMessageSize 22

actor "Quản lý tòa nhà" as Admin
participant "Giao diện" as FE
participant "RegistrationController" as RegC
participant "RegistrationService" as RegS
participant "UserService" as UserS
database "CSDL" as DB

Admin -> FE: Chọn Khoa + Ấn "Duyệt tự động theo chỉ tiêu"
FE -> RegC: POST /api/registrations/auto-allocate (body: {faculty})
RegC -> RegS: bulkApproveRegistrations({faculty, adminId})
RegS -> DB: SELECT settings (scoring_weights)
DB --> RegS: Quotas (Tân SV %, Khóa cũ %)
RegS -> DB: SELECT * FROM register_forms WHERE status = 'Chờ duyệt'
DB --> RegS: Danh sách hồ sơ
RegS -> RegS: Sắp xếp theo Basket (1->2->3) + Điểm AI (Giảm dần)
loop Từng hồ sơ (cho đến khi hết chỉ tiêu)
  RegS -> DB: UPDATE register_forms SET status = 'Chấp nhận'
  RegS -> UserS: Tìm hoặc tạo tài khoản Sinh viên
  UserS -> DB: INSERT users (nếu chưa có)
  RegS -> DB: INSERT student_contracts (status = 'Pending')
end
RegS --> RegC: Kết quả duyệt hàng loạt (số lượng thành công, danh sách duyệt)
RegC --> FE: 200 OK (Kết quả bulk approve)
FE --> Admin: Hiển thị danh sách sinh viên được duyệt
@enduml
```

---

### 2.5. `registration_scoring_vision_activity.puml` (Thuật toán tính điểm ưu tiên cộng dồn & Điểm xét tuyển)
*Đường dẫn lưu:* `dormitory-frontend/diagrams/nhomhosodangky/registration_scoring_vision_activity.puml`

```puml
@startuml "Registration Scoring Vision Activity"
skinparam defaultFontSize 22
skinparam defaultFontName "Times New Roman"
|Hệ thống|
start
:Nhận hồ sơ sinh viên;
:Lấy cấu hình điểm chi tiết (priority_detailed) từ Settings;
|Thuật toán tính điểm|
:Khởi tạo priority_score = 0;
:Duyệt qua chuỗi priority_reasons;
if (Chứa "Hộ nghèo"?) then (Có)
  :priority_score += 40;
endif
if (Chứa "Khuyết tật"?) then (Có)
  :priority_score += 30;
endif
if (Chứa "Con thương binh/liệt sỹ"?) then (Có)
  :priority_score += 45/50;
endif
if (Chứa "Vùng sâu/xa/hải đảo"?) then (Có)
  :priority_score += 20/25;
endif
:Giới hạn priority_score = Math.min(priority_score, 100);

:Tính Year Score (Năm 1 = 100, Năm 2 = 60, Năm 3 = 40, Năm 4 = 20);

if (Là sinh viên Năm 1 & GPA trống/bằng 0?) then (Đúng)
  :Đặt GPA Score = 50 (Chưa tích lũy học tập);
else (Không)
  if (GPA < 2.0?) then (Đúng)
    :Đánh dấu hồ sơ bị loại (isFiltered = true, Score = 0);
    :suggestion = "Không ưu tiên";
    goto SaveDB;
  else (Không)
    :GPA Score = GPA * 25 (Thang 100);
  endif
endif

:Xác định Nhóm giỏ (Basket 1: Chính sách, Basket 2: Tân SV, Basket 3: Khóa cũ);
:Lấy bộ trọng số tương ứng (W1_ưu tiên, W2_năm, W3_GPA);
:Tính điểm xét tuyển cuối cùng:
Score = Priority*W1 + Year*W2 + GPA*W3;
:Xác định đề xuất xét duyệt theo ngưỡng điểm của từng giỏ;

label SaveDB
|Hệ thống|
:Lưu điểm xét tuyển, đề xuất xét duyệt, chi tiết tính điểm vào DB;
:Chạy xác thực minh chứng (Vision API) nền;
stop
@enduml
```

---

## 3. PHÂN NHÓM HỢP ĐỒNG & PHÒNG Ở (CONTRACT & ASSIGNMENT FLOWS)

### 3.1. `room_assignment_activity.puml` (Hoạt động gán phòng tự động hàng loạt)
*Đường dẫn lưu:* `dormitory-frontend/diagrams/nhomphonghopdong/room_assignment_activity.puml`

```puml
@startuml "Room Assignment Activity"
skinparam defaultFontSize 22
skinparam defaultFontName "Times New Roman"
|Quản lý tòa nhà|
start
if (Chọn chế độ gán?) then (Gán thủ công từng bạn)
  :Chọn hợp đồng Pending;
  :Hệ thống gợi ý phòng trống trùng giới tính;
  :Chọn phòng từ danh sách;
  |Hệ thống|
  :Cập nhật Hợp đồng = Active, gán room_id;
  :Tăng occupancy của phòng lên 1;
else (Gán tự động hàng loạt)
  |Quản lý tòa nhà|
  :Chọn Khoa (hoặc Tất cả);
  :Kích hoạt Gán phòng tự động (auto-assign);
  |Hệ thống|
  :Lấy danh sách hợp đồng Pending (xếp thứ tự điểm AI giảm dần);
  :Lấy danh sách toàn bộ phòng Active còn chỗ trống;
  loop Từng hợp đồng Pending
    :Xác định Nhóm đối tượng (Lưu học sinh, Tân SV, Khóa cũ) + Giới tính;
    :Tìm phòng trống phù hợp giới tính;
    if (Tìm thấy phòng có reserved_for = đối tượng?) then (Có)
      :Chọn phòng này (Ưu tiên nhất);
    else (Không)
      if (Tìm thấy phòng general?) then (Có)
        :Chọn phòng general (Ưu tiên nhì);
      else (Không)
        :Bỏ qua (Giữ hợp đồng ở trạng thái Pending);
        continue;
      endif
    endif
    :Gán phòng cho Hợp đồng;
    :Cập nhật Hợp đồng = Active, cập nhật giá thuê;
    :Tăng occupancy phòng trong bộ nhớ tạm;
  endloop
  :Ghi nhận kết quả gán phòng hàng loạt;
endif
|Quản lý tòa nhà|
stop
@enduml
```

---

### 3.2. `room_assignment_sequence.puml` (Tuần tự gán phòng tự động hàng loạt)
*Đường dẫn lưu:* `dormitory-frontend/diagrams/nhomphonghopdong/room_assignment_sequence.puml`

```puml
@startuml "Room Assignment Sequence"
skinparam defaultFontSize 22
skinparam defaultFontName "Times New Roman"
skinparam sequenceMessageSize 22

actor "Quản lý tòa nhà" as Admin
participant "Giao diện" as FE
participant "ContractController" as ConC
participant "ContractService" as ConS
participant "RoomDAO" as RoomDAO
participant "StudentContractDAO" as ConDAO
database "CSDL" as DB

Admin -> FE: Chọn Khoa + Ấn "Gán phòng tự động"
FE -> ConC: POST /api/contracts/auto-assign (body: {faculty})
ConC -> ConS: autoAssignPendingRooms({faculty, adminId})
ConS -> RoomDAO: findAll({status: 'Active'})
RoomDAO -> DB: SELECT * FROM rooms WHERE status = 'Active'
DB --> RoomDAO: Danh sách phòng còn trống
ConS -> ConDAO: searchAndFilter({status: 'Pending'})
ConDAO -> DB: SELECT * FROM student_contracts WHERE status = 'Pending'
DB --> ConDAO: Danh sách hợp đồng chờ gán phòng
ConS -> ConS: Sắp xếp hợp đồng theo điểm AI
loop Từng hợp đồng Pending
  ConS -> ConS: Lọc phòng trống khớp Giới tính & Ưu tiên reserved_for
  alt Tìm thấy phòng phù hợp
    ConS -> ConDAO: assignRoom(contractId, roomId)
    ConDAO -> DB: UPDATE student_contracts (status = 'Active')
    ConS -> RoomDAO: Tăng occupancy phòng
    RoomDAO -> DB: UPDATE rooms SET current_occupancy = occupancy + 1
  end
end
ConS --> ConC: Kết quả (số lượng gán thành công, danh sách gán)
ConC --> FE: 200 OK (Kết quả gán tự động)
FE --> Admin: Hiển thị báo cáo gán phòng thành công
@enduml
```

---

### 3.3. `volunteer_role_assignment_activity.puml` (Hoạt động bổ nhiệm Sinh viên xung kích)
*Đường dẫn lưu:* `dormitory-frontend/diagrams/nhomphonghopdong/volunteer_role_assignment_activity.puml`

```puml
@startuml "Volunteer Role Assignment Activity"
skinparam defaultFontSize 22
skinparam defaultFontName "Times New Roman"
|Quản lý tòa nhà|
start
:Chọn hợp đồng của sinh viên xung kích (trong phòng xung kích);
:Chọn chức vụ bổ nhiệm (Trưởng ban xung kích tòa nhà / Thành viên);
|Hệ thống|
if (Chức vụ = Trưởng ban xung kích (truong_xung_kich)?) then (Có)
  :Tìm sinh viên đang là Trưởng ban xung kích cũ của Tòa nhà này;
  if (Có Trưởng ban cũ?) then (Có)
    :Hạ chức Trưởng ban cũ xuống thành thành viên xung kích thường (xung_kich);
    :Cập nhật ghi log hệ thống (DEMOTION);
  endif
  :Bổ nhiệm sinh viên mới làm Trưởng ban (truong_xung_kich);
else (Không)
  :Cập nhật chức vụ thành viên xung kích thường (xung_kich);
endif
:Cập nhật database student_contracts;
:Ghi log hệ thống (PROMOTION);
|Quản lý tòa nhà|
:Hoàn tất bổ nhiệm;
stop
@enduml
```

---

### 3.4. `volunteer_role_assignment_sequence.puml` (Tuần tự bổ nhiệm Sinh viên xung kích)
*Đường dẫn lưu:* `dormitory-frontend/diagrams/nhomphonghopdong/volunteer_role_assignment_sequence.puml`

```puml
@startuml "Volunteer Role Assignment Sequence"
skinparam defaultFontSize 22
skinparam defaultFontName "Times New Roman"
skinparam sequenceMessageSize 22

actor "Quản lý tòa nhà" as Admin
participant "Giao diện" as FE
participant "ContractController" as ConC
participant "ContractService" as ConS
participant "StudentContractDAO" as ConDAO
database "CSDL" as DB

Admin -> FE: Chọn SV + Chọn vai trò "Trưởng ban xung kích"
FE -> ConC: POST /api/contracts/{id}/set-volunteer-role (body: {volunteer_role: 'truong_xung_kich'})
ConC -> ConS: setVolunteerRole(contractId, 'truong_xung_kich', adminId)
ConS -> DB: Query thông tin phòng và tòa nhà của hợp đồng
DB --> ConS: Tòa nhà A, Phòng 101 (xung kích)
ConS -> ConDAO: Tìm Trưởng xung kích cũ của Tòa nhà A
ConDAO -> DB: Query Trưởng xung kích cũ
DB --> ConDAO: Contract ID của người cũ
opt Có Trưởng ban xung kích cũ
  ConS -> ConDAO: update(oldContractId, {volunteer_role: 'xung_kich'})
  ConDAO -> DB: UPDATE student_contracts
end
ConS -> ConDAO: update(contractId, {volunteer_role: 'truong_xung_kich'})
ConDAO -> DB: UPDATE student_contracts
ConS --> ConC: Kết quả cập nhật
ConC --> FE: 200 OK (Đã bổ nhiệm thành công)
FE --> Admin: Hiển thị thông báo bổ nhiệm thành công & cập nhật UI
@enduml
```

---

## 4. SƠ ĐỒ CẤU TRÚC VÀ DỮ LIỆU CẬP NHẬT (STRUCTURAL DIAGRAMS)

### 4.1. `erd.puml` (Sơ đồ thực thể liên kết cập nhật các trường mới)
*Đường dẫn lưu:* `dormitory-frontend/diagrams/sql/erd.puml`

```puml
@startuml "ERD - Dormitory System"
skinparam defaultFontSize 30
skinparam defaultFontName "Times New Roman"
skinparam linetype ortho
skinparam nodesep 55
skinparam ranksep 45
skinparam entity {
  BackgroundColor #FFFFFF
  BorderColor #000000
  FontColor #1F2937
  AttributeFontColor #0F172A
  HeaderBackgroundColor #C7D2EA
  HeaderFontColor #0A1020
}
hide circle
left to right direction

entity "<b>Users</b>" as users {
  🔑 id : VARCHAR
  --
  email : VARCHAR
  password : VARCHAR
  full_name : VARCHAR
  role : user_role (ADMIN, STUDENT, SUPER_ADMIN, STAFF)
  staff_title : VARCHAR (Quản trị viên, Quản lý tòa nhà, Kế toán...)
  phone : VARCHAR
  is_active : BOOLEAN
  conduct_score : INTEGER
}

entity "<b>Settings</b>" as settings {
  🔑 id : VARCHAR
  --
  category : VARCHAR
  name : VARCHAR
  value : JSONB (Chứa Quotas, Weights, Mappings...)
  # updated_by : VARCHAR
}

entity "<b>Register Forms</b>" as register_forms {
  🔑 id : VARCHAR
  --
  student_name : VARCHAR
  student_id : VARCHAR
  student_email : VARCHAR
  status : registration_status
  ai_score : INTEGER
  ai_suggestion : ai_suggestion_type
  ai_reasoning : JSONB (Chi tiết tính điểm)
  # reviewed_by : VARCHAR
}

entity "<b>Rooms</b>" as rooms {
  🔑 id : VARCHAR
  --
  room_number : VARCHAR
  building : VARCHAR
  floor : INTEGER
  capacity : INTEGER
  current_occupancy : INTEGER
  gender_type : gender_type
  rent_price : DECIMAL
  reserved_for : VARCHAR (xung_kich, international, freshmen, returning_students)
  status : room_status
}

entity "<b>Student Contracts</b>" as student_contracts {
  🔑 id : VARCHAR
  --
  # user_id : VARCHAR
  # room_id : VARCHAR
  # register_form_id : VARCHAR
  contract_number : VARCHAR
  status : contract_status
  volunteer_role : VARCHAR (truong_xung_kich, xung_kich)
  # created_by : VARCHAR
}

entity "<b>Invoices</b>" as invoices {
  🔑 id : VARCHAR
  --
  # room_id : VARCHAR
  invoice_number : VARCHAR
  billing_month : DATE
  total_amount : DECIMAL
  status : bill_status
  # created_by : VARCHAR
}

entity "<b>Notifications</b>" as notifications {
  🔑 id : VARCHAR
  --
  title : VARCHAR
  type : notification_type
  target_audience : target_audience
  # created_by : VARCHAR
}

entity "<b>Feedbacks</b>" as feedbacks {
  🔑 id : VARCHAR
  --
  # user_id : VARCHAR
  # room_id : VARCHAR
  category : feedback_category
  status : feedback_status
}

entity "<b>Assets</b>" as assets {
  🔑 id : VARCHAR
  --
  asset_code : VARCHAR
  name : VARCHAR
  category_name : VARCHAR
  # room_id : VARCHAR
  status : asset_status
}

entity "<b>Disciplinary Records</b>" as disciplinary_records {
  🔑 id : VARCHAR
  --
  # user_id : VARCHAR
  # room_id : VARCHAR
  # contract_id : VARCHAR
  violation_type : violation_type
  status : disciplinary_status
}

entity "<b>Log System</b>" as log_system {
  🔑 id : VARCHAR
  --
  # user_id : VARCHAR
  action : VARCHAR
  entity_type : VARCHAR
  entity_id : VARCHAR
}

users ||--o{ student_contracts
users ||--o{ notifications
users ||--o{ feedbacks
users ||--o{ assets
users ||--o{ disciplinary_records
users ||--o{ settings
users ||--o{ invoices
users ||--o{ log_system
users ||--o{ register_forms

rooms ||--o{ student_contracts
rooms ||--o{ invoices
rooms ||--o{ feedbacks
rooms ||--o{ assets

register_forms ||--o| student_contracts
student_contracts ||--o{ disciplinary_records
@enduml
```

---

### 4.2. `class_diagram.puml` (Sơ đồ lớp cấu trúc cập nhật)
*Đường dẫn lưu:* `dormitory-frontend/diagrams/sql/class_diagram.puml`

```puml
@startuml "Class Diagram - Dormitory System"
skinparam defaultFontSize 22
skinparam defaultFontName "Times New Roman"
skinparam classAttributeIconSize 0
skinparam linetype ortho
left to right direction

class "User" as User {
  id: VARCHAR
  email: VARCHAR
  full_name: VARCHAR
  role: user_role
  staff_title: VARCHAR
  phone: VARCHAR
  is_active: BOOLEAN
  conduct_score: INTEGER
  --
  +create()
  +update()
  +findById()
}

class "Room" as Room {
  id: VARCHAR
  room_number: VARCHAR
  building: VARCHAR
  floor: INTEGER
  capacity: INTEGER
  current_occupancy: INTEGER
  gender_type: gender_type
  reserved_for: VARCHAR
  status: room_status
  --
  +create()
  +update()
  +findById()
}

class "StudentContract" as StudentContract {
  id: VARCHAR
  user_id: VARCHAR
  room_id: VARCHAR
  register_form_id: VARCHAR
  contract_number: VARCHAR
  volunteer_role: VARCHAR
  status: contract_status
  --
  +create()
  +update()
  +assignRoom()
}

class "RegisterForm" as RegisterForm {
  id: VARCHAR
  student_name: VARCHAR
  student_id: VARCHAR
  status: registration_status
  ai_score: INTEGER
  ai_suggestion: ai_suggestion_type
  ai_reasoning: JSONB
  --
  +create()
  +updateStatus()
  +calculatePriorityScore()
}

class "Setting" as Setting {
  id: VARCHAR
  category: VARCHAR
  name: VARCHAR
  value: JSONB
  --
  +getScoringWeightsSettings()
}

User "1" -- "0..*" StudentContract : user_id
Room "1" -- "0..*" StudentContract : room_id
RegisterForm "1" -- "0..1" StudentContract : register_form_id
@enduml
```

---

## 5. KẾT LUẬN & HƯỚNG DẪN THỰC THI

Hệ thống biểu đồ này phản ánh cực kỳ chính xác các tính năng vận hành thực tế đã được lập trình sẵn trong mã nguồn. Việc này không những làm đẹp quyển báo cáo đồ án tốt nghiệp mà còn giúp trả lời xuất sắc các câu hỏi phản biện của hội đồng về tính thực tiễn của phần mềm (hệ thống vận hành thực tế chứ không chỉ là CRUD tĩnh).
