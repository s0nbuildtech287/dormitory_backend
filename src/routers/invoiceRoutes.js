const express = require('express');
const router = express.Router();
const InvoiceController = require('../controllers/InvoiceController');
const { authenticate, requireAdmin } = require('../middlewares/auth');

// All routes require authentication
router.use(authenticate);

// Get all invoices
router.get('/', InvoiceController.getAll);

// Get revenue statistics
router.get('/statistics/revenue', requireAdmin, InvoiceController.getRevenueStatistics);

// Update overdue invoices
router.post('/update-overdue', requireAdmin, InvoiceController.updateOverdue);

// Pricing settings
router.get('/pricing-settings', requireAdmin, InvoiceController.getPricingSettings);
router.put('/pricing-settings', requireAdmin, InvoiceController.updatePricingSettings);

// Get invoices by user
router.get('/user', InvoiceController.getByUser);
router.get('/user/:userId', InvoiceController.getByUser);

// Get invoice by ID
router.get('/:id', InvoiceController.getById);

// Admin only routes
router.post('/', requireAdmin, InvoiceController.create);
router.post('/from-room', requireAdmin, InvoiceController.createFromRoom);
router.put('/:id', requireAdmin, InvoiceController.update);
router.post('/:id/mark-paid', requireAdmin, InvoiceController.markAsPaid);
router.delete('/:id', requireAdmin, InvoiceController.delete);

module.exports = router;
