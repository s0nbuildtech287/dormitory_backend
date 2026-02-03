const express = require('express');
const router = express.Router();
const FeedbackController = require('../controllers/FeedbackController');
const { authenticate, requireAdmin } = require('../middlewares/auth');

// All routes require authentication
router.use(authenticate);

// Get all feedbacks
router.get('/', FeedbackController.getAll);

// Get statistics
router.get('/statistics', requireAdmin, FeedbackController.getStatistics);

// Get pending count
router.get('/pending-count', requireAdmin, FeedbackController.getPendingCount);

// Get feedbacks by user
router.get('/user', FeedbackController.getByUser);
router.get('/user/:userId', FeedbackController.getByUser);

// Get feedback by ID
router.get('/:id', FeedbackController.getById);

// Create new feedback
router.post('/', FeedbackController.create);

// Update feedback
router.put('/:id', FeedbackController.update);

// Update feedback status (Admin only)
router.post('/:id/status', requireAdmin, FeedbackController.updateStatus);

// Delete feedback
router.delete('/:id', FeedbackController.delete);

module.exports = router;
