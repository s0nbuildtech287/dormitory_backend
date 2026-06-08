# Room / Floor / Building UI Spec

## 1. Muc tieu

Tai lieu nay de xuat cach thiet ke lai cac modal `Them toa`, `Them tang`, `Them phong` sao cho:

- Hop ly voi nghiep vu.
- Bam duoc backend hien tai.
- It doi database.
- Tranh loi nhu field `equipment`.

Huong tiep can:

- Khong tach bang `buildings` trong giai doan nay.
- Van dung `rooms.building` la nguon du lieu cho toa.
- Tach ro 3 thao tac:
  - Tao 1 phong le.
  - Khoi tao nhieu phong cho 1 tang.
  - Khoi tao nhieu phong cho 1 toa.

## 2. Van de hien tai

### 2.1 Modal them phong

Van de:

- Chon tang xong sinh ma phong la chua du.
- Backend can nhieu truong bat buoc hon.
- Frontend dang gui field `equipment`, trong khi bang `rooms` khong co cot nay.

Ket luan:

- Modal `Them phong` phai la modal tao 1 phong day du.

### 2.2 Modal them tang

Van de:

- Neu chi co input ten tang hoac so tang ma khong co `so phong trong tang` thi nghiep vu khong ro.

Ket luan:

- `Them tang` thuc chat nen la `Khoi tao phong cho tang`.

### 2.3 Modal them toa

Van de:

- Neu chi nhap ten toa ma khong co so tang, so phong moi tang thi chua giai quyet duoc nhu cau van hanh.

Ket luan:

- `Them toa` nen la `Khoi tao toa va sinh phong mau`.

## 3. Phan tach nghiep vu de xuat

### 3.1 Chuc nang 1 - Tao phong le

Muc dich:

- Dung khi can them 1 phong moi vao toa/tang da co.

Ten modal:

- `Them phong`

Input bat buoc:

- `building`
- `floor`
- `room_number`
- `capacity`
- `gender_type`
- `rent_price`

Input tuy chon:

- `garbage_fee`
- `internet_fee`
- `parking_fee`
- `area`
- `status`
- `maintenance_reason`
- `qr_code`
- `last_inspection_date`

Khong hien thi:

- `current_occupancy`
- `equipment`

Ly do:

- `current_occupancy` phai do he thong quan ly.
- `equipment` da tach sang module tai san.

### 3.2 Chuc nang 2 - Khoi tao phong cho 1 tang

Muc dich:

- Dung khi can tao nhanh nhieu phong cho cung 1 tang.

Ten modal:

- `Khoi tao tang`

Input bat buoc:

- `building`
- `floor`
- `rooms_count`
- `room_number_prefix` hoac `room_start_number`
- `capacity`
- `gender_type`
- `rent_price`

Input tuy chon:

- `garbage_fee`
- `internet_fee`
- `parking_fee`
- `area`
- `status`

Ket qua:

- Frontend tao preview danh sach phong se sinh ra.
- Admin bam xac nhan.
- Frontend goi nhieu request `POST /rooms` hoac sau nay co the dung batch API.

### 3.3 Chuc nang 3 - Khoi tao toa

Muc dich:

- Dung khi truong mo them 1 toa moi.

Ten modal:

- `Khoi tao toa`

Input bat buoc:

- `building`
- `floors_count`
- `rooms_per_floor`
- `room_number_pattern`
- `capacity`
- `gender_type`
- `rent_price`

Input tuy chon:

- `garbage_fee`
- `internet_fee`
- `parking_fee`
- `area`
- `status`
- `odd_even_gender_rule` neu muon mo rong sau

Ket qua:

- Sinh preview toan bo phong.
- Admin xem tong so phong sap tao.
- Bam xac nhan de tao hang loat.

## 4. UI flow de xuat

### 4.1 Man hinh chinh quan ly phong

Nut action de xuat:

- `Them phong`
- `Khoi tao tang`
- `Khoi tao toa`

Khong nen dung:

- 1 modal chung gom het 3 nghiep vu.

Ly do:

- Se gay roi.
- Admin khong ro minh dang tao 1 phong hay sinh nhieu phong.

### 4.2 Flow modal `Them phong`

Buoc 1:

- Chon `building`
- Chon `floor`

Buoc 2:

- Nhap `room_number`
- Nhap `capacity`
- Chon `gender_type`

Buoc 3:

- Nhap gia va phi
- Nhap thong tin phu neu can

Buoc 4:

- Preview ma phong
- Bam `Tao phong`

### 4.3 Flow modal `Khoi tao tang`

Buoc 1:

- Chon `building`
- Nhap `floor`

Buoc 2:

- Nhap `rooms_count`
- Nhap `room_start_number` hoac pattern

Buoc 3:

- Nhap thong so mac dinh cho toan bo phong trong tang

Buoc 4:

- Xem preview danh sach phong

Buoc 5:

- Bam `Khoi tao tang`

### 4.4 Flow modal `Khoi tao toa`

Buoc 1:

- Nhap `building`

Buoc 2:

- Nhap `floors_count`
- Nhap `rooms_per_floor`
- Chon pattern danh so phong

Buoc 3:

- Nhap thong so mac dinh cho toan bo phong

Buoc 4:

- Preview:
  - Tong so tang
  - Tong so phong
  - Mau ma phong

Buoc 5:

- Bam `Khoi tao toa`

