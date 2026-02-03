const express = require('express');
const router = express.Router();
const RegistrationController = require('../controllers/RegistrationController');
const { authenticate, requireAdmin } = require('../middlewares/auth');
const upload = require('../middlewares/upload');

// Import from Excel (NO AUTH FOR TESTING - MUST BE BEFORE router.use(authenticate))
router.post('/import/excel', upload.single('file'), RegistrationController.importExcel);

// All OTHER routes require authentication
router.use(authenticate);

// Get all registrations
router.get('/', RegistrationController.getAll);

// Get statistics
router.get('/statistics', requireAdmin, RegistrationController.getStatistics);

// Get registration by ID
router.get('/:id', RegistrationController.getById);

// Create new registration
router.post('/', RegistrationController.create);

// Update registration
router.put('/:id', requireAdmin, RegistrationController.update);

// Approve registration
router.post('/:id/approve', requireAdmin, RegistrationController.approve);

// Reject registration
router.post('/:id/reject', requireAdmin, RegistrationController.reject);

module.exports = router;
