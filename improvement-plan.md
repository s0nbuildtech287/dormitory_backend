# Improvement Plan - Dormitory System

## 1. Muc tieu

Muc tieu cua ke hoach nay la nang he thong tu muc "quan ly du lieu" len muc "ho tro van hanh ky tuc xa", nhung van uu tien giai phap it thay doi database, it anh huong den ERD va cac bieu do hien co.

Huong tiep can:

- Uu tien bo sung workflow, dashboard, rule nghiep vu, scheduler, notification.
- Uu tien tan dung bang `rooms`, `register_forms`, `student_contracts` dang co.
- Chi them thuoc tinh vao bang hien tai khi that su can thiet.
- Han che tao bang moi, trừ khi bat buoc cho mo rong lau dai.

## 2. Danh gia hien trang

He thong hien tai da co:

- CRUD phong.
- Ho so dang ky + cham diem + quota.
- Duyet ho so.
- Tao contract pending.
- Goi y phong va gan phong.
- Tra cuu hop dong sap het han.
- Quan ly hoa don, thong bao, feedback.

He thong hien tai con thieu:

- Co che chuan bi cho mot dot tan sinh vien moi.
- Du bao suc chua san sang trong tuong lai gan.
- Canh bao chu dong cho hop dong sap het han.
- Workflow gia han / khong gia han / tra phong.
- Phan bo phong theo loai phong / doi tuong / uu tien van hanh.
- Giam bot duyet thu cong.
- Quan ly toa theo nghiep vu thay vi chi la text trong `rooms.building`.

## 3. Nguyen tac cai thien

- Khong thay doi lon mo hinh du lieu neu chua can.
- Uu tien them API va man hinh tong hop truoc khi chuan hoa DB.
- Tach 2 muc tieu ro rang:
  - Muc tieu bao ve do an: tra loi duoc cau hoi cua thay.
  - Muc tieu ky thuat: de he thong co the mo rong sau nay.

## 4. Ke hoach tong the

### Giai doan 1 - Hoan thien nghiep vu van hanh co ban

Muc tieu:

- Chuyen he thong tu "chi quan ly" sang "co ho tro van hanh".
- Khong tao bang moi neu co the.

Cong viec:

1. Bo sung dashboard van hanh tong hop

- Tao API tong hop cho admin:
  - So cho trong hien tai.
  - So cho se trong trong 7/15/30 ngay toi.
  - So hop dong sap het han.
  - So contract pending chua gan phong.
  - So phong maintenance / inactive.
  - So ho so cho duyet theo nhom uu tien.

Loi ich:

- Tra loi duoc cau hoi "neu dot moi vao thi co du phong khong".

2. Bo sung canh bao hop dong sap het han

- Tan dung API hop dong sap het han dang co.
- Them scheduler chay hang ngay:
  - Nhac truoc 30 ngay.
  - Nhac truoc 15 ngay.
  - Nhac truoc 7 ngay.
- Gui notification cho admin.
- Neu co the thi gui notification cho sinh vien.

Loi ich:

- Tra loi duoc cau hoi "hop dong nam 4 sap het han thi he thong xu ly sao".

3. Bo sung danh sach "sap trong"

- Tao API danh sach phong sap trong dua tren:
  - Hop dong active sap het han.
  - Hop dong da thong bao khong gia han.
  - Phong dang maintenance thi khong tinh vao nguon cung san sang.

Loi ich:

- Giup du bao suc chua cho dot moi.

4. Chuyen luong duyet ho so sang "hang doi xu ly"

- Hien thi danh sach ho so theo:
  - Basket.
  - AI score.
  - Vision status.
  - Tinh trang day/du quota.
  - Kha nang phan bo.
- Khong bat admin xem tung ho so roi tu quyet dinh thu cong hoan toan.

Loi ich:

- Giam nhan xet "duyet tay 5000 ho so".

### Giai doan 2 - Nang cap nghiep vu phong, toa, doi tuong

Muc tieu:

- Mo rong logic phong ma khong can tao qua nhieu bang moi.

Cong viec:

1. Mo rong bang `rooms` bang cach them thuoc tinh

De xuat them cac cot sau:

