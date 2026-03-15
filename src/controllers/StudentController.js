/**
 * StudentController.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Controller xử lý tất cả các request từ phía sinh viên.
 * Mỗi method tương ứng với một route trong studentRoutes.js.
 *
 * Các chức năng:
 *   GET  /student/profile          → Hồ sơ cá nhân đầy đủ
 *   GET  /student/contracts         → Danh sách hợp đồng
 *   GET  /student/invoices          → Danh sách hóa đơn
 *   GET  /student/notifications     → Thông báo dành cho sinh viên
 *   GET  /student/feedbacks         → Danh sách phản hồi đã gửi
 *   POST /student/feedbacks         → Gửi phản hồi mới
 *   GET  /student/disciplinary      → Danh sách phiếu kỷ luật
 * ─────────────────────────────────────────────────────────────────────────────
 */

const StudentDAO = require('../dao/StudentDAO');

class StudentController {

    // ─────────────────────────────────────────────────────────────────────────
    // PROFILE
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * GET /student/profile
     * Trả về toàn bộ thông tin hồ sơ sinh viên:
     * register_form + thông tin phòng + thông tin hợp đồng.
     */
    async getProfile(req, res, next) {
        try {
            const email = req.user?.email;
            if (!email) {
                return res.status(401).json({ success: false, message: 'Không xác thực được người dùng' });
            }

            const profile = await StudentDAO.getProfile(email);
            res.json({ success: true, data: profile || null });
        } catch (error) {
            next(error);
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // HỢP ĐỒNG
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * GET /student/contracts
     * Trả về danh sách hợp đồng của sinh viên đang đăng nhập.
     */
    async getContracts(req, res, next) {
        try {
            const userId = req.user?.userId;
            if (!userId) {
                return res.status(401).json({ success: false, message: 'Không xác thực được người dùng' });
            }

            const contracts = await StudentDAO.getContracts(userId);
            res.json({ success: true, data: contracts });
        } catch (error) {
            next(error);
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // HÓA ĐƠN
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * GET /student/invoices
     * Trả về danh sách hóa đơn của phòng mà sinh viên đang ở.
     */
    async getInvoices(req, res, next) {
        try {
            const userId = req.user?.userId;
            if (!userId) {
                return res.status(401).json({ success: false, message: 'Không xác thực được người dùng' });
            }

            const invoices = await StudentDAO.getInvoices(userId);
            res.json({ success: true, data: invoices });
        } catch (error) {
            next(error);
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // THÔNG BÁO
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * GET /student/notifications
     * Trả về thông báo dành cho sinh viên (ALL + STUDENTS + SPECIFIC).
     */
    async getNotifications(req, res, next) {
        try {
            const userId = req.user?.userId;
            if (!userId) {
                return res.status(401).json({ success: false, message: 'Không xác thực được người dùng' });
            }

            const notifications = await StudentDAO.getNotifications(userId);
            res.json({ success: true, data: notifications });
        } catch (error) {
            next(error);
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // PHẢN HỒI (FEEDBACK)
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * GET /student/feedbacks
     * Trả về danh sách phản hồi mà sinh viên đã gửi.
     */
    async getFeedbacks(req, res, next) {
        try {
            const userId = req.user?.userId;
            if (!userId) {
                return res.status(401).json({ success: false, message: 'Không xác thực được người dùng' });
            }

            const feedbacks = await StudentDAO.getFeedbacks(userId);
            res.json({ success: true, data: feedbacks });
        } catch (error) {
            next(error);
        }
    }

    /**
     * POST /student/feedbacks
     * Sinh viên gửi phản hồi mới.
     * Body: { category, content, room_id?, images? }
     */
    async createFeedback(req, res, next) {
        try {
            const userId = req.user?.userId;
            if (!userId) {
                return res.status(401).json({ success: false, message: 'Không xác thực được người dùng' });
            }

            const { content } = req.body;
            if (!content || !content.trim()) {
                return res.status(400).json({ success: false, message: 'Nội dung phản hồi không được để trống' });
            }

            const feedback = await StudentDAO.createFeedback(req.body, userId);
            res.status(201).json({ success: true, message: 'Gửi phản hồi thành công', data: feedback });
        } catch (error) {
            next(error);
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // KỶ LUẬT
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * GET /student/disciplinary
     * Trả về danh sách phiếu kỷ luật của sinh viên (trừ phiếu đã hủy).
     */
    async getDisciplinaryRecords(req, res, next) {
        try {
            const userId = req.user?.userId;
            if (!userId) {
                return res.status(401).json({ success: false, message: 'Không xác thực được người dùng' });
            }

            const records = await StudentDAO.getDisciplinaryRecords(userId);
            res.json({ success: true, data: records });
        } catch (error) {
            next(error);
        }
    }
}

module.exports = new StudentController();