## 5. Payload de xuat cho frontend

### 5.1 Payload `Them phong`

Endpoint dung backend hien tai:

- `POST /api/rooms`

Payload:

```json
{
  "room_number": "A101",
  "building": "A",
  "floor": 1,
  "capacity": 4,
  "gender_type": "Nam",
  "rent_price": 500000,
  "garbage_fee": 20000,
  "internet_fee": 50000,
  "parking_fee": 30000,
  "area": 25,
  "status": "Active"
}
```

Khong gui:

```json
{
  "equipment": [],
  "current_occupancy": 0
}
```

### 5.2 Payload `Khoi tao tang`

Day la payload cho frontend tu xu ly, chua bat buoc backend phai co endpoint rieng:

```json
{
  "building": "A",
  "floor": 3,
  "rooms_count": 10,
  "room_start_number": 301,
  "capacity": 4,
  "gender_type": "Nam",
  "rent_price": 500000,
  "garbage_fee": 20000,
  "internet_fee": 50000,
  "parking_fee": 30000,
  "area": 25,
  "status": "Active"
}
```

Frontend se convert thanh nhieu payload `POST /api/rooms`, vi du:

```json
[
  {
    "room_number": "A301",
    "building": "A",
    "floor": 3,
    "capacity": 4,
    "gender_type": "Nam",
    "rent_price": 500000,
    "garbage_fee": 20000,
    "internet_fee": 50000,
    "parking_fee": 30000,
    "area": 25,
    "status": "Active"
  },
  {
    "room_number": "A302",
    "building": "A",
    "floor": 3,
    "capacity": 4,
    "gender_type": "Nam",
    "rent_price": 500000,
    "garbage_fee": 20000,
    "internet_fee": 50000,
    "parking_fee": 30000,
    "area": 25,
    "status": "Active"
  }
]
```

### 5.3 Payload `Khoi tao toa`

Payload muc frontend:

```json
{
  "building": "E",
  "floors_count": 5,
  "rooms_per_floor": 8,
  "room_number_pattern": "{building}{floor}{index}",
  "capacity": 4,
  "gender_type": "Nu",
  "rent_price": 550000,
  "garbage_fee": 20000,
  "internet_fee": 50000,
  "parking_fee": 30000,
  "area": 25,
  "status": "Active"
}
```

Frontend preview xong se sinh danh sach phong va goi tung `POST /api/rooms`.

## 6. Validation de xuat tren frontend

### 6.1 Cho `Them phong`

- `building` khong duoc rong.
- `floor` phai > 0.
- `room_number` khong duoc rong.
- `capacity` phai > 0.
- `rent_price` phai >= 0.
- `gender_type` phai thuoc `Nam` hoac `Nu`.

### 6.2 Cho `Khoi tao tang`

- `rooms_count` phai > 0.
- `room_start_number` hop le.
- Preview khong duoc trung `room_number` da ton tai.

### 6.3 Cho `Khoi tao toa`

- `floors_count` phai > 0.
- `rooms_per_floor` phai > 0.
- Preview khong duoc sinh ra `room_number` trung.

## 7. Logic preview ma phong

De xuat cach sinh ma phong don gian:

- Tang 1, phong 1 cua toa A => `A101`
- Tang 1, phong 2 cua toa A => `A102`
- Tang 2, phong 1 cua toa A => `A201`

Cong thuc:

- `room_number = building + floor + room_index_2_digits`

Vi du:

- `A101`
- `A102`
- `A305`
- `E801`

Neu truong can format khac thi doi bang `room_number_pattern`.

## 8. De xuat backend toi thieu

Backend hien tai da du de tao phong le neu payload dung schema.

Can lam toi thieu:

- Giu viec sanitize field trong tao/sua phong.
- Khong cho frontend gui `equipment`.
- Co the bo sung endpoint check trung ma phong neu can.

Khong bat buoc lam ngay:

- Batch create rooms.
- Bang `buildings`.
- Bang `floors`.

## 9. UX copy de xuat

### 9.1 Modal `Them phong`

Title:

- `Them phong moi`

Description:

- `Tao mot phong moi trong toa va tang da co.`

### 9.2 Modal `Khoi tao tang`

Title:

- `Khoi tao phong cho tang`

Description:

- `Sinh nhanh nhieu phong cho mot tang theo cau hinh chung.`

### 9.3 Modal `Khoi tao toa`

Title:

- `Khoi tao toa moi`

Description:

- `Sinh toan bo phong cho toa moi dua tren so tang va so phong moi tang.`

## 10. Uu tien trien khai

### Muc 1 - Lam ngay

- Sua modal `Them phong` cho dung payload backend.
- Bo field `equipment`.
- Hien validate ro rang.

### Muc 2 - Lam tiep

- Them modal `Khoi tao tang`.
- Tao preview danh sach phong truoc khi submit.

### Muc 3 - Lam sau

- Them modal `Khoi tao toa`.
- Neu can thi them API batch create.

## 11. Ket luan

Voi du an hien tai, cach hop ly nhat la:

- `Them phong` = tao 1 phong le day du.
- `Them tang` = khoi tao nhieu phong cho 1 tang.
- `Them toa` = khoi tao nhieu phong cho 1 toa.

Khong nen gom 3 nghiep vu nay vao mot modal, vi se dan den UI roi, payload sai va trai voi logic backend hien co.
