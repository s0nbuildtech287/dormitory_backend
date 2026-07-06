const express = require('express');
const router = express.Router();
const RegistrationController = require('../controllers/RegistrationController');
const { authenticate, requireAdmin } = require('../middlewares/auth');
const upload = require('../middlewares/upload');

// Đăng ký phòng công khai dành cho sinh viên (không yêu cầu token)
router.post('/', RegistrationController.create);
router.get('/status', RegistrationController.getStatus);

// Yêu cầu đăng nhập đối với các API bên dưới
router.use(authenticate);

// Import danh sách sinh viên từ file Excel
router.post('/import/excel', upload.single('file'), RegistrationController.importExcel);

// Import danh sách từ Google Sheets
router.post('/import/sheets', RegistrationController.importGoogleSheets);

// Xem trước và debug dữ liệu từ Google Sheets (không lưu vào database)
router.post('/import/sheets/debug', RegistrationController.debugSheet);

// Lấy danh sách email tài khoản dịch vụ Google (phục vụ chia sẻ file sheet)
router.get('/service-accounts', RegistrationController.getServiceAccountEmails);

// Lấy danh sách toàn bộ hồ sơ đăng ký phòng
router.get('/', RegistrationController.getAll);

// Thống kê hồ sơ đăng ký phòng
router.get('/statistics', requireAdmin, RegistrationController.getStatistics);

// Lấy thông số cấu hình trọng số ưu tiên chấm điểm AI
router.get('/scoring-weights', requireAdmin, RegistrationController.getScoringWeights);

// Cập nhật thông số cấu hình trọng số ưu tiên chấm điểm AI
router.put('/scoring-weights', requireAdmin, RegistrationController.updateScoringWeights);

// Tính toán lại điểm số ưu tiên cho tất cả đơn đăng ký
router.post('/recalculate-scores', requireAdmin, RegistrationController.recalculateScores);

// Các endpoint dự báo và phân tích nhu cầu xếp phòng
router.get('/room-forecast', requireAdmin, RegistrationController.getRoomForecast);
router.get('/demand-forecast', requireAdmin, RegistrationController.getDemandForecast);

// Lấy thông tin chi tiết một đơn đăng ký theo ID
router.get('/:id', RegistrationController.getById);

// Cập nhật thông tin đơn đăng ký
router.put('/:id', requireAdmin, RegistrationController.update);

// Duyệt đơn đăng ký phòng
router.post('/:id/approve', requireAdmin, RegistrationController.approve);

// Từ chối đơn đăng ký phòng
router.post('/:id/reject', requireAdmin, RegistrationController.reject);

// Xác thực tính trung thực của ảnh minh chứng bằng Google Vision API
router.post('/:id/validate-images', requireAdmin, RegistrationController.validateImages);

// Xóa đơn đăng ký phòng
router.delete('/:id', requireAdmin, RegistrationController.delete);

// Chạy thuật toán tự động xếp phòng bằng trí tuệ nhân tạo (AI Auto-Allocation)
router.post('/auto-allocate', requireAdmin, RegistrationController.autoAllocate);

module.exports = router;
