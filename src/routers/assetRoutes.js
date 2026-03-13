const express = require('express');
const router = express.Router();
const AssetController = require('../controllers/AssetController');
const { authenticate } = require('../middlewares/auth');

// All routes require authentication
router.use(authenticate);

// Get all assets or asset summary
router.get('/', AssetController.getAll.bind(AssetController));

// Get asset statistics
router.get('/statistics', AssetController.getStatistics.bind(AssetController));

// Get asset by ID
router.get('/:id', AssetController.getById.bind(AssetController));

// Create new asset
router.post('/', AssetController.create.bind(AssetController));

// Update asset
router.put('/:id', AssetController.update.bind(AssetController));

// Delete asset
router.delete('/:id', AssetController.delete.bind(AssetController));

module.exports = router;
