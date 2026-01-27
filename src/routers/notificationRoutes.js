const express = require('express');
const router = express.Router();
const NotificationController = require('../controllers/NotificationController');
const { authenticate, requireAdmin } = require('../middlewares/auth');

// All routes require authentication
router.use(authenticate);

// Get all notifications
router.get('/', NotificationController.getAll);

// Get notifications for current user
router.get('/my', NotificationController.getForUser);

// Get notification by ID
router.get('/:id', NotificationController.getById);

// Admin only routes
router.post('/', requireAdmin, NotificationController.create);
router.post('/send-all', requireAdmin, NotificationController.sendToAllStudents);
router.post('/send-specific', requireAdmin, NotificationController.sendToSpecificUsers);
router.put('/:id', requireAdmin, NotificationController.update);
router.delete('/:id', requireAdmin, NotificationController.delete);

module.exports = router;
