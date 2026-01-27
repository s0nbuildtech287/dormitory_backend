const BaseDAO = require('./BaseDAO');

class FeedbackDAO extends BaseDAO {
    constructor() {
        super('feedbacks');
    }

    /**
     * Find feedbacks by user ID
     */
    async findByUserId(userId) {
        return this.findAll({ user_id: userId }, ['created_at DESC']);
    }

    /**
     * Find feedbacks by status
     */
    async findByStatus(status) {
        return this.findAll({ status }, ['created_at DESC']);
    }

    /**
     * Find feedbacks by room
     */
    async findByRoom(roomId) {
        return this.findAll({ room_id: roomId }, ['created_at DESC']);
    }

    /**
     * Search and filter feedbacks
     */
    async searchAndFilter(filters = {}) {
        let query = `
            SELECT 
                f.*,
                u.full_name as student_name,
                u.email as student_email,
                r.room_number,
                r.building,
                resolver.full_name as resolver_name
            FROM ${this.tableName} f
            LEFT JOIN users u ON f.user_id = u.id
            LEFT JOIN rooms r ON f.room_id = r.id
            LEFT JOIN users resolver ON f.resolved_by = resolver.id
            WHERE 1=1
        `;
        const values = [];

        if (filters.status) {
            query += ` AND f.status = ?`;
            values.push(filters.status);
        }

        if (filters.category) {
            query += ` AND f.category = ?`;
            values.push(filters.category);
        }

        if (filters.sentiment) {
            query += ` AND f.sentiment = ?`;
            values.push(filters.sentiment);
        }

        if (filters.searchTerm) {
            query += ` AND (f.content LIKE ? OR u.full_name LIKE ?)`;
            values.push(`%${filters.searchTerm}%`, `%${filters.searchTerm}%`);
        }

        query += ` ORDER BY f.created_at DESC`;

        if (filters.limit) {
            query += ` LIMIT ?`;
            values.push(filters.limit);
        }

        return this.executeQuery(query, values);
    }

    /**
     * Update feedback status
     */
    async updateStatus(feedbackId, status, resolvedBy = null, adminResponse = null) {
        const data = { status };
        
        if (status === 'Resolved') {
            data.resolved_by = resolvedBy;
            data.resolved_at = new Date();
            if (adminResponse) {
                data.admin_response = adminResponse;
            }
        }

        return this.update(feedbackId, data);
    }

    /**
     * Get feedback statistics
     */
    async getStatistics() {
        const query = `
            SELECT 
                status,
                category,
                sentiment,
                COUNT(*) as count,
                COUNT(CASE WHEN status = 'New' THEN 1 END) as new_count,
                COUNT(CASE WHEN status = 'Processing' THEN 1 END) as processing_count,
                COUNT(CASE WHEN status = 'Resolved' THEN 1 END) as resolved_count
            FROM ${this.tableName}
            GROUP BY status, category, sentiment
        `;
        return this.executeQuery(query);
    }

    /**
     * Get pending feedbacks count
     */
    async getPendingCount() {
        return this.count({ status: 'New' });
    }
}

module.exports = new FeedbackDAO();
