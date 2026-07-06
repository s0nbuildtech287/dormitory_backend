const express = require('express');
const router = express.Router();
const NotificationController = require('../controllers/NotificationController');
const { authenticate, requireAdmin } = require('../middlewares/auth');

// Yêu cầu đăng nhập đối với tất cả các API thông báo
router.use(authenticate);

// Lấy danh sách toàn bộ thông báo (dành cho admin quản lý)
router.get('/', NotificationController.getAll);

// Lấy danh sách thông báo gửi riêng/phù hợp với người dùng hiện tại
router.get('/my', NotificationController.getForUser);

// Lấy thông tin chi tiết một thông báo theo ID
router.get('/:id', NotificationController.getById);

// Các API quản trị viên (Thêm, gửi thông báo diện rộng, sửa, xóa)
router.post('/', requireAdmin, NotificationController.create);
router.post('/send-all', requireAdmin, NotificationController.sendToAllStudents);
router.post('/send-specific', requireAdmin, NotificationController.sendToSpecificUsers);
router.put('/:id', requireAdmin, NotificationController.update);
router.delete('/:id', requireAdmin, NotificationController.delete);

module.exports = router;
