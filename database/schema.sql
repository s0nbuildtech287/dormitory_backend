-- Dormitory Management System Database Schema for PostgreSQL
-- DAO Pattern: Flexible schema allowing easy column additions/modifications

-- Drop tables if exists (for clean setup)
DROP TABLE IF EXISTS log_system CASCADE;
DROP TABLE IF EXISTS feedbacks CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS invoices CASCADE;
DROP TABLE IF EXISTS student_contracts CASCADE;
DROP TABLE IF EXISTS rooms CASCADE;
DROP TABLE IF EXISTS register_forms CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Drop existing types if they exist
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

-- Create ENUM types for PostgreSQL
CREATE TYPE user_role AS ENUM ('ADMIN', 'STUDENT');
CREATE TYPE gender_type AS ENUM ('Nam', 'Nữ');
CREATE TYPE registration_status AS ENUM ('Chờ duyệt', 'Chấp nhận', 'Từ chối');
CREATE TYPE ai_suggestion_type AS ENUM ('Nên duyệt', 'Cân nhắc', 'Không ưu tiên');
CREATE TYPE room_status AS ENUM ('Active', 'Inactive', 'Maintenance');
CREATE TYPE contract_status AS ENUM ('Active', 'Expired', 'Terminated');
CREATE TYPE bill_status AS ENUM ('Chưa thanh toán', 'Đã thanh toán', 'Quá hạn');
CREATE TYPE notification_type AS ENUM ('Thông báo chung', 'Thanh toán', 'Bảo trì', 'Khẩn cấp');
CREATE TYPE target_audience AS ENUM ('ALL', 'STUDENTS', 'SPECIFIC');
CREATE TYPE feedback_category AS ENUM ('Sửa chữa', 'Vệ sinh', 'An ninh', 'Khác');
CREATE TYPE feedback_sentiment AS ENUM ('Positive', 'Neutral', 'Negative');
CREATE TYPE feedback_status AS ENUM ('New', 'Processing', 'Resolved');

-- ==================== USERS TABLE ====================
CREATE TABLE users (
    id VARCHAR(50) PRIMARY KEY,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    role user_role NOT NULL DEFAULT 'STUDENT',
    phone VARCHAR(20),
    avatar VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);

