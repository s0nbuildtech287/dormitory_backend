const BaseDAO = require('./BaseDAO');

class LogSystemDAO extends BaseDAO {
    constructor() {
        super('log_system');
    }

    /**
     * Create log entry — normalize ::1 → 127.0.0.1
     */
    async log(userId, action, entityType, entityId, oldValue, newValue, req = null) {
        const rawIp = req
            ? (req.headers['x-forwarded-for']?.split(',')[0].trim() || req.ip || null)
            : null;
        const ip = rawIp === '::1' ? '127.0.0.1' : rawIp;

        const logData = {
            id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
            user_id: userId,
            action,
            entity_type: entityType,
            entity_id: entityId,
            old_value: oldValue ? JSON.stringify(oldValue) : null,
            new_value: newValue ? JSON.stringify(newValue) : null,
            ip_address: ip,
            user_agent: req ? req.get('user-agent') : null,
        };

        return this.create(logData);
    }

    async getByUser(userId, limit = 50) {
        return this.findAll({ user_id: userId }, ['created_at DESC'], limit);
    }

    async getByEntity(entityType, entityId, limit = 50) {
        return this.findAll({ entity_type: entityType, entity_id: entityId }, ['created_at DESC'], limit);
    }

    async getRecentActivity(limit = 50) {
        const query = `
            SELECT l.*, u.full_name as user_name, u.email as user_email, u.role as user_role
            FROM ${this.tableName} l
            LEFT JOIN users u ON l.user_id = u.id
            ORDER BY l.created_at DESC
            LIMIT $1
        `;
        return this.executeQuery(query, [limit]);
    }

    /**
     * Get activity logs with filters + pagination (PostgreSQL $N placeholders)
     */
    async getActivityLogs(filters = {}) {
        const values = [];
        const conditions = [];
        let p = 1;

        if (filters.userId) {
            conditions.push('l.user_id = $' + p++);
            values.push(filters.userId);
        }
        if (filters.action) {
            conditions.push('l.action = $' + p++);
            values.push(filters.action);
        }
        if (filters.entityType) {
            conditions.push('l.entity_type = $' + p++);
            values.push(filters.entityType);
        }
        if (filters.startDate) {
            conditions.push('l.created_at >= $' + p++);
            values.push(filters.startDate);
        }
        if (filters.endDate) {
            conditions.push('l.created_at <= $' + p++);
            values.push(filters.endDate);
        }
        if (filters.search) {
            const idx = p++;
            conditions.push('(u.full_name ILIKE $' + idx + ' OR l.action ILIKE $' + idx + ' OR l.entity_id ILIKE $' + idx + ')');
            values.push('%' + filters.search + '%');
        }

        const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';
        const baseFrom = 'FROM ' + this.tableName + ' l LEFT JOIN users u ON l.user_id = u.id ' + where;

        // Count
        const countResult = await this.executeQuery('SELECT COUNT(*) as total ' + baseFrom, values);
        const total = parseInt(countResult[0].total);

        // Paginated rows
        const limit  = filters.limit  ? parseInt(filters.limit)  : 10;
        const offset = filters.offset ? parseInt(filters.offset) : 0;
        const dataValues = [...values, limit, offset];
        const limitIdx  = p;
        const offsetIdx = p + 1;

        const dataQuery =
            'SELECT l.*, u.full_name as user_name, u.email as user_email, u.role as user_role ' +
            baseFrom +
            ' ORDER BY l.created_at DESC' +
            ' LIMIT $' + limitIdx + ' OFFSET $' + offsetIdx;

        const rows = await this.executeQuery(dataQuery, dataValues);
        return { rows, total };
    }

    async getActionStatistics(startDate, endDate) {
        const query = `
            SELECT action, entity_type, COUNT(*) as count, DATE(created_at) as date
            FROM ${this.tableName}
            WHERE created_at BETWEEN $1 AND $2
            GROUP BY action, entity_type, DATE(created_at)
            ORDER BY date DESC
        `;
        return this.executeQuery(query, [startDate, endDate]);
    }

    async cleanOldLogs(days = 90) {
        const query = `
            DELETE FROM ${this.tableName}
            WHERE created_at < NOW() - INTERVAL '${parseInt(days)} days'
        `;
        const result = await this.executeQuery(query, []);
        return result.rowCount || 0;
    }
}

module.exports = new LogSystemDAO();
