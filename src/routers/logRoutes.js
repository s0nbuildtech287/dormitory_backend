const express = require('express');
const router = express.Router();
const LogController = require('../controllers/LogController');
const { authenticate, requireAdmin } = require('../middlewares/auth');

// Yêu cầu đăng nhập và quyền admin đối với tất cả các API log hệ thống
router.use(authenticate, requireAdmin);

// Lấy danh sách các hoạt động hệ thống mới nhất
router.get('/recent', LogController.getRecentActivity);

// Lấy danh sách nhật ký hoạt động kèm bộ lọc và phân trang
router.get('/', LogController.getActivityLogs);

// Lấy số liệu thống kê về các hành động hệ thống
router.get('/statistics', LogController.getActionStatistics);

// Lấy nhật ký hoạt động của một người dùng cụ thể
router.get('/user', LogController.getByUser);
router.get('/user/:userId', LogController.getByUser);

// Lấy nhật ký hoạt động liên quan đến một đối tượng cụ thể (Ví dụ: phòng, tài sản)
router.get('/entity/:entityType/:entityId', LogController.getByEntity);

// Xóa bớt các bản ghi nhật ký hệ thống cũ để dọn dẹp dung lượng DB
router.delete('/clean', LogController.cleanOldLogs);

module.exports = router;
