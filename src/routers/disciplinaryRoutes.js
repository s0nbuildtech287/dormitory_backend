const express = require('express');
const router = express.Router();
const C = require('../controllers/DisciplinaryController');
const { authenticate } = require('../middlewares/auth');

router.use(authenticate);

// Score config (điều chỉnh điểm trừ)
router.get('/settings/score-config',  C.getScoreConfig.bind(C));
router.put('/settings/score-config',  C.saveScoreConfig.bind(C));

// Statistics
router.get('/statistics', C.getStatistics.bind(C));

// CRUD
router.get('/',     C.getAll.bind(C));
router.post('/',    C.create.bind(C));
router.get('/:id',  C.getById.bind(C));
router.put('/:id',  C.update.bind(C));
router.delete('/:id', C.delete.bind(C));

module.exports = router;
