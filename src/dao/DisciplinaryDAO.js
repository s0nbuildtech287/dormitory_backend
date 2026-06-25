const pool = require('../config/database');

class DisciplinaryDAO {
  
  // Lấy danh sách phiếu kỷ luật kèm các bộ lọc và thông tin sinh viên/phòng tương ứng
  async findAll(filters = {}) {
    let query = `
      SELECT
        dr.*,
        u.full_name   AS student_name,
        u.email       AS student_email,
        u.conduct_score,
        COALESCE(sc.snapshot_student_id, sc_latest.snapshot_student_id) AS snapshot_student_id,
        rf.student_id AS rf_student_id,
        r.room_number,
        r.building,
        h.full_name   AS handled_by_name
      FROM disciplinary_records dr
      LEFT JOIN users u  ON dr.user_id    = u.id
      LEFT JOIN student_contracts sc ON dr.contract_id = sc.id
      LEFT JOIN LATERAL (
        SELECT snapshot_student_id
        FROM student_contracts sc2
        WHERE sc2.user_id = dr.user_id
        ORDER BY sc2.created_at DESC
        LIMIT 1
      ) sc_latest ON TRUE
      LEFT JOIN LATERAL (
        SELECT student_id
        FROM register_forms rf2
        WHERE rf2.student_email = u.email
        ORDER BY rf2.created_at DESC
        LIMIT 1
      ) rf ON TRUE
      LEFT JOIN rooms r  ON dr.room_id    = r.id
      LEFT JOIN users h  ON dr.handled_by = h.id
      WHERE 1=1
    `;
    const params = [];
    let i = 1;

    if (filters.user_id) {
      query += ` AND dr.user_id = $${i++}`;
      params.push(filters.user_id);
    }
    if (filters.status) {
      query += ` AND dr.status = $${i++}`;
      params.push(filters.status);
    }
    if (filters.violation_type) {
      query += ` AND dr.violation_type = $${i++}`;
      params.push(filters.violation_type);
    }
    if (filters.disciplinary_level) {
      query += ` AND dr.disciplinary_level = $${i++}`;
      params.push(filters.disciplinary_level);
    }
    if (filters.date_from) {
      query += ` AND dr.violation_date >= $${i++}`;
      params.push(filters.date_from);
    }
    if (filters.date_to) {
      query += ` AND dr.violation_date <= $${i++}`;
      params.push(filters.date_to);
    }
    if (filters.search) {
      query += ` AND (u.full_name ILIKE $${i} OR u.email ILIKE $${i})`;
      params.push(`%${filters.search}%`);
      i++;
    }

    query += ` ORDER BY dr.violation_date DESC`;

    const result = await pool.query(query, params);
    return result.rows;
  }

  // Lấy thông tin chi tiết một phiếu kỷ luật theo ID
  async findById(id) {
    const query = `
      SELECT
        dr.*,
        u.full_name  AS student_name,
        u.email      AS student_email,
        u.conduct_score,
        COALESCE(sc.snapshot_student_id, sc_latest.snapshot_student_id) AS snapshot_student_id,
        rf.student_id AS rf_student_id,
        r.room_number,
        r.building,
        h.full_name  AS handled_by_name
      FROM disciplinary_records dr
      LEFT JOIN users u ON dr.user_id    = u.id
      LEFT JOIN student_contracts sc ON dr.contract_id = sc.id
      LEFT JOIN LATERAL (
        SELECT snapshot_student_id
        FROM student_contracts sc2
        WHERE sc2.user_id = dr.user_id
        ORDER BY sc2.created_at DESC
        LIMIT 1
      ) sc_latest ON TRUE
      LEFT JOIN LATERAL (
        SELECT student_id
        FROM register_forms rf2
        WHERE rf2.student_email = u.email
        ORDER BY rf2.created_at DESC
        LIMIT 1
      ) rf ON TRUE
      LEFT JOIN rooms r ON dr.room_id    = r.id
      LEFT JOIN users h ON dr.handled_by = h.id
      WHERE dr.id = $1
    `;
    const result = await pool.query(query, [id]);
    return result.rows[0] || null;
  }

  // Đếm số lần vi phạm cùng loại của một sinh viên (để theo dõi tái phạm)
  async countByUserAndType(userId, violationType) {
    const result = await pool.query(
      `SELECT COUNT(*) AS cnt FROM disciplinary_records
       WHERE user_id = $1 AND violation_type = $2`,
      [userId, violationType]
    );
    return parseInt(result.rows[0].cnt, 10);
  }

