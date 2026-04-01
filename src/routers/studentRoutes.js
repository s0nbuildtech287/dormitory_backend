/**
 * studentRoutes.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Tất cả các route dành riêng cho phía sinh viên.
 * Base path: /api/student  (đăng ký trong server.js)
 *
 * Tất cả route đều yêu cầu xác thực (authenticate middleware).
 * Không có route nào yêu cầu quyền admin.
 *
 * Danh sách endpoints:
 *   GET  /api/student/profile        → Hồ sơ cá nhân đầy đủ
 *   GET  /api/student/contracts      → Danh sách hợp đồng
 *   GET  /api/student/invoices       → Danh sách hóa đơn
 *   GET  /api/student/notifications  → Thông báo dành cho sinh viên
 *   GET  /api/student/feedbacks      → Danh sách phản hồi đã gửi
 *   POST /api/student/feedbacks      → Gửi phản hồi mới
 *   GET  /api/student/disciplinary   → Danh sách phiếu kỷ luật
 * ─────────────────────────────────────────────────────────────────────────────
 */

const express = require('express');
const router = express.Router();
const StudentController = require('../controllers/StudentController');
const { authenticate } = require('../middlewares/auth');

// Tất cả route đều yêu cầu đăng nhập
router.use(authenticate);

// ── Hồ sơ cá nhân ──────────────────────────────────────────────────────────
router.get('/profile', StudentController.getProfile);

// ── Hợp đồng ───────────────────────────────────────────────────────────────
router.get('/contracts', StudentController.getContracts);

// ── Hóa đơn ────────────────────────────────────────────────────────────────
router.get('/invoices', StudentController.getInvoices);
router.post('/invoices/meter-reading', StudentController.submitMeterReading);

// ── Thông báo ──────────────────────────────────────────────────────────────
router.get('/notifications', StudentController.getNotifications);

// ── Phản hồi ───────────────────────────────────────────────────────────────
router.get('/feedbacks', StudentController.getFeedbacks);
router.post('/feedbacks', StudentController.createFeedback);

// ── Kỷ luật ────────────────────────────────────────────────────────────────
router.get('/disciplinary', StudentController.getDisciplinaryRecords);

module.exports = router;
