const express = require('express');
const router = express.Router();
const RegistrationController = require('../controllers/RegistrationController');
const { authenticate, requireAdmin } = require('../middlewares/auth');
const upload = require('../middlewares/upload');

// All routes require authentication
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

// Import from Excel
router.post('/import/excel', requireAdmin, upload.single('file'), RegistrationController.importExcel);

module.exports = router;
