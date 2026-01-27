const BaseDAO = require('./BaseDAO');

class LogSystemDAO extends BaseDAO {
    constructor() {
        super('log_system');
    }

    /**
     * Create log entry
     */
    async log(userId, action, entityType, entityId, oldValue, newValue, req = null) {
        const logData = {
            id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            user_id: userId,
            action,
            entity_type: entityType,
            entity_id: entityId,
            old_value: oldValue ? JSON.stringify(oldValue) : null,
            new_value: newValue ? JSON.stringify(newValue) : null,
            ip_address: req ? req.ip : null,
            user_agent: req ? req.get('user-agent') : null
        };

        return this.create(logData);
    }

    /**
     * Get logs by user
     */
    async getByUser(userId, limit = 50) {
        return this.findAll({ user_id: userId }, ['created_at DESC'], limit);
    }

    /**
     * Get logs by entity
     */
    async getByEntity(entityType, entityId, limit = 50) {
        return this.findAll({ entity_type: entityType, entity_id: entityId }, ['created_at DESC'], limit);
    }

    /**
     * Get recent activity logs
     */
    async getRecentActivity(limit = 50) {
        const query = `
            SELECT 
                l.*,
                u.full_name as user_name,
                u.email as user_email,
                u.role as user_role
            FROM ${this.tableName} l
            LEFT JOIN users u ON l.user_id = u.id
            ORDER BY l.created_at DESC
            LIMIT ?
        `;
        return this.executeQuery(query, [limit]);
    }

    /**
     * Get activity logs with filters
     */
    async getActivityLogs(filters = {}) {
        let query = `
            SELECT 
                l.*,
                u.full_name as user_name,
                u.email as user_email,
                u.role as user_role
            FROM ${this.tableName} l
            LEFT JOIN users u ON l.user_id = u.id
            WHERE 1=1
        `;
        const values = [];

        if (filters.userId) {
            query += ` AND l.user_id = ?`;
            values.push(filters.userId);
        }

        if (filters.action) {
            query += ` AND l.action = ?`;
            values.push(filters.action);
        }

        if (filters.entityType) {
            query += ` AND l.entity_type = ?`;
            values.push(filters.entityType);
        }

        if (filters.startDate) {
            query += ` AND l.created_at >= ?`;
            values.push(filters.startDate);
        }

        if (filters.endDate) {
            query += ` AND l.created_at <= ?`;
            values.push(filters.endDate);
        }

        query += ` ORDER BY l.created_at DESC`;

        if (filters.limit) {
            query += ` LIMIT ?`;
            values.push(filters.limit);
        }

        return this.executeQuery(query, values);
    }

    /**
     * Get statistics by action
     */
    async getActionStatistics(startDate, endDate) {
        const query = `
            SELECT 
                action,
                entity_type,
                COUNT(*) as count,
                DATE(created_at) as date
            FROM ${this.tableName}
            WHERE created_at BETWEEN ? AND ?
            GROUP BY action, entity_type, DATE(created_at)
            ORDER BY date DESC
        `;
        return this.executeQuery(query, [startDate, endDate]);
    }

    /**
     * Clean old logs (older than specified days)
     */
    async cleanOldLogs(days = 90) {
        const query = `
            DELETE FROM ${this.tableName}
            WHERE created_at < DATE_SUB(NOW(), INTERVAL ? DAY)
        `;
        const [result] = await this.executeQuery(query, [days]);
        return result.affectedRows;
    }
}

module.exports = new LogSystemDAO();
