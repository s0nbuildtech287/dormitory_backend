const express = require('express');
const router = express.Router();
const FeedbackController = require('../controllers/FeedbackController');
const { authenticate, requireAdmin } = require('../middlewares/auth');

// Yêu cầu đăng nhập đối với tất cả các API phản ánh ý kiến
router.use(authenticate);

// Lấy danh sách toàn bộ phản ánh
router.get('/', FeedbackController.getAll);

// Thống kê phản ánh thông thường
router.get('/statistics', requireAdmin, FeedbackController.getStatistics);

// Thống kê phân tích sắc thái phản ánh bằng AI (chỉ số cảm xúc, mức độ ưu tiên)
router.get('/ai-statistics', requireAdmin, FeedbackController.getAIStatistics);

// Lấy số lượng phản ánh mới chưa xử lý
router.get('/pending-count', requireAdmin, FeedbackController.getPendingCount);

// Lấy danh sách phản ánh của sinh viên
router.get('/user', FeedbackController.getByUser);
router.get('/user/:userId', FeedbackController.getByUser);

// Lấy thông tin chi tiết một phản ánh theo ID
router.get('/:id', FeedbackController.getById);

// Gửi phản ánh mới
router.post('/', FeedbackController.create);

// Cập nhật thông tin phản ánh
router.put('/:id', FeedbackController.update);

// Cập nhật trạng thái xử lý phản ánh (Chỉ dành cho Admin)
router.post('/:id/status', requireAdmin, FeedbackController.updateStatus);

// Xóa phản ánh
router.delete('/:id', FeedbackController.delete);

module.exports = router;
