const express = require('express');
const router = express.Router();
const LogController = require('../controllers/LogController');
const { authenticate, requireAdmin } = require('../middlewares/auth');

// All routes require authentication and admin role
router.use(authenticate, requireAdmin);

// Get recent activity logs
router.get('/recent', LogController.getRecentActivity);

// Get activity logs with filters
router.get('/', LogController.getActivityLogs);

// Get action statistics
router.get('/statistics', LogController.getActionStatistics);

// Get logs by user
router.get('/user', LogController.getByUser);
router.get('/user/:userId', LogController.getByUser);

// Get logs by entity
router.get('/entity/:entityType/:entityId', LogController.getByEntity);

// Clean old logs
router.delete('/clean', LogController.cleanOldLogs);

module.exports = router;
