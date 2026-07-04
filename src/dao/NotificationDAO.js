const BaseDAO = require('./BaseDAO');

class NotificationDAO extends BaseDAO {
    constructor() {
        super('notifications');
    }

    // Tìm kiếm thông báo theo thể loại (loại)
    async findByType(type) {
        return this.findAll({ type }, ['created_at DESC']);
    }

    // Lấy danh sách các thông báo đã xuất bản công khai
    async getPublished(limit = null) {
        let query = `
            SELECT n.*, u.full_name as creator_name
            FROM ${this.tableName} n
            LEFT JOIN users u ON n.created_by = u.id
            WHERE n.is_published = TRUE
            ORDER BY n.created_at DESC
        `;
        const values = [];
        if (limit) {
            query += ` LIMIT $1`;
            values.push(limit);
        }
        return this.executeQuery(query, values);
    }

    // Lấy danh sách thông báo dành riêng cho một người dùng (chung toàn trường, nhóm sinh viên hoặc gửi riêng)
    async getForUser(userId) {
        const query = `
            SELECT n.*, u.full_name as creator_name
            FROM ${this.tableName} n
            LEFT JOIN users u ON n.created_by = u.id
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
        return this.executeQuery(query, [userId]);
    }

    // Tạo thông báo mới kèm ID người tạo
    async createNotification(data, createdBy) {
        const notificationData = {
            id: data.id || `notif-${Date.now()}`,
            ...data,
            created_by: createdBy,
            is_published: data.is_published !== undefined ? data.is_published : true
        };
        return this.create(notificationData);
    }

    // Gửi thông báo đến toàn bộ sinh viên
    async sendToAllStudents(title, content, type, createdBy) {
        return this.createNotification({
            title,
            content,
            type,
            target_audience: 'STUDENTS'
        }, createdBy);
    }

    // Gửi thông báo đến danh sách người nhận cụ thể
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
