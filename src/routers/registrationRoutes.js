const express = require('express');
const router = express.Router();
const RegistrationController = require('../controllers/RegistrationController');
const { authenticate, requireAdmin } = require('../middlewares/auth');
const upload = require('../middlewares/upload');

// Public route — không cần token (sinh viên đăng ký ngoài đợt)
router.post('/', RegistrationController.create);

// All routes below require authentication
router.use(authenticate);

// Import from Excel (only authenticated users - remove requireAdmin for testing)
router.post('/import/excel', upload.single('file'), RegistrationController.importExcel);

// Get all registrations
router.get('/', RegistrationController.getAll);

// Get statistics
router.get('/statistics', requireAdmin, RegistrationController.getStatistics);

// Get scoring weights
router.get('/scoring-weights', requireAdmin, RegistrationController.getScoringWeights);

// Update scoring weights
router.put('/scoring-weights', requireAdmin, RegistrationController.updateScoringWeights);

// Recalculate AI scores for all registrations (when settings change)
router.post('/recalculate-scores', requireAdmin, RegistrationController.recalculateScores);

// Get registration by ID
router.get('/:id', RegistrationController.getById);

// Update registration
router.put('/:id', requireAdmin, RegistrationController.update);

// Approve registration
router.post('/:id/approve', requireAdmin, RegistrationController.approve);

// Reject registration
router.post('/:id/reject', requireAdmin, RegistrationController.reject);

// Delete registration
router.delete('/:id', requireAdmin, RegistrationController.delete);

module.exports = router;
