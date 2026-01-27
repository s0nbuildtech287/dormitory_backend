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
                ai_suggestion,
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
}

module.exports = new RegisterFormDAO();
