const BaseDAO = require('./BaseDAO');

class RegisterFormDAO extends BaseDAO {
    constructor() {
        super('register_forms');
    }

    /**
     * Find by status
     */
    async findByStatus(status) {
        return this.findAll({ status }, ['created_at DESC']);
    }

    /**
     * Find by student ID
     */
    async findByStudentId(studentId) {
        return this.findAll({ student_id: studentId });
    }

    /**
     * Search and filter registrations
     */
    async searchAndFilter(filters = {}) {
        let query = `SELECT * FROM ${this.tableName} WHERE 1=1`;
        const values = [];

        if (filters.status) {
            query += ` AND status = ?`;
            values.push(filters.status);
        }

        if (filters.gender) {
            query += ` AND gender = ?`;
            values.push(filters.gender);
        }

        if (filters.searchTerm) {
            query += ` AND (student_name LIKE ? OR student_id LIKE ? OR email LIKE ?)`;
            values.push(`%${filters.searchTerm}%`, `%${filters.searchTerm}%`, `%${filters.searchTerm}%`);
        }

        if (filters.aiSuggestion) {
            query += ` AND ai_suggestion = ?`;
            values.push(filters.aiSuggestion);
        }

        query += ` ORDER BY created_at DESC`;

        if (filters.limit) {
            query += ` LIMIT ?`;
            values.push(filters.limit);
        }

        return this.executeQuery(query, values);
    }

    /**
     * Update status and reviewer
     */
    async updateStatus(id, status, reviewedBy, note = null) {
        const data = {
            status,
            reviewed_by: reviewedBy,
            reviewed_at: new Date(),
            note
        };
        return this.update(id, data);
    }

    /**
     * Get statistics by status
     */
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

    /**
     * Import from Excel data
     */
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

    /**
     * Get scoring weights settings from settings table
     */
    async getScoringWeightsSettings() {
        const query = `
            SELECT * FROM settings 
            WHERE category = 'system' AND name = 'scoring_weights' AND is_active = true
            LIMIT 1
        `;
        const result = await this.executeQuery(query);
        return result[0] || null;
    }

    /**
     * Create scoring weights settings in settings table
     */
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

    /**
     * Update scoring weights settings in settings table
     */
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
}

module.exports = new RegisterFormDAO();