-- ==================== REGISTER FORMS TABLE ====================
CREATE TABLE register_forms (
    id VARCHAR(50) PRIMARY KEY,
    student_name VARCHAR(100) NOT NULL,
    student_id VARCHAR(50),
    email VARCHAR(100) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    gender gender_type NOT NULL,
    dob DATE,
    address TEXT,
    faculty VARCHAR(100),
    class VARCHAR(50),
    year INTEGER,
    gpa DECIMAL(3,2),
    distance INTEGER, -- Distance from home to school in km
    priority_points INTEGER DEFAULT 0,
    status registration_status DEFAULT 'Chờ duyệt',
    ai_suggestion ai_suggestion_type,
    ai_score INTEGER,
    ai_reasoning JSONB, -- AI scoring breakdown
    evidence_images JSONB, -- Array of image URLs
    note TEXT, -- Admin notes for approval/rejection
    reviewed_by VARCHAR(50),
    reviewed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_register_forms_status ON register_forms(status);
CREATE INDEX idx_register_forms_student_id ON register_forms(student_id);
CREATE INDEX idx_register_forms_created_at ON register_forms(created_at);

-- ==================== ROOMS TABLE ====================
CREATE TABLE rooms (
    id VARCHAR(50) PRIMARY KEY,
    room_number VARCHAR(20) NOT NULL UNIQUE,
    building VARCHAR(20) NOT NULL,
    floor INTEGER NOT NULL,
    capacity INTEGER NOT NULL DEFAULT 4,
    current_occupancy INTEGER NOT NULL DEFAULT 0,
    gender_type gender_type NOT NULL,
    rent_price DECIMAL(10,2) NOT NULL,
    status room_status DEFAULT 'Active',
    equipment JSONB, -- Array of equipment objects
    electric_meter_reading DECIMAL(10,2) DEFAULT 0,
    water_meter_reading DECIMAL(10,2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CHECK (current_occupancy <= capacity)
);

CREATE INDEX idx_rooms_building ON rooms(building);
CREATE INDEX idx_rooms_gender_type ON rooms(gender_type);
CREATE INDEX idx_rooms_status ON rooms(status);

-- ==================== STUDENT CONTRACTS TABLE ====================
CREATE TABLE student_contracts (
    id VARCHAR(50) PRIMARY KEY,
    user_id VARCHAR(50) NOT NULL,
    room_id VARCHAR(50) NOT NULL,
    register_form_id VARCHAR(50),
    contract_number VARCHAR(50) UNIQUE,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    rent_price DECIMAL(10,2) NOT NULL,
    deposit_amount DECIMAL(10,2) NOT NULL,
    deposit_paid BOOLEAN DEFAULT FALSE,
    status contract_status DEFAULT 'Active',
    terms_conditions TEXT,
    signed_at TIMESTAMP,
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

-- ==================== INVOICES TABLE ====================
CREATE TABLE invoices (
    id VARCHAR(50) PRIMARY KEY,
    contract_id VARCHAR(50) NOT NULL,
    invoice_number VARCHAR(50) UNIQUE NOT NULL,
    billing_month DATE NOT NULL, -- First day of billing month
    rent_amount DECIMAL(10,2) NOT NULL,
    electric_start DECIMAL(10,2) DEFAULT 0,
    electric_end DECIMAL(10,2) DEFAULT 0,
    electric_rate DECIMAL(10,2) DEFAULT 3500, -- VND per kWh
    water_start DECIMAL(10,2) DEFAULT 0,
    water_end DECIMAL(10,2) DEFAULT 0,
    water_rate DECIMAL(10,2) DEFAULT 15000, -- VND per m3
    other_fees DECIMAL(10,2) DEFAULT 0,
    total_amount DECIMAL(10,2) NOT NULL,
    status bill_status DEFAULT 'Chưa thanh toán',
    due_date DATE NOT NULL,
    paid_at TIMESTAMP,
    payment_method VARCHAR(50),
    note TEXT,
    created_by VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (contract_id) REFERENCES student_contracts(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_invoices_contract_id ON invoices(contract_id);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_invoices_billing_month ON invoices(billing_month);
CREATE INDEX idx_invoices_due_date ON invoices(due_date);

-- ==================== NOTIFICATIONS TABLE ====================
CREATE TABLE notifications (
    id VARCHAR(50) PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    content TEXT NOT NULL,
    type notification_type DEFAULT 'Thông báo chung',
    target_audience target_audience DEFAULT 'ALL',
    target_users JSONB, -- Array of user IDs for SPECIFIC audience
    created_by VARCHAR(50),
    is_published BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_notifications_type ON notifications(type);
CREATE INDEX idx_notifications_created_at ON notifications(created_at);

-- ==================== FEEDBACKS TABLE ====================
CREATE TABLE feedbacks (
    id VARCHAR(50) PRIMARY KEY,
    user_id VARCHAR(50) NOT NULL,
    room_id VARCHAR(50),
    category feedback_category DEFAULT 'Khác',
    content TEXT NOT NULL,
    sentiment feedback_sentiment,
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

-- ==================== LOG SYSTEM TABLE ====================
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

-- ==================== TRIGGERS FOR UPDATED_AT ====================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

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

-- ==================== INITIAL DATA ====================
-- Create default admin account (password: admin123)
INSERT INTO users (id, email, password, full_name, role, phone) VALUES
('admin-1', 'admin@ktx.edu.vn', '$2a$10$rK7lHb8cZ0pqPgGJ6L9Yg.Y8QLzWl0vXTK4NvMzBkWJGJH5KJxhOu', 'Quản Trị Viên', 'ADMIN', '0123456789');

-- Sample rooms
INSERT INTO rooms (id, room_number, building, floor, capacity, current_occupancy, gender_type, rent_price, status) VALUES
('room-1', 'P.101', 'A1', 1, 4, 0, 'Nam', 500000, 'Active'),
('room-2', 'P.102', 'A1', 1, 4, 0, 'Nam', 500000, 'Active'),
('room-3', 'P.201', 'A1', 2, 4, 0, 'Nam', 500000, 'Active'),
('room-4', 'P.101', 'B1', 1, 4, 0, 'Nữ', 500000, 'Active'),
('room-5', 'P.102', 'B1', 1, 4, 0, 'Nữ', 500000, 'Active');
