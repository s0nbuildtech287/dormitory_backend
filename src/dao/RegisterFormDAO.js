const BaseDAO = require('./BaseDAO');

class RegisterFormDAO extends BaseDAO {
    constructor() {
        super('register_forms');
    }

    // Tìm kiếm đơn đăng ký theo trạng thái
    async findByStatus(status) {
        return this.findAll({ status }, ['created_at DESC']);
    }

    // Tìm kiếm đơn đăng ký theo mã sinh viên (student_id)
    async findByStudentId(studentId) {
        return this.findAll({ student_id: studentId });
    }

    // Tìm kiếm và lọc đơn đăng ký phòng
    async searchAndFilter(filters = {}) {
        let query = `SELECT * FROM ${this.tableName} WHERE 1=1`;
        const values = [];
        let paramIndex = 1;

        if (filters.status) {
            query += ` AND status = $${paramIndex++}`;
            values.push(filters.status);
        }

        if (filters.gender) {
            query += ` AND gender = $${paramIndex++}`;
            values.push(filters.gender);
        }

        if (filters.searchTerm) {
            query += ` AND (student_name ILIKE $${paramIndex} OR student_id ILIKE $${paramIndex + 1} OR email ILIKE $${paramIndex + 2})`;
            values.push(`%${filters.searchTerm}%`, `%${filters.searchTerm}%`, `%${filters.searchTerm}%`);
            paramIndex += 3;
        }

        if (filters.aiSuggestion) {
            query += ` AND ai_suggestion = $${paramIndex++}`;
            values.push(filters.aiSuggestion);
        }

        query += ` ORDER BY created_at DESC`;

        if (filters.limit) {
            query += ` LIMIT $${paramIndex++}`;
            values.push(filters.limit);
        }

        return this.executeQuery(query, values);
    }

    // Cập nhật trạng thái duyệt đơn đăng ký kèm ghi chú và người duyệt
    async updateStatus(id, status, reviewedBy, note = null) {
        const data = {
            status,
            reviewed_by: reviewedBy,
            reviewed_at: new Date(),
            note
        };
        return this.update(id, data);
    }

    // Thống kê số lượng đơn đăng ký theo trạng thái và gợi ý của AI
    async getStatistics() {
        const query = `
            SELECT 
                status,
                COUNT(*) as count,
                COUNT(CASE WHEN ai_suggestion = 'Nên duyệt' THEN 1 END) as recommended_count,
                COUNT(CASE WHEN ai_suggestion = 'Cân nhắc' THEN 1 END) as consider_count,
                COUNT(CASE WHEN ai_suggestion = 'Không ưu tiên' THEN 1 END) as low_priority_count
            FROM ${this.tableName}
            GROUP BY status
        `;
        return this.executeQuery(query);
    }

    // Thêm nhiều đơn đăng ký cùng lúc (phục vụ import CSV/Excel)
    async bulkCreate(dataArray) {
        try {
            const results = [];
            for (const data of dataArray) {
                const result = await this.create(data);
                results.push(result);
            }
            return results;
        } catch (error) {
            throw new Error(`Error in bulkCreate: ${error.message}`);
        }
    }

    // Lấy cài đặt trọng số chấm điểm AI từ bảng settings
    async getScoringWeightsSettings() {
        const query = `
            SELECT * FROM settings 
            WHERE category = 'system' AND name = 'scoring_weights' AND is_active = true
            LIMIT 1
        `;
        const result = await this.executeQuery(query);
        return result[0] || null;
    }

    // Khởi tạo trọng số chấm điểm AI mới vào bảng settings
    async createScoringWeightsSettings(settingData) {
        const query = `
            INSERT INTO settings (id, category, name, value, description, is_active, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
            RETURNING *
        `;
        const result = await this.executeQuery(query, [
            settingData.id,
            settingData.category,
            settingData.name,
            JSON.stringify(settingData.value),
            settingData.description,
            settingData.is_active
        ]);
        return result[0];
    }

    // Cập nhật trọng số chấm điểm AI
    async updateScoringWeightsSettings(value, updatedBy = null) {
        const query = `
            UPDATE settings 
            SET value = $1, updated_by = $2, updated_at = CURRENT_TIMESTAMP
            WHERE id = 'scoring_weights'
            RETURNING *
        `;
        const result = await this.executeQuery(query, [JSON.stringify(value), updatedBy]);
        return result[0];
    }

    // Đếm số lượng đơn đăng ký được tạo trong năm được chọn
    async countByYear(year) {
        const query = `
            SELECT COUNT(*) AS count
            FROM ${this.tableName}
            WHERE EXTRACT(YEAR FROM created_at) = $1
        `;
        const result = await this.executeQuery(query, [year]);
        return parseInt(result[0]?.count || 0, 10);
    }

    // Thống kê đơn đăng ký theo nhóm đối tượng (tân sinh viên, sinh viên cũ, diện chính sách)
    async countByTargetGroup(year) {
        const query = `
            SELECT
                COUNT(*) FILTER (WHERE year = 1 AND (priority_reasons IS NULL OR priority_reasons = '')) AS freshmen,
                COUNT(*) FILTER (WHERE year > 1 AND (priority_reasons IS NULL OR priority_reasons = '')) AS returning,
                COUNT(*) FILTER (WHERE priority_reasons IS NOT NULL AND priority_reasons <> '') AS policy
            FROM ${this.tableName}
            WHERE EXTRACT(YEAR FROM created_at) = $1
        `;
        const result = await this.executeQuery(query, [year]);
        const row = result[0] || {};
        return [
            { label: "Tân sinh viên (Năm 1)", count: parseInt(row.freshmen || 0, 10), color: "blue" },
            { label: "Lưu sinh viên (Năm 2-4)", count: parseInt(row.returning || 0, 10), color: "violet" },
            { label: "Diện chính sách", count: parseInt(row.policy || 0, 10), color: "rose" },
        ];
    }
}

module.exports = new RegisterFormDAO();
