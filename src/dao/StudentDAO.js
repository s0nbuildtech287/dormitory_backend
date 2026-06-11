/**
 * StudentDAO.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Data Access Object cho phía sinh viên.
 * Tập hợp tất cả các truy vấn DB mà sinh viên cần:
 *   - Hồ sơ cá nhân (register_forms + rooms + contracts)
 *   - Hợp đồng của sinh viên
 *   - Hóa đơn của sinh viên
 *   - Thông báo dành cho sinh viên
 *   - Phản hồi (feedback) của sinh viên
 *   - Phiếu kỷ luật của sinh viên
 * ─────────────────────────────────────────────────────────────────────────────
 */

const db = require('../config/database');

class StudentDAO {

    // ─────────────────────────────────────────────────────────────────────────
    // PROFILE
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Lấy toàn bộ thông tin hồ sơ sinh viên theo email.
     * JOIN với student_contracts (Active/Pending) và rooms để lấy thông tin phòng.
     * Nếu không tìm thấy register_form, fallback sang users + contracts.
     *
     * @param {string} email - Email đăng nhập của sinh viên
     * @returns {Object|null} Hồ sơ đầy đủ hoặc null
     */
    async getProfile(email) {
        // Truy vấn chính: lấy từ register_forms
        const query = `
            SELECT
                rf.*,
                -- Thông tin phòng (qua hợp đồng Active/Pending)
                r.room_number,
                r.building,
                r.floor,
                r.capacity,
                r.current_occupancy,
                r.gender_type        AS room_gender,
                r.rent_price         AS room_rent_price,
                r.garbage_fee,
                r.internet_fee,
                r.parking_fee,
                r.area,
                r.last_inspection_date,
                r.status             AS room_status,
                -- Thông tin hợp đồng
                sc.id                AS contract_id,
                sc.contract_number,
                sc.start_date,
                sc.end_date,
                sc.status            AS contract_status,
                sc.deposit_amount,
                sc.deposit_paid,
                sc.snapshot_student_id,
                sc.snapshot_cccd,
                sc.snapshot_gender,
                sc.snapshot_year,
                sc.snapshot_faculty,
                sc.snapshot_phone,
                sc.signed_at,
                sc.rent_price        AS contract_rent_price
            FROM register_forms rf
            LEFT JOIN student_contracts sc
                ON sc.register_form_id = rf.id
                AND sc.status IN ('Active', 'Pending')
            LEFT JOIN rooms r ON r.id = sc.room_id
            WHERE rf.student_email = $1
            ORDER BY rf.created_at DESC
            LIMIT 1
        `;

        const result = await db.query(query, [email]);
        if (result.rows[0]) return result.rows[0];

        // Fallback: không có register_form, lấy từ users + contracts
        const fallback = `
            SELECT
                NULL::varchar        AS id,
                u.full_name          AS student_name,
                sc.snapshot_student_id AS student_id,
                u.email              AS student_email,
                sc.snapshot_phone    AS phone_number,
                sc.snapshot_gender   AS gender,
                NULL::date           AS dob,
                sc.snapshot_cccd     AS cccd,
                NULL::text           AS address,
                sc.snapshot_faculty  AS faculty,
                NULL::varchar        AS major,
                NULL::varchar        AS class,
                sc.snapshot_year     AS year,
                NULL::decimal        AS gpa,
                NULL::integer        AS distance,
                NULL::text           AS priority_reasons,
                NULL::varchar        AS status,
                NULL::varchar        AS ai_suggestion,
                NULL::integer        AS ai_score,
                NULL::jsonb          AS ai_reasoning,
                NULL::jsonb          AS evidence_images,
                NULL::text           AS note,
                NULL::varchar        AS reviewed_by,
                NULL::timestamp      AS reviewed_at,
                u.created_at,
                u.updated_at,
                -- Thông tin phòng
                r.room_number,
                r.building,
                r.floor,
                r.capacity,
                r.current_occupancy,
                r.gender_type        AS room_gender,
                r.rent_price         AS room_rent_price,
                r.garbage_fee,
                r.internet_fee,
                r.parking_fee,
                r.area,
                r.last_inspection_date,
                r.status             AS room_status,
                -- Thông tin hợp đồng
                sc.id                AS contract_id,
                sc.contract_number,
                sc.start_date,
                sc.end_date,
                sc.status            AS contract_status,
                sc.deposit_amount,
                sc.deposit_paid,
                sc.snapshot_student_id,
                sc.snapshot_cccd,
                sc.snapshot_gender,
                sc.snapshot_year,
                sc.snapshot_faculty,
                sc.snapshot_phone,
                sc.signed_at,
                sc.rent_price        AS contract_rent_price
            FROM users u
            LEFT JOIN student_contracts sc
                ON sc.user_id = u.id
                AND sc.status IN ('Active', 'Pending')
            LEFT JOIN rooms r ON r.id = sc.room_id
            WHERE u.email = $1
            ORDER BY sc.created_at DESC
            LIMIT 1
        `;

        const fb = await db.query(fallback, [email]);
        return fb.rows[0] || null;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // HỢP ĐỒNG
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Lấy danh sách hợp đồng của sinh viên (theo userId).
     * JOIN với rooms để hiển thị thông tin phòng.
     *
     * @param {string} userId - ID người dùng
     * @returns {Array} Danh sách hợp đồng
     */
    async getContracts(userId) {
        const query = `
            SELECT
                sc.*,
                u.full_name          AS student_name,
                rf.student_name      AS rf_student_name,
                rf.class             AS snapshot_class,
                r.room_number,
                r.building,
                r.floor,
                r.area,
                r.capacity,
                r.current_occupancy,
                r.rent_price AS room_rent_price,
                r.internet_fee,
                r.garbage_fee,
                r.parking_fee,
                r.last_inspection_date
            FROM student_contracts sc
            LEFT JOIN users u ON u.id = sc.user_id
            LEFT JOIN register_forms rf ON rf.id = sc.register_form_id
            LEFT JOIN rooms r ON r.id = sc.room_id
            WHERE sc.user_id = $1
            ORDER BY sc.created_at DESC
        `;
        const result = await db.query(query, [userId]);
        return result.rows;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // HÓA ĐƠN
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Lấy danh sách hóa đơn của sinh viên.
     * Tìm phòng qua hợp đồng Active của sinh viên, sau đó lấy hóa đơn của phòng đó.
     *
     * @param {string} userId - ID người dùng
     * @returns {Array} Danh sách hóa đơn
     */
    async getInvoices(userId) {
        const query = `
            SELECT
                i.*,
                r.room_number,
                r.building
            FROM invoices i
            JOIN rooms r ON r.id = i.room_id
            WHERE i.room_id IN (
                SELECT room_id FROM student_contracts
                WHERE user_id = $1
                  AND status = 'Active'
                  AND room_id IS NOT NULL
            )
            AND i.deleted_at IS NULL
            ORDER BY i.billing_month DESC
        `;
        const result = await db.query(query, [userId]);
        return result.rows;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // THÔNG BÁO
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Lấy thông báo dành cho sinh viên.
     * Bao gồm: thông báo cho ALL, cho STUDENTS, và SPECIFIC (có userId trong target_users).
     *
     * @param {string} userId - ID người dùng
     * @returns {Array} Danh sách thông báo
     */
    async getNotifications(userId) {
        const query = `
            SELECT
                n.*,
                u.full_name AS creator_name
            FROM notifications n
            LEFT JOIN users u ON u.id = n.created_by
            WHERE n.is_published = TRUE
              AND (
                  n.target_audience = 'ALL'
                  OR n.target_audience = 'STUDENTS'
                  OR (
                      n.target_audience = 'SPECIFIC'
                      AND n.target_users @> to_jsonb($1::text)
                  )
              )
            ORDER BY n.created_at DESC
        `;
        const result = await db.query(query, [userId]);
        return result.rows;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // PHẢN HỒI (FEEDBACK)
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Lấy danh sách phản hồi của sinh viên.
     *
     * @param {string} userId - ID người dùng
     * @returns {Array} Danh sách feedback
     */
    async getFeedbacks(userId) {
        const query = `
            SELECT
                f.*,
                r.room_number,
                r.building,
                resolver.full_name AS resolver_name
            FROM feedbacks f
            LEFT JOIN rooms r ON r.id = f.room_id
            LEFT JOIN users resolver ON resolver.id = f.resolved_by
            WHERE f.user_id = $1
            ORDER BY f.created_at DESC
        `;
        const result = await db.query(query, [userId]);
        return result.rows;
    }

    /**
     * Tạo phản hồi mới từ sinh viên.
     *
     * @param {Object} data - Dữ liệu feedback { category, content, room_id, images }
     * @param {string} userId - ID người dùng
     * @returns {Object} Feedback vừa tạo
     */
    async createFeedback(data, userId) {
        const id = `fb-${Date.now()}`;
        const query = `
            INSERT INTO feedbacks (id, user_id, room_id, category, content, images, status, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, 'New', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            RETURNING *
        `;
        const result = await db.query(query, [
            id,
            userId,
            data.room_id || null,
            data.category || 'Khác',
            data.content,
            data.images ? JSON.stringify(data.images) : null,
        ]);
        return result.rows[0];
    }

    // ─────────────────────────────────────────────────────────────────────────
    // KỶ LUẬT
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Lấy danh sách phiếu kỷ luật của sinh viên.
     * Chỉ trả về các phiếu chưa bị hủy.
     *
     * @param {string} userId - ID người dùng
     * @returns {Array} Danh sách phiếu kỷ luật
     */
    async getDisciplinaryRecords(userId) {
        const query = `
            SELECT
                dr.*,
                r.room_number,
                r.building,
                handler.full_name AS handler_name
            FROM disciplinary_records dr
            LEFT JOIN rooms r ON r.id = dr.room_id
            LEFT JOIN users handler ON handler.id = dr.handled_by
            WHERE dr.user_id = $1
              AND dr.status != 'Đã hủy'
            ORDER BY dr.violation_date DESC
        `;
        const result = await db.query(query, [userId]);
        return result.rows;
    }
}

module.exports = new StudentDAO();