- `room_type`: phong thuong, chat luong cao, uu tien, luu hoc sinh...
- `reserved_for`: freshmen, policy, international, normal...
- `is_operational`: phong co duoc dua vao dot hien tai hay khong.
- `available_from`: ngay phong co the dua vao su dung.
- `priority_order`: uu tien phan bo.

Co the bo sung them neu can:

- `building_zone`
- `building_gender_policy`

Loi ich:

- Giai quyet duoc cau hoi "phong loai nao", "phong cho sinh vien nuoc ngoai co khong".
- Khong can tao bang `buildings` ngay.

2. Tao module CRUD "toa" theo huong it doi DB

Huong thuc hien:

- Khong tao bang `buildings` trong giai doan nay.
- Quan ly toa dua tren tap gia tri `rooms.building`.
- Cac chuc nang:
  - Liet ke danh sach toa.
  - Tao toa moi bang cach tao namespace `building`.
  - Doi ten toa bang cap nhat hang loat `rooms.building`.
  - Danh dau toa tam ngung bang cap nhat `is_operational` cho phong thuoc toa do.

Loi ich:

- Co module nghiep vu cho toa.
- It anh huong den database va bieu do.

Luu y:

- Day la CRUD nghiep vu, khong phai chuan hoa du lieu muc cao.
- Neu mo rong sau nay moi tach bang `buildings`.

3. Nang cap logic goi y phong

Hien tai dang uu tien theo:

- Gioi tinh.
- Nam hoc.
- Khoa.

Can bo sung them:

- `room_type`.
- `reserved_for`.
- `is_operational`.
- `available_from`.
- Trang thai maintenance / inactive.

Loi ich:

- Goi y phong sat thuc te van hanh hon.

### Giai doan 3 - Cai thien logic uu tien va quota

Muc tieu:

- Tra loi duoc nhan xet "1 sinh vien co nhieu uu tien thi sao".

Cong viec:

1. Doi tu duy "1 ho so thuoc 1 nhom" thanh "1 ho so co nhieu thuoc tinh uu tien"

Khong can doi DB lon ngay, co the:

- Giữ `priority_reasons`.
- Sinh ra `priority_tags` o tang service.
- Xac dinh:
  - `primary_priority`
  - `secondary_priority_factors`

2. Dieu chinh rule xep hang

Thu tu de xuat:

- Kiem tra dieu kien toi thieu.
- Xac dinh nhom chinh.
- Tinh diem trong nhom.
- Neu bang diem thi dung yeu to phu de pha hoa.

3. Mo rong quota thanh quota cau hinh duoc

- Giu settings JSON hien tai.
- Co the bo sung:
  - quota theo doi tuong.
  - quota theo loai phong.
  - quota theo dot.

Loi ich:

- Giu duoc cach lam it doi DB.
- De giai thich voi thay la he thong co co che uu tien linh hoat hon.

### Giai doan 4 - Hoan thien workflow contract

Muc tieu:

- Hop dong khong chi dung de luu, ma phai ho tro van hanh.

Cong viec:

1. Bo sung workflow gia han

Khong can them bang moi ngay, co the bo sung thuoc tinh vao `student_contracts`:

- `renewal_status`
- `renewal_requested_at`
- `renewal_confirmed_at`
- `checkout_planned_at`

Trang thai nghiep vu de xuat:

- Active
- Renewal Pending
- Renewed
- Checkout Planned
- Expired
- Terminated

2. Tach ro 3 nhom contract cho van hanh

- Sap het han nhung chua phan hoi.
- Da xin gia han.
- Khong gia han, sap tra phong.

3. Tao man hinh xu ly theo lo

- Xu ly nhieu contract cung luc.
- Gui nhac hang loat.
- Danh dau gia han / khong gia han.

Loi ich:

- Chuyen xu ly contract tu thu cong sang ban quy trinh.

### Giai doan 5 - Cai thien UI/UX va thao tac duyet

Muc tieu:

- Giam nhan xet "UI/UX kho hieu", "duyet thu cong".

Cong viec:

1. Tach giao dien thanh cac buoc ro rang

- Ho so moi nop.
- Ho so hop le.
- Ho so can xem xet.
- Ho so duoc de xuat duyet.
- Ho so da tao contract pending.
- Ho so da gan phong.

