// src/routers/aiRoutes.js
const express = require('express');
const router = express.Router();
const { getModels, chat } = require('../controllers/AiController');

router.get('/models', getModels);
router.post('/chat', chat);

module.exports = router;
