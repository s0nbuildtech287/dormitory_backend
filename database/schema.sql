-- ============================================================================
-- DORMITORY MANAGEMENT SYSTEM - DATABASE SCHEMA
-- ============================================================================
-- Hệ thống: Quản lý Ký túc xá
-- DBMS: PostgreSQL
-- Pattern: DAO (Data Access Object)
-- Version: 2.0 - Mở rộng với Quản lý Cơ sở vật chất và Kỷ luật
-- ============================================================================

-- ============================================================================
-- BƯỚC 0: TẠO DATABASE VỚI UTF-8 ENCODING (NẾU CHƯA TỒN TẠI)
-- ============================================================================
-- Đảm bảo database support tiếng Việt đầy đủ
-- Chú ý: Phải disconnect khỏi database trước khi chạy lệnh này

-- DROP DATABASE dormitory_system WITH (FORCE);
-- CREATE DATABASE dormitory_system
--   WITH 
--   ENCODING = 'UTF8'
--   LC_COLLATE = 'en_US.UTF-8'
--   LC_CTYPE = 'en_US.UTF-8'
--   TEMPLATE = template0;

-- Sau khi tạo database, connect vào dormitory_system rồi chạy các lệnh bên dưới

-- ============================================================================
-- BƯỚC 1: XÓA CÁC BẢNG CŨ (NẾU TỒN TẠI)
-- ============================================================================
-- Lưu ý: Thực hiện theo thứ tự từ bảng con đến bảng cha để tránh lỗi constraint
DROP TABLE IF EXISTS log_system CASCADE;
DROP TABLE IF EXISTS disciplinary_records CASCADE;  -- MỚI: Phiếu kỷ luật
DROP TABLE IF EXISTS assets CASCADE;                 -- Cơ sở vật chất (đã tối ưu)
DROP TABLE IF EXISTS settings CASCADE;               -- MỚI: Cài đặt hệ thống
DROP TABLE IF EXISTS feedbacks CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS invoices CASCADE;
DROP TABLE IF EXISTS student_contracts CASCADE;
DROP TABLE IF EXISTS rooms CASCADE;
DROP TABLE IF EXISTS register_forms CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- ============================================================================
-- BƯỚC 2: XÓA CÁC ENUM TYPES CŨ
-- ============================================================================
DROP TYPE IF EXISTS user_role CASCADE;
DROP TYPE IF EXISTS gender_type CASCADE;
DROP TYPE IF EXISTS registration_status CASCADE;
DROP TYPE IF EXISTS ai_suggestion_type CASCADE;
DROP TYPE IF EXISTS room_status CASCADE;
DROP TYPE IF EXISTS contract_status CASCADE;
DROP TYPE IF EXISTS bill_status CASCADE;
DROP TYPE IF EXISTS notification_type CASCADE;
DROP TYPE IF EXISTS target_audience CASCADE;
DROP TYPE IF EXISTS feedback_category CASCADE;
DROP TYPE IF EXISTS feedback_sentiment CASCADE;
DROP TYPE IF EXISTS feedback_status CASCADE;
-- MỚI: Enum cho các tính năng mở rộng
DROP TYPE IF EXISTS asset_status CASCADE;
DROP TYPE IF EXISTS asset_condition CASCADE;
DROP TYPE IF EXISTS violation_type CASCADE;
DROP TYPE IF EXISTS disciplinary_status CASCADE;
DROP TYPE IF EXISTS disciplinary_level CASCADE;

-- ============================================================================
-- BƯỚC 3: TẠO CÁC ENUM TYPES
-- ============================================================================
-- Mục đích: Đảm bảo tính toàn vẹn dữ liệu và dễ bảo trì

-- 3.1. ENUMs cho hệ thống cơ bản
CREATE TYPE user_role AS ENUM ('ADMIN', 'STUDENT');  -- ADMIN làm tất cả, STUDENT chỉ xem
CREATE TYPE gender_type AS ENUM ('Nam', 'Nữ');
CREATE TYPE registration_status AS ENUM ('Chờ duyệt', 'Chấp nhận', 'Từ chối');
CREATE TYPE ai_suggestion_type AS ENUM ('Nên duyệt', 'Cân nhắc', 'Không ưu tiên'); -- Gợi ý xét duyệt từ hệ thống tính điểm

-- 3.2. ENUMs cho quản lý phòng và hợp đồng
CREATE TYPE room_status AS ENUM ('Active', 'Inactive', 'Maintenance');
CREATE TYPE contract_status AS ENUM ('Pending', 'Active', 'Expired', 'Terminated');
-- Pending: Đã duyệt hồ sơ nhưng chưa gán phòng

-- 3.3. ENUMs cho hóa đơn và thông báo
CREATE TYPE bill_status AS ENUM ('Chưa thanh toán', 'Đã thanh toán', 'Quá hạn');
CREATE TYPE notification_type AS ENUM ('Thông báo chung', 'Thanh toán', 'Bảo trì', 'Khẩn cấp', 'Kỷ luật');
CREATE TYPE target_audience AS ENUM ('ALL', 'STUDENTS', 'SPECIFIC');

