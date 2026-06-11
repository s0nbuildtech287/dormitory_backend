# Plan chỉnh role cho đồ án

## Mục tiêu

- Giữ hệ thống gọn, dễ giải thích khi bảo vệ.
- Không tách permission quá phức tạp.
- Vẫn giữ tài khoản `admin / 123` để test nhanh.
- Đổi mật khẩu seed của `admin` thành `Sondeptrai123@k`.
- Giữ `buixu4ns0n@gmail.com` là tài khoản tối cao nhất.

## Role đề xuất

- `SUPER_ADMIN`
  - Tài khoản tối cao.
  - Hiện tại là `buixu4ns0n@gmail.com`.
  - Có quyền tạo tài khoản và can thiệp toàn hệ thống.
- `STAFF`
  - Tài khoản cán bộ quản lý.
  - Có thể gắn thêm `staff_title` dạng text để mô tả chức danh.
  - Admin tự nhập chức danh cụ thể như:
    - Giám đốc trung tâm
    - Phó giám đốc trung tâm
    - Ban quản lý phòng
    - Ban tài chính
    - Ban kỷ luật
  - `staff_title` chỉ để phân loại và hiển thị, không tách permission phức tạp.
- `STUDENT`
  - Tài khoản sinh viên.
  - Chỉ truy cập phần sinh viên.

## Backend sẽ chỉnh

- `database/schema.sql`
  - Chuẩn hóa role.
  - Bổ sung trường `staff_title` dạng text nếu cần.
- `src/services/AuthService.js`
  - Validate role khi tạo tài khoản.
  - Cho phép `SUPER_ADMIN` tạo tài khoản mới.
- `src/controllers/AuthController.js`
  - Nhận thêm `role`.
  - Nhận thêm `staff_title` dạng text khi tạo `STAFF`.
- `src/dao/UserDAO.js`
  - Lưu `role`, `staff_title`.
- `src/middlewares/auth.js`
  - Giữ logic tách 3 nhóm chính:
    - `SUPER_ADMIN`
    - `STAFF`
    - `STUDENT`
- `scripts/fake-all-data.js`
  - Giữ tài khoản test `admin`.
  - Seed password `Sondeptrai123@k`.
- File seed user liên quan
  - `buixu4ns0n@gmail.com` => `SUPER_ADMIN`
  - `admin` => tài khoản test quản trị thường

## Frontend sẽ chỉnh

- Màn tạo tài khoản của admin
  - Thêm mục `Phân quyền`.
  - Nếu chọn `STAFF` thì hiện thêm ô nhập `Chức danh`.
- Nếu có trang danh sách tài khoản
  - Hiển thị thêm cột `role`.
  - Hiển thị thêm cột `staff_title` nếu có.

## Không làm

- Không tách role nhỏ theo từng ban.
- Không xây permission phức tạp.
- Không làm rối luồng test nhanh `admin`.

## Thông điệp để đưa vào báo cáo

- Hệ thống phân quyền theo 3 nhóm chính: `SUPER_ADMIN`, `STAFF`, `STUDENT`.
- `SUPER_ADMIN` là tài khoản quản trị cao nhất.
- `STAFF` là nhóm cán bộ quản lý, có thể gắn thêm chức danh nội bộ qua `staff_title` dạng text.
- `STUDENT` là tài khoản sinh viên.
- Cách này phản ánh đúng cơ cấu thực tế nhưng vẫn giữ hệ thống đơn giản, dễ bảo trì.
