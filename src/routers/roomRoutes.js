const express = require('express');
const router = express.Router();
const RoomController = require('../controllers/RoomController');
const { authenticate, requireAdmin } = require('../middlewares/auth');

// All routes require authentication
router.use(authenticate);

// Get all rooms
router.get('/', RoomController.getAll);

// Get available rooms
router.get('/available', RoomController.getAvailable);

// Get building/floor metadata
router.get('/meta/structure', requireAdmin, RoomController.getStructureMetadata);

// Get statistics
router.get('/statistics', requireAdmin, RoomController.getStatistics);

// Admin batch create routes
router.post('/batch/floor', requireAdmin, RoomController.createFloorRooms);
router.post('/batch/building', requireAdmin, RoomController.createBuildingRooms);

// Get room by ID
router.get('/:id', RoomController.getById);

// Admin only routes
router.post('/', requireAdmin, RoomController.create);
router.put('/:id', requireAdmin, RoomController.update);
router.delete('/:id', requireAdmin, RoomController.delete);

// Update meter readings
router.post('/:id/meter-readings', requireAdmin, RoomController.updateMeterReadings);

module.exports = router;