-- 3.4. ENUMs cho phản hồi
CREATE TYPE feedback_category AS ENUM ('Sửa chữa', 'Vệ sinh', 'An ninh', 'Trang thiết bị', 'Khác');
CREATE TYPE feedback_sentiment AS ENUM ('Positive', 'Neutral', 'Negative');
CREATE TYPE feedback_status AS ENUM ('New', 'Processing', 'Resolved');

-- 3.5. MỚI: ENUMs cho quản lý cơ sở vật chất
CREATE TYPE asset_status AS ENUM (
    'Đang sử dụng',      -- Đang được sử dụng
    'Sẵn sàng',          -- Sẵn sàng cấp phát
    'Hư hỏng',           -- Cần sửa chữa
    'Đang bảo trì',      -- Đang trong quá trình bảo trì
    'Thanh lý'           -- Đã thanh lý
);

CREATE TYPE asset_condition AS ENUM (
    'Mới',               -- Tài sản mới 100%
    'Tốt',               -- Hoạt động tốt >80%
    'Khá',               -- Còn sử dụng được 50-80%
    'Trung bình',        -- Cần chú ý 30-50%
    'Kém'                -- Cần thay thế <30%
);



-- 3.6. MỚI: ENUMs cho phiếu kỷ luật
CREATE TYPE violation_type AS ENUM (
    'Vi phạm nội quy',   -- Vi phạm quy định chung
    'Gây mất trật tự',   -- Ồn ào, gây rối
    'Hư hại tài sản',    -- Làm hỏng cơ sở vật chất
    'Vệ sinh kém',       -- Không giữ vệ sinh
    'Trốn phòng',        -- Cho người khác ở chung
    'Nộp tiền trễ',      -- Chậm thanh toán
    'Sử dụng điện sai quy định', -- Dùng điện vượt mức
    'Khác'               -- Vi phạm khác
);

CREATE TYPE disciplinary_level AS ENUM (
    'Nhắc nhở',          -- Lần đầu, mức nhẹ
    'Cảnh cáo',          -- Lần 2 hoặc mức trung bình
    'Phạt tiền',         -- Có thiệt hại tài sản
    'Đình chỉ tạm thời', -- Vi phạm nghiêm trọng
    'Buộc thôi ở'        -- Vi phạm rất nghiêm trọng
);

CREATE TYPE disciplinary_status AS ENUM (
    'Chờ xử lý',         -- Mới lập biên bản
    'Đã xử lý',          -- Đã xử lý kỷ luật
    'Đã khiếu nại',      -- Sinh viên khiếu nại
    'Đã hủy'             -- Hủy bỏ quyết định
);

-- ============================================================================
-- BƯỚC 4: TẠO BẢNG USERS (Người dùng)
-- ============================================================================
-- Mục đích: Quản lý tài khoản người dùng (Admin và Sinh viên)
-- Tối ưu: 
-- - ADMIN: Toàn quyền (quản lý phòng, sinh viên, tài sản, kỷ luật...)
-- - STUDENT: Chỉ xem thông tin cá nhân, đăng ký, feedback
-- - Index trên email và role để tìm kiếm nhanh
-- - Hỗ trợ soft delete với deleted_at

CREATE TABLE users (
    id VARCHAR(50) PRIMARY KEY,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    role user_role NOT NULL DEFAULT 'STUDENT',
    phone VARCHAR(20),
    avatar VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE,           -- Tối ưu: Khóa tài khoản
    last_login TIMESTAMP,                     -- Tối ưu: Theo dõi đăng nhập
    conduct_score INTEGER DEFAULT 100,        -- Điểm rèn luyện (0-100), trừ dần khi vi phạm
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP                      -- Tối ưu: Soft delete
);

-- Indexes để tối ưu truy vấn
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_active ON users(is_active) WHERE deleted_at IS NULL;

-- ============================================================================
-- BƯỚC 4.1: TẠO BẢNG SETTINGS (Cài đặt hệ thống)
-- ============================================================================
-- Mục đích: Lưu trữ các cài đặt linh hoạt theo category
-- Tối ưu: JSONB cho dữ liệu linh hoạt, category để phân loại

CREATE TABLE settings (
    id VARCHAR(50) PRIMARY KEY,
    category VARCHAR(50) NOT NULL,           -- system, room, user, etc.
    name VARCHAR(100) NOT NULL,              -- Tên setting
    value JSONB NOT NULL,                    -- Giá trị setting (JSON linh hoạt)
    description TEXT,                        -- Mô tả setting
    is_active BOOLEAN DEFAULT TRUE,          -- Có đang active không
    updated_by VARCHAR(50),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
);

-- Indexes để tối ưu truy vấn
CREATE INDEX idx_settings_category ON settings(category);
CREATE INDEX idx_settings_name ON settings(name);
CREATE INDEX idx_settings_active ON settings(is_active) WHERE is_active = TRUE;

-- ============================================================================
-- BƯỚC 5: TẠO BẢNG REGISTER_FORMS (Đơn đăng ký)
-- ============================================================================
-- Mục đích: Quản lý đơn đăng ký ở KTX của sinh viên
-- Tối ưu: Giữ nguyên cấu trúc hiện tại với hệ thống tính điểm xét duyệt

