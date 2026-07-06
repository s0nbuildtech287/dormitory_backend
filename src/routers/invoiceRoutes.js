const express = require('express');
const router = express.Router();
const InvoiceController = require('../controllers/InvoiceController');
const { authenticate, requireAdmin } = require('../middlewares/auth');

// Yêu cầu đăng nhập đối với tất cả các API hóa đơn
router.use(authenticate);

// Lấy danh sách toàn bộ hóa đơn
router.get('/', InvoiceController.getAll);

// Thống kê hóa đơn doanh thu
router.get('/statistics', requireAdmin, InvoiceController.getStatistics);

// Phát hiện bất thường trong chỉ số sử dụng điện/nước của các phòng
router.get('/anomalies', requireAdmin, InvoiceController.detectAnomalies);

// Thống kê doanh thu theo mốc thời gian (không khuyến khích sử dụng)
router.get('/statistics/revenue', requireAdmin, InvoiceController.getRevenueStatistics);

// Quét cập nhật các hóa đơn quá hạn thanh toán
router.post('/update-overdue', requireAdmin, InvoiceController.updateOverdue);

// Cấu hình đơn giá điện, nước và dịch vụ
router.get('/pricing-settings', requireAdmin, InvoiceController.getPricingSettings);
router.put('/pricing-settings', requireAdmin, InvoiceController.updatePricingSettings);

// Lấy danh sách hóa đơn chưa thanh toán của sinh viên
router.get('/user', InvoiceController.getByUser);
router.get('/user/:userId', InvoiceController.getByUser);

// Lấy thông tin chi tiết một hóa đơn theo ID
router.get('/:id', InvoiceController.getById);

// Các API quản trị viên (Thêm, tạo nhanh từ phòng, sửa, thanh toán thủ công, xóa)
router.post('/', requireAdmin, InvoiceController.create);
router.post('/from-room', requireAdmin, InvoiceController.createFromRoom);
router.put('/:id', requireAdmin, InvoiceController.update);
router.post('/:id/mark-paid', requireAdmin, InvoiceController.markAsPaid);
router.delete('/:id', requireAdmin, InvoiceController.delete);

module.exports = router;
