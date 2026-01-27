const BaseDAO = require('./BaseDAO');

class NotificationDAO extends BaseDAO {
    constructor() {
        super('notifications');
    }

    /**
     * Find notifications by type
     */
    async findByType(type) {
        return this.findAll({ type }, ['created_at DESC']);
    }

    /**
     * Get published notifications
     */
    async getPublished(limit = null) {
        const query = `
            SELECT n.*, u.full_name as creator_name
            FROM ${this.tableName} n
            LEFT JOIN users u ON n.created_by = u.id
            WHERE n.is_published = TRUE
            ORDER BY n.created_at DESC
            ${limit ? 'LIMIT ?' : ''}
        `;
        return this.executeQuery(query, limit ? [limit] : []);
    }

    /**
     * Get notifications for specific user
     */
    async getForUser(userId) {
        const query = `
            SELECT n.*, u.full_name as creator_name
            FROM ${this.tableName} n
            LEFT JOIN users u ON n.created_by = u.id
            WHERE n.is_published = TRUE
            AND (
                n.target_audience = 'ALL'
                OR (n.target_audience = 'STUDENTS' AND ? IN (SELECT id FROM users WHERE role = 'STUDENT'))
                OR (n.target_audience = 'SPECIFIC' AND JSON_CONTAINS(n.target_users, JSON_QUOTE(?)))
            )
            ORDER BY n.created_at DESC
        `;
        return this.executeQuery(query, [userId, userId]);
    }

    /**
     * Create notification with creator
     */
    async createNotification(data, createdBy) {
        const notificationData = {
            ...data,
            created_by: createdBy,
            is_published: data.is_published !== undefined ? data.is_published : true
        };
        return this.create(notificationData);
    }

    /**
     * Send to all students
     */
    async sendToAllStudents(title, content, type, createdBy) {
        return this.createNotification({
            title,
            content,
            type,
            target_audience: 'STUDENTS'
        }, createdBy);
    }

    /**
     * Send to specific users
     */
    async sendToSpecificUsers(title, content, type, userIds, createdBy) {
        return this.createNotification({
            title,
            content,
            type,
            target_audience: 'SPECIFIC',
            target_users: JSON.stringify(userIds)
        }, createdBy);
    }
}

module.exports = new NotificationDAO();
