const express = require('express');
const router = express.Router();
const RoomController = require('../controllers/RoomController');
const { authenticate, requireAdmin } = require('../middlewares/auth');

// Yêu cầu đăng nhập đối với tất cả các API quản lý phòng
router.use(authenticate);

// Lấy danh sách toàn bộ phòng
router.get('/', RoomController.getAll);

// Lấy danh sách các phòng còn chỗ trống
router.get('/available', RoomController.getAvailable);

// Lấy thông tin cấu trúc tầng/tòa nhà của ký túc xá
router.get('/meta/structure', requireAdmin, RoomController.getStructureMetadata);

// Cấu hình tên hiển thị của các tòa nhà
router.get('/settings/display-names', RoomController.getBuildingDisplayNames);
router.put('/settings/display-names', requireAdmin, RoomController.updateBuildingDisplayNames);

// Lấy thống kê chung về các phòng
router.get('/statistics', requireAdmin, RoomController.getStatistics);

// Tạo phòng tự động hàng loạt theo tầng/tòa và cập nhật phòng xung kích
router.post('/batch/floor', requireAdmin, RoomController.createFloorRooms);
router.post('/batch/building', requireAdmin, RoomController.createBuildingRooms);
router.put('/batch/reserved-for', requireAdmin, RoomController.updateBatchReservedFor);

// Lấy thông tin chi tiết một phòng theo ID
router.get('/:id', RoomController.getById);

// Các API quản trị viên (Thêm, sửa, xóa phòng)
router.post('/', requireAdmin, RoomController.create);
router.put('/:id', requireAdmin, RoomController.update);
router.delete('/:id', requireAdmin, RoomController.delete);

// Cập nhật chỉ số công tơ điện và nước của phòng
router.post('/:id/meter-readings', requireAdmin, RoomController.updateMeterReadings);

module.exports = router;