  // Lập phiếu kỷ luật mới (trừ điểm rèn luyện và tự động chấm dứt hợp đồng nếu buộc thôi ở)
  async create(data) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Thêm mới phiếu kỷ luật
      const insertQ = `
        INSERT INTO disciplinary_records (
          id, user_id, room_id, contract_id,
          violation_type, violation_date, description, evidence,
          disciplinary_level, penalty_amount, penalty_paid,
          score_deducted, violation_count,
          email_sent, email_sent_at,
          decision_number, decision_content, effective_date, expiry_date,
          status, reported_by, handled_by, note,
          created_at, updated_at
        ) VALUES (
          $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,NOW(),NOW()
        ) RETURNING *
      `;
      const vals = [
        data.id,
        data.user_id,
        data.room_id || null,
        data.contract_id || null,
        data.violation_type,
        data.violation_date,
        data.description,
        data.evidence ? JSON.stringify(data.evidence) : null,
        data.disciplinary_level,
        data.penalty_amount || 0,
        false,
        data.score_deducted || 0,
        data.violation_count || 1,
        data.email_sent || false,
        data.email_sent_at || null,
        data.decision_number || null,
        data.decision_content || null,
        data.effective_date || null,
        data.expiry_date || null,
        data.status || 'Chờ xử lý',
        data.reported_by || null,
        data.handled_by || null,
        data.note || null,
      ];
      const inserted = await client.query(insertQ, vals);
      const record = inserted.rows[0];

      // Tự động trừ điểm rèn luyện (không trừ nếu vi phạm buộc thôi ở)
      if (data.score_deducted > 0) {
        await client.query(
          `UPDATE users
           SET conduct_score = GREATEST(0, conduct_score - $1), updated_at = NOW()
           WHERE id = $2`,
          [data.score_deducted, data.user_id]
        );
      }

      // Nếu kỷ luật buộc thôi ở, chấm dứt hợp đồng tương ứng
      if (data.disciplinary_level === 'Buộc thôi ở' && data.contract_id) {
        await client.query(
          `UPDATE student_contracts
           SET status = 'Terminated', termination_reason = $1, updated_at = NOW()
           WHERE id = $2`,
          [`Kỷ luật buộc thôi ở - Phiếu ${record.id}`, data.contract_id]
        );
      }

      await client.query('COMMIT');
      return record;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  // Cập nhật thông tin phiếu kỷ luật
  async update(id, data) {
    const fields = Object.keys(data);
    const setClause = fields.map((f, idx) => `${f} = $${idx + 2}`).join(', ');
    const values = [id, ...Object.values(data)];
    const result = await pool.query(
      `UPDATE disciplinary_records SET ${setClause}, updated_at = NOW() WHERE id = $1 RETURNING *`,
      values
    );
    return result.rows[0];
  }

  // Xóa phiếu kỷ luật theo ID
  async delete(id) {
    const result = await pool.query(
      'DELETE FROM disciplinary_records WHERE id = $1 RETURNING *',
      [id]
    );
    return result.rows[0];
  }

  // Lấy số liệu thống kê kỷ luật (tổng số, đang xử lý, đã xử lý, phạt chưa thanh toán)
  async getStatistics() {
    const result = await pool.query(`
      SELECT
        COUNT(*)                                                        AS total,
        COUNT(*) FILTER (WHERE status = 'Chờ xử lý')                  AS pending,
        COUNT(*) FILTER (WHERE status = 'Đã xử lý')                   AS resolved,
        COUNT(*) FILTER (WHERE penalty_paid = FALSE AND penalty_amount > 0) AS unpaid_penalty,
        SUM(penalty_amount) FILTER (WHERE penalty_paid = TRUE)         AS total_collected,
        SUM(score_deducted)                                            AS total_score_deducted
      FROM disciplinary_records
    `);
    return result.rows[0];
  }

  // Lấy cấu hình điểm trừ tương ứng cho các loại vi phạm từ settings
  async getScoreConfig() {
    const result = await pool.query(
      `SELECT value FROM settings WHERE id = 'disciplinary_score_config' AND is_active = TRUE`
    );
    return result.rows[0]?.value || null;
  }

  // Lưu cấu hình điểm trừ vi phạm vào settings
  async saveScoreConfig(config, updatedBy) {
    const result = await pool.query(
      `INSERT INTO settings (id, category, name, value, description, is_active, updated_by, updated_at)
       VALUES ('disciplinary_score_config', 'discipline', 'Cấu hình điểm trừ vi phạm', $1,
               'Điểm trừ rèn luyện theo từng loại vi phạm', TRUE, $2, NOW())
       ON CONFLICT (id) DO UPDATE SET value = $1, updated_by = $2, updated_at = NOW()
       RETURNING *`,
      [JSON.stringify(config), updatedBy]
    );
    return result.rows[0];
  }
}

module.exports = new DisciplinaryDAO();
