const express = require('express');
const router = express.Router();
const C = require('../controllers/DisciplinaryController');
const { authenticate } = require('../middlewares/auth');

// Yêu cầu đăng nhập đối với tất cả các API kỷ luật
router.use(authenticate);

// Cấu hình định mức điểm trừ rèn luyện cho các loại vi phạm
router.get('/settings/score-config',  C.getScoreConfig.bind(C));
router.put('/settings/score-config',  C.saveScoreConfig.bind(C));

// Lấy thống kê số liệu vi phạm kỷ luật
router.get('/statistics', C.getStatistics.bind(C));

// Các API quản lý kỷ luật (CRUD)
router.get('/',     C.getAll.bind(C));
router.post('/',    C.create.bind(C));
router.get('/:id',  C.getById.bind(C));
router.put('/:id',  C.update.bind(C));
router.delete('/:id', C.delete.bind(C));

module.exports = router;
