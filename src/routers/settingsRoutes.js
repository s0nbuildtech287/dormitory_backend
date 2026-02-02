const express = require('express');
const router = express.Router();
const SettingsController = require('../controllers/SettingsController');
const { authenticate, requireAdmin } = require('../middlewares/auth');

// All routes require authentication and admin role
router.use(authenticate);
router.use(requireAdmin);

// Get all settings grouped by category
router.get('/', SettingsController.getAllSettings);

// Get settings by category
router.get('/category/:category', SettingsController.getSettingsByCategory);

// Get scoring weights (backward compatibility)
router.get('/scoring-weights', SettingsController.getScoringWeights);

// Update scoring weights (backward compatibility)
router.put('/scoring-weights', SettingsController.updateScoringWeights);

// Update setting by ID
router.put('/:id', SettingsController.updateSetting);

// Create new setting
router.post('/', SettingsController.createSetting);

module.exports = router;