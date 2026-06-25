const express = require("express");
const router = express.Router();
const EmailController = require("../controllers/EmailController");
const { authenticate, requireAdmin } = require("../middlewares/auth");

// Yêu cầu đăng nhập để gửi email
router.use(authenticate);

// API gửi email của Admin tới sinh viên
router.post("/send", requireAdmin, EmailController.send);

module.exports = router;
