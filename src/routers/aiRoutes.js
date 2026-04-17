// src/routers/aiRoutes.js
const express = require('express');
const router = express.Router();
const { getModels, chat, analyzeFeedbackEndpoint } = require('../controllers/AiController');
const { authenticate, requireAdmin } = require('../middlewares/auth');

router.get('/models', getModels);
router.post('/chat', chat);

// Re-analyze a feedback — ADMIN only
router.post('/analyze-feedback', authenticate, requireAdmin, analyzeFeedbackEndpoint);

module.exports = router;