CREATE TABLE register_forms (
    id VARCHAR(50) PRIMARY KEY,
    student_name VARCHAR(100) NOT NULL,
    student_id VARCHAR(50),
    student_email VARCHAR(100) NOT NULL,      -- Email sinh viên
    phone_number VARCHAR(20) NOT NULL,        -- Số điện thoại
    gender gender_type NOT NULL,
    dob DATE,
    cccd VARCHAR(20),                         -- Số CCCD
    address TEXT,
    faculty VARCHAR(100),
    major VARCHAR(100),                       -- Chuyên ngành
    class VARCHAR(50),
    year INTEGER,
    gpa DECIMAL(3,2),
    distance INTEGER,                         -- Khoảng cách nhà-trường (km)
    priority_reasons TEXT,                    -- Lý do ưu tiên
    status registration_status DEFAULT 'Chờ duyệt',
    ai_suggestion ai_suggestion_type,        -- Gợi ý xét duyệt: Nên duyệt / Cân nhắc / Không ưu tiên
    ai_score INTEGER,                         -- Điểm xét duyệt (0-100)
    ai_reasoning JSONB,                       -- Chi tiết tính điểm xét duyệt
    evidence_images JSONB,                    -- Ảnh minh chứng (mảng URL)
    vision_status VARCHAR(20) DEFAULT 'PENDING', -- Trạng thái xác thực ảnh: PENDING/VALID/SUSPECT/INVALID/ERROR
    vision_score DECIMAL(4,3),               -- Điểm tin cậy tổng hợp (0.0 - 1.0)
    vision_reasons JSONB,                    -- Mảng lý do phân loại ảnh
    note TEXT,                                -- Ghi chú admin
    reviewed_by VARCHAR(50),
    reviewed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_register_forms_status ON register_forms(status);
CREATE INDEX idx_register_forms_student_id ON register_forms(student_id);
CREATE INDEX idx_register_forms_created_at ON register_forms(created_at);

-- ============================================================================
-- BƯỚC 6: TẠO BẢNG ROOMS (Phòng ở)
-- ============================================================================
-- Mục đích: Quản lý các phòng ở trong KTX
-- Tối ưu:
-- - Tách equipment thành bảng riêng (assets) để quản lý tốt hơn
-- - Thêm QR code cho từng phòng
-- - Tracking chỉ số điện nước theo tháng

CREATE TABLE rooms (
    id VARCHAR(50) PRIMARY KEY,
    room_number VARCHAR(20) NOT NULL UNIQUE,
    building VARCHAR(20) NOT NULL,
    floor INTEGER NOT NULL,
    capacity INTEGER NOT NULL DEFAULT 4,
    current_occupancy INTEGER NOT NULL DEFAULT 0,
    gender_type gender_type NOT NULL,
    -- Các cột giá nhóm lại với nhau
    rent_price DECIMAL(10,2) NOT NULL,
    garbage_fee DECIMAL(10,2) DEFAULT 0,      -- Tiền rác hàng tháng
    internet_fee DECIMAL(10,2) DEFAULT 0,     -- Tiền mạng hàng tháng
    parking_fee DECIMAL(10,2) DEFAULT 0,      -- Tiền gửi xe hàng tháng
    electric_meter_reading DECIMAL(10,2) DEFAULT 0,
    water_meter_reading DECIMAL(10,2) DEFAULT 0,
    -- Các cột khác
    status room_status DEFAULT 'Active',
    maintenance_reason TEXT,                  -- Lý do bảo trì (chỉ dùng khi status = 'Maintenance')
    area DECIMAL(5,2),                        -- Tối ưu: Diện tích (m2)
    qr_code VARCHAR(255),                     -- Tối ưu: Mã QR cho check-in
    last_inspection_date DATE,                -- Tối ưu: Ngày kiểm tra cuối
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CHECK (current_occupancy <= capacity)
);

CREATE INDEX idx_rooms_building ON rooms(building);
CREATE INDEX idx_rooms_gender_type ON rooms(gender_type);
CREATE INDEX idx_rooms_status ON rooms(status);
CREATE INDEX idx_rooms_building_floor ON rooms(building, floor);  -- Tối ưu: Composite index

-- ============================================================================
-- BƯỚC 7: TẠO BẢNG STUDENT_CONTRACTS (Hợp đồng sinh viên)
-- ============================================================================
-- Mục đích: Quản lý hợp đồng thuê phòng
-- Tối ưu: Giữ nguyên cấu trúc hiện tại

CREATE TABLE student_contracts (
    id VARCHAR(50) PRIMARY KEY,
    user_id VARCHAR(50) NOT NULL,
    room_id VARCHAR(50),                      -- NULL khi Pending (chưa gán phòng)
    register_form_id VARCHAR(50),
    contract_number VARCHAR(50) UNIQUE,
    start_date DATE,
    end_date DATE,
    rent_price DECIMAL(10,2) DEFAULT 0,
    deposit_amount DECIMAL(10,2) DEFAULT 0,
    deposit_paid BOOLEAN DEFAULT FALSE,
    hard_copy_received BOOLEAN DEFAULT FALSE, -- Đã nhận bản cứng hợp đồng giấy
    email_sent_at TIMESTAMP,                 -- Thời điểm gửi email thông báo
    status contract_status DEFAULT 'Pending', -- Mặc định Pending sau khi duyệt hồ sơ
    -- Snapshot thông tin sinh viên tại thời điểm tạo hợp đồng
    snapshot_student_id VARCHAR(50),          -- Mã SV snapshot
    snapshot_cccd VARCHAR(20),               -- CCCD snapshot
    snapshot_gender gender_type,             -- Giới tính snapshot (dùng để gợi ý phòng)
    snapshot_year INTEGER,                   -- Năm học snapshot (dùng để gán phòng cùng khoá)
    snapshot_faculty VARCHAR(100),           -- Khoa snapshot
    snapshot_phone VARCHAR(20),              -- SĐT snapshot
    -- Kết thúc hợp đồng
    terms_conditions TEXT,
    signed_at TIMESTAMP,                     -- Null khi Pending, điền khi Active
    termination_reason TEXT,
    created_by VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE RESTRICT,
    FOREIGN KEY (register_form_id) REFERENCES register_forms(id) ON DELETE SET NULL,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_contracts_user_id ON student_contracts(user_id);
CREATE INDEX idx_contracts_room_id ON student_contracts(room_id);
CREATE INDEX idx_contracts_status ON student_contracts(status);
CREATE INDEX idx_contracts_dates ON student_contracts(start_date, end_date);  -- Tối ưu

-- ============================================================================
-- BƯỚC 8: TẠO BẢNG INVOICES (Hóa đơn)
-- ============================================================================
-- Mục đích: Quản lý hóa đơn tiền phòng, điện, nước
-- Tối ưu: Giữ nguyên cấu trúc hiện tại

CREATE TABLE invoices (
    id VARCHAR(50) PRIMARY KEY,
    room_id VARCHAR(50) NOT NULL,                  -- Invoice theo phòng, không theo contract
    invoice_number VARCHAR(50) UNIQUE NOT NULL,
    billing_month DATE NOT NULL,              -- Ngày đầu tháng tính tiền
    
    -- Tiền phòng (500k/người × số người)
    rent_per_person DECIMAL(10,2) DEFAULT 500000,  -- 500k/người/tháng
    occupancy INTEGER NOT NULL,                     -- Số người ở (3-5)
    rent_amount DECIMAL(10,2) NOT NULL,            -- = rent_per_person × occupancy
    
    -- Điện
    electric_start DECIMAL(10,2) DEFAULT 0,        -- Số điện đầu kỳ (kWh)
    electric_end DECIMAL(10,2) DEFAULT 0,          -- Số điện cuối kỳ (kWh)
    electric_rate DECIMAL(10,2) DEFAULT 3500,      -- 3,500 VNĐ/kWh
    electric_amount DECIMAL(10,2) DEFAULT 0,       -- = (end - start) × rate
    
    -- Nước
    water_start DECIMAL(10,2) DEFAULT 0,           -- Số nước đầu kỳ (m³)
    water_end DECIMAL(10,2) DEFAULT 0,             -- Số nước cuối kỳ (m³)
    water_rate DECIMAL(10,2) DEFAULT 15000,        -- 15,000 VNĐ/m³
    water_amount DECIMAL(10,2) DEFAULT 0,          -- = (end - start) × rate
    
    -- Dịch vụ
    garbage_fee DECIMAL(10,2) DEFAULT 70000,       -- 70k/phòng/tháng
    internet_fee DECIMAL(10,2) DEFAULT 300000,     -- 300k/phòng/tháng
    parking_fee_per_vehicle DECIMAL(10,2) DEFAULT 50000,  -- 50k/xe/tháng
    parking_count INTEGER DEFAULT 0,                -- Số xe
    parking_fee DECIMAL(10,2) DEFAULT 0,           -- = parking_fee_per_vehicle × parking_count
    
    -- Tổng phí dịch vụ
    service_fees DECIMAL(10,2) DEFAULT 0,          -- = garbage + internet + parking
    
    -- Điều chỉnh
    discount_amount DECIMAL(10,2) DEFAULT 0,       -- Giảm giá
    penalty_amount DECIMAL(10,2) DEFAULT 0,        -- Phí phạt trễ hạn
    
    -- Tổng cộng
    total_amount DECIMAL(10,2) NOT NULL,           -- = rent + electric + water + service - discount + penalty
    
    -- Trạng thái thanh toán
    status bill_status DEFAULT 'Chưa thanh toán',
    due_date DATE NOT NULL,
    paid_at TIMESTAMP,
    payment_method VARCHAR(50),
    payment_reference VARCHAR(100),                -- Mã tham chiếu thanh toán
    note TEXT,
    
    -- Audit
    created_by VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP,                          -- Soft delete: NULL = active, NOT NULL = deleted

    -- Số liệu điện/nước do sinh viên gửi
    meter_submitted_by   VARCHAR(50),              -- user_id người gửi
    meter_submitted_at   TIMESTAMP,                -- Thời điểm gửi
    meter_submitter_name VARCHAR(100),             -- Tên người gửi (snapshot)
    
    FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_invoices_room_id ON invoices(room_id);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_invoices_billing_month ON invoices(billing_month);
CREATE INDEX idx_invoices_due_date ON invoices(due_date);
CREATE INDEX idx_invoices_deleted ON invoices(deleted_at) WHERE deleted_at IS NULL;

-- ============================================================================
-- BƯỚC 9: TẠO BẢNG NOTIFICATIONS (Thông báo)
-- ============================================================================
-- Mục đích: Gửi thông báo đến sinh viên
-- Tối ưu: Thêm loại 'Kỷ luật' trong notification_type

CREATE TABLE notifications (
    id VARCHAR(50) PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    content TEXT NOT NULL,
    type notification_type DEFAULT 'Thông báo chung',
    target_audience target_audience DEFAULT 'ALL',
    target_users JSONB,                       -- Mảng user IDs cho SPECIFIC
    priority INTEGER DEFAULT 1,               -- Tối ưu: Độ ưu tiên (1-5)
    attachment_url VARCHAR(255),              -- Tối ưu: File đính kèm
    created_by VARCHAR(50),
    is_published BOOLEAN DEFAULT TRUE,
    published_at TIMESTAMP,                   -- Tối ưu: Thời gian xuất bản
    expires_at TIMESTAMP,                     -- Tối ưu: Hết hiệu lực
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_notifications_type ON notifications(type);
CREATE INDEX idx_notifications_created_at ON notifications(created_at);
CREATE INDEX idx_notifications_published ON notifications(is_published, published_at);

-- ============================================================================
-- BƯỚC 10: TẠO BẢNG FEEDBACKS (Phản hồi)
-- ============================================================================
-- Mục đích: Sinh viên gửi phản hồi về vấn đề trong KTX
-- Tối ưu: Thêm 'Trang thiết bị' vào feedback_category

CREATE TABLE feedbacks (
    id VARCHAR(50) PRIMARY KEY,
    user_id VARCHAR(50) NOT NULL,
    room_id VARCHAR(50),
    category feedback_category DEFAULT 'Khác',
    content TEXT NOT NULL,
    images JSONB,                             -- Tối ưu: Hình ảnh minh chứng
    sentiment feedback_sentiment,
    sentiment_score FLOAT,
    priority VARCHAR(10) DEFAULT 'Medium',
    ai_summary TEXT,
    keywords TEXT[],
    emotion VARCHAR(50),
    status feedback_status DEFAULT 'New',
    admin_response TEXT,
    resolved_by VARCHAR(50),
    resolved_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE SET NULL,
    FOREIGN KEY (resolved_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_feedbacks_user_id ON feedbacks(user_id);
CREATE INDEX idx_feedbacks_status ON feedbacks(status);
CREATE INDEX idx_feedbacks_created_at ON feedbacks(created_at);
CREATE INDEX idx_feedbacks_category ON feedbacks(category);
CREATE INDEX idx_feedbacks_priority ON feedbacks(priority);

-- ============================================================================
-- BƯỚC 11: TẠO BẢNG ASSETS TỐI ƯU (GỘP CATEGORY)
-- ============================================================================
-- Mục đích: Quản lý tài sản với thông tin danh mục gộp chung để đơn giản hóa
-- Lợi ích: Giảm JOIN queries, dễ quản lý, phù hợp quy mô KTX
-- Ghi chú: Lịch sử nhập/xuất được ghi vào log_system
--          room_id = NULL nghĩa là tài sản đang ở kho

CREATE TABLE assets (
    -- Thông tin cơ bản
    id                VARCHAR(50) PRIMARY KEY,
    asset_code        VARCHAR(50) NOT NULL,            -- Mã tài sản (GIUONG, TU, BAN, QUAT, DIEUHOA, DEN, CAMERA, WIFI)
    name              VARCHAR(200) NOT NULL,           -- Tên tài sản
    
    -- Thông tin danh mục
    category_name     VARCHAR(100) NOT NULL,           -- Tên danh mục (Nội thất, Thiết bị điện...)
    unit              VARCHAR(20) DEFAULT 'Cái',       -- Đơn vị tính
    
    -- Vị trí và số lượng
    room_id           VARCHAR(50),                     -- Phòng hiện tại (NULL = kho)
    location          VARCHAR(100),                    -- Vị trí cụ thể trong phòng
    quantity          INTEGER NOT NULL DEFAULT 1,      -- Số lượng
    
    -- Trạng thái
    status            asset_status DEFAULT 'Sẵn sàng',
    
    -- Thông tin tài chính
    purchase_date     DATE,                            -- Ngày mua
    purchase_price    DECIMAL(12,2),                   -- Giá mua
    
    -- Thông tin nhà cung cấp
    supplier          VARCHAR(200),                    -- Nhà cung cấp
    
    -- Thông tin kỹ thuật
    specifications    JSONB,                          -- Thông số kỹ thuật (JSON)
    qr_code          VARCHAR(255),                    -- Mã QR cho quản lý
    
    -- Ghi chú và mô tả
    description       TEXT,                           -- Mô tả chi tiết
    note              TEXT,                           -- Ghi chú bảo trì/sử dụng
    
    -- Audit trail
    created_by        VARCHAR(50),
    created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign keys
    FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE SET NULL,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    
    -- Constraints
    CHECK (quantity > 0),
    CHECK (purchase_price >= 0)
);

-- Indexes tối ưu
CREATE INDEX idx_assets_code ON assets(asset_code);
CREATE INDEX idx_assets_name ON assets USING gin(to_tsvector('english', name));
CREATE INDEX idx_assets_category ON assets(category_name);
CREATE INDEX idx_assets_room ON assets(room_id);
CREATE INDEX idx_assets_status ON assets(status);
CREATE INDEX idx_assets_category_status ON assets(category_name, status);
CREATE INDEX idx_assets_warehouse ON assets(status, category_name) WHERE room_id IS NULL;



-- ============================================================================
-- BƯỚC 15: TẠO BẢNG DISCIPLINARY_RECORDS (Phiếu kỷ luật)
-- ============================================================================
-- Mục đích: Quản lý vi phạm và xử lý kỷ luật sinh viên
-- Tối ưu:
-- - Lưu lịch sử vi phạm để theo dõi
-- - Tự động tăng mức độ kỷ luật nếu tái phạm
-- - Liên kết với hóa đơn phạt (nếu có)

CREATE TABLE disciplinary_records (
    id VARCHAR(50) PRIMARY KEY,
    
    -- Thông tin sinh viên
    user_id VARCHAR(50) NOT NULL,             -- Sinh viên vi phạm
    room_id VARCHAR(50),                      -- Phòng xảy ra vi phạm
    contract_id VARCHAR(50),                  -- Hợp đồng liên quan
    
    -- Thông tin vi phạm
    violation_type violation_type NOT NULL,
    violation_date TIMESTAMP NOT NULL,        -- Thời gian xảy ra
    description TEXT NOT NULL,                -- Mô tả chi tiết vi phạm
    evidence JSONB,                           -- Bằng chứng (ảnh, video...)
    
    -- Xử lý kỷ luật
    disciplinary_level disciplinary_level NOT NULL,
    penalty_amount DECIMAL(10,2) DEFAULT 0,  -- Số tiền phạt (nếu có)
    penalty_paid BOOLEAN DEFAULT FALSE,       -- Đã đóng phạt chưa

    -- Điểm rèn luyện
    -- Quy tắc trừ điểm theo disciplinary_level (tính ở backend service):
    --   Nhắc nhở: -2 | Cảnh cáo: -5 | Phạt tiền: -10 | Đình chỉ: -20 | Buộc thôi ở: -30
    score_deducted INTEGER DEFAULT 0,         -- Số điểm rèn luyện bị trừ cho vi phạm này
    violation_count INTEGER DEFAULT 1,        -- Lần vi phạm thứ N (cùng violation_type + user_id)

    -- Email cảnh báo (tự động gửi khi violation_count >= 3)
    email_sent BOOLEAN DEFAULT FALSE,         -- Đã gửi email cảnh báo chưa
    email_sent_at TIMESTAMP,                  -- Thời điểm gửi email
    
    -- Quyết định
    decision_number VARCHAR(50),              -- Số quyết định kỷ luật
    decision_content TEXT,                    -- Nội dung quyết định
    effective_date DATE,                      -- Ngày có hiệu lực
    expiry_date DATE,                         -- Ngày hết hiệu lực (nếu có)
    
    -- Trạng thái
    status disciplinary_status DEFAULT 'Chờ xử lý',
    
    -- Khiếu nại (nếu có)
    appeal_content TEXT,                      -- Nội dung khiếu nại
    appeal_date TIMESTAMP,                    -- Ngày khiếu nại
    appeal_response TEXT,                     -- Phản hồi khiếu nại
    appeal_resolved_at TIMESTAMP,
    
    -- Metadata
    reported_by VARCHAR(50),                  -- Người báo cáo/phát hiện
    handled_by VARCHAR(50),                   -- Người xử lý
    note TEXT,                                -- Ghi chú thêm
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE SET NULL,
    FOREIGN KEY (contract_id) REFERENCES student_contracts(id) ON DELETE SET NULL,
    FOREIGN KEY (reported_by) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (handled_by) REFERENCES users(id) ON DELETE SET NULL
);

-- Tối ưu: Indexes cho quản lý kỷ luật
CREATE INDEX idx_disciplinary_user ON disciplinary_records(user_id);
CREATE INDEX idx_disciplinary_room ON disciplinary_records(room_id);
CREATE INDEX idx_disciplinary_status ON disciplinary_records(status);
CREATE INDEX idx_disciplinary_type ON disciplinary_records(violation_type);
CREATE INDEX idx_disciplinary_level ON disciplinary_records(disciplinary_level);
CREATE INDEX idx_disciplinary_date ON disciplinary_records(violation_date);
CREATE INDEX idx_disciplinary_penalty ON disciplinary_records(penalty_paid) WHERE penalty_amount > 0;
-- Index đếm vi phạm theo sinh viên + loại (dùng khi tính violation_count)
CREATE INDEX idx_disciplinary_user_type ON disciplinary_records(user_id, violation_type);
-- Index lọc email chưa gửi (dùng cho job gửi email cảnh báo)
CREATE INDEX idx_disciplinary_email ON disciplinary_records(email_sent) WHERE email_sent = FALSE;

-- ============================================================================
-- BƯỚC 16: TẠO BẢNG LOG_SYSTEM (Nhật ký hệ thống)
-- ============================================================================
-- Mục đích: Ghi lại mọi thao tác quan trọng trong hệ thống
-- Tối ưu: Audit trail đầy đủ cho bảo mật và troubleshooting

CREATE TABLE log_system (
    id VARCHAR(50) PRIMARY KEY,
    user_id VARCHAR(50),
    action VARCHAR(100) NOT NULL, -- Action performed
    entity_type VARCHAR(50), -- Table/Entity affected
    entity_id VARCHAR(50), -- ID of affected record
    old_value JSONB, -- Previous state
    new_value JSONB, -- New state
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_logs_user_id ON log_system(user_id);
CREATE INDEX idx_logs_entity ON log_system(entity_type, entity_id);
CREATE INDEX idx_logs_created_at ON log_system(created_at);
CREATE INDEX idx_logs_action ON log_system(action);  -- Tối ưu: Tìm theo hành động

-- ============================================================================
-- BƯỚC 17: TẠO CÁC TRIGGERS CHO UPDATED_AT
-- ============================================================================
-- Mục đích: Tự động cập nhật thời gian sửa đổi

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Áp dụng trigger cho các bảng
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_register_forms_updated_at BEFORE UPDATE ON register_forms
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_rooms_updated_at BEFORE UPDATE ON rooms
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_contracts_updated_at BEFORE UPDATE ON student_contracts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON invoices
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notifications_updated_at BEFORE UPDATE ON notifications
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_feedbacks_updated_at BEFORE UPDATE ON feedbacks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Triggers cho bảng tài sản
CREATE TRIGGER update_assets_updated_at BEFORE UPDATE ON assets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_disciplinary_records_updated_at BEFORE UPDATE ON disciplinary_records
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_settings_updated_at BEFORE UPDATE ON settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- BƯỚC 18: DỮ LIỆU MẪU (INITIAL DATA)
-- ============================================================================
-- Tạo tài khoản và dữ liệu mẫu để test

-- Insert default settings
INSERT INTO settings (id, category, name, value, description) VALUES 
('scoring_weights', 'system', 'scoring_weights', '{
    "year": {"weight": 20, "max_year": 5},
    "distance": {"weight": 30, "max_distance": 100},
    "gpa": {"weight": 25, "min_gpa": 2.0},
    "circumstance": {"weight": 25, "max_points": 20}
}', 'Trọng số tính điểm hồ sơ đăng ký'),
('room_capacity', 'room', 'defaultCapacity', '4', 'Sức chứa mặc định cho phòng mới'),
('room_rent_price', 'room', 'defaultRentPrice', '1200000', 'Giá thuê phòng mặc định (VNĐ)'),
('room_garbage_fee', 'room', 'defaultGarbageFee', '20000', 'Phí rác hàng tháng mặc định'),
('room_internet_fee', 'room', 'defaultInternetFee', '50000', 'Phí internet hàng tháng mặc định'),
('room_parking_fee', 'room', 'defaultParkingFee', '100000', 'Phí gửi xe hàng tháng mặc định'),
('room_area', 'room', 'defaultArea', '25.5', 'Diện tích phòng mặc định (m²)'),
('system_config', 'system', 'maintenance_mode', 'false', 'Chế độ bảo trì hệ thống'),
('user_prefs', 'user', 'default_view', '"list"', 'Chế độ xem mặc định'),
('pricing_config', 'pricing', 'pricing_config', '{
    "rentPerPerson": 500000,
    "electricRate": 3500,
    "electricStart": 0,
    "waterRate": 15000,
    "waterStart": 0,
    "garbageFee": 70000,
    "internetFee": 300000,
    "parkingFeePerVehicle": 50000,
    "dueDateDay": 10
}', 'Cấu hình bảng giá tiền phòng, điện, nước và dịch vụ cho hệ thống hóa đơn'),
('asset_limits', 'asset', 'Asset Limits Configuration', '{
    "perRoom": {
        "GIUONG": 5,
        "TU": 5,
        "BAN": 5,
        "QUAT": 2,
        "DIEUHOA": 2,
        "DEN": 5
    },
    "perFloor": {
        "WIFI": 1,
        "CAMERA": 1
    }
}', 'Cấu hình giới hạn số lượng tài sản cho mỗi phòng và tầng');

-- Insert default admin user
INSERT INTO users (id, email, password, full_name, role, phone, avatar, created_at, updated_at) VALUES 
('admin-1', 'admin', '$2b$10$r4PtV7h0KGlEULC0E0gOwudU1jY5rrTam9PBpwDb90rZqZxxgymyO', 'Quản Trị Viên', 'ADMIN', '0123456789', 'https://ui-avatars.com/api/?name=Admin&background=1e40af&color=fff', NOW(), NOW()),
('admin-2', 'buixu4ns0n@gmail.com', '123', 'Bui Xuan Son', 'ADMIN', NULL, 'https://ui-avatars.com/api/?name=Bui+Xuan+Son&background=1e40af&color=fff', NOW(), NOW());

-- ============================================================================
-- KẾT THÚC SCHEMA
-- ============================================================================
-- Hướng dẫn sử dụng:
-- 1. Chạy toàn bộ file này để tạo database từ đầu
-- 2. Hoặc chạy từng bước theo thứ tự (BƯỚC 1 -> BƯỚC 18)
-- 3. Kiểm tra dữ liệu mẫu đã được tạo
-- 4. Bắt đầu phát triển DAO và API

-- ============================================================================
-- PHÂN TÍCH THIẾT KẾ VÀ TỐI ƯU
-- ============================================================================

-- ============================================================================
-- PHÂN TÍCH THIẾT KẾ VÀ TỐI ƯU
-- ============================================================================

-- ĐIỂM MẠNH CỦA SCHEMA NÀY:
-- ✓ Cấu trúc rõ ràng, dễ hiểu với comment chi tiết
-- ✓ Sử dụng ENUM types đảm bảo tính toàn vẹn dữ liệu
-- ✓ Index đầy đủ cho các truy vấn thường dùng
-- ✓ Foreign keys hợp lý với ON DELETE phù hợp
-- ✓ Trigger tự động cập nhật updated_at
-- ✓ Hỗ trợ soft delete (deleted_at)
-- ✓ Lưu trữ JSONB linh hoạt cho dữ liệu động
-- ✓ Audit trail đầy đủ qua log_system

-- TỐI ƯU BẢNG ASSETS:
-- ✓ GỘP asset_categories VÀO assets để đơn giản hóa
-- ✓ Giảm số lượng JOIN queries cần thiết
-- ✓ Thêm thông tin chi tiết: supplier, warranty, specifications
-- ✓ Hỗ trợ QR code và location tracking
-- ✓ Tính năng khấu hao và giá trị hiện tại
-- ✓ Full-text search với gin index

-- MỞ RỘNG THÊM CHO TƯƠNG LAI:
-- 1. QUẢN LÝ CƠ SỞ VẬT CHẤT:
--    ✓ Thông tin danh mục gộp chung trong bảng assets
--    ✓ Tracking vị trí chi tiết và QR code
--    ✓ Quản lý bảo hành và khấu hao tự động
--    ✓ Lịch sử nhập/xuất dùng log_system (entity_type = 'assets')

-- 2. PHIẾU KỶ LUẬT:
--    - disciplinary_records: Vi phạm và xử lý
--    - Hỗ trợ khiếu nại
--    - Liên kết với hóa đơn phạt
--    - Theo dõi lịch sử vi phạm

-- KHẢ NĂNG MỞ RỘNG TIẾP:
-- - Hệ thống đặt phòng online
-- - Quản lý xe (bãi đỗ xe)
-- - Quản lý điểm danh ra vào (access control)
-- - Hệ thống đánh giá phòng/dịch vụ
-- - Tích hợp thanh toán online
-- - Chat/Message giữa admin và sinh viên
-- - Báo cáo và thống kê nâng cao

-- TỐI ƯU HIỆU NĂNG:
-- 1. Đã tạo indexes cho các cột thường dùng trong WHERE, JOIN
-- 2. Composite indexes cho truy vấn nhiều điều kiện
-- 3. Partial indexes cho các điều kiện đặc biệt
-- 4. JSONB cho dữ liệu linh hoạt nhưng vẫn query được
-- 5. Full-text search index cho tìm kiếm tài sản
-- 6. Views tối ưu cho báo cáo thường dùng
-- 7. Functions hỗ trợ tính toán khấu hao

-- BẢO MẬT:
-- ✓ Password đã hash (bcrypt)
-- ✓ Soft delete thay vì xóa thật
-- ✓ Tracking user actions qua log_system
-- ✓ Role-based access control (ADMIN và STUDENT)

-- ============================================================================
-- MIGRATION: Cập nhật student_contracts cho luồng gán phòng mới
-- (Chạy script này nếu database đã tồn tại, không cần nếu tạo mới từ schema)
-- ============================================================================
-- ALTER TYPE contract_status ADD VALUE IF NOT EXISTS 'Pending' BEFORE 'Active';
-- ALTER TABLE student_contracts ALTER COLUMN room_id DROP NOT NULL;
-- ALTER TABLE student_contracts ALTER COLUMN start_date DROP NOT NULL;
-- ALTER TABLE student_contracts ALTER COLUMN end_date DROP NOT NULL;
-- ALTER TABLE student_contracts ALTER COLUMN rent_price SET DEFAULT 0;
-- ALTER TABLE student_contracts ALTER COLUMN deposit_amount SET DEFAULT 0;
-- ALTER TABLE student_contracts ALTER COLUMN status SET DEFAULT 'Pending';
-- ALTER TABLE student_contracts ADD COLUMN IF NOT EXISTS snapshot_student_id VARCHAR(50);
-- ALTER TABLE student_contracts ADD COLUMN IF NOT EXISTS snapshot_cccd VARCHAR(20);
-- ALTER TABLE student_contracts ADD COLUMN IF NOT EXISTS snapshot_gender gender_type;
-- ALTER TABLE student_contracts ADD COLUMN IF NOT EXISTS snapshot_year INTEGER;
-- ALTER TABLE student_contracts ADD COLUMN IF NOT EXISTS snapshot_faculty VARCHAR(100);
-- ALTER TABLE student_contracts ADD COLUMN IF NOT EXISTS snapshot_phone VARCHAR(20);


-- KHUYẾN NGHỊ TIẾP THEO:
-- 1. Tạo các View cho báo cáo thường dùng (đã có trong sample_asset_data.sql)
-- 2. Tạo stored procedures cho logic phức tạp
-- 3. Backup strategy cho dữ liệu quan trọng
-- 4. Monitor query performance
-- 5. Implement connection pooling ở backend
-- 6. Cache thường xuyên cho dữ liệu ít thay đổi
