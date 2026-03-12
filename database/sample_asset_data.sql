-- ============================================================================
-- SAMPLE DATA FOR ASSET MANAGEMENT
-- ============================================================================
-- Dữ liệu mẫu cho hệ thống quản lý cơ sở vật chất

-- ============================================================================
-- 1. ASSET CATEGORIES (Danh mục tài sản)
-- ============================================================================

INSERT INTO asset_categories (id, code, name, description, unit, depreciation_rate, warranty_period, created_at, updated_at) VALUES
('cat-001', 'TB', 'Thiết bị điện tử', 'Các thiết bị điện tử như TV, tủ lạnh, máy lạnh', 'Cái', 15.0, 24, NOW(), NOW()),
('cat-002', 'NT', 'Nội thất', 'Bàn, ghế, tủ, giường và các đồ nội thất khác', 'Cái', 10.0, 12, NOW(), NOW()),
('cat-003', 'DD', 'Dụng dụng', 'Chăn, gối, màn, rèm và các dụng cụ sinh hoạt', 'Cái', 20.0, 6, NOW(), NOW()),
('cat-004', 'DL', 'Điện lạnh', 'Quạt, máy lạnh, máy nước nóng', 'Cái', 12.0, 18, NOW(), NOW()),
('cat-005', 'VS', 'Vệ sinh', 'Thùng rác, chổi, cây lau nhà', 'Cái', 25.0, 3, NOW(), NOW());

-- ============================================================================
-- 2. ASSETS (Tài sản)
-- ============================================================================

-- Tài sản cho phòng A101
INSERT INTO assets (id, asset_code, category_id, name, description, room_id, location, purchase_price, purchase_date, current_value, supplier, warranty_expiry, status, condition, qr_code, specifications, note, created_by, created_at, updated_at) VALUES
('asset-001', 'TB001', 'cat-001', 'Tivi Samsung 43 inch', 'Smart TV Samsung 43 inch Full HD', (SELECT id FROM rooms WHERE room_number = 'A101' LIMIT 1), 'Góc phòng', 8500000, '2024-01-15', 7500000, 'Điện máy Xanh', '2026-01-15', 'Đang sử dụng', 'Tốt', 'QR_TB001_1705123456', '{"brand": "Samsung", "size": "43 inch", "resolution": "Full HD"}', 'Hoạt động tốt', 'admin-1', NOW(), NOW()),

('asset-002', 'NT001', 'cat-002', 'Bàn học gỗ', 'Bàn học gỗ công nghiệp 1m2', (SELECT id FROM rooms WHERE room_number = 'A101' LIMIT 1), 'Cạnh cửa sổ', 1200000, '2024-01-15', 1100000, 'Nội thất Hòa Phát', '2025-01-15', 'Đang sử dụng', 'Tốt', 'QR_NT001_1705123457', '{"material": "Gỗ công nghiệp", "size": "1m x 0.6m"}', 'Còn mới', 'admin-1', NOW(), NOW()),

('asset-003', 'NT002', 'cat-002', 'Ghế xoay văn phòng', 'Ghế xoay có tựa lưng', (SELECT id FROM rooms WHERE room_number = 'A101' LIMIT 1), 'Trước bàn học', 800000, '2024-01-15', 750000, 'Nội thất Hòa Phát', '2025-01-15', 'Đang sử dụng', 'Tốt', 'QR_NT002_1705123458', '{"type": "Ghế xoay", "color": "Đen"}', 'Hoạt động tốt', 'admin-1', NOW(), NOW()),

('asset-004', 'DL001', 'cat-004', 'Quạt trần Panasonic', 'Quạt trần 3 cánh', (SELECT id FROM rooms WHERE room_number = 'A101' LIMIT 1), 'Trần phòng', 1500000, '2024-01-15', 1400000, 'Điện máy Chợ Lớn', '2026-01-15', 'Đang sử dụng', 'Tốt', 'QR_DL001_1705123459', '{"brand": "Panasonic", "blades": 3}', 'Hoạt động êm', 'admin-1', NOW(), NOW()),

-- Tài sản cho phòng A102
('asset-005', 'TB002', 'cat-001', 'Tủ lạnh Electrolux 180L', 'Tủ lạnh mini 2 cửa', (SELECT id FROM rooms WHERE room_number = 'A102' LIMIT 1), 'Góc phòng', 6500000, '2024-01-20', 6000000, 'Điện máy Xanh', '2026-01-20', 'Đang sử dụng', 'Tốt', 'QR_TB002_1705123460', '{"brand": "Electrolux", "capacity": "180L"}', 'Làm lạnh tốt', 'admin-1', NOW(), NOW()),

