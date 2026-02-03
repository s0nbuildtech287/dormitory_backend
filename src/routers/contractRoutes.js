const express = require('express');
const router = express.Router();
const ContractController = require('../controllers/ContractController');
const { authenticate, requireAdmin } = require('../middlewares/auth');

// All routes require authentication
router.use(authenticate);

// Get all contracts
router.get('/', ContractController.getAll);

// Get expiring contracts
router.get('/expiring', requireAdmin, ContractController.getExpiring);

// Get contracts by user
router.get('/user', ContractController.getByUser);
router.get('/user/:userId', ContractController.getByUser);

// Get contract by ID
router.get('/:id', ContractController.getById);

// Admin only routes
router.post('/', requireAdmin, ContractController.create);
router.post('/from-registration', requireAdmin, ContractController.createFromRegistration);
router.put('/:id', requireAdmin, ContractController.update);
router.post('/:id/terminate', requireAdmin, ContractController.terminate);

module.exports = router;
