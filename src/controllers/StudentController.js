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
const FeedbackService = require('../services/FeedbackService');
const db = require('../config/database');

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

            const feedback = await FeedbackService.createFeedback(req.body, userId, req);
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

    /**
     * POST /student/invoices/meter-reading
     * Sinh viên gửi số điện/nước trong 5 ngày đầu tháng.
     * Body: { electric_end, water_end }
     * - Tìm hóa đơn tháng hiện tại của phòng sinh viên
     * - Cập nhật electric_end, water_end, tính lại electric_amount, water_amount, total_amount
     * - Lưu thông tin người gửi và thời gian
     */
    async submitMeterReading(req, res, next) {
        try {
            const userId = req.user?.userId;
            if (!userId) {
                return res.status(401).json({ success: false, message: 'Không xác thực được người dùng' });
            }

            // Kiểm tra trong 5 ngày đầu tháng
            const today = new Date();
            if (today.getDate() > 5) {
                return res.status(400).json({
                    success: false,
                    message: 'Chỉ được gửi số điện/nước trong 5 ngày đầu tháng (ngày 1-5)',
                });
            }

            const { electric_end, water_end } = req.body;
            if (electric_end == null || water_end == null) {
                return res.status(400).json({ success: false, message: 'Vui lòng nhập đủ số điện và số nước' });
            }
            if (Number(electric_end) < 0 || Number(water_end) < 0) {
                return res.status(400).json({ success: false, message: 'Số điện/nước không được âm' });
            }

            // Lấy phòng của sinh viên
            const contractRes = await db.query(
                `SELECT sc.room_id, u.full_name
                 FROM student_contracts sc
                 JOIN users u ON u.id = sc.user_id
                 WHERE sc.user_id = $1 AND sc.status = 'Active' AND sc.room_id IS NOT NULL
                 LIMIT 1`,
                [userId]
            );
            if (contractRes.rows.length === 0) {
                return res.status(404).json({ success: false, message: 'Không tìm thấy hợp đồng phòng đang hoạt động' });
            }
            const { room_id, full_name } = contractRes.rows[0];

            // Tìm hóa đơn tháng trước (tháng cần nộp số liệu)
            const prevMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
            const billingMonthStr = `${prevMonth.getFullYear()}-${String(prevMonth.getMonth() + 1).padStart(2, '0')}-01`;

            const invoiceRes = await db.query(
                `SELECT * FROM invoices WHERE room_id = $1 AND billing_month = $2 AND deleted_at IS NULL LIMIT 1`,
                [room_id, billingMonthStr]
            );
            if (invoiceRes.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: `Không tìm thấy hóa đơn tháng ${prevMonth.getMonth() + 1}/${prevMonth.getFullYear()} cho phòng của bạn`,
                });
            }
            const invoice = invoiceRes.rows[0];

            // Không cho gửi nếu hóa đơn đã thanh toán
            if (invoice.status === 'Đã thanh toán') {
                return res.status(400).json({
                    success: false,
                    message: 'Hóa đơn tháng này đã được thanh toán, không thể cập nhật số liệu.',
                });
            }

            // Validate: electric_end >= electric_start
            if (Number(electric_end) < Number(invoice.electric_start)) {
                return res.status(400).json({ success: false, message: `Số điện cuối (${electric_end}) không được nhỏ hơn số điện đầu kỳ (${invoice.electric_start})` });
            }
            if (Number(water_end) < Number(invoice.water_start)) {
                return res.status(400).json({ success: false, message: `Số nước cuối (${water_end}) không được nhỏ hơn số nước đầu kỳ (${invoice.water_start})` });
            }

            // Tính lại
            const electricAmount = (Number(electric_end) - Number(invoice.electric_start)) * Number(invoice.electric_rate);
            const waterAmount    = (Number(water_end)    - Number(invoice.water_start))    * Number(invoice.water_rate);
            const totalAmount    = Number(invoice.rent_amount) + electricAmount + waterAmount
                                 + Number(invoice.service_fees) - Number(invoice.discount_amount) + Number(invoice.penalty_amount);

            await db.query(
                `UPDATE invoices SET
                    electric_end          = $1,
                    electric_amount       = $2,
                    water_end             = $3,
                    water_amount          = $4,
                    total_amount          = $5,
                    meter_submitted_by    = $6,
                    meter_submitted_at    = NOW(),
                    meter_submitter_name  = $7,
                    updated_at            = NOW()
                 WHERE id = $8`,
                [electric_end, electricAmount, water_end, waterAmount, totalAmount, userId, full_name, invoice.id]
            );

            res.json({
                success: true,
                message: 'Gửi số điện/nước thành công! Hóa đơn đã được cập nhật.',
                data: {
                    invoice_id:      invoice.id,
                    invoice_number:  invoice.invoice_number,
                    electric_end,
                    water_end,
                    electric_amount: electricAmount,
                    water_amount:    waterAmount,
                    total_amount:    totalAmount,
                },
            });
        } catch (error) {
            next(error);
        }
    }
}

module.exports = new StudentController();
