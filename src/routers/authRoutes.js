const express = require('express');
const router = express.Router();
const AuthController = require('../controllers/AuthController');
const { authenticate } = require('../middlewares/auth');

// Public routes
router.post('/register', AuthController.register);
router.post('/login', AuthController.login);
router.post('/send-otp', AuthController.sendOtp);
router.post('/verify-otp', AuthController.verifyOtp);

// Protected routes
router.get('/me', authenticate, AuthController.getMe);
router.post('/change-password', authenticate, AuthController.changePassword);
router.post('/create-admin', authenticate, AuthController.createAdmin);

module.exports = router;