('asset-006', 'NT003', 'cat-002', 'Giường tầng gỗ', 'Giường tầng 2 tầng', (SELECT id FROM rooms WHERE room_number = 'A102' LIMIT 1), 'Giữa phòng', 3500000, '2024-01-20', 3200000, 'Nội thất Minh Long', '2025-01-20', 'Đang sử dụng', 'Khá', 'QR_NT003_1705123461', '{"type": "Giường tầng", "material": "Gỗ thông"}', 'Chắc chắn', 'admin-1', NOW(), NOW()),

-- Tài sản trong kho
('asset-007', 'DL002', 'cat-004', 'Máy lạnh Daikin 1HP', 'Máy lạnh treo tường 1 chiều', NULL, 'Kho', 12000000, '2024-02-01', 11500000, 'Điện lạnh Sài Gòn', '2026-02-01', 'Sẵn sàng', 'Mới', 'QR_DL002_1705123462', '{"brand": "Daikin", "capacity": "1HP", "type": "Treo tường"}', 'Chưa lắp đặt', 'admin-1', NOW(), NOW()),

('asset-008', 'VS001', 'cat-005', 'Thùng rác inox', 'Thùng rác có nắp đạp chân', NULL, 'Kho', 350000, '2024-02-05', 320000, 'Đồ gia dụng Việt', '2024-08-05', 'Sẵn sàng', 'Mới', 'QR_VS001_1705123463', '{"material": "Inox", "capacity": "20L"}', 'Chưa sử dụng', 'admin-1', NOW(), NOW()),

-- Tài sản hư hỏng
('asset-009', 'TB003', 'cat-001', 'Tivi LG 32 inch (hỏng)', 'Smart TV LG bị hỏng màn hình', (SELECT id FROM rooms WHERE room_number = 'A103' LIMIT 1), 'Góc phòng', 5500000, '2023-06-15', 2000000, 'Điện máy Xanh', '2025-06-15', 'Hư hỏng', 'Kém', 'QR_TB003_1705123464', '{"brand": "LG", "size": "32 inch", "issue": "Màn hình bị vỡ"}', 'Cần sửa chữa', 'admin-1', NOW(), NOW()),

('asset-010', 'DD001', 'cat-003', 'Bộ chăn ga gối', 'Bộ chăn ga gối cotton', (SELECT id FROM rooms WHERE room_number = 'A104' LIMIT 1), 'Trên giường', 800000, '2024-01-10', 600000, 'Dệt may Việt Nam', '2024-07-10', 'Đang sử dụng', 'Khá', 'QR_DD001_1705123465', '{"material": "Cotton", "color": "Xanh dương"}', 'Sử dụng bình thường', 'admin-1', NOW(), NOW());

-- ============================================================================
-- 3. ASSET MOVEMENTS (Biến động tài sản)
-- ============================================================================

INSERT INTO asset_movements (id, asset_id, movement_type, from_location, to_location, from_room_id, to_room_id, quantity, reason, amount, performed_by, approved_by, created_at) VALUES
-- Nhập kho ban đầu
('mov-001', 'asset-001', 'Nhập kho', NULL, 'Kho', NULL, NULL, 1, 'Mua mới từ nhà cung cấp', 8500000, 'admin-1', 'admin-1', '2024-01-15 08:00:00'),
('mov-002', 'asset-002', 'Nhập kho', NULL, 'Kho', NULL, NULL, 1, 'Mua mới từ nhà cung cấp', 1200000, 'admin-1', 'admin-1', '2024-01-15 08:30:00'),
('mov-003', 'asset-003', 'Nhập kho', NULL, 'Kho', NULL, NULL, 1, 'Mua mới từ nhà cung cấp', 800000, 'admin-1', 'admin-1', '2024-01-15 09:00:00'),