2. Hien thi ly do he thong de xuat

- Tai sao ho so nam trong nhom nao.
- Tai sao duoc/khong duoc uu tien.
- Tai sao phong nay duoc goi y.

3. Bo sung bo loc thuc dung

- Theo khoa.
- Theo nam.
- Theo basket.
- Theo vision status.
- Theo kha nang phan bo.

4. Them thao tac hang loat

- Duyet hang loat.
- Tu choi hang loat.
- Danh dau can bo sung.
- Gui thong bao hang loat.

### Giai doan 6 - Bao cao va phan tich

Muc tieu:

- Co so lieu de bao ve va van hanh.

Cong viec:

1. Bao cao cong suat

- Tong cho.
- Cho dang su dung.
- Cho trong.
- Cho sap trong.
- Cho khong san sang.

2. Bao cao phan bo

- Theo toa.
- Theo gioi tinh.
- Theo khoa.
- Theo nam hoc.
- Theo doi tuong uu tien.

3. Bao cao dot tuyen

- So ho so nop.
- So ho so dat dieu kien.
- So ho so duoc duyet.
- So ho so da gan phong.
- So ho so chua co phong.

## 5. Phan ky thuat uu tien it doi DB

### Muc A - Lam ngay

- Dashboard van hanh tong hop.
- Scheduler canh bao hop dong sap het han.
- API phong sap trong.
- Nang cap danh sach duyet ho so.
- Bo loc theo khoa / nhom / kha nang phan bo.

### Muc B - Them it cot, khong tao bang moi

- Them cac cot van hanh vao `rooms`.
- Them cac cot workflow vao `student_contracts`.
- Nang cap rule goi y phong.

### Muc C - Lam sau neu con thoi gian

- CRUD toa theo nghiep vu.
- Batch assignment.
- Tinh diem uu tien chong lan tinh vi hon.
- Tach bang `buildings` neu can chuan hoa sau nay.

## 6. De xuat thay doi database toi thieu

Neu can chot pham vi "it tao DB", chi de xuat:

### Bang `rooms`

- `room_type`
- `reserved_for`
- `is_operational`
- `available_from`
- `priority_order`

### Bang `student_contracts`

- `renewal_status`
- `renewal_requested_at`
- `renewal_confirmed_at`
- `checkout_planned_at`

Khong bat buoc tao bang moi trong giai doan nay.

## 7. Cach tra loi thay

Co the trinh bay theo huong:

"He thong hien tai cua em da co phan quan ly ho so, phong, hop dong va hoa don. Tuy nhien em dong y la no moi nghieng ve quan ly du lieu, chua day du cho van hanh theo dot. Huong cai thien cua em la bo sung dashboard van hanh, du bao cho trong dua tren hop dong sap het han, canh bao gia han, mo rong thuoc tinh phong de phan bo theo loai phong va doi tuong, dong thoi giam duyet thu cong bang xep hang va goi y xu ly. De giam anh huong toi kien truc hien tai, em uu tien mo rong bang va workflow truoc, chua bat buoc tach them bang moi."

## 8. Roadmap de lam that

### Tuan 1

- Lam API dashboard van hanh.
- Lam API hop dong sap het han + danh sach phong sap trong.
- Lam scheduler thong bao admin.

### Tuan 2

- Them thuoc tinh van hanh vao `rooms`.
- Sua logic goi y phong.
- Them bo loc va danh sach xu ly ho so.

### Tuan 3

- Them workflow gia han contract.
- Them dashboard contract.
- Them thao tac hang loat.

### Tuan 4

- Chinh UI/UX.
- Them bao cao tong hop.
- Chuan bi slide/giai trinh theo logic van hanh.

## 9. Ket luan

Khong nhat thiet phai them nhieu bang moi de cai thien du an nay. Trong giai doan hien tai, cach hop ly nhat la:

- Bo sung workflow van hanh.
- Bo sung scheduler va canh bao.
- Mo rong thuoc tinh tren bang san co.
- Nang cap rule phan bo phong.
- Them dashboard va bao cao.

Neu sau nay can mo rong thanh he thong thuc te quy mo lon, khi do moi nen chuan hoa tiep bang `buildings`, `campaigns` hoac `floors`.
