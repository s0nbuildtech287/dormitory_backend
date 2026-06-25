const express = require('express');
const router = express.Router();
const AssetController = require('../controllers/AssetController');
const { authenticate } = require('../middlewares/auth');

// Tất cả các route bên dưới đều yêu cầu xác thực
router.use(authenticate);

// Lấy danh sách toàn bộ tài sản hoặc tóm tắt tài sản
router.get('/', AssetController.getAll.bind(AssetController));

// Lấy số liệu thống kê tài sản
router.get('/statistics', AssetController.getStatistics.bind(AssetController));

// Lấy danh sách tài sản theo tòa nhà
router.get('/buildings', AssetController.getAssetsByBuilding.bind(AssetController));

// Lấy lịch sử nhập/xuất tài sản
router.get('/history', AssetController.getHistory.bind(AssetController));

// Cấu hình tài sản - giới hạn định mức
router.get('/settings/limits', AssetController.getAssetLimits.bind(AssetController));
router.put('/settings/limits', AssetController.updateAssetLimits.bind(AssetController));

// Cấu hình tài sản - nội quy quy định
router.get('/settings/regulations', AssetController.getAssetRegulations.bind(AssetController));
router.put('/settings/regulations', AssetController.updateAssetRegulations.bind(AssetController));

// Lấy danh sách tài sản của một phòng cụ thể
router.get('/room/:roomId', AssetController.getAssetsByRoom.bind(AssetController));

// Nhập thêm tài sản vào kho
router.post('/import', AssetController.importAsset.bind(AssetController));

// Xuất tài sản từ kho bàn giao về phòng
router.post('/export', AssetController.exportAsset.bind(AssetController));

// Lấy thông tin chi tiết tài sản theo ID
router.get('/:id', AssetController.getById.bind(AssetController));

// Khởi tạo tài sản mới
router.post('/', AssetController.create.bind(AssetController));

// Cập nhật thông tin tài sản
router.put('/:id', AssetController.update.bind(AssetController));

// Xóa tài sản
router.delete('/:id', AssetController.delete.bind(AssetController));

module.exports = router;