-- Xuất kho cấp phát
('mov-004', 'asset-001', 'Xuất kho', 'Kho', 'Phòng A101', NULL, (SELECT id FROM rooms WHERE room_number = 'A101' LIMIT 1), 1, 'Cấp phát cho phòng A101', NULL, 'admin-1', 'admin-1', '2024-01-16 10:00:00'),
('mov-005', 'asset-002', 'Xuất kho', 'Kho', 'Phòng A101', NULL, (SELECT id FROM rooms WHERE room_number = 'A101' LIMIT 1), 1, 'Cấp phát cho phòng A101', NULL, 'admin-1', 'admin-1', '2024-01-16 10:30:00'),
('mov-006', 'asset-003', 'Xuất kho', 'Kho', 'Phòng A101', NULL, (SELECT id FROM rooms WHERE room_number = 'A101' LIMIT 1), 1, 'Cấp phát cho phòng A101', NULL, 'admin-1', 'admin-1', '2024-01-16 11:00:00'),

-- Nhập và xuất tài sản khác
('mov-007', 'asset-005', 'Nhập kho', NULL, 'Kho', NULL, NULL, 1, 'Mua mới tủ lạnh', 6500000, 'admin-1', 'admin-1', '2024-01-20 08:00:00'),
('mov-008', 'asset-005', 'Xuất kho', 'Kho', 'Phòng A102', NULL, (SELECT id FROM rooms WHERE room_number = 'A102' LIMIT 1), 1, 'Cấp phát cho phòng A102', NULL, 'admin-1', 'admin-1', '2024-01-21 09:00:00'),

-- Kiểm kê
('mov-009', 'asset-001', 'Kiểm kê', 'Phòng A101', 'Phòng A101', (SELECT id FROM rooms WHERE room_number = 'A101' LIMIT 1), (SELECT id FROM rooms WHERE room_number = 'A101' LIMIT 1), 1, 'Kiểm kê định kỳ tháng 2', NULL, 'admin-1', 'admin-1', '2024-02-01 14:00:00');

-- ============================================================================
-- 4. ASSET MAINTENANCE (Bảo trì tài sản)
-- ============================================================================

INSERT INTO asset_maintenance (id, asset_id, title, description, maintenance_type, scheduled_date, started_at, completed_at, estimated_cost, actual_cost, technician, vendor, parts_replaced, status, priority, result, images, created_by, assigned_to, created_at, updated_at) VALUES
-- Bảo trì hoàn thành
('maint-001', 'asset-001', 'Vệ sinh và kiểm tra TV Samsung', 'Vệ sinh màn hình và kiểm tra các chức năng', 'Bảo trì định kỳ', '2024-02-15', '2024-02-15 08:00:00', '2024-02-15 10:00:00', 200000, 150000, 'Nguyễn Văn A', 'Dịch vụ điện tử ABC', '[]', 'Hoàn thành', 2, 'Vệ sinh sạch sẽ, tất cả chức năng hoạt động bình thường', NULL, 'admin-1', 'admin-1', '2024-02-10 09:00:00', '2024-02-15 10:30:00'),

-- Bảo trì đang thực hiện
('maint-002', 'asset-009', 'Sửa chữa màn hình TV LG', 'Thay thế màn hình bị vỡ', 'Sửa chữa sự cố', '2024-03-01', '2024-03-01 08:00:00', NULL, 3000000, NULL, 'Trần Văn B', 'Trung tâm bảo hành LG', '[{"part": "Màn hình LCD 32 inch", "quantity": 1}]', 'Đang sửa chữa', 3, NULL, NULL, 'admin-1', 'admin-1', '2024-02-25 14:00:00', '2024-03-01 08:30:00'),

-- Bảo trì chờ xử lý
('maint-003', 'asset-004', 'Bảo dưỡng quạt trần', 'Vệ sinh và bôi trơn quạt trần', 'Bảo trì định kỳ', '2024-03-15', NULL, NULL, 300000, NULL, 'Lê Văn C', 'Dịch vụ điện lạnh XYZ', NULL, 'Chờ xử lý', 2, NULL, NULL, 'admin-1', 'admin-1', '2024-03-05 10:00:00', '2024-03-05 10:00:00'),

-- Bảo trì khẩn cấp
('maint-004', 'asset-007', 'Lắp đặt máy lạnh Daikin', 'Lắp đặt máy lạnh cho phòng mới', 'Lắp đặt', '2024-03-10', NULL, NULL, 1500000, NULL, 'Phạm Văn D', 'Điện lạnh Sài Gòn', NULL, 'Chờ xử lý', 4, NULL, NULL, 'admin-1', 'admin-1', '2024-03-08 16:00:00', '2024-03-08 16:00:00');

-- ============================================================================
-- KẾT THÚC SAMPLE DATA
-- ============================================================================

-- Thông báo hoàn thành
SELECT 'Sample asset data inserted successfully!' as message;